import type { UploadedFile } from "express-fileupload";

export type AltTextJobStatus = "PENDING" | "RUNNING" | "FAILED" | "COMPLETE";

export type CompletionCallback = () => Promise<void>;

export interface AltTextJob {
  id: string;
  file: UploadedFile;
  result: UploadedFile | null;
  status: AltTextJobStatus;
  errorReason?: string;
  onComplete: CompletionCallback[];
};

export interface StartAltTextJobOptions {
  file: UploadedFile;
}