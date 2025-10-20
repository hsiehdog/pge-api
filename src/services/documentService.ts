import { prisma } from "../db/prisma";
import { TextChunk } from "../lib/textProcessor";

// Define types manually since Prisma client types are not being recognized
type Document = {
  id: number;
  filename: string;
  original_name: string;
  file_size: number;
  content: string;
  upload_date: Date;
  metadata: any;
};

type DocumentChunk = {
  id: number;
  document_id: number;
  chunk_index: number;
  content: string;
  embedding?: number[] | null;
  metadata: any;
  created_at: Date;
};

export interface DocumentWithChunks extends Document {
  chunks: DocumentChunk[];
}

export interface CreateDocumentData {
  filename: string;
  original_name: string;
  file_size: number;
  content: string;
  metadata?: Record<string, any>;
}

export interface CreateChunkData {
  document_id: number;
  chunk_index: number;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

/**
 * Create a new document in the database
 */
export async function createDocument(
  data: CreateDocumentData
): Promise<Document> {
  return await prisma.document.create({
    data: {
      filename: data.filename,
      original_name: data.original_name,
      file_size: data.file_size,
      content: data.content,
      metadata: data.metadata || {},
    },
  });
}

/**
 * Create document chunks with embeddings
 */
export async function createDocumentChunks(
  documentId: number,
  chunks: TextChunk[],
  embeddings: number[][]
): Promise<DocumentChunk[]> {
  if (chunks.length !== embeddings.length) {
    throw new Error("Number of chunks must match number of embeddings");
  }

  // Create chunks without embeddings first
  const chunkData = chunks.map((chunk) => ({
    document_id: documentId,
    chunk_index: chunk.index,
    content: chunk.content,
    metadata: {
      ...chunk.metadata,
      wordCount: chunk.metadata.wordCount,
    },
  }));

  await prisma.documentChunk.createMany({
    data: chunkData,
  });

  // Get the created chunks
  const createdChunks = await prisma.documentChunk.findMany({
    where: { document_id: documentId },
    orderBy: { chunk_index: "asc" },
  });

  // Update chunks with embeddings using raw SQL
  for (let i = 0; i < createdChunks.length; i++) {
    const chunk = createdChunks[i];
    const embedding = embeddings[i];

    // Convert embedding array to PostgreSQL vector format
    const embeddingString = `[${embedding.join(",")}]`;

    await prisma.$executeRaw`
      UPDATE document_chunks 
      SET embedding = ${embeddingString}::vector 
      WHERE id = ${chunk.id}
    `;
  }

  return await prisma.documentChunk.findMany({
    where: { document_id: documentId },
    orderBy: { chunk_index: "asc" },
  });
}

/**
 * Get document by ID with chunks
 */
export async function getDocumentWithChunks(
  documentId: number
): Promise<DocumentWithChunks | null> {
  return await (prisma as any).document.findUnique({
    where: { id: documentId },
    include: {
      chunks: {
        orderBy: { chunk_index: "asc" },
      },
    },
  });
}

/**
 * Get all documents
 */
export async function getAllDocuments(): Promise<Document[]> {
  return await (prisma as any).document.findMany({
    orderBy: { upload_date: "desc" },
  });
}

/**
 * Delete document and all its chunks
 */
export async function deleteDocument(documentId: number): Promise<void> {
  await (prisma as any).document.delete({
    where: { id: documentId },
  });
}

/**
 * Search for similar chunks using vector similarity
 */
export async function searchSimilarChunks(
  queryEmbedding: number[],
  limit: number = 5,
  document_id?: number
): Promise<
  Array<{
    id: number;
    content: string;
    similarity: number;
    document_id: number;
    chunk_index: number;
    document: {
      filename: string;
      original_name: string;
    };
  }>
> {
  // Convert embedding to string format for PostgreSQL
  const embeddingString = `[${queryEmbedding.join(",")}]`;

  const whereClause = document_id
    ? `WHERE dc.document_id = ${document_id}`
    : "";

  const query = `
    SELECT 
      dc.id,
      dc.content,
      dc.document_id,
      dc.chunk_index,
      d.filename,
      d.original_name,
      (dc.embedding <=> '${embeddingString}'::vector) as distance
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    ${whereClause}
    ORDER BY dc.embedding <=> '${embeddingString}'::vector
    LIMIT ${limit}
  `;

  try {
    const results = (await prisma.$queryRawUnsafe(query)) as Array<{
      id: number;
      content: string;
      distance: number;
      document_id: number;
      chunk_index: number;
      filename: string;
      original_name: string;
    }>;

    if (results.length === 0) {
      console.log(
        "Vector similarity search returned 0 results, using fallback"
      );
      return await searchSimilarChunksFallback(
        queryEmbedding,
        limit,
        document_id
      );
    }

    return results.map((result) => ({
      id: result.id,
      content: result.content,
      similarity: 1 - result.distance, // Convert distance to similarity
      document_id: result.document_id,
      chunk_index: result.chunk_index,
      document: {
        filename: result.filename,
        original_name: result.original_name,
      },
    }));
  } catch (error) {
    console.error("Vector similarity search error:", error);
    // Fallback: use text similarity if vector search fails
    return await searchSimilarChunksFallback(
      queryEmbedding,
      limit,
      document_id
    );
  }
}

/**
 * Fallback search using text similarity when vector search fails
 */
async function searchSimilarChunksFallback(
  queryEmbedding: number[],
  limit: number = 5,
  document_id?: number
): Promise<
  Array<{
    id: number;
    content: string;
    similarity: number;
    document_id: number;
    chunk_index: number;
    document: {
      filename: string;
      original_name: string;
    };
  }>
> {
  const whereClause = document_id
    ? `WHERE dc.document_id = ${document_id}`
    : "";

  const query = `
    SELECT 
      dc.id,
      dc.content,
      dc.document_id,
      dc.chunk_index,
      d.filename,
      d.original_name,
      0.5 as similarity
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    ${whereClause}
    ORDER BY dc.id DESC
    LIMIT ${limit}
  `;

  const results = (await prisma.$queryRawUnsafe(query)) as Array<{
    id: number;
    content: string;
    similarity: number;
    document_id: number;
    chunk_index: number;
    filename: string;
    original_name: string;
  }>;

  return results.map((result) => ({
    id: result.id,
    content: result.content,
    similarity: result.similarity,
    document_id: result.document_id,
    chunk_index: result.chunk_index,
    document: {
      filename: result.filename,
      original_name: result.original_name,
    },
  }));
}

/**
 * Get document statistics
 */
export async function getDocumentStats(): Promise<{
  totalDocuments: number;
  totalChunks: number;
  avgChunksPerDoc: number;
}> {
  const [totalDocuments, totalChunks, avgChunksPerDoc] = await Promise.all([
    (prisma as any).document.count(),
    (prisma as any).documentChunk.count(),
    (prisma as any).documentChunk
      .groupBy({
        by: ["document_id"],
        _count: { id: true },
      })
      .then((results: Array<{ _count: { id: number } }>) =>
        results.length > 0
          ? results.reduce(
              (sum: number, doc: { _count: { id: number } }) =>
                sum + doc._count.id,
              0
            ) / results.length
          : 0
      ),
  ]);

  return {
    totalDocuments,
    totalChunks,
    avgChunksPerDoc: Math.round(avgChunksPerDoc * 100) / 100,
  };
}
