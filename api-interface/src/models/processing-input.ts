import { IsNotEmpty, IsString, Max, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

export class ProcessingInput {
    @IsNotEmpty()
    @IsString()
    readonly id?: string;

    @IsNotEmpty()
    @IsString()
    readonly name?: string;

    @IsNotEmpty()
    @IsString()
    readonly surname?: string;

    @IsNotEmpty()
    @IsInt()
    @Max(150)
    @Transform((input) => parseInt(input.value, 10), { toClassOnly: true })
    readonly age?: number;
}
