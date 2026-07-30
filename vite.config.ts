import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
);

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';
  return {
    base: './',
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      'process.env': '{}',
    },
    build: isLib
      ? {
          outDir: 'dist',
          lib: {
            entry: path.resolve(__dirname, 'src/main.tsx'),
            name: 'P2PFileTransfer',
            formats: ['es'],
            fileName: () => 'index.js',
          },
          rollupOptions: {
            output: { assetFileNames: 'style.css' },
          },
        }
      : { outDir: 'dist' },
  };
});
