import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'http://localhost:8000/api/v1/openapi.json',
  output: './generated',
  client: 'fetch',
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
    '@hey-api/tanstack-query'
  ]
});
