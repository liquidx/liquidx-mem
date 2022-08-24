import { defineConfig } from 'vite'
import { createVuePlugin } from 'vite-plugin-vue2'
import { resolve } from 'path';

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [createVuePlugin()],
  server: {
    host: '127.0.0.1',
    port: 12000,
  },
  resolve: {
    alias: {
      '@': resolve('./src'),
    },
  },
})
