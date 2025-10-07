// config/vite.config.js
import vue from "file:///D:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///D:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
import { fileURLToPath } from "node:url";
import AutoImport from "file:///D:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/node_modules/unplugin-auto-import/dist/vite.js";
import Components from "file:///D:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/node_modules/unplugin-vue-components/dist/vite.js";
import { defineConfig } from "file:///D:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/node_modules/vite/dist/node/index.js";
import vuetify from "file:///D:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/node_modules/vite-plugin-vuetify/dist/index.mjs";
import svgLoader from "file:///D:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/node_modules/vite-svg-loader/index.js";
import path from "path";
var __vite_injected_original_import_meta_url = "file:///D:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/config/vite.config.js";
var vite_config_default = defineConfig({
  plugins: [
    {
      name: "debug-resolver",
      configResolved(config) {
        console.log("--- Diagn\xF3stico de Aliases ---");
        const aliases = config.resolve.alias;
        if (Array.isArray(aliases)) {
          const coreAlias = aliases.find((a) => a.find === "@core");
          const layoutsAlias = aliases.find((a) => a.find === "@layouts");
          const stylesAlias = aliases.find((a) => a.find === "@styles");
          console.log("Caminho para @core:", coreAlias ? coreAlias.replacement : "N\xE3o encontrado");
          console.log("Caminho para @layouts:", layoutsAlias ? layoutsAlias.replacement : "N\xE3o encontrado");
          console.log("Caminho para @styles:", stylesAlias ? stylesAlias.replacement : "N\xE3o encontrado");
        }
        console.log("------------------------------");
      }
    },
    vue(),
    vueJsx(),
    vuetify({
      styles: {
        configFile: "src/assets/styles/variables/_vuetify.scss"
      }
    }),
    Components({
      dirs: ["src/@core/components", "src/components"],
      dts: true,
      resolvers: [
        (componentName) => {
          if (componentName === "VueApexCharts")
            return { name: "default", from: "vue3-apexcharts", as: "VueApexCharts" };
        }
      ]
    }),
    AutoImport({
      imports: ["vue", "vue-router", "@vueuse/core", "@vueuse/math", "pinia"],
      vueTemplate: true,
      ignore: ["useCookies", "useStorage"],
      eslintrc: {
        enabled: true,
        filepath: "./.eslintrc-auto-import.json"
      }
    }),
    svgLoader()
  ],
  define: { "process.env": {} },
  resolve: {
    alias: {
      "@": path.resolve(path.dirname(fileURLToPath(__vite_injected_original_import_meta_url)), "..", "src"),
      "@core": path.resolve(path.dirname(fileURLToPath(__vite_injected_original_import_meta_url)), "..", "src", "@core"),
      "@layouts": path.resolve(path.dirname(fileURLToPath(__vite_injected_original_import_meta_url)), "..", "src", "@layouts"),
      "@images": path.resolve(path.dirname(fileURLToPath(__vite_injected_original_import_meta_url)), "..", "src", "assets", "images"),
      "@styles": path.resolve(path.dirname(fileURLToPath(__vite_injected_original_import_meta_url)), "..", "src", "assets", "styles"),
      "@configured-variables": path.resolve(path.dirname(fileURLToPath(__vite_injected_original_import_meta_url)), "..", "src", "assets", "styles", "variables", "_template.scss")
    }
  },
  build: {
    chunkSizeWarningLimit: 5e3,
    minify: "terser",
    treeshake: true,
    cssMinify: false,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    }
  },
  optimizeDeps: {
    exclude: ["vuetify"],
    entries: [
      "./src/**/*.vue"
    ]
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "unsafe-none",
      "Cross-Origin-Embedder-Policy": "unsafe-none"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiY29uZmlnL3ZpdGUuY29uZmlnLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRDpcXFxcUFJPSkVUT1MgVlMgQ09ERVxcXFxSRVZBTElEQUZMT1dcXFxcRlJPTlRFTkQgRSBCQUNLRU5EXFxcXGNvbmZpZ1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcUFJPSkVUT1MgVlMgQ09ERVxcXFxSRVZBTElEQUZMT1dcXFxcRlJPTlRFTkQgRSBCQUNLRU5EXFxcXGNvbmZpZ1xcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovUFJPSkVUT1MlMjBWUyUyMENPREUvUkVWQUxJREFGTE9XL0ZST05URU5EJTIwRSUyMEJBQ0tFTkQvY29uZmlnL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXG5pbXBvcnQgdnVlSnN4IGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZS1qc3gnXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnXG5pbXBvcnQgQXV0b0ltcG9ydCBmcm9tICd1bnBsdWdpbi1hdXRvLWltcG9ydC92aXRlJ1xuaW1wb3J0IENvbXBvbmVudHMgZnJvbSAndW5wbHVnaW4tdnVlLWNvbXBvbmVudHMvdml0ZSdcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgdnVldGlmeSBmcm9tICd2aXRlLXBsdWdpbi12dWV0aWZ5J1xuaW1wb3J0IHN2Z0xvYWRlciBmcm9tICd2aXRlLXN2Zy1sb2FkZXInXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6ICdkZWJ1Zy1yZXNvbHZlcicsXG4gICAgICAgICAgICBjb25maWdSZXNvbHZlZChjb25maWcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnLS0tIERpYWduXHUwMEYzc3RpY28gZGUgQWxpYXNlcyAtLS0nKTtcbiAgICAgICAgICAgICAgICBjb25zdCBhbGlhc2VzID0gY29uZmlnLnJlc29sdmUuYWxpYXM7XG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYWxpYXNlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29yZUFsaWFzID0gYWxpYXNlcy5maW5kKGEgPT4gYS5maW5kID09PSAnQGNvcmUnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGF5b3V0c0FsaWFzID0gYWxpYXNlcy5maW5kKGEgPT4gYS5maW5kID09PSAnQGxheW91dHMnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3R5bGVzQWxpYXMgPSBhbGlhc2VzLmZpbmQoYSA9PiBhLmZpbmQgPT09ICdAc3R5bGVzJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0NhbWluaG8gcGFyYSBAY29yZTonLCBjb3JlQWxpYXMgPyBjb3JlQWxpYXMucmVwbGFjZW1lbnQgOiAnTlx1MDBFM28gZW5jb250cmFkbycpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ2FtaW5obyBwYXJhIEBsYXlvdXRzOicsIGxheW91dHNBbGlhcyA/IGxheW91dHNBbGlhcy5yZXBsYWNlbWVudCA6ICdOXHUwMEUzbyBlbmNvbnRyYWRvJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDYW1pbmhvIHBhcmEgQHN0eWxlczonLCBzdHlsZXNBbGlhcyA/IHN0eWxlc0FsaWFzLnJlcGxhY2VtZW50IDogJ05cdTAwRTNvIGVuY29udHJhZG8nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLScpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgdnVlKCksXG4gICAgICAgIHZ1ZUpzeCgpLFxuICAgICAgICB2dWV0aWZ5KHtcbiAgICAgICAgICAgIHN0eWxlczoge1xuICAgICAgICAgICAgICAgIGNvbmZpZ0ZpbGU6ICdzcmMvYXNzZXRzL3N0eWxlcy92YXJpYWJsZXMvX3Z1ZXRpZnkuc2NzcycsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KSxcbiAgICAgICAgQ29tcG9uZW50cyh7XG4gICAgICAgICAgICBkaXJzOiBbJ3NyYy9AY29yZS9jb21wb25lbnRzJywgJ3NyYy9jb21wb25lbnRzJ10sXG4gICAgICAgICAgICBkdHM6IHRydWUsXG4gICAgICAgICAgICByZXNvbHZlcnM6IFtcbiAgICAgICAgICAgICAgICBjb21wb25lbnROYW1lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudE5hbWUgPT09ICdWdWVBcGV4Q2hhcnRzJylcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6ICdkZWZhdWx0JywgZnJvbTogJ3Z1ZTMtYXBleGNoYXJ0cycsIGFzOiAnVnVlQXBleENoYXJ0cycgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9KSxcbiAgICAgICAgQXV0b0ltcG9ydCh7XG4gICAgICAgICAgICBpbXBvcnRzOiBbJ3Z1ZScsICd2dWUtcm91dGVyJywgJ0B2dWV1c2UvY29yZScsICdAdnVldXNlL21hdGgnLCAncGluaWEnXSxcbiAgICAgICAgICAgIHZ1ZVRlbXBsYXRlOiB0cnVlLFxuICAgICAgICAgICAgaWdub3JlOiBbJ3VzZUNvb2tpZXMnLCAndXNlU3RvcmFnZSddLFxuICAgICAgICAgICAgZXNsaW50cmM6IHtcbiAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgIGZpbGVwYXRoOiAnLi8uZXNsaW50cmMtYXV0by1pbXBvcnQuanNvbicsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KSxcbiAgICAgICAgc3ZnTG9hZGVyKCksXG4gICAgXSxcbiAgICBkZWZpbmU6IHsgJ3Byb2Nlc3MuZW52Jzoge30gfSxcbiAgICByZXNvbHZlOiB7XG4gICAgICAgIGFsaWFzOiB7XG4gICAgICAgICAgICAnQCc6IHBhdGgucmVzb2x2ZShwYXRoLmRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKSwgJy4uJywgJ3NyYycpLFxuICAgICAgICAgICAgJ0Bjb3JlJzogcGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpLCAnLi4nLCAnc3JjJywgJ0Bjb3JlJyksXG4gICAgICAgICAgICAnQGxheW91dHMnOiBwYXRoLnJlc29sdmUocGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSksICcuLicsICdzcmMnLCAnQGxheW91dHMnKSxcbiAgICAgICAgICAgICdAaW1hZ2VzJzogcGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpLCAnLi4nLCAnc3JjJywgJ2Fzc2V0cycsICdpbWFnZXMnKSxcbiAgICAgICAgICAgICdAc3R5bGVzJzogcGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpLCAnLi4nLCAnc3JjJywgJ2Fzc2V0cycsICdzdHlsZXMnKSxcbiAgICAgICAgICAgICdAY29uZmlndXJlZC12YXJpYWJsZXMnOiBwYXRoLnJlc29sdmUocGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSksICcuLicsICdzcmMnLCAnYXNzZXRzJywgJ3N0eWxlcycsICd2YXJpYWJsZXMnLCAnX3RlbXBsYXRlLnNjc3MnKSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgYnVpbGQ6IHtcbiAgICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiA1MDAwLFxuICAgICAgICBtaW5pZnk6ICd0ZXJzZXInLFxuICAgICAgICB0cmVlc2hha2U6IHRydWUsXG4gICAgICAgIGNzc01pbmlmeTogZmFsc2UsXG4gICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgIG91dHB1dDoge1xuICAgICAgICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiBgYXNzZXRzL1tuYW1lXS1baGFzaF0uanNgLFxuICAgICAgICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiBgYXNzZXRzL1tuYW1lXS1baGFzaF0uanNgLFxuICAgICAgICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiBgYXNzZXRzL1tuYW1lXS1baGFzaF0uW2V4dF1gXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgICBleGNsdWRlOiBbJ3Z1ZXRpZnknXSxcbiAgICAgICAgZW50cmllczogW1xuICAgICAgICAgICAgJy4vc3JjLyoqLyoudnVlJyxcbiAgICAgICAgXSxcbiAgICB9LFxuICAgIHNlcnZlcjoge1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAnQ3Jvc3MtT3JpZ2luLU9wZW5lci1Qb2xpY3knOiAndW5zYWZlLW5vbmUnLFxuICAgICAgICAgICAgJ0Nyb3NzLU9yaWdpbi1FbWJlZGRlci1Qb2xpY3knOiAndW5zYWZlLW5vbmUnXG4gICAgICAgIH1cbiAgICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFrWCxPQUFPLFNBQVM7QUFDbFksT0FBTyxZQUFZO0FBQ25CLFNBQVMscUJBQXFCO0FBQzlCLE9BQU8sZ0JBQWdCO0FBQ3ZCLE9BQU8sZ0JBQWdCO0FBQ3ZCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sYUFBYTtBQUNwQixPQUFPLGVBQWU7QUFDdEIsT0FBTyxVQUFVO0FBUm9OLElB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
