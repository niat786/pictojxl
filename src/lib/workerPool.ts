import { wrap, type Remote } from 'comlink';
import type { JxlWorkerApi } from '../workers/jxl.worker';

export type RemoteWorker = Remote<JxlWorkerApi>;

function poolSize(): number {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;
  return Math.min(4, Math.max(2, cores));
}

export function createWorkerPool(): RemoteWorker[] {
  const size = poolSize();
  const workers: RemoteWorker[] = [];

  for (let i = 0; i < size; i++) {
    const worker = new Worker(new URL('../workers/jxl.worker.ts', import.meta.url), {
      type: 'module',
    });
    workers.push(wrap<JxlWorkerApi>(worker));
  }

  return workers;
}

export class RoundRobinPool {
  private index = 0;

  constructor(private readonly workers: RemoteWorker[]) {}

  next(): RemoteWorker {
    const worker = this.workers[this.index % this.workers.length];
    this.index += 1;
    return worker;
  }

  get size(): number {
    return this.workers.length;
  }
}
