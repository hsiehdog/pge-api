import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * Generate embeddings for text using OpenAI's embedding model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: text,
    });

    return response.embedding;
  } catch (error) {
    throw new Error(
      `Failed to generate embedding: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const embeddings = await Promise.all(
      texts.map((text) =>
        embed({
          model: openai.embedding("text-embedding-3-small"),
          value: text,
        }).then((response) => response.embedding)
      )
    );

    return embeddings;
  } catch (error) {
    throw new Error(
      `Failed to generate embeddings: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same dimension");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find most similar chunks using cosine similarity
 */
export function findSimilarChunks(
  queryEmbedding: number[],
  chunkEmbeddings: { id: number; embedding: number[]; content: string }[],
  topK: number = 5
): { id: number; content: string; similarity: number }[] {
  const similarities = chunkEmbeddings.map((chunk) => ({
    id: chunk.id,
    content: chunk.content,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
