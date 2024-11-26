/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly TMDB_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
