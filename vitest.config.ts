import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import manifest from './package.json' with { type: 'json' };

export default defineConfig({
    // The same stamps the build applies, so a component can read them under test too.
    define: {
        __APP_VERSION__: JSON.stringify(manifest.version),
        __APP_REPOSITORY__: JSON.stringify(manifest.repository.url),
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        globals: true,
        clearMocks: true,
        environment: 'node',
        setupFiles: ['tests/fixtures/browser-setup.ts'],
        include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
        coverage: {
            provider: 'v8',
            reportsDirectory: 'coverage',
            include: ['src/domain/**', 'src/services/**'],
            thresholds: {
                statements: 80,
                branches: 75,
                functions: 80,
                lines: 80,
            },
        },
    },
});
