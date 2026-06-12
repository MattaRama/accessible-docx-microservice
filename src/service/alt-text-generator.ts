import type { UploadedFile } from "express-fileupload";
import { chunkWordDocument } from "./chunking";
import type { ChunkResult, ExtractedImage, RagChunk } from "./chunking";
import { OpenAI } from 'openai';
import { describeImagePrompt, improveImageDescriptionPrompt } from "./prompts";
import { addAltTextToDocx } from "./injection";
import similarity from 'compute-cosine-similarity';
import type { AltTextJob } from "./alt-text-job";
import { logAIInteraction } from "../logging";

const ai = new OpenAI();

const DEFAULT_LLM_MODEL = process.env["DEFAULT_LLM_MODEL"] || "gpt-5.4-mini";
const DEFAULT_EMBEDDING_MODEL = process.env["DEFAULT_EMBEDDING_MODEL"] || "text-embedding-3-large";

function mapTextChunk(chunk: RagChunk): string {
  if (chunk.metadata.currentHeader) {
    return `Header: ${chunk.metadata.currentHeader}\n\n\n${chunk.pageContent}`;
  }

  return chunk.pageContent;
}

async function describeImage(image: ExtractedImage, job: AltTextJob): Promise<string> {
  const prompt = describeImagePrompt(image.buffer, image.contentType);

  const response = await ai.responses.create({
    model: DEFAULT_LLM_MODEL,
    input: prompt,
  });

  logAIInteraction(
    job,
    new Date(response.created_at * 1000).toISOString(),
    (response.completed_at ? new Date(response.completed_at) : new Date()).toISOString(),
    'describe',
    JSON.stringify(prompt),
    response.usage?.input_tokens,
    response.usage?.output_tokens,
    response.usage?.total_tokens,
    response.error?.message,
    response.output_text,
  );

  return response.output_text;
}

async function improveImageDescription(baseDesc: string, context: string[], job: AltTextJob) {
  const prompt = improveImageDescriptionPrompt(baseDesc, context);

  const response = await ai.responses.create({
    model: DEFAULT_LLM_MODEL,
    input: prompt,
  });

  logAIInteraction(
    job,
    new Date(response.created_at * 1000).toISOString(),
    (response.completed_at ? new Date(response.completed_at) : new Date()).toISOString(),
    'improve',
    JSON.stringify(prompt),
    response.usage?.input_tokens,
    response.usage?.output_tokens,
    response.usage?.total_tokens,
    response.error?.message,
    response.output_text,
  );

  return response.output_text;
}

async function generateImageAltText(image: ExtractedImage, textChunks: string[], textEmbeddings: OpenAI.Embedding[], job: AltTextJob) {
  // generate base description and embeddings
  const baseDesc = await describeImage(image, job);
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
  return await improveImageDescription(baseDesc, zippedText.slice(0, 5).map(i => i.text), job);
}

async function generateAltText(chunks: ChunkResult, job: AltTextJob): Promise<void> {
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

    img.altText = await generateImageAltText(img, textChunks, textChunkEmbeddings, job);
  }
}

export async function processFile(job: AltTextJob): Promise<UploadedFile | null> {
  const chunked = await chunkWordDocument(job.file.data, job.file.name);
  await generateAltText(chunked, job);
  const newDocx = await addAltTextToDocx(job.file.data, { altTextList: chunked.images.map(img => img.altText!) });

  const clone = { ...job.file };
  clone.data = newDocx;
  return clone;
}