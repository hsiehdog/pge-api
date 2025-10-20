-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_chunks table
CREATE TABLE "document_chunks" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better performance
CREATE INDEX "idx_chunks_documentId" ON "document_chunks"("documentId");
CREATE INDEX "idx_chunks_chunkIndex" ON "document_chunks"("chunkIndex");

-- Create vector similarity search index
CREATE INDEX "idx_chunks_embedding_cosine" ON "document_chunks" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add foreign key constraint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
