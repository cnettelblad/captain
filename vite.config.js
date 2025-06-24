import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
    resolve: {
        alias: {
            Captain: path.resolve(__dirname, './src'),
        },
    },
});