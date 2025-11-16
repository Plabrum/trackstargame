/**
 * Extended Zod instance with OpenAPI support
 * Import this instead of 'zod' when defining OpenAPI schemas
 */

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z as zodOriginal } from 'zod';

extendZodWithOpenApi(zodOriginal);

export const z = zodOriginal;
export type { z as ZodType } from 'zod';
