import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { fileURLToPath } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import vuetify from 'vite-plugin-vuetify'
import svgLoader from 'vite-svg-loader'
import path from 'path'
const projectRoot = fileURLToPath(new URL('..', import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        {
            name: 'debug-resolver',
            configResolved(config) {
                console.log('projectRoot:', projectRoot);
                console.log('--- Diagnóstico de Aliases ---');
                const aliases = config.resolve.alias;
                if (Array.isArray(aliases)) {
                    const coreAlias = aliases.find(a => a.find === '@core');
                    const layoutsAlias = aliases.find(a => a.find === '@layouts');
                    const stylesAlias = aliases.find(a => a.find === '@styles');

                    console.log('Caminho para @core:', coreAlias ? coreAlias.replacement : 'Não encontrado');
                    console.log('Caminho para @layouts:', layoutsAlias ? layoutsAlias.replacement : 'Não encontrado');
                    console.log('Caminho para @styles:', stylesAlias ? stylesAlias.replacement : 'Não encontrado');
                } else if (aliases && typeof aliases === 'object') {
                    console.log('Caminho para @core:', aliases['@core'] || 'Não encontrado');
                    console.log('Caminho para @layouts:', aliases['@layouts'] || 'Não encontrado');
                    console.log('Caminho para @styles:', aliases['@styles'] || 'Não encontrado');
                }
                console.log('------------------------------');
            },
        },
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
            '@': path.resolve(projectRoot, 'src'),
            '@core': path.resolve(projectRoot, 'src', '@core'),
            '@layouts': path.resolve(projectRoot, 'src', '@layouts'),
            '@images': path.resolve(projectRoot, 'src', 'assets', 'images'),
            '@styles': path.resolve(projectRoot, 'src', 'assets', 'styles'),
            '@configured-variables': path.resolve(projectRoot, 'src', 'assets', 'styles', 'variables', '_template.scss'),
        },
    },

    build: {
        chunkSizeWarningLimit: 5000,
        minify: 'terser',
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
        exclude: ['vuetify'],
        entries: [
            './src/**/*.vue',
        ],
    },
})
