import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes/api';
import { securityHeaders, corsMiddleware } from './middleware/security';

const app = express();
const server = createServer(app);

// Security middleware
app.use(securityHeaders);
app.use(corsMiddleware);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// API routes
app.use('/api', apiRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(process.cwd(), 'dist', 'public');
  
  if (!fs.existsSync(distPath)) {
    console.error(`Build directory not found: ${distPath}`);
  } else {
    console.log(`Serving static files from: ${distPath}`);
  }
  
  app.use(express.static(distPath));
  
  // Fallback to index.html for SPA routing (exclude API routes)
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
} else {
  // Development mode with Vite
  const startVite = async () => {
    const { setupVite } = await import('./_core/vite');
    await setupVite(app, server);
  };

  startVite().catch(error => {
    console.error('Failed to start Vite in development:', error);
    process.exit(1);
  });
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

