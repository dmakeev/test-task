import { ProcessingState } from '../models/processing-state.js';
import { ProcessingInput } from '../models/processing-input.js';
import { ProcessingResult } from '../models/processing-result.js';
import { TransportRabbitMQ } from './rabbitmq.js';

export interface ProcessingTransport {
    /**
     * Init the transport connection
     *
     */
    init(): Promise<void>;

    /**
     * Disconnect from the transport
     *
     */
    disconnect(): Promise<void>;

    /**
     * Send the data processing request to the engine - sync
     *
     * @param {ProcessingInput} input
     * @returns {ProcessingResult}
     */
    sendProcessingRequestSync(input: ProcessingInput): Promise<ProcessingResult>;

    /**
     * Send the data processing request to the engine - async
     *
     * @param {ProcessingInput} input
     * @returns {void}
     */
    sendProcessingRequestAsync(input: ProcessingInput): void;

    /**
     * Request the processing status
     *
     * @param {string} id
     * @returns {ProcessingState}
     */
    requestForStatus(id: string): Promise<ProcessingState | null>;

    /**
     * Clear all old processings
     *
     */
    clear(): void;

    /**
     * Terminate all running processings
     *
     */
    terminate(): void;
}

export function createTransport(): ProcessingTransport {
    return new TransportRabbitMQ();
}
