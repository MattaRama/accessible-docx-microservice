import * as mammoth from "mammoth";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export interface RagChunk {
  pageContent: string;
  metadata: {
    source: string;
    currentHeader?: string;
  };
}

export interface ExtractedImage {
  filename: string;
  contentType: string;
  buffer: Buffer;
  altText?: string;
}

export interface ChunkResult {
  chunks: RagChunk[];
  images: ExtractedImage[];
}

export async function chunkWordDocument(docxBuffer: Buffer, fileName: string): Promise<ChunkResult> {
  const extractedImages: ExtractedImage[] = [];
  let imageCounter = 0;

  const options = {
    convertImage: mammoth.images.imgElement(async (image) => {
      imageCounter++;

      // Read the image file out as a raw Node.js Buffer
      const imageBuffer = await image.readAsBuffer();

      // Determine file extension
      const extension = image.contentType.split("/")[1] || "png";
      const filename = `image_${imageCounter}.${extension}`;

      // Store it in our in-memory array for later use
      extractedImages.push({
        filename,
        contentType: image.contentType,
        buffer: imageBuffer,
        altText: (image as any).altText || undefined
      });

      return {
        src: `[IMAGE: ${filename}]`
      };
    })
  };

  const conversionResult = await mammoth.convertToHtml({ buffer: docxBuffer }, options);
  const htmlText = conversionResult.value;
  const markdownText = NodeHtmlMarkdown.translate(htmlText);

  const sections = markdownText.split(/(?=\n#{1,3}\s)/g);
  const childSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 250,
  });

  const chunks: RagChunk[] = [];
  let lastSeenHeader = "Introduction";

  for (const section of sections) {
    if (!section.trim()) continue;

    // Detect if this section starts with a header and update context tracker
    const headerMatch = section.match(/^\n*(#{1,3})\s+(.*)/);
    if (headerMatch && headerMatch[2]) {
      lastSeenHeader = headerMatch[2].trim();
    }

    // Sub-split this specific section into vector-sized pieces
    const subChunks = await childSplitter.splitText(section);

    for (const chunkText of subChunks) {
      chunks.push({
        pageContent: chunkText,
        metadata: {
          source: fileName,
          currentHeader: lastSeenHeader,
        },
      });
    }
  }

  return { chunks, images: extractedImages };
}
