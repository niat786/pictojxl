export type StudioMode = 'single' | 'step-by-step' | 'auto-queue';

export type JobStatus = 'queued' | 'processing' | 'done' | 'error' | 'paused';

export interface EncodeOptions {
  quality: number;
  effort: number;
  lossless: boolean;
}

export interface ConvertRequest {
  jobId: string;
  fileName: string;
  mimeType: string;
  buffer: ArrayBuffer;
  options: EncodeOptions;
  needsPreview: boolean;
}

export interface ConvertResult {
  jobId: string;
  opfsPath: string;
  originalBytes: number;
  jxlBytes: number;
  width: number;
  height: number;
  previewBitmap?: ImageBitmap;
  originalBitmap?: ImageBitmap;
}

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  mimeType: string;
  originalBytes: number;
  jxlBytes: number | null;
  status: JobStatus;
  error?: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  opfsPath: string | null;
  savingsPct: number | null;
}

export interface StudioProps {
  headline?: string;
  subheadline?: string;
  dropzoneLabel?: string;
  acceptHint?: string;
  defaultMode?: StudioMode;
}
