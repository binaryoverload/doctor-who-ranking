// @ts-check
import runtimeLogger from "@inox-tools/runtime-logger"
import { defineConfig } from "astro/config"

import tailwind from "@astrojs/tailwind"

// https://astro.build/config
export default defineConfig({
  integrations: [runtimeLogger(), tailwind()],
})
