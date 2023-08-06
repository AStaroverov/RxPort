import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            input: './examples/index.html',
        },
    },
});
