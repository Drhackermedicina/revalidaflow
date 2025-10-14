// Arquivo de configuração do Vitest
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
    plugins: [vue()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.js'],
        include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        alias: {
            '@': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src',
            '@core': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/@core',
            '@layouts': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/@layouts',
            '@images': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/assets/images/',
            '@styles': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/assets/styles/',
            '@configured-variables': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/assets/styles/variables/_template.scss',
            '@plugins': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/plugins',
            '@components': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/components',
            '@composables': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/composables',
            '@assets': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/assets',
            '@stores': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/stores',
            '@utils': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/utils',
            '@services': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/services',
            '@views': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/views',
            '@pages': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/pages',
        },
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
        alias: {
            '@': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src',
            '@core': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/@core',
            '@layouts': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/@layouts',
            '@images': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/assets/images/',
            '@styles': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/assets/styles/',
            '@configured-variables': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/assets/styles/variables/_template.scss',
            '@plugins': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/plugins',
            '@components': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/components',
            '@composables': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/composables',
            '@assets': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/assets',
            '@stores': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/stores',
            '@utils': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/utils',
            '@services': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/services',
            '@views': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/views',
            '@pages': 'D:/PROJETOS VS CODE/REVALIDAFLOW/FRONTEND E BACKEND/src/pages',
        }
    }
})
