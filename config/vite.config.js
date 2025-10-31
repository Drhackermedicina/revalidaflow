import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { fileURLToPath } from 'node:url'
import legacy from '@vitejs/plugin-legacy'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import vuetify from 'vite-plugin-vuetify'
import svgLoader from 'vite-svg-loader'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    logLevel: 'info',
    plugins: [
        legacy({
            targets: ['defaults', 'not IE 11']
        }),
        vue(),
        vueJsx(),
        vuetify({
            styles: {
                configFile: 'src/assets/styles/variables/_vuetify.scss',
            },
        }),
        Components({
            dirs: ['src/@core/components', 'src/components'],
            dts: true,
            resolvers: [
                componentName => {
                    if (componentName === 'VueApexCharts')
                        return { name: 'default', from: 'vue3-apexcharts', as: 'VueApexCharts' }
                },
            ],
        }),
        AutoImport({
            imports: ['vue', 'vue-router', '@vueuse/core', '@vueuse/math', 'pinia'],
            vueTemplate: true,
            ignore: ['useCookies', 'useStorage'],
            eslintrc: {
                enabled: true,
                filepath: './.eslintrc-auto-import.json',
            },
        }),
        svgLoader(),
    ],
    define: { 'process.env': {} },
    resolve: {
        alias: {
            '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src'),
            '@core': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', '@core'),
            '@layouts': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', '@layouts'),
            '@images': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'images'),
            '@styles': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'styles'),
            '@configured-variables': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'styles', 'variables', '_template.scss'),
        },
    },

    build: {
        chunkSizeWarningLimit: 1000, // Increased to reduce warnings
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true, // Remove console.log in production
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug']
            }
        },
        treeshake: true,
        cssMinify: true, // Enable CSS minification
        rollupOptions: {
            output: {
                entryFileNames: `assets/[name]-[hash].js`,
                chunkFileNames: `assets/chunk-[name]-[hash].js`,
                assetFileNames: `assets/asset-[name]-[hash].[ext]`,
                // Custom chunk strategy
                manualChunks: id => {
                    if (id.includes('node_modules')) {
                        if (id.includes('@vue/') || (id.includes('vue') && !id.includes('vuetify'))) {
                            return 'vue-core'
                        }
                        if (id.includes('vuetify')) {
                            return 'vuetify'
                        }
                        if (id.includes('firebase/app')) {
                            return 'firebase-app'
                        }
                        if (id.includes('firebase/auth')) {
                            return 'firebase-auth'
                        }
                        if (id.includes('firebase/firestore')) {
                            return 'firebase-firestore'
                        }
                        if (id.includes('firebase/storage')) {
                            return 'firebase-storage'
                        }
                        if (id.includes('firebase/')) {
                            return 'firebase-other'
                        }
                        if (id.includes('@tensorflow/')) {
                            return 'tensorflow'
                        }
                        if (id.includes('lottie-web')) {
                            return 'lottie'
                        }
                        if (id.includes('apexcharts') || id.includes('vue3-apexcharts')) {
                            return 'charts'
                        }
                        if (id.includes('@tiptap/')) {
                            return 'editor'
                        }
                        if (id.includes('socket.io-client')) {
                            return 'socket'
                        }
                        if (id.includes('@vueuse/')) {
                            return 'vueuse'
                        }
                        if (id.includes('lodash-es')) {
                            return 'lodash'
                        }
                        if (id.includes('marked')) {
                            return 'markdown'
                        }
                        if (id.includes('browser-image-compression')) {
                            return 'image-utils'
                        }

                        return 'vendor'
                    }

                    if (id.includes('src/')) {
                        if (id.includes('views/simulation/') || id.includes('SimulationView')) {
                            return 'simulation-view'
                        }
                        if (id.includes('views/admin/') || id.includes('AdminView') || id.includes('AdminUpload') || id.includes('EditStationView')) {
                            return 'admin-view'
                        }
                        if (id.includes('components/Simulation') || id.includes('components/simulation/')) {
                            return 'simulation-components'
                        }
                        if (id.includes('components/dashboard/')) {
                            return 'dashboard-components'
                        }
                        if (id.includes('components/Chat') || id.includes('components/chat/')) {
                            return 'chat-components'
                        }

                        // Remaining modules fall back to Rollup defaults
                        // Removed the previous app-utils and app-stores buckets to avoid circular chunk dependencies
                    }
                }
            }
        },
        reportCompressedSize: false, // Skip gzip report (faster build)
        sourcemap: false // Disable sourcemaps in production
    },
    optimizeDeps: {
        exclude: ['vuetify'],
        entries: [
            './src/**/*.vue',
        ],
    },
    server: {
        open: true, // Abre automaticamente o navegador quando iniciar o servidor de desenvolvimento
        headers: {
            // Removido Cross-Origin-Opener-Policy para evitar erros no login Google
            // 'Cross-Origin-Opener-Policy': 'unsafe-none',
            // 'Cross-Origin-Embedder-Policy': 'unsafe-none'
        }
    }
})
