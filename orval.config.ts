/**
 * Orval Configuration
 *
 * Generates a fully-typed TypeScript client from the OpenAPI spec.
 * Run: pnpm orval
 */

import { defineConfig } from 'orval';

export default defineConfig({
  trackstar: {
    input: {
      target: './lib/api/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './lib/api/client.ts',
      schemas: './lib/api/model',
      client: 'react-query',
      mock: false,
      override: {
        query: {
          signal: true,
        },
        mutator: {
          path: './lib/api/mutator.ts',
          name: 'customFetch',
        },
      },
    },
  },
});
