const { PDFParse } = require("pdf-parse");

export interface TextChunk {
  content: string;
  index: number;
  metadata: {
    startChar: number;
    endChar: number;
    wordCount: number;
  };
}

export interface ExtractedText {
  text: string;
  metadata: {
    pages: number;
    wordCount: number;
    charCount: number;
  };
}

/**
 * Extract text from PDF buffer
 */
export async function extractTextFromPDF(
  buffer: Buffer
): Promise<ExtractedText> {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();

    return {
      text: result.text,
      metadata: {
        pages: result.numpages,
        wordCount: result.text.split(/\s+/).length,
        charCount: result.text.length,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to extract text from PDF: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    await parser.destroy();
  }
}

/**
 * Split text into chunks with overlap for better context
 */
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): TextChunk[] {
  if (chunkSize <= overlap) {
    throw new Error("Chunk size must be greater than overlap");
  }

  const chunks: TextChunk[] = [];
  const words = text.split(/\s+/);
  const effectiveChunkSize = chunkSize - overlap;

  let currentIndex = 0;
  let chunkIndex = 0;

  while (currentIndex < words.length) {
    const endIndex = Math.min(currentIndex + chunkSize, words.length);
    const chunkWords = words.slice(currentIndex, endIndex);
    const content = chunkWords.join(" ");

    chunks.push({
      content,
      index: chunkIndex,
      metadata: {
        startChar: currentIndex,
        endChar: endIndex,
        wordCount: chunkWords.length,
      },
    });

    // Move to next chunk with overlap
    currentIndex += effectiveChunkSize;
    chunkIndex++;
  }

  return chunks;
}

/**
 * Clean and normalize text for better processing
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ") // Replace multiple whitespace with single space
    .replace(/\n\s*\n/g, "\n") // Replace multiple newlines with single newline
    .trim();
}

/**
 * Calculate text statistics
 */
export function getTextStats(text: string) {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const sentences = text
    .split(/[.!?]+/)
    .filter((sentence) => sentence.trim().length > 0);

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    charCount: text.length,
    avgWordsPerSentence: words.length / sentences.length,
  };
}
