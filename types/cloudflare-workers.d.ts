declare module "cloudflare:workers" {
  export const env: {
    DB?: unknown;
  };
}

type D1Database = any;

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}
