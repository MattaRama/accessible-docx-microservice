import type { AltTextJobStatus } from "./service/alt-text-job";

export type AltTextStartJobResponse = StartJobFailure | JobStarted;

export interface StartJobFailure {
  reason: string;
};

export interface JobStarted {
  jobId: string;
};

export type AltTextJobStatusResponse = JobStatus | JobNotFound | InvalidFormBody;

export interface JobStatus {
  jobId: string;
  jobStatus: AltTextJobStatus;
};

export interface InvalidFormBody {
  reason: string;
};

export interface JobNotFound {
  reason: string;
};

export type AltTextFetchResponse = '';
