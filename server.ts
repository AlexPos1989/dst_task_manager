import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize PostgreSQL Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://dst_tracker_user:TEdfecVwrlkFf3eYahFjRSIYzqbfj1es@dpg-d6eqsuhr0fns73cthcq0-a.frankfurt-postgres.render.com/dst_tracker',
  ssl: {
    rejectUnauthorized: false
  }
});

// Ensure table exists (PostgreSQL syntax)
async function initDb() {
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'killed_bosses'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      // Create table with session_id support
      await pool.query(`
        CREATE TABLE killed_bosses (
          session_id TEXT DEFAULT 'default',
          boss_id TEXT,
          PRIMARY KEY (session_id, boss_id)
        )
      `);
      console.log('Database initialized with new schema');
    } else {
      // Check if session_id column exists
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'killed_bosses' AND column_name = 'session_id'
      `);

      if (columnCheck.rowCount === 0) {
        // Migrate existing table: Add session_id column and update PK
        console.log('Migrating database schema...');
        await pool.query(`
          ALTER TABLE killed_bosses ADD COLUMN session_id TEXT DEFAULT 'default';
          ALTER TABLE killed_bosses DROP CONSTRAINT killed_bosses_pkey;
          ALTER TABLE killed_bosses ADD PRIMARY KEY (session_id, boss_id);
        `);
        console.log('Database migration complete');
      }
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

async function startServer() {
  await initDb();
  
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json());

  // Helper to broadcast to all clients
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('close', () => console.log('Client disconnected'));
  });

  // API Routes
  app.get('/api/bosses', async (req, res) => {
    try {
      const sessionId = (req.query.session_id as string) || 'default';
      const result = await pool.query('SELECT boss_id FROM killed_bosses WHERE session_id = $1', [sessionId]);
      const killedBosses = result.rows.map(row => row.boss_id);
      res.json(killedBosses);
    } catch (error) {
      console.error('Error fetching bosses:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/bosses/toggle', async (req, res) => {
    const { id, session_id } = req.body;
    const sessionId = session_id || 'default';

    if (!id) {
      return res.status(400).json({ error: 'Boss ID is required' });
    }

    try {
      const checkResult = await pool.query('SELECT 1 FROM killed_bosses WHERE session_id = $1 AND boss_id = $2', [sessionId, id]);
      const exists = checkResult.rowCount && checkResult.rowCount > 0;
      let killed = false;
      
      if (exists) {
        await pool.query('DELETE FROM killed_bosses WHERE session_id = $1 AND boss_id = $2', [sessionId, id]);
        killed = false;
      } else {
        await pool.query('INSERT INTO killed_bosses (session_id, boss_id) VALUES ($1, $2)', [sessionId, id]);
        killed = true;
      }

      const response = { id, killed, type: 'BOSS_TOGGLE', session_id: sessionId };
      broadcast(response);
      res.json(response);
    } catch (error) {
      console.error('Error toggling boss:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/bosses/reset', async (req, res) => {
    const { session_id } = req.body;
    const sessionId = session_id || 'default';

    try {
      await pool.query('DELETE FROM killed_bosses WHERE session_id = $1', [sessionId]);
      const response = { type: 'BOSS_RESET', session_id: sessionId };
      broadcast(response);
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

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
