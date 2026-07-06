import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://about.wukai.work",
  output: "static",
  build: {
    format: "preserve"
  }
});
