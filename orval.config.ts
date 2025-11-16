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
      target: './lib/api/openapi.ts',
      // Alternatively, use the served endpoint:
      // target: 'http://localhost:3000/api/openapi',
    },
    output: {
      mode: 'tags-split',
      target: './lib/api/client.ts',
      schemas: './lib/api/model',
      client: 'react-query',
      mock: false,
      override: {
        mutator: {
          path: './lib/api/mutator.ts',
          name: 'customFetch',
        },
      },
    },
  },
});
