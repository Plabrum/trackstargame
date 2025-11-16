/**
 * Generate OpenAPI spec JSON file for Orval
 */

import { writeFileSync } from 'fs';
import { openApiDocument } from '../lib/api/openapi';

const outputPath = './lib/api/openapi.json';

writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2), 'utf-8');

console.log(`✅ OpenAPI spec generated at ${outputPath}`);
