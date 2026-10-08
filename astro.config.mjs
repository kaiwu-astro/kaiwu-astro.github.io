import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://wukai.work",
  output: "static",
  build: {
    format: "preserve"
  }
});
