-- Create documents table
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- Create indexes for documents table
CREATE INDEX "idx_documents_filename" ON "documents"("filename");
CREATE INDEX "idx_documents_uploadDate" ON "documents"("uploadDate");
