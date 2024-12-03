// @ts-check
import runtimeLogger from "@inox-tools/runtime-logger"
import { defineConfig, envField } from "astro/config"

import tailwind from "@astrojs/tailwind"

// https://astro.build/config
export default defineConfig({
  integrations: [runtimeLogger(), tailwind()],
  env: {
    schema: {
      TMDB_API_KEY: envField.string({
        startsWith: "eyJhbGc",
        context: "server",
        access: "secret",
      }),
    },
  },
})
