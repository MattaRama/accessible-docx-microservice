import type { UploadedFile } from "express-fileupload";
import { chunkWordDocument } from "./chunking";
import type { ChunkResult, ExtractedImage, RagChunk } from "./chunking";
import { OpenAI } from 'openai';
import { describeImagePrompt, improveImageDescriptionPrompt } from "./prompts";
import { addAltTextToDocx } from "./injection";
import similarity from 'compute-cosine-similarity';

const ai = new OpenAI();

const DEFAULT_LLM_MODEL = process.env["DEFAULT_LLM_MODEL"]!;
const DEFAULT_EMBEDDING_MODEL = process.env["DEFAULT_EMBEDDING_MODEL"]!;

function mapTextChunk(chunk: RagChunk): string {
  if (chunk.metadata.currentHeader) {
    return `Header: ${chunk.metadata.currentHeader}\n\n\n${chunk.pageContent}`;
  }

  return chunk.pageContent;
}

async function describeImage(image: ExtractedImage): Promise<string> {
  const response = await ai.responses.create({
    model: DEFAULT_LLM_MODEL,
    input: describeImagePrompt(image.buffer, image.contentType),
  });

  return response.output_text;
}

async function improveImageDescription(baseDesc: string, context: string[]) {
  const response = await ai.responses.create({
    model: DEFAULT_LLM_MODEL,
    input: improveImageDescriptionPrompt(baseDesc, context),
  });

  return response.output_text;
}

async function generateImageAltText(image: ExtractedImage, textChunks: string[], textEmbeddings: OpenAI.Embedding[]) {
  // generate base description and embeddings
  const baseDesc = await describeImage(image);
  const baseEmbedding = (await ai.embeddings.create({
    model: DEFAULT_EMBEDDING_MODEL,
    input: baseDesc
  })).data[0]!.embedding;

  // vector search for context
  const similarities = textEmbeddings.map((embedding) => similarity(embedding.embedding, baseEmbedding)!);
  const zippedText = similarities.map((similarity, i) => ({
    similarity,
    text: textChunks[i]!
  })).sort((a, b) => (b.similarity - a.similarity));

  // generate new description and return
  return await improveImageDescription(baseDesc, zippedText.slice(0, 5).map(i => i.text));
}

async function generateAltText(chunks: ChunkResult): Promise<void> {
  // embed all chunks
  const textChunks = chunks.chunks.map(v => mapTextChunk(v));

  const textChunkEmbeddings = (await ai.embeddings.create({
    model: DEFAULT_EMBEDDING_MODEL,
    input: textChunks
  })).data;

  // describe all images, perform vector search, then redescribe
  for (var i = 0; i < chunks.images.length; i++) {
    const img = chunks.images[i]!;
    if (img.altText) {
      continue;
    }

    img.altText = await generateImageAltText(img, textChunks, textChunkEmbeddings);
  }
}

export async function processFile(file: UploadedFile): Promise<UploadedFile | null> {
  const chunked = await chunkWordDocument(file.data, file.name);
  await generateAltText(chunked);
  const newDocx = await addAltTextToDocx(file.data, { altTextList: chunked.images.map(img => img.altText!) });

  const clone = { ...file };
  clone.data = newDocx;
  return clone;
}