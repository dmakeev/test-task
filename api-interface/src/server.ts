import express from 'express';
import winston from 'winston';
import bodyParser from 'body-parser';
import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

import { ProcessingInput } from './models/processing-input.js';
import { ProcessingTransport, createTransport } from './transports/transport.js';

class ApiEngine {
    private readonly logger: winston.Logger;
    private readonly httpPort: number;
    private readonly app: express.Application;
    private readonly transport: ProcessingTransport;

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
        this.transport = createTransport();
        this.httpPort =
            typeof process.env['HTTP_PORT'] != 'undefined' ? parseInt(process.env['HTTP_PORT'] as string) : 8890;
        this.app = express();
        this.app.use(bodyParser.urlencoded({ extended: false }));
        this.app.use(bodyParser.json());
    }

    public async startServer(): Promise<void> {
        await this.transport.init();
        await this.fillRoutes();

        // Init the server
        this.app.listen(this.httpPort, () => {
            this.logger.info('Application interface is started at ' + this.httpPort + ' port');
        });
    }

    private async fillRoutes(): Promise<void> {
        this.app.get('/status/:id', async (req: express.Request, res: express.Response) => {
            console.log(req.params.id);
            if (typeof req.params.id === 'undefined') {
                res.status(400).json({ error: 'Provide an ID of the process, please' });
                return;
            }
            const status = await this.transport.requestForStatus(req.params.id);
            res.json(status);
        });

        this.app.post('/sync', (req: express.Request<ProcessingInput>, res: express.Response) => {
            const input: ProcessingInput = plainToClass(ProcessingInput, req.body);
            validate(input).then(async (errors: ValidationError[]) => {
                if (errors.length > 0) {
                    if (errors[0].constraints !== undefined) {
                        res.status(400).json({ error: Object.values(errors[0].constraints)[0] });
                    } else if (errors[0] !== undefined) {
                        res.status(400).json({ error: errors[0] });
                    } else {
                        res.status(400).json({ error: 'Input validation error' });
                    }
                } else {
                    const result = await this.transport.sendProcessingRequestSync(input);
                    if (!result.error) {
                        res.status(202).json(result);
                    } else {
                        res.status(500).json(result);
                    }
                }
            });
        });

        this.app.post('/async', (req: express.Request<ProcessingInput>, res: express.Response) => {
            const input: ProcessingInput = plainToClass(ProcessingInput, req.body);
            validate(input).then((errors: ValidationError[]) => {
                if (errors.length > 0) {
                    if (errors[0].constraints !== undefined) {
                        res.status(400).json({ error: Object.values(errors[0].constraints)[0] });
                    } else if (errors[0] !== undefined) {
                        res.status(400).json({ error: errors[0] });
                    } else {
                        res.status(400).json({ error: 'Input validation error' });
                    }
                } else {
                    this.transport.sendProcessingRequestAsync(input);
                    res.status(201).json({ id: input.id });
                }
            });
        });

        this.app.delete('/clear', (req: express.Request<ProcessingInput>, res: express.Response) => {
            this.transport.clear();
            res.status(201).json({});
        });

        this.app.delete('/terminate', (req: express.Request<ProcessingInput>, res: express.Response) => {
            this.transport.terminate();
            res.status(201).json({});
        });
    }
}

(async () => {
    const engine = new ApiEngine();
    await engine.startServer();
})();
