import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: './',
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
