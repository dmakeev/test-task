import { Connection, Channel, ConsumeMessage, connect } from 'amqplib';
import winston from 'winston';
import { plainToClass } from 'class-transformer';

import { ProcessingInput } from '../models/processing-input.js';
import { ProcessingResult } from '../models/processing-result.js';
import { EngineTransport } from './transport.js';
import { ProcessingState } from '../models/processing-state.js';

export class EngineTransportRabbitMQ implements EngineTransport {
    private readonly logger: winston.Logger;
    private readonly queueInputs: string = 'inputs';
    private readonly queueOutputs: string = 'outputs';
    private readonly queueStatusRequests: string = 'status-request';
    private readonly queueStatusResponses: string = 'status-response';
    private readonly queueClear: string = 'clear';
    private readonly queueTerminate: string = 'terminate';
    private connection?: Connection;
    private channel?: Channel;

    // Event for the new input received
    // As we'll have only one receiver - there is no need to use nmultipe listener or rx logic
    public onInputReceived: (input: ProcessingInput) => void = () => {};

    // Event for the new input received
    // As we'll have only one receiver - there is no need to use nmultipe listener or rx logic
    public onStatusRequested: (input: string) => void = () => {};

    // Event for the clear command
    public onClearCommand: () => void = () => {};

    // Event for the terminate command
    public onTerminateCommand: () => void = () => {};

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
        this.channel.assertQueue(this.queueInputs);
        this.channel.assertQueue(this.queueStatusRequests);
        this.channel.assertQueue(this.queueClear);
        this.channel.assertQueue(this.queueTerminate);

        // Listener for the calculation results
        this.channel.consume(this.queueInputs, (message: ConsumeMessage | null) => {
            if (message !== null) {
                this.logger.info(`Received input: ${message.content.toString()}`);
                const input: ProcessingInput = plainToClass(ProcessingInput, JSON.parse(message.content.toString()));
                this.onInputReceived(input);
                this.channel!.ack(message);
            } else {
                this.logger.warn('Consumer for sync processing response had been cancelled by server');
            }
        });

        // Listener for the status results
        this.channel.consume(this.queueStatusRequests, (message: ConsumeMessage | null) => {
            if (message !== null) {
                this.logger.info(`Received status request: ${message.content.toString()}`);
                const id: string = message.content.toString();
                this.onStatusRequested(id);
                this.channel!.ack(message);
            } else {
                this.logger.warn('Consumer for status request had been cancelled by server');
            }
        });

        // Listener for the clear command
        this.channel.consume(this.queueClear, (message: ConsumeMessage | null) => {
            if (message !== null) {
                this.logger.info('Received clear command');
                this.onClearCommand();
                this.channel!.ack(message);
            } else {
                this.logger.warn('Consumer for clear had been cancelled by server');
            }
        });

        // Listener for the terminate command
        this.channel.consume(this.queueTerminate, (message: ConsumeMessage | null) => {
            if (message !== null) {
                this.logger.info('Received terminate command');
                this.onTerminateCommand();
                this.channel!.ack(message);
            } else {
                this.logger.warn('Consumer for terminal had been cancelled by server');
            }
        });
    }

    /**
     * Send the data processing request to the engine - sync
     *
     * @param {ProcessingResult} result
     */
    public sendProcessingResult(result: ProcessingResult) {
        this.channel!.sendToQueue(this.queueOutputs, Buffer.from(JSON.stringify(result)));
    }

    /**
     * Send the data processing request to the engine - sync
     *
     * @param {ProcessingState} state
     */
    public sendProcessingState(state: ProcessingState): void {
        this.channel!.sendToQueue(this.queueStatusResponses, Buffer.from(JSON.stringify(state)));
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
