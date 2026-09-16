import type { PipeTransform } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { z } from 'zod';

/** Parses `value` with `schema`. A thrown `ZodError` propagates to whatever exception filter is installed. */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodType) {}

  transform(value: unknown): unknown {
    return this.schema.parse(value);
  }
}
