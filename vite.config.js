import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [vue({
    template: {
      compilerOptions: {
        compatConfig: {
          MODE: 2
        }
      }
    }
  })],
  server: {
    host: '127.0.0.1',
    port: 12000,
  },
  resolve: {
    alias: {
      '@': resolve('./src'),
      vue: '@vue/compat'
    },
  },
})
