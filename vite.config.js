import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // 重要：確保 APK 內的相對路徑正確，避免白畫面
})