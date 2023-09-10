import { ProcessingResult } from './processing-result.js';

export enum ProcessingStatus {
    New = 'new',
    Processing = 'processing',
    Done = 'done',
    Error = 'error',
}

export class ProcessingState {
    constructor(
        public readonly id: string,
        public status: ProcessingStatus,
        public result?: ProcessingResult,
        public reason?: string
    ) {}
}
