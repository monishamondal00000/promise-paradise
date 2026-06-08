import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Plugin to serve backend JSON data files directly from Vite dev server
function serveBackendData() {
  const dataDir = path.resolve(__dirname, '../backend/data');
  const endpoints = {
    '/api/destinations': 'destinations.json',
    '/api/packages': 'packages.json',
    '/api/vendors': 'vendors.json'
  };

  return {
    name: 'serve-backend-data',
    configureServer(server) {
      // Add middleware BEFORE Vite's built-in middleware
      server.middlewares.use((req, res, next) => {
        const url = req.url.split('?')[0];

        // Handle CORS preflight for API calls
        if (req.method === 'OPTIONS' && url.startsWith('/api/')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.statusCode = 204;
          res.end();
          return;
        }

        // Serve static data endpoints (read-only fallback for when backend is down)
        if (endpoints[url] && req.method === 'GET') {
          const filePath = path.join(dataDir, endpoints[url]);
          if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = 200;
            res.end(data);
            return;
          }
        }
        // All other /api/* requests pass through to the backend proxy
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), serveBackendData()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
