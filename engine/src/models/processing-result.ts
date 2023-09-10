export class ProcessingResult {
    constructor(
        public readonly id: string,
        public readonly ageOfFirstDrivingIncident: number | null,
        public readonly error?: string
    ) {}
}
