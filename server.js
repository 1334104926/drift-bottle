const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite database
const db = new Database('drift_bottles.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS bottles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    color TEXT DEFAULT 'blue',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reply_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bottle_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bottle_id) REFERENCES bottles(id)
  );
`);

// API Routes

// Throw a new bottle
app.post('/api/bottles', (req, res) => {
  try {
    const { content, type = 'text', color = 'blue' } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const stmt = db.prepare('INSERT INTO bottles (content, type, color) VALUES (?, ?, ?)');
    const result = stmt.run(content.trim(), type, color);
    
    res.json({ 
      success: true, 
      message: 'Bottle thrown into the sea!',
      bottleId: result.lastInsertRowid 
    });
  } catch (error) {
    console.error('Error throwing bottle:', error);
    res.status(500).json({ error: 'Failed to throw bottle' });
  }
});

// Pick up a random bottle
app.get('/api/bottles/random', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM bottles 
      ORDER BY RANDOM() 
      LIMIT 1
    `);
    const bottle = stmt.get();
    
    if (!bottle) {
      return res.json({ 
        success: true, 
        bottle: null,
        message: 'The sea is empty, no bottles found. Be the first to throw one!' 
      });
    }

    res.json({ 
      success: true, 
      bottle: {
        id: bottle.id,
        content: bottle.content,
        type: bottle.type,
        color: bottle.color,
        createdAt: bottle.created_at,
        replyCount: bottle.reply_count
      }
    });
  } catch (error) {
    console.error('Error picking bottle:', error);
    res.status(500).json({ error: 'Failed to pick bottle' });
  }
});

// Reply to a bottle
app.post('/api/bottles/:id/reply', (req, res) => {
  try {
    const bottleId = parseInt(req.params.id);
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Reply content is required' });
    }

    // Check if bottle exists
    const bottleStmt = db.prepare('SELECT id FROM bottles WHERE id = ?');
    const bottle = bottleStmt.get(bottleId);
    
    if (!bottle) {
      return res.status(404).json({ error: 'Bottle not found' });
    }

    // Add reply
    const replyStmt = db.prepare('INSERT INTO replies (bottle_id, content) VALUES (?, ?)');
    replyStmt.run(bottleId, content.trim());

    // Update reply count
    const updateStmt = db.prepare('UPDATE bottles SET reply_count = reply_count + 1 WHERE id = ?');
    updateStmt.run(bottleId);

    res.json({ 
      success: true, 
      message: 'Reply sent!' 
    });
  } catch (error) {
    console.error('Error replying to bottle:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Get replies for a bottle
app.get('/api/bottles/:id/replies', (req, res) => {
  try {
    const bottleId = parseInt(req.params.id);
    const stmt = db.prepare('SELECT * FROM replies WHERE bottle_id = ? ORDER BY created_at ASC');
    const replies = stmt.all(bottleId);
    
    res.json({ 
      success: true, 
      replies: replies.map(r => ({
        id: r.id,
        content: r.content,
        createdAt: r.created_at
      }))
    });
  } catch (error) {
    console.error('Error getting replies:', error);
    res.status(500).json({ error: 'Failed to get replies' });
  }
});

// Get bottle count
app.get('/api/stats', (req, res) => {
  try {
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM bottles');
    const replyStmt = db.prepare('SELECT COUNT(*) as count FROM replies');
    
    const bottleCount = countStmt.get().count;
    const replyCount = replyStmt.get().count;
    
    res.json({ 
      success: true, 
      stats: {
        bottlesThrown: bottleCount,
        replies: replyCount
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎒 Drift Bottle Server running on port ${PORT}`);
  console.log(`🌊 Open http://localhost:${PORT} to start`);
});
