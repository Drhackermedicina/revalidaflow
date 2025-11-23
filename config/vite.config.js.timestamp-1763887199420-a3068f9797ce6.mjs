// config/vite.config.js
import vue from "file:///D:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///D:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
import { fileURLToPath } from "node:url";
import legacy from "file:///D:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/node_modules/@vitejs/plugin-legacy/dist/index.mjs";
import AutoImport from "file:///D:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/node_modules/unplugin-auto-import/dist/vite.js";
import Components from "file:///D:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/node_modules/unplugin-vue-components/dist/vite.js";
import { defineConfig } from "file:///D:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/node_modules/vite/dist/node/index.js";
import vuetify from "file:///D:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/node_modules/vite-plugin-vuetify/dist/index.mjs";
import svgLoader from "file:///D:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/node_modules/vite-svg-loader/index.js";
import path from "path";
var __vite_injected_original_import_meta_url = "file:///d:/PROJETOS%20VS%20CODE/REVALIDAFLOW/FRONTEND%20E%20BACKEND/config/vite.config.js";
var vite_config_default = defineConfig({
  logLevel: "info",
  plugins: [
    legacy({
      targets: ["defaults", "not IE 11"]
    }),
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
    chunkSizeWarningLimit: 1e3,
    // Increased to reduce warnings
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.debug"]
      }
    },
    treeshake: true,
    cssMinify: true,
    // Enable CSS minification
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/chunk-[name]-[hash].js`,
        assetFileNames: `assets/asset-[name]-[hash].[ext]`,
        // Custom chunk strategy
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("@vue/") || id.includes("vue") && !id.includes("vuetify")) {
              return "vue-core";
            }
            if (id.includes("vuetify")) {
              return "vuetify";
            }
            if (id.includes("firebase/app")) {
              return "firebase-app";
            }
            if (id.includes("firebase/auth")) {
              return "firebase-auth";
            }
            if (id.includes("firebase/firestore")) {
              return "firebase-firestore";
            }
            if (id.includes("firebase/storage")) {
              return "firebase-storage";
            }
            if (id.includes("firebase/")) {
              return "firebase-other";
            }
            if (id.includes("@tensorflow/")) {
              return "tensorflow";
            }
            if (id.includes("lottie-web")) {
              return "lottie";
            }
            if (id.includes("apexcharts") || id.includes("vue3-apexcharts")) {
              return "charts";
            }
            if (id.includes("@tiptap/")) {
              return "editor";
            }
            if (id.includes("socket.io-client")) {
              return "socket";
            }
            if (id.includes("@vueuse/")) {
              return "vueuse";
            }
            if (id.includes("lodash-es")) {
              return "lodash";
            }
            if (id.includes("marked")) {
              return "markdown";
            }
            if (id.includes("browser-image-compression")) {
              return "image-utils";
            }
            return "vendor";
          }
          if (id.includes("src/")) {
            if (id.includes("views/simulation/") || id.includes("SimulationView")) {
              return "simulation-view";
            }
            if (id.includes("views/admin/") || id.includes("AdminView") || id.includes("AdminUpload") || id.includes("EditStationView")) {
              return "admin-view";
            }
            if (id.includes("components/Simulation") || id.includes("components/simulation/")) {
              return "simulation-components";
            }
            if (id.includes("components/dashboard/")) {
              return "dashboard-components";
            }
            if (id.includes("components/Chat") || id.includes("components/chat/")) {
              return "chat-components";
            }
          }
        }
      }
    },
    reportCompressedSize: false,
    // Skip gzip report (faster build)
    sourcemap: false
    // Disable sourcemaps in production
  },
  optimizeDeps: {
    exclude: ["vuetify"],
    entries: [
      "./src/**/*.vue"
    ]
  },
  server: {
    open: true,
    // Abre automaticamente o navegador quando iniciar o servidor de desenvolvimento
    headers: {
      // Removido Cross-Origin-Opener-Policy para evitar erros no login Google
      // 'Cross-Origin-Opener-Policy': 'unsafe-none',
      // 'Cross-Origin-Embedder-Policy': 'unsafe-none'
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiY29uZmlnL3ZpdGUuY29uZmlnLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiZDpcXFxcUFJPSkVUT1MgVlMgQ09ERVxcXFxSRVZBTElEQUZMT1dcXFxcRlJPTlRFTkQgRSBCQUNLRU5EXFxcXGNvbmZpZ1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiZDpcXFxcUFJPSkVUT1MgVlMgQ09ERVxcXFxSRVZBTElEQUZMT1dcXFxcRlJPTlRFTkQgRSBCQUNLRU5EXFxcXGNvbmZpZ1xcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vZDovUFJPSkVUT1MlMjBWUyUyMENPREUvUkVWQUxJREFGTE9XL0ZST05URU5EJTIwRSUyMEJBQ0tFTkQvY29uZmlnL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXG5pbXBvcnQgdnVlSnN4IGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZS1qc3gnXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnXG5pbXBvcnQgbGVnYWN5IGZyb20gJ0B2aXRlanMvcGx1Z2luLWxlZ2FjeSdcbmltcG9ydCBBdXRvSW1wb3J0IGZyb20gJ3VucGx1Z2luLWF1dG8taW1wb3J0L3ZpdGUnXG5pbXBvcnQgQ29tcG9uZW50cyBmcm9tICd1bnBsdWdpbi12dWUtY29tcG9uZW50cy92aXRlJ1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCB2dWV0aWZ5IGZyb20gJ3ZpdGUtcGx1Z2luLXZ1ZXRpZnknXG5pbXBvcnQgc3ZnTG9hZGVyIGZyb20gJ3ZpdGUtc3ZnLWxvYWRlcidcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICAgIGxvZ0xldmVsOiAnaW5mbycsXG4gICAgcGx1Z2luczogW1xuICAgICAgICBsZWdhY3koe1xuICAgICAgICAgICAgdGFyZ2V0czogWydkZWZhdWx0cycsICdub3QgSUUgMTEnXVxuICAgICAgICB9KSxcbiAgICAgICAgdnVlKCksXG4gICAgICAgIHZ1ZUpzeCgpLFxuICAgICAgICB2dWV0aWZ5KHtcbiAgICAgICAgICAgIHN0eWxlczoge1xuICAgICAgICAgICAgICAgIGNvbmZpZ0ZpbGU6ICdzcmMvYXNzZXRzL3N0eWxlcy92YXJpYWJsZXMvX3Z1ZXRpZnkuc2NzcycsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KSxcbiAgICAgICAgQ29tcG9uZW50cyh7XG4gICAgICAgICAgICBkaXJzOiBbJ3NyYy9AY29yZS9jb21wb25lbnRzJywgJ3NyYy9jb21wb25lbnRzJ10sXG4gICAgICAgICAgICBkdHM6IHRydWUsXG4gICAgICAgICAgICByZXNvbHZlcnM6IFtcbiAgICAgICAgICAgICAgICBjb21wb25lbnROYW1lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudE5hbWUgPT09ICdWdWVBcGV4Q2hhcnRzJylcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6ICdkZWZhdWx0JywgZnJvbTogJ3Z1ZTMtYXBleGNoYXJ0cycsIGFzOiAnVnVlQXBleENoYXJ0cycgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9KSxcbiAgICAgICAgQXV0b0ltcG9ydCh7XG4gICAgICAgICAgICBpbXBvcnRzOiBbJ3Z1ZScsICd2dWUtcm91dGVyJywgJ0B2dWV1c2UvY29yZScsICdAdnVldXNlL21hdGgnLCAncGluaWEnXSxcbiAgICAgICAgICAgIHZ1ZVRlbXBsYXRlOiB0cnVlLFxuICAgICAgICAgICAgaWdub3JlOiBbJ3VzZUNvb2tpZXMnLCAndXNlU3RvcmFnZSddLFxuICAgICAgICAgICAgZXNsaW50cmM6IHtcbiAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgIGZpbGVwYXRoOiAnLi8uZXNsaW50cmMtYXV0by1pbXBvcnQuanNvbicsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KSxcbiAgICAgICAgc3ZnTG9hZGVyKCksXG4gICAgXSxcbiAgICBkZWZpbmU6IHsgJ3Byb2Nlc3MuZW52Jzoge30gfSxcbiAgICByZXNvbHZlOiB7XG4gICAgICAgIGFsaWFzOiB7XG4gICAgICAgICAgICAnQCc6IHBhdGgucmVzb2x2ZShwYXRoLmRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKSwgJy4uJywgJ3NyYycpLFxuICAgICAgICAgICAgJ0Bjb3JlJzogcGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpLCAnLi4nLCAnc3JjJywgJ0Bjb3JlJyksXG4gICAgICAgICAgICAnQGxheW91dHMnOiBwYXRoLnJlc29sdmUocGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSksICcuLicsICdzcmMnLCAnQGxheW91dHMnKSxcbiAgICAgICAgICAgICdAaW1hZ2VzJzogcGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpLCAnLi4nLCAnc3JjJywgJ2Fzc2V0cycsICdpbWFnZXMnKSxcbiAgICAgICAgICAgICdAc3R5bGVzJzogcGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpLCAnLi4nLCAnc3JjJywgJ2Fzc2V0cycsICdzdHlsZXMnKSxcbiAgICAgICAgICAgICdAY29uZmlndXJlZC12YXJpYWJsZXMnOiBwYXRoLnJlc29sdmUocGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSksICcuLicsICdzcmMnLCAnYXNzZXRzJywgJ3N0eWxlcycsICd2YXJpYWJsZXMnLCAnX3RlbXBsYXRlLnNjc3MnKSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgYnVpbGQ6IHtcbiAgICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLCAvLyBJbmNyZWFzZWQgdG8gcmVkdWNlIHdhcm5pbmdzXG4gICAgICAgIG1pbmlmeTogJ3RlcnNlcicsXG4gICAgICAgIHRlcnNlck9wdGlvbnM6IHtcbiAgICAgICAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgICAgICAgICAgZHJvcF9jb25zb2xlOiB0cnVlLCAvLyBSZW1vdmUgY29uc29sZS5sb2cgaW4gcHJvZHVjdGlvblxuICAgICAgICAgICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWUsXG4gICAgICAgICAgICAgICAgcHVyZV9mdW5jczogWydjb25zb2xlLmxvZycsICdjb25zb2xlLmluZm8nLCAnY29uc29sZS5kZWJ1ZyddXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHRyZWVzaGFrZTogdHJ1ZSxcbiAgICAgICAgY3NzTWluaWZ5OiB0cnVlLCAvLyBFbmFibGUgQ1NTIG1pbmlmaWNhdGlvblxuICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAgICAgICBlbnRyeUZpbGVOYW1lczogYGFzc2V0cy9bbmFtZV0tW2hhc2hdLmpzYCxcbiAgICAgICAgICAgICAgICBjaHVua0ZpbGVOYW1lczogYGFzc2V0cy9jaHVuay1bbmFtZV0tW2hhc2hdLmpzYCxcbiAgICAgICAgICAgICAgICBhc3NldEZpbGVOYW1lczogYGFzc2V0cy9hc3NldC1bbmFtZV0tW2hhc2hdLltleHRdYCxcbiAgICAgICAgICAgICAgICAvLyBDdXN0b20gY2h1bmsgc3RyYXRlZ3lcbiAgICAgICAgICAgICAgICBtYW51YWxDaHVua3M6IGlkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdAdnVlLycpIHx8IChpZC5pbmNsdWRlcygndnVlJykgJiYgIWlkLmluY2x1ZGVzKCd2dWV0aWZ5JykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICd2dWUtY29yZSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygndnVldGlmeScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICd2dWV0aWZ5J1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdmaXJlYmFzZS9hcHAnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnZmlyZWJhc2UtYXBwJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdmaXJlYmFzZS9hdXRoJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ2ZpcmViYXNlLWF1dGgnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2ZpcmViYXNlL2ZpcmVzdG9yZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdmaXJlYmFzZS1maXJlc3RvcmUnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2ZpcmViYXNlL3N0b3JhZ2UnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnZmlyZWJhc2Utc3RvcmFnZSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnZmlyZWJhc2UvJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ2ZpcmViYXNlLW90aGVyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdAdGVuc29yZmxvdy8nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAndGVuc29yZmxvdydcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbG90dGllLXdlYicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdsb3R0aWUnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2FwZXhjaGFydHMnKSB8fCBpZC5pbmNsdWRlcygndnVlMy1hcGV4Y2hhcnRzJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ2NoYXJ0cydcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQHRpcHRhcC8nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnZWRpdG9yJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdzb2NrZXQuaW8tY2xpZW50JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ3NvY2tldCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQHZ1ZXVzZS8nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAndnVldXNlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdsb2Rhc2gtZXMnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnbG9kYXNoJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdtYXJrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnbWFya2Rvd24nXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2Jyb3dzZXItaW1hZ2UtY29tcHJlc3Npb24nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnaW1hZ2UtdXRpbHMnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAndmVuZG9yJ1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdzcmMvJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygndmlld3Mvc2ltdWxhdGlvbi8nKSB8fCBpZC5pbmNsdWRlcygnU2ltdWxhdGlvblZpZXcnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnc2ltdWxhdGlvbi12aWV3J1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCd2aWV3cy9hZG1pbi8nKSB8fCBpZC5pbmNsdWRlcygnQWRtaW5WaWV3JykgfHwgaWQuaW5jbHVkZXMoJ0FkbWluVXBsb2FkJykgfHwgaWQuaW5jbHVkZXMoJ0VkaXRTdGF0aW9uVmlldycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdhZG1pbi12aWV3J1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdjb21wb25lbnRzL1NpbXVsYXRpb24nKSB8fCBpZC5pbmNsdWRlcygnY29tcG9uZW50cy9zaW11bGF0aW9uLycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdzaW11bGF0aW9uLWNvbXBvbmVudHMnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2NvbXBvbmVudHMvZGFzaGJvYXJkLycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdkYXNoYm9hcmQtY29tcG9uZW50cydcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnY29tcG9uZW50cy9DaGF0JykgfHwgaWQuaW5jbHVkZXMoJ2NvbXBvbmVudHMvY2hhdC8nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnY2hhdC1jb21wb25lbnRzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZW1haW5pbmcgbW9kdWxlcyBmYWxsIGJhY2sgdG8gUm9sbHVwIGRlZmF1bHRzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmVkIHRoZSBwcmV2aW91cyBhcHAtdXRpbHMgYW5kIGFwcC1zdG9yZXMgYnVja2V0cyB0byBhdm9pZCBjaXJjdWxhciBjaHVuayBkZXBlbmRlbmNpZXNcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcmVwb3J0Q29tcHJlc3NlZFNpemU6IGZhbHNlLCAvLyBTa2lwIGd6aXAgcmVwb3J0IChmYXN0ZXIgYnVpbGQpXG4gICAgICAgIHNvdXJjZW1hcDogZmFsc2UgLy8gRGlzYWJsZSBzb3VyY2VtYXBzIGluIHByb2R1Y3Rpb25cbiAgICB9LFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgICBleGNsdWRlOiBbJ3Z1ZXRpZnknXSxcbiAgICAgICAgZW50cmllczogW1xuICAgICAgICAgICAgJy4vc3JjLyoqLyoudnVlJyxcbiAgICAgICAgXSxcbiAgICB9LFxuICAgIHNlcnZlcjoge1xuICAgICAgICBvcGVuOiB0cnVlLCAvLyBBYnJlIGF1dG9tYXRpY2FtZW50ZSBvIG5hdmVnYWRvciBxdWFuZG8gaW5pY2lhciBvIHNlcnZpZG9yIGRlIGRlc2Vudm9sdmltZW50b1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAvLyBSZW1vdmlkbyBDcm9zcy1PcmlnaW4tT3BlbmVyLVBvbGljeSBwYXJhIGV2aXRhciBlcnJvcyBubyBsb2dpbiBHb29nbGVcbiAgICAgICAgICAgIC8vICdDcm9zcy1PcmlnaW4tT3BlbmVyLVBvbGljeSc6ICd1bnNhZmUtbm9uZScsXG4gICAgICAgICAgICAvLyAnQ3Jvc3MtT3JpZ2luLUVtYmVkZGVyLVBvbGljeSc6ICd1bnNhZmUtbm9uZSdcbiAgICAgICAgfVxuICAgIH1cbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWtYLE9BQU8sU0FBUztBQUNsWSxPQUFPLFlBQVk7QUFDbkIsU0FBUyxxQkFBcUI7QUFDOUIsT0FBTyxZQUFZO0FBQ25CLE9BQU8sZ0JBQWdCO0FBQ3ZCLE9BQU8sZ0JBQWdCO0FBQ3ZCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sYUFBYTtBQUNwQixPQUFPLGVBQWU7QUFDdEIsT0FBTyxVQUFVO0FBVG9OLElBQU0sMkNBQTJDO0FBWXRSLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQ3hCLFVBQVU7QUFBQSxFQUNWLFNBQVM7QUFBQSxJQUNMLE9BQU87QUFBQSxNQUNILFNBQVMsQ0FBQyxZQUFZLFdBQVc7QUFBQSxJQUNyQyxDQUFDO0FBQUEsSUFDRCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsTUFDSixRQUFRO0FBQUEsUUFDSixZQUFZO0FBQUEsTUFDaEI7QUFBQSxJQUNKLENBQUM7QUFBQSxJQUNELFdBQVc7QUFBQSxNQUNQLE1BQU0sQ0FBQyx3QkFBd0IsZ0JBQWdCO0FBQUEsTUFDL0MsS0FBSztBQUFBLE1BQ0wsV0FBVztBQUFBLFFBQ1AsbUJBQWlCO0FBQ2IsY0FBSSxrQkFBa0I7QUFDbEIsbUJBQU8sRUFBRSxNQUFNLFdBQVcsTUFBTSxtQkFBbUIsSUFBSSxnQkFBZ0I7QUFBQSxRQUMvRTtBQUFBLE1BQ0o7QUFBQSxJQUNKLENBQUM7QUFBQSxJQUNELFdBQVc7QUFBQSxNQUNQLFNBQVMsQ0FBQyxPQUFPLGNBQWMsZ0JBQWdCLGdCQUFnQixPQUFPO0FBQUEsTUFDdEUsYUFBYTtBQUFBLE1BQ2IsUUFBUSxDQUFDLGNBQWMsWUFBWTtBQUFBLE1BQ25DLFVBQVU7QUFBQSxRQUNOLFNBQVM7QUFBQSxRQUNULFVBQVU7QUFBQSxNQUNkO0FBQUEsSUFDSixDQUFDO0FBQUEsSUFDRCxVQUFVO0FBQUEsRUFDZDtBQUFBLEVBQ0EsUUFBUSxFQUFFLGVBQWUsQ0FBQyxFQUFFO0FBQUEsRUFDNUIsU0FBUztBQUFBLElBQ0wsT0FBTztBQUFBLE1BQ0gsS0FBSyxLQUFLLFFBQVEsS0FBSyxRQUFRLGNBQWMsd0NBQWUsQ0FBQyxHQUFHLE1BQU0sS0FBSztBQUFBLE1BQzNFLFNBQVMsS0FBSyxRQUFRLEtBQUssUUFBUSxjQUFjLHdDQUFlLENBQUMsR0FBRyxNQUFNLE9BQU8sT0FBTztBQUFBLE1BQ3hGLFlBQVksS0FBSyxRQUFRLEtBQUssUUFBUSxjQUFjLHdDQUFlLENBQUMsR0FBRyxNQUFNLE9BQU8sVUFBVTtBQUFBLE1BQzlGLFdBQVcsS0FBSyxRQUFRLEtBQUssUUFBUSxjQUFjLHdDQUFlLENBQUMsR0FBRyxNQUFNLE9BQU8sVUFBVSxRQUFRO0FBQUEsTUFDckcsV0FBVyxLQUFLLFFBQVEsS0FBSyxRQUFRLGNBQWMsd0NBQWUsQ0FBQyxHQUFHLE1BQU0sT0FBTyxVQUFVLFFBQVE7QUFBQSxNQUNyRyx5QkFBeUIsS0FBSyxRQUFRLEtBQUssUUFBUSxjQUFjLHdDQUFlLENBQUMsR0FBRyxNQUFNLE9BQU8sVUFBVSxVQUFVLGFBQWEsZ0JBQWdCO0FBQUEsSUFDdEo7QUFBQSxFQUNKO0FBQUEsRUFFQSxPQUFPO0FBQUEsSUFDSCx1QkFBdUI7QUFBQTtBQUFBLElBQ3ZCLFFBQVE7QUFBQSxJQUNSLGVBQWU7QUFBQSxNQUNYLFVBQVU7QUFBQSxRQUNOLGNBQWM7QUFBQTtBQUFBLFFBQ2QsZUFBZTtBQUFBLFFBQ2YsWUFBWSxDQUFDLGVBQWUsZ0JBQWdCLGVBQWU7QUFBQSxNQUMvRDtBQUFBLElBQ0o7QUFBQSxJQUNBLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQTtBQUFBLElBQ1gsZUFBZTtBQUFBLE1BQ1gsUUFBUTtBQUFBLFFBQ0osZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUE7QUFBQSxRQUVoQixjQUFjLFFBQU07QUFDaEIsY0FBSSxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBQzdCLGdCQUFJLEdBQUcsU0FBUyxPQUFPLEtBQU0sR0FBRyxTQUFTLEtBQUssS0FBSyxDQUFDLEdBQUcsU0FBUyxTQUFTLEdBQUk7QUFDekUscUJBQU87QUFBQSxZQUNYO0FBQ0EsZ0JBQUksR0FBRyxTQUFTLFNBQVMsR0FBRztBQUN4QixxQkFBTztBQUFBLFlBQ1g7QUFDQSxnQkFBSSxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBQzdCLHFCQUFPO0FBQUEsWUFDWDtBQUNBLGdCQUFJLEdBQUcsU0FBUyxlQUFlLEdBQUc7QUFDOUIscUJBQU87QUFBQSxZQUNYO0FBQ0EsZ0JBQUksR0FBRyxTQUFTLG9CQUFvQixHQUFHO0FBQ25DLHFCQUFPO0FBQUEsWUFDWDtBQUNBLGdCQUFJLEdBQUcsU0FBUyxrQkFBa0IsR0FBRztBQUNqQyxxQkFBTztBQUFBLFlBQ1g7QUFDQSxnQkFBSSxHQUFHLFNBQVMsV0FBVyxHQUFHO0FBQzFCLHFCQUFPO0FBQUEsWUFDWDtBQUNBLGdCQUFJLEdBQUcsU0FBUyxjQUFjLEdBQUc7QUFDN0IscUJBQU87QUFBQSxZQUNYO0FBQ0EsZ0JBQUksR0FBRyxTQUFTLFlBQVksR0FBRztBQUMzQixxQkFBTztBQUFBLFlBQ1g7QUFDQSxnQkFBSSxHQUFHLFNBQVMsWUFBWSxLQUFLLEdBQUcsU0FBUyxpQkFBaUIsR0FBRztBQUM3RCxxQkFBTztBQUFBLFlBQ1g7QUFDQSxnQkFBSSxHQUFHLFNBQVMsVUFBVSxHQUFHO0FBQ3pCLHFCQUFPO0FBQUEsWUFDWDtBQUNBLGdCQUFJLEdBQUcsU0FBUyxrQkFBa0IsR0FBRztBQUNqQyxxQkFBTztBQUFBLFlBQ1g7QUFDQSxnQkFBSSxHQUFHLFNBQVMsVUFBVSxHQUFHO0FBQ3pCLHFCQUFPO0FBQUEsWUFDWDtBQUNBLGdCQUFJLEdBQUcsU0FBUyxXQUFXLEdBQUc7QUFDMUIscUJBQU87QUFBQSxZQUNYO0FBQ0EsZ0JBQUksR0FBRyxTQUFTLFFBQVEsR0FBRztBQUN2QixxQkFBTztBQUFBLFlBQ1g7QUFDQSxnQkFBSSxHQUFHLFNBQVMsMkJBQTJCLEdBQUc7QUFDMUMscUJBQU87QUFBQSxZQUNYO0FBRUEsbUJBQU87QUFBQSxVQUNYO0FBRUEsY0FBSSxHQUFHLFNBQVMsTUFBTSxHQUFHO0FBQ3JCLGdCQUFJLEdBQUcsU0FBUyxtQkFBbUIsS0FBSyxHQUFHLFNBQVMsZ0JBQWdCLEdBQUc7QUFDbkUscUJBQU87QUFBQSxZQUNYO0FBQ0EsZ0JBQUksR0FBRyxTQUFTLGNBQWMsS0FBSyxHQUFHLFNBQVMsV0FBVyxLQUFLLEdBQUcsU0FBUyxhQUFhLEtBQUssR0FBRyxTQUFTLGlCQUFpQixHQUFHO0FBQ3pILHFCQUFPO0FBQUEsWUFDWDtBQUNBLGdCQUFJLEdBQUcsU0FBUyx1QkFBdUIsS0FBSyxHQUFHLFNBQVMsd0JBQXdCLEdBQUc7QUFDL0UscUJBQU87QUFBQSxZQUNYO0FBQ0EsZ0JBQUksR0FBRyxTQUFTLHVCQUF1QixHQUFHO0FBQ3RDLHFCQUFPO0FBQUEsWUFDWDtBQUNBLGdCQUFJLEdBQUcsU0FBUyxpQkFBaUIsS0FBSyxHQUFHLFNBQVMsa0JBQWtCLEdBQUc7QUFDbkUscUJBQU87QUFBQSxZQUNYO0FBQUEsVUFJSjtBQUFBLFFBQ0o7QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUFBLElBQ0Esc0JBQXNCO0FBQUE7QUFBQSxJQUN0QixXQUFXO0FBQUE7QUFBQSxFQUNmO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDVixTQUFTLENBQUMsU0FBUztBQUFBLElBQ25CLFNBQVM7QUFBQSxNQUNMO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNKLE1BQU07QUFBQTtBQUFBLElBQ04sU0FBUztBQUFBO0FBQUE7QUFBQTtBQUFBLElBSVQ7QUFBQSxFQUNKO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
