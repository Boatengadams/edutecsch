
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    // Security: Disable source maps in production to prevent code/logic exposure
    sourcemap: mode === 'development',
    // Security: Aggressive minification and obfuscation
    minify: 'terser',
    terserOptions: {
      compress: {
        // Security: Remove console logs to prevent leaking sensitive info or debugging traces
        drop_console: mode === 'production',
        drop_debugger: true,
      },
      format: {
        comments: false, // Remove all comments
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore'],
          charts: ['recharts'],
          utils: ['html2canvas', '@google/genai']
        },
      },
    },
  },
  server: {
    headers: {
      // Security Headers for Development Server
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
}));