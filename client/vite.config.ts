// vite.config.ts

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag: string) => tag === 'vue-json-pretty',
        },
      },
    }),
  ],
  resolve: {
    alias: {},
  },
  // *** הוספת הגדרת ה-Build כאן! ***
  build: {
    // מכוון את ה-esbuild/Vite לבצע קומפילציה לגרסת JS מודרנית
    // שתומכת בתכונת Top-Level Await.
    target: 'es2022', 
  },
  // **********************************
})