import { Request, Response } from "express";
import { generateEmbedding } from "../../services/embeddingService";
import { searchSimilarChunks } from "../../services/documentService";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export interface RAGQueryRequest {
  query: string;
  limit?: number;
  document_id?: number;
}

export interface RAGQueryResponse {
  query: string;
  answer: string;
  sources: Array<{
    id: number;
    content: string;
    similarity: number;
    document: {
      filename: string;
      original_name: string;
    };
    chunk_index: number;
  }>;
  metadata: {
    totalSources: number;
    avgSimilarity: number;
  };
}

/**
 * Perform RAG query - search for relevant chunks and generate answer
 */
export const queryRAG = async (req: Request, res: Response) => {
  try {
    const { query, limit = 5, document_id }: RAGQueryRequest = req.body;

    if (!query || typeof query !== "string") {
      return res
        .status(400)
        .json({ error: "Query is required and must be a string" });
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Search for similar chunks
    const similarChunks = await searchSimilarChunks(
      queryEmbedding,
      limit,
      document_id
    );

    if (similarChunks.length === 0) {
      return res.json({
        query,
        answer:
          "I couldn't find any relevant information in the uploaded documents to answer your question.",
        sources: [],
        metadata: {
          totalSources: 0,
          avgSimilarity: 0,
        },
      });
    }

    // Prepare context from similar chunks
    const context = similarChunks
      .map((chunk, index) => `[Source ${index + 1}]: ${chunk.content}`)
      .join("\n\n");

    // Generate answer using LLM with context
    const systemPrompt = `You are a helpful assistant that answers questions based on the provided document context. 
Use only the information from the provided sources to answer the question. If the sources don't contain enough information to answer the question, say so.

Sources:
${context}

Instructions:
- Answer based only on the provided sources
- If you quote or reference information, mention which source it came from
- If the sources don't contain enough information, be honest about it
- Keep your answer concise and relevant`;

    const result = await generateText({
      model: openai("gpt-3.5-turbo"),
      system: systemPrompt,
      messages: [{ role: "user" as const, content: query }],
    });

    // Calculate average similarity
    const avgSimilarity =
      similarChunks.reduce((sum, chunk) => sum + chunk.similarity, 0) /
      similarChunks.length;

    const response: RAGQueryResponse = {
      query,
      answer: result.text,
      sources: similarChunks.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
        similarity: chunk.similarity,
        document: chunk.document,
        chunk_index: chunk.chunk_index,
      })),
      metadata: {
        totalSources: similarChunks.length,
        avgSimilarity: Math.round(avgSimilarity * 1000) / 1000,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("RAG query error:", error);
    res.status(500).json({
      error: "Failed to process RAG query",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get document statistics
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const stats = await getDocumentStats();
    res.json({ stats });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      error: "Failed to retrieve statistics",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Import the service function
import { getDocumentStats } from "../../services/documentService";
