/**
 * Typed `import.meta.env` access so environment variables never resolve to `any`.
 * All public client variables must be prefixed with `VITE_` to be exposed by Vite.
 */
interface ImportMetaEnv {
  /** Base URL of the backend API (empty string = same origin). */
  readonly VITE_API_URL?: string;
  /** Optional Google PageSpeed Insights API key (raises the anonymous rate limit). */
  readonly VITE_PAGESPEED_API_KEY?: string;
  /** Endpoint overrides consumed by the existing audit agent. */
  readonly VITE_AUDIT_ENDPOINT?: string;
  readonly VITE_INTAKE_ENDPOINT?: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
