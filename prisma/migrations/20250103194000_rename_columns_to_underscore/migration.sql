-- Rename columns in documents table to underscore_case
ALTER TABLE "documents" RENAME COLUMN "originalName" TO "original_name";
ALTER TABLE "documents" RENAME COLUMN "fileSize" TO "file_size";
ALTER TABLE "documents" RENAME COLUMN "uploadDate" TO "upload_date";

-- Rename columns in document_chunks table to underscore_case
ALTER TABLE "document_chunks" RENAME COLUMN "documentId" TO "document_id";
ALTER TABLE "document_chunks" RENAME COLUMN "chunkIndex" TO "chunk_index";
ALTER TABLE "document_chunks" RENAME COLUMN "createdAt" TO "created_at";
