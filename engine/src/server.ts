import winston from 'winston';

import { EngineTransport, createTransport } from './transports/transport.js';
import { ProcessingInput } from './models/processing-input.js';
import { ChthonicEngine } from './engine/engine.js';

class ApiEngine {
    private readonly logger: winston.Logger;
    private readonly transport: EngineTransport;
    private readonly engine: ChthonicEngine;

    constructor() {
        this.logger = winston.createLogger({
            format: winston.format.combine(winston.format.simple()),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: './logs/error2.log', level: 'error' }),
                new winston.transports.File({ filename: './logs/combined.log' }),
            ],
        });
        // Catch all uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error(error);
            this.logger.error(error.message);
        });
        // Create engine
        this.engine = new ChthonicEngine();
        // Create transport
        this.transport = createTransport();
    }

    public async startServer(): Promise<void> {
        await this.transport.init();
        // On processing input received - start processing
        this.transport.onInputReceived = async (input: ProcessingInput) => {
            const result = await this.engine.doSomething(input);
            this.transport.sendProcessingResult(result);
        };
        // On status request received - return the current state
        this.transport.onStatusRequested = (id: string) => {
            const state = this.engine.getState(id);
            this.transport.sendProcessingState(state);
        };
        // Clear command received
        this.transport.onClearCommand = () => {
            this.engine.clear();
        };
        // Terminate command received
        this.transport.onTerminateCommand = () => {
            this.engine.terminate();
        };
    }
}

(async () => {
    const engine = new ApiEngine();
    await engine.startServer();
})();
