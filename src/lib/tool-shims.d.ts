// Ambient declarations for the standalone tool build (tsconfig.tool.json).
// The CLI tools compile outside SvelteKit, so the `$env/static/private`
// virtual module that SvelteKit normally generates is not available. Declare
// only the private env vars the server modules pulled into the tool graph use.
declare module "$env/static/private" {
  export const S3_ACCESS_KEY: string;
  export const S3_REGION: string;
  export const S3_SECRET_KEY: string;
  export const S3_SERVICE_URL: string;
  export const S3_BUCKET: string;
}
