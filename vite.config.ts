import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // React Compiler can break some styled-components layouts on optimized bundles.
      // Keep it off in production for stable CSS behavior.
      babel:
        mode === 'production'
          ? undefined
          : {
              plugins: [['babel-plugin-react-compiler']]
            }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
}))
