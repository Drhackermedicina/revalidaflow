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
        chunkSizeWarningLimit: 1000, // Aumentado para reduzir avisos
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true, // Remove console.log em produção
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug']
            }
        },
        treeshake: true,
        cssMinify: true, // Ativado minificação de CSS
        rollupOptions: {
            output: {
                entryFileNames: `assets/[name]-[hash].js`,
                chunkFileNames: `assets/chunk-[name]-[hash].js`,
                assetFileNames: `assets/asset-[name]-[hash].[ext]`,
                // Code splitting otimizado
                manualChunks: (id) => {
                    // Dependências de node_modules com agrupamento por escopo/pacote
                    if (id.includes('node_modules')) {
                        // Frameworks principais
                        if (id.includes('@vue/') || (id.includes('vue') && !id.includes('vuetify'))) {
                            return 'vue-core';
                        }
                        if (id.includes('vuetify')) {
                            return 'vuetify';
                        }

                        // Firebase por módulo
                        if (id.includes('firebase/app')) {
                            return 'firebase-app';
                        }
                        if (id.includes('firebase/auth')) {
                            return 'firebase-auth';
                        }
                        if (id.includes('firebase/firestore')) {
                            return 'firebase-firestore';
                        }
                        if (id.includes('firebase/storage')) {
                            return 'firebase-storage';
                        }
                        if (id.includes('firebase/')) {
                            return 'firebase-other';
                        }

                        // Bibliotecas especializadas
                        if (id.includes('@tensorflow/')) {
                            return 'tensorflow';
                        }
                        if (id.includes('lottie-web')) {
                            return 'lottie';
                        }
                        if (id.includes('apexcharts') || id.includes('vue3-apexcharts')) {
                            return 'charts';
                        }
                        if (id.includes('@tiptap/')) {
                            return 'editor';
                        }
                        if (id.includes('socket.io-client')) {
                            return 'socket';
                        }

                        // Utilitários
                        if (id.includes('@vueuse/')) {
                            return 'vueuse';
                        }
                        if (id.includes('lodash-es')) {
                            return 'lodash';
                        }
                        if (id.includes('marked')) {
                            return 'markdown';
                        }
                        if (id.includes('browser-image-compression')) {
                            return 'image-utils';
                        }

                        // Outros pacotes de node_modules - agrupar em vendor genérico
                        return 'vendor';
                    }

                    // Código da aplicação - agrupamento por funcionalidades
                    if (id.includes('src/')) {
                        // Views principais
                        if (id.includes('views/simulation/') || id.includes('SimulationView')) {
                            return 'simulation-view';
                        }
                        if (id.includes('views/admin/') || id.includes('AdminView') || id.includes('AdminUpload') || id.includes('EditStationView')) {
                            return 'admin-view';
                        }

                        // Componentes de simulação
                        if (id.includes('components/Simulation') || id.includes('components/simulation/')) {
                            return 'simulation-components';
                        }

                        // Componentes de dashboard
                        if (id.includes('components/dashboard/')) {
                            return 'dashboard-components';
                        }

                        // Componentes de chat
                        if (id.includes('components/Chat') || id.includes('components/chat/')) {
                            return 'chat-components';
                        }

                        // Utilitários da aplicação
                        if (id.includes('utils/') || id.includes('composables/')) {
                            return 'app-utils';
                        }

                        // Stores
                        if (id.includes('stores/')) {
                            return 'app-stores';
                        }

                        // Outros componentes serão gerenciados pelo Vite automaticamente
                        // Removido o chunk ui-components para evitar problemas de ordem de inicialização
                    }
                }
            }
        },
        // Otimização adicional
        reportCompressedSize: false, // Desativa relatório de gzip (acelera build)
        sourcemap: false // Desativa sourcemaps em produção
    },
    optimizeDeps: {
        exclude: ['vuetify'],
        entries: [
            './src/**/*.vue',
        ],
    },
    server: {
        headers: {
            'Cross-Origin-Opener-Policy': 'unsafe-none',
            'Cross-Origin-Embedder-Policy': 'unsafe-none'
        }
    }
})
