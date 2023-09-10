import { Connection, Channel, ConsumeMessage, connect } from 'amqplib';
import winston from 'winston';
import { plainToClass } from 'class-transformer';

import { ProcessingInput } from '../models/processing-input.js';
import { ProcessingResult } from '../models/processing-result.js';
import { ProcessingState } from '../models/processing-state.js';
import { ProcessingTransport } from './transport.js';

class PromiseFinisher<T> {
    constructor(public readonly resolve: (value: T) => void, public readonly reject: (reason?: any) => void) {}
}

export class TransportRabbitMQ implements ProcessingTransport {
    private readonly logger: winston.Logger;
    private readonly queueInputs: string = 'inputs';
    private readonly queueOutputs: string = 'outputs';
    private readonly queueStatusRequests: string = 'status-request';
    private readonly queueStatusResponses: string = 'status-response';
    private readonly queueClear: string = 'clear';
    private readonly queueTerminate: string = 'terminate';
    // Processing requests promises
    private readonly processingPromises: Map<string, PromiseFinisher<ProcessingResult>> = new Map<
        string,
        PromiseFinisher<ProcessingResult>
    >();
    // Status request promises
    private readonly statusPromises: Map<string, PromiseFinisher<ProcessingState>> = new Map<
        string,
        PromiseFinisher<ProcessingState>
    >();
    private connection?: Connection;
    private channel?: Channel;

    constructor() {
        this.logger = winston.createLogger();
    }

    /**
     * Init RabbitMQ connection
     *
     */
    public async init(): Promise<void> {
        const host: string = process.env['RABBITMQ_HOST'] ?? 'localhost';
        this.logger.info(`Connecting to RabbitMQ: amqp://${host}`);
        this.connection = await connect(`amqp://${host}`);
        this.channel = await this.connection.createChannel();
        this.channel.assertQueue(this.queueOutputs);
        this.channel.assertQueue(this.queueStatusResponses);

        // Listener for the calculation results
        this.channel.consume(this.queueOutputs, (message: ConsumeMessage | null) => {
            if (message !== null) {
                this.logger.info('Received result:', message.content.toString());
                const result: ProcessingResult = plainToClass(
                    ProcessingResult,
                    JSON.parse(message.content.toString()) as { [key: string]: any }
                );
                console.log(result);
                const id: string = result.id;
                if (this.processingPromises.has(id!)) {
                    this.processingPromises.get(id!)?.resolve(result);
                    this.processingPromises.delete(id);
                } else {
                    this.logger.warn(`Unrequested ProcessingResult received, id: ${id}`);
                }
                this.channel!.ack(message);
            } else {
                this.logger.warn('Consumer for sync processing response had been cancelled by server');
            }
        });

        // Listener for the status results
        this.channel.consume(this.queueStatusResponses, (message: ConsumeMessage | null) => {
            if (message !== null) {
                this.logger.info('Received state:', message.content.toString());
                const entity: ProcessingState = plainToClass(
                    ProcessingState,
                    JSON.parse(message.content.toString()) as { [key: string]: any }
                );
                const id: string = entity.id!;
                if (this.statusPromises.has(id!)) {
                    this.statusPromises.get(id!)?.resolve(entity);
                    this.statusPromises.delete(id);
                } else {
                    this.logger.warn(`Unrequested ProcessingEntity received, id: ${id}`);
                }
                this.channel!.ack(message);
            } else {
                this.logger.warn('Consumer for status response had been cancelled by server');
            }
        });
    }

    /**
     * Send the data processing request to the engine - sync
     *
     * @param {ProcessingInput} input
     * @returns {ProcessingResult}
     */
    public async sendProcessingRequestSync(input: ProcessingInput): Promise<ProcessingResult> {
        const promise = new Promise<ProcessingResult>(
            // Store resolve/rejects for the promise
            (resolve: (value: ProcessingResult) => void, reject: (reason?: any) => void) => {
                this.processingPromises.set(input.id!, new PromiseFinisher<ProcessingResult>(resolve, reject));
                this.channel!.sendToQueue(this.queueInputs, Buffer.from(JSON.stringify(input)));
            }
        );
        return promise;
    }

    /**
     * Send the data processing request to the engine - sync
     *
     * @param {ProcessingInput} input
     * @returns {void}
     */
    public sendProcessingRequestAsync(input: ProcessingInput): void {
        this.channel!.sendToQueue(this.queueInputs, Buffer.from(JSON.stringify(input)));
    }

    /**
     * Request the processing status
     *
     * @param {string} id
     * @returns {ProcessingEntity}
     */
    public async requestForStatus(id: string): Promise<ProcessingState> {
        const promise = new Promise<ProcessingState>(
            // Store resolve/rejects for the promise
            (resolve: (value: ProcessingState) => void, reject: (reason?: any) => void) => {
                this.statusPromises.set(id, new PromiseFinisher<ProcessingState>(resolve, reject));
                this.channel!.sendToQueue(this.queueStatusRequests, Buffer.from(id));
            }
        );
        return promise;
    }

    /**
     * Clear all old processings
     *
     */
    public clear(): void {
        this.channel!.sendToQueue(this.queueClear, Buffer.from(''));
    }

    /**
     * Terminate all running processings
     *
     */
    terminate(): void {
        this.channel!.sendToQueue(this.queueTerminate, Buffer.from(''));
    }

    /**
     * Disconnect from the RabbitMQ
     *
     */
    public async disconnect(): Promise<void> {
        await this.channel?.close();
        this.connection?.close();
    }
}
