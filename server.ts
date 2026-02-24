import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Database
const db = new Database('bosses.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS killed_bosses (
    boss_id TEXT PRIMARY KEY
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/bosses', (req, res) => {
    try {
      const rows = db.prepare('SELECT boss_id FROM killed_bosses').all() as { boss_id: string }[];
      const killedBosses = rows.map(row => row.boss_id);
      res.json(killedBosses);
    } catch (error) {
      console.error('Error fetching bosses:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/bosses/toggle', (req, res) => {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Boss ID is required' });
    }

    try {
      const exists = db.prepare('SELECT 1 FROM killed_bosses WHERE boss_id = ?').get(id);
      
      if (exists) {
        db.prepare('DELETE FROM killed_bosses WHERE boss_id = ?').run(id);
        res.json({ id, killed: false });
      } else {
        db.prepare('INSERT INTO killed_bosses (boss_id) VALUES (?)').run(id);
        res.json({ id, killed: true });
      }
    } catch (error) {
      console.error('Error toggling boss:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/bosses/reset', (req, res) => {
    try {
      db.prepare('DELETE FROM killed_bosses').run();
      res.json({ success: true });
    } catch (error) {
      console.error('Error resetting bosses:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
