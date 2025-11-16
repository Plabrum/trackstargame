/**
 * GET /api/openapi
 *
 * Serves the OpenAPI specification for the Trackstar API.
 * Can be used with Swagger UI, Postman, or to generate typed clients.
 */

import { NextResponse } from 'next/server';
import { openApiDocument } from '@/lib/api/openapi';

export async function GET() {
  return NextResponse.json(openApiDocument, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}
