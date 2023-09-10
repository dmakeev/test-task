import { ProcessingInput } from '../models/processing-input.js';
import { ProcessingResult } from '../models/processing-result.js';
import { ProcessingState } from '../models/processing-state.js';
import { EngineTransportRabbitMQ } from './rabbitmq.js';

export interface EngineTransport {
    // Event for the new input received
    // As we'll have only one receiver - there is no need to use nmultipe listener or rx logic
    onInputReceived: (input: ProcessingInput) => void;

    // Event for the new input received
    // As we'll have only one receiver - there is no need to use nmultipe listener or rx logic
    onStatusRequested: (input: string) => void;

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
     * Send the result of the processing - its finished
     *
     * @param {ProcessingResult} result
     */
    sendProcessingResult(result: ProcessingResult): void;

    /**
     * Send the processing status - on request for async mode
     *
     * @param {ProcessingStatus} status
     */
    sendProcessingState(state: ProcessingState): void;

    // Event for the clear command
    onClearCommand: () => void;

    // Event for the terminate command
    onTerminateCommand: () => void;
}

export function createTransport(): EngineTransport {
    return new EngineTransportRabbitMQ();
}
