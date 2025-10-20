import { Request, Response } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import {
  extractTextFromPDF,
  chunkText,
  cleanText,
} from "../../lib/textProcessor";
import { generateEmbeddings } from "../../services/embeddingService";
import {
  createDocument,
  createDocumentChunks,
} from "../../services/documentService";

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

export const uploadMiddleware = upload.single("pdf");

/**
 * Upload and process PDF file
 */
export const uploadPDF = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file provided" });
    }

    const { originalname, buffer, size } = req.file;
    const filename = `${uuidv4()}-${originalname}`;

    // Extract text from PDF
    const extractedText = await extractTextFromPDF(buffer);
    const cleanedText = cleanText(extractedText.text);

    // Create document record
    const document = await createDocument({
      filename,
      original_name: originalname,
      file_size: size,
      content: cleanedText,
      metadata: {
        pages: extractedText.metadata.pages,
        wordCount: extractedText.metadata.wordCount,
        charCount: extractedText.metadata.charCount,
      },
    });

    // Chunk the text
    const chunks = chunkText(cleanedText, 1000, 200);

    // Generate embeddings for all chunks
    const chunkTexts = chunks.map((chunk) => chunk.content);
    const embeddings = await generateEmbeddings(chunkTexts);

    // Store chunks with embeddings
    await createDocumentChunks(document.id, chunks, embeddings);

    res.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        originalName: document.original_name,
        fileSize: document.file_size,
        uploadDate: document.upload_date,
        metadata: document.metadata,
      },
      processing: {
        chunksCreated: chunks.length,
        embeddingsGenerated: embeddings.length,
      },
    });
  } catch (error) {
    console.error("PDF upload error:", error);
    res.status(500).json({
      error: "Failed to process PDF",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get all documents
 */
export const getDocuments = async (req: Request, res: Response) => {
  try {
    const documents = await getAllDocuments();
    res.json({ documents });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({
      error: "Failed to retrieve documents",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get document by ID with chunks
 */
export const getDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const documentId = parseInt(id);

    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const document = await getDocumentWithChunks(documentId);

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({ document });
  } catch (error) {
    console.error("Get document error:", error);
    res.status(500).json({
      error: "Failed to retrieve document",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Delete document
 */
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const documentId = parseInt(id);

    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    await deleteDocumentService(documentId);
    res.json({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({
      error: "Failed to delete document",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Import the service functions
import {
  getAllDocuments,
  getDocumentWithChunks,
  deleteDocument as deleteDocumentService,
} from "../../services/documentService";
