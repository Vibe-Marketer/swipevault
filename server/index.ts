import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth';

const app = express();
const server = createServer(app);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Auth routes
app.use('/api', authRoutes);

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
  
  // Fallback to index.html for SPA routing
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
} else {
  // Development mode with Vite
  const { setupVite } = await import('./_core/vite');
  await setupVite(app, server);
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

