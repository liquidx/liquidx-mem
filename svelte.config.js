import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const vercelConfig = {
  runtime: "nodejs22.x",
  regions: ["sfo1"]
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(vercelConfig)
  }
};

export default config;
