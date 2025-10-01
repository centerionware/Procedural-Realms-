import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-transform',
      apply: 'build', // Only apply in build
      transformIndexHtml(html) {
        // Remove Tailwind CDN and its config script for production build
        return html
          .replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/, '')
          .replace(/<script>[\s\S]*?tailwind\.config[\s\S]*?<\/script>/s, '');
      },
    },
  ],
})