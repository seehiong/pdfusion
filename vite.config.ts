import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deployed to GitHub Pages under https://<user>.github.io/pdfusion/, so the
// production build needs an absolute base. React Router reads the same value
// via import.meta.env.BASE_URL to set its basename.
const REPO_BASE = '/pdfusion';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? REPO_BASE : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
}));
