// Arquivo de configuração do Vitest
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.resolve(projectRoot, 'src')

const resolveSrcPath = (relativePath) => path.resolve(srcRoot, relativePath)

const aliasConfig = {
    '@': srcRoot,
    '@core': resolveSrcPath('@core'),
    '@layouts': resolveSrcPath('@layouts'),
    '@images': resolveSrcPath('assets/images/'),
    '@styles': resolveSrcPath('assets/styles/'),
    '@configured-variables': resolveSrcPath('assets/styles/variables/_template.scss'),
    '@plugins': resolveSrcPath('plugins'),
    '@components': resolveSrcPath('components'),
    '@composables': resolveSrcPath('composables'),
    '@assets': resolveSrcPath('assets'),
    '@stores': resolveSrcPath('stores'),
    '@utils': resolveSrcPath('utils'),
    '@services': resolveSrcPath('services'),
    '@views': resolveSrcPath('views'),
    '@pages': resolveSrcPath('pages'),
}
export default defineConfig({
    plugins: [vue()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.js'],
        include: [
            'tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
            'tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
        ],
        alias: aliasConfig,
        coverage: {
            provider: 'istanbul',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/coverage/**',
                '**/dist/**',
                '**/docs/**'
            ]
        }
    },
    resolve: {
        alias: aliasConfig
    }
})
