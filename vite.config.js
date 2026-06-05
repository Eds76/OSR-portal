import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ExpressPeerServer } from 'peer'

// https://vite.dev/config/
export default defineConfig({
  base: '/OSR-portal/',
  plugins: [
    react(),
    {
      name: 'peerjs-server',
      configureServer(server) {
        server.httpServer?.once('listening', () => {
          const peerServer = ExpressPeerServer(server.httpServer, {
            path: '/',
            allow_discovery: true,
          });
          server.middlewares.use('/peerjs-local', peerServer);
        });
      }
    }
  ],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: true,
  },
})
