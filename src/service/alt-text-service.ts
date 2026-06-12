import PQueue from 'p-queue';
import { type AltTextJob, type StartAltTextJobOptions } from './alt-text-job';
import { v4 as genId } from 'uuid';

import { processFile } from './alt-text-generator';

const CONCURRENCY_LIMIT = parseInt(process.env['JOB_CONCURRENCY_LIMIT']!);
const JOB_HOLD_TIME = parseInt(process.env['JOB_HOLD_TIME_SECS']!);

const jobQueue = new PQueue({ concurrency: CONCURRENCY_LIMIT });
const jobInfo: { [dict_key: string]: AltTextJob } = {};

export function getJob(id: string): AltTextJob | null {
  return jobInfo[id] || null;
}

export async function createJob(options: StartAltTextJobOptions) {
  const job: AltTextJob = {
    id: genId(),
    file: options.file,
    status: 'PENDING',
    result: null,
    onComplete: []
  };

  jobInfo[job.id] = job;

  jobQueue.add(() => processJob(job));

  return job;
}

export async function processJob(job: AltTextJob) {
  job.status = "RUNNING";
  try {
    const response = await processFile(job.file);
    job.result = response;
    job.status = 'COMPLETE';
  } catch (err) {
    job.status = 'FAILED';
    job.errorReason = <string>err;
  }

  // remove data from memory after JOB_HOLD_TIME seconds
  setTimeout(() => {
    delete jobInfo[job.id];
  }, JOB_HOLD_TIME * 1000)

  // job completion callbacks (for subscribe endpoint)
  job.onComplete.forEach(async (callback) => {
    await callback();
  });
}
