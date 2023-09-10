import { ProcessingInput } from '../models/processing-input.js';
import { ProcessingResult } from '../models/processing-result.js';
import { ProcessingState, ProcessingStatus } from '../models/processing-state.js';

export class ChthonicEngine {
    private readonly processes: Map<string, ProcessingState> = new Map<string, ProcessingState>();
    private readonly processingDuration: number = 10000;
    private readonly resolvers: Map<string, (result: ProcessingResult) => void> = new Map<
        string,
        (result: ProcessingResult) => void
    >();

    /**
     * Do something usefull - some part of looong business logic
     *
     * @param {ProcessingInput} input
     * @returns {Promise<ProcessingResult>}
     */
    public async doSomething(input: ProcessingInput): Promise<ProcessingResult> {
        const id: string = input.id!;
        if (this.processes.has(id)) {
            const result = new ProcessingResult(id, null, 'Another request with the same ID was processed before');
            this.processes.get(id)!.status = ProcessingStatus.Error;
            this.processes.get(id)!.result = result;
            return result;
        }
        const state = new ProcessingState(id, ProcessingStatus.New);
        this.processes.set(id, state);
        return new Promise((resolve: (result: ProcessingResult) => void) => {
            this.resolvers.set(id, resolve);
            this.processes.get(id)!.status = ProcessingStatus.Processing;
            setTimeout(() => {
                this.resolvers.delete(id);
                if (!this.processes.has(id)) {
                    this.processes.get(id)!.status = ProcessingStatus.Error;
                    const result = new ProcessingResult(id, null, 'Looks like this processing was cancelled');
                    resolve(result);
                    return;
                }
                const importantResultValue: number = Math.round(50 * Math.random());
                this.processes.get(id)!.status = ProcessingStatus.Done;
                const result = new ProcessingResult(id, importantResultValue);
                this.processes.get(id)!.result = result;
                resolve(result);
            }, this.processingDuration);
        });
    }

    /**
     * Get the state of the task
     *
     * @param {string} id
     * @returns {ProcessingState}
     */
    public getState(id: string): ProcessingState {
        if (this.processes.has(id)) {
            return this.processes.get(id)!;
        } else {
            return new ProcessingState(id, ProcessingStatus.Error, undefined, 'Task not found');
        }
    }

    /**
     * Remove all finished tasks
     *
     */
    public clear(): void {
        this.processes.forEach((state, id) => {
            if ([ProcessingStatus.Done, ProcessingStatus.Error].includes(state.status)) {
                this.processes.delete(id);
            }
        });
    }

    /**
     * Terminate all running tasks
     *
     */
    public terminate(): void {
        this.processes.forEach((state, id) => {
            if (state.status === ProcessingStatus.Processing) {
                const result = new ProcessingResult(id, null, 'Process was terminated');
                if (this.resolvers.has(id)) {
                    this.resolvers.get(id)!(result);
                    this.resolvers.delete(id);
                }
                this.processes.delete(id);
            }
        });
    }
}
