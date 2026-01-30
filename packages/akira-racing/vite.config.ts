import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: resolve(__dirname, 'src'),
    publicDir: resolve(__dirname, 'public'),
    base: `./`,
    build: {
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: true
    },
    server: {
        port: 8080,
        open: true
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        }
    }
}); 