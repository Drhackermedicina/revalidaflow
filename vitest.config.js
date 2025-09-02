import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [], // Add setup files here if needed
    css: {
      // This will mock CSS imports, preventing the TypeError
      // You can also specify a more granular configuration if needed
      // For example, to only mock .css files:
      // include: /\.css$/,
      // modules: { ... }
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/@core', import.meta.url)),
      '@layouts': fileURLToPath(new URL('./src/@layouts', import.meta.url)),
      '@images': fileURLToPath(new URL('./src/assets/images/', import.meta.url)),
      '@styles': fileURLToPath(new URL('./src/assets/styles/', import.meta.url)),
      '@configured-variables': fileURLToPath(new URL('./src/assets/styles/variables/_template.scss', import.meta.url)),
    },
  },
});
