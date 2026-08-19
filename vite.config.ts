import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import manifest from './package.json' with { type: 'json' };

export default defineConfig({
    base: './',
    // The footer of the interface names the running version and links back to where it came from.
    define: {
        __APP_VERSION__: JSON.stringify(manifest.version),
        __APP_REPOSITORY__: JSON.stringify(manifest.repository.url),
    },
    plugins: [react()],
    server: {
        // Bind to every interface so the dev server can be opened from a phone on the same network.
        host: true,
        port: 5173,
        strictPort: true,
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    build: {
        target: 'es2022',
        cssCodeSplit: true,
        reportCompressedSize: false,
    },
});
