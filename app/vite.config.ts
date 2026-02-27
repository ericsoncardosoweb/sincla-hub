import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            // Em desenvolvimento local, repassa requisições /rh para a ferramenta satélite
            '/rh': {
                target: 'http://localhost:5174',
                changeOrigin: true,
                secure: false,
            }
        }
    }
})
