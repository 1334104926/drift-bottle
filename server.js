const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
const DB_FILE = path.join(__dirname, 'data', 'bottles.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database file
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ 
    bottles: [], 
    replies: [],
    messages: [],
    users: {}
  }));
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// API Routes

// Throw a new bottle
app.post('/api/bottles', (req, res) => {
  try {
    const { content, type = 'text', color = 'blue', userId, userName } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const db = readDB();
    const bottle = {
      id: Date.now(),
      content: content.trim(),
      type,
      color,
      userId: userId || 'anonymous',
      userName: userName || '匿名用户',
      createdAt: new Date().toISOString(),
      replyCount: 0,
      messageCount: 0
    };
    db.bottles.push(bottle);
    writeDB(db);
    
    res.json({ 
      success: true, 
      message: 'Bottle thrown into the sea!',
      bottleId: bottle.id 
    });
  } catch (error) {
    console.error('Error throwing bottle:', error);
    res.status(500).json({ error: 'Failed to throw bottle' });
  }
});

// Pick up a random bottle
app.get('/api/bottles/random', (req, res) => {
  try {
    const db = readDB();
    if (db.bottles.length === 0) {
      return res.json({ 
        success: true, 
        bottle: null,
        message: 'The sea is empty' 
      });
    }

    const randomIndex = Math.floor(Math.random() * db.bottles.length);
    const bottle = db.bottles[randomIndex];

    res.json({ 
      success: true, 
      bottle: {
        id: bottle.id,
        content: bottle.content,
        type: bottle.type,
        color: bottle.color,
        userId: bottle.userId,
        userName: bottle.userName,
        createdAt: bottle.createdAt,
        replyCount: bottle.replyCount,
        messageCount: bottle.messageCount
      }
    });
  } catch (error) {
    console.error('Error picking bottle:', error);
    res.status(500).json({ error: 'Failed to pick bottle' });
  }
});

// Get single bottle
app.get('/api/bottles/:id', (req, res) => {
  try {
    const bottleId = parseInt(req.params.id);
    const db = readDB();
    const bottle = db.bottles.find(b => b.id === bottleId);
    if (!bottle) {
      return res.status(404).json({ error: 'Bottle not found' });
    }
    res.json({
      success: true,
      bottle: {
        id: bottle.id,
        content: bottle.content,
        userId: bottle.userId,
        userName: bottle.userName,
        createdAt: bottle.createdAt,
        replyCount: bottle.replyCount,
        messageCount: bottle.messageCount
      }
    });
  } catch (error) {
    console.error('Error getting bottle:', error);
    res.status(500).json({ error: 'Failed to get bottle' });
  }
});

// Reply to a bottle (with optional parentReplyId for sub-replies)
app.post('/api/bottles/:id/reply', (req, res) => {
  try {
    const bottleId = parseInt(req.params.id);
    const { content, userId, userName, parentReplyId } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Reply content is required' });
    }

    const db = readDB();
    const bottleIndex = db.bottles.findIndex(b => b.id === bottleId);
    
    if (bottleIndex === -1) {
      return res.status(404).json({ error: 'Bottle not found' });
    }

    const reply = {
      id: Date.now(),
      bottleId,
      content: content.trim(),
      userId: userId || 'anonymous',
      userName: userName || '匿名用户',
      createdAt: new Date().toISOString(),
      parentReplyId: parentReplyId || null
    };
    db.replies.push(reply);
    db.bottles[bottleIndex].replyCount++;
    writeDB(db);

    res.json({ success: true, message: 'Reply sent!' });
  } catch (error) {
    console.error('Error replying to bottle:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Get replies for a bottle
app.get('/api/bottles/:id/replies', (req, res) => {
  try {
    const bottleId = parseInt(req.params.id);
    const db = readDB();
    const replies = db.replies.filter(r => r.bottleId === bottleId);
    
    res.json({ 
      success: true, 
      replies: replies.map(r => ({
        id: r.id,
        content: r.content,
        userId: r.userId,
        userName: r.userName,
        createdAt: r.createdAt,
        parentReplyId: r.parentReplyId
      }))
    });
  } catch (error) {
    console.error('Error getting replies:', error);
    res.status(500).json({ error: 'Failed to get replies' });
  }
});

// Check if user can send message
app.get('/api/bottles/:id/can-message', (req, res) => {
  try {
    const bottleId = parseInt(req.params.id);
    const { userId } = req.query;
    
    const db = readDB();
    const bottle = db.bottles.find(b => b.id === bottleId);
    
    if (!bottle) {
      return res.json({ success: false, canMessage: false, message: '瓶子不存在' });
    }
    
    // Check if user has replied to this bottle
    const userReply = db.replies.find(r => r.bottleId === bottleId && r.userId === userId);
    if (!userReply) {
      return res.json({ 
        success: true, 
        canMessage: false, 
        step: 'reply',
        message: '请先评论该瓶子' 
      });
    }
    
    // Check if bottle owner has replied to user's comment
    const bottleOwnerReplies = db.replies.filter(r => 
      r.bottleId === bottleId && r.userId === bottle.userId
    );
    
    if (bottleOwnerReplies.length === 0) {
      return res.json({ 
        success: true, 
        canMessage: false, 
        step: 'waiting',
        message: '已评论，等待瓶子主人回复后可私信' 
      });
    }
    
    res.json({ 
      success: true, 
      canMessage: true,
      message: '可以发送私信'
    });
  } catch (error) {
    console.error('Error checking message permission:', error);
    res.status(500).json({ error: 'Failed to check permission' });
  }
});

// Send a private message
app.post('/api/messages', (req, res) => {
  try {
    const { bottleId, toUserId, content, fromUserId, fromUserName } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const db = readDB();
    
    // Check permission
    const bottle = db.bottles.find(b => b.id === bottleId);
    if (!bottle) {
      return res.status(404).json({ error: '瓶子不存在' });
    }
    
    // 瓶子主人可以直接回复评论者
    const isOwner = bottle.userId === fromUserId;
    
    if (!isOwner) {
      // 非瓶子主人需要先评论
      const userReply = db.replies.find(r => r.bottleId === bottleId && r.userId === fromUserId);
      if (!userReply) {
        return res.status(403).json({ error: '请先评论该瓶子' });
      }
      
      // 非瓶子主人需要瓶子主人回复（可以是评论或私信）才能私信
      const ownerMessages = db.messages.filter(m => 
        m.bottleId === bottleId && 
        m.fromUserId === bottle.userId && 
        m.toUserId === fromUserId
      );
      
      const ownerReplies = db.replies.filter(r => r.bottleId === bottleId && r.userId === bottle.userId);
      
      if (ownerMessages.length === 0 && ownerReplies.length === 0) {
        return res.status(403).json({ error: '等待瓶子主人回复后可私信' });
      }
    }

    const message = {
      id: Date.now(),
      bottleId,
      fromUserId: fromUserId || 'anonymous',
      fromUserName: fromUserName || '匿名用户',
      toUserId,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      read: false
    };
    db.messages.push(message);
    
    const bottleIndex = db.bottles.findIndex(b => b.id === bottleId);
    if (bottleIndex !== -1) {
      db.bottles[bottleIndex].messageCount++;
    }
    
    writeDB(db);

    res.json({ success: true, message: '私信发送成功！' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get messages for a user
app.get('/api/messages', (req, res) => {
  try {
    const { userId } = req.query;
    const db = readDB();
    
    const messages = db.messages.filter(m => m.toUserId === userId || m.fromUserId === userId);
    
    res.json({ 
      success: true, 
      messages: messages.map(m => ({
        id: m.id,
        bottleId: m.bottleId,
        fromUserId: m.fromUserId,
        fromUserName: m.fromUserName,
        toUserId: m.toUserId,
        content: m.content,
        createdAt: m.createdAt,
        read: m.read,
        isMine: m.fromUserId === userId
      }))
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Get conversation
app.get('/api/messages/conversation', (req, res) => {
  try {
    const { bottleId, userId1, userId2 } = req.query;
    const db = readDB();
    
    const messages = db.messages.filter(m => 
      m.bottleId === parseInt(bottleId) &&
      ((m.fromUserId === userId1 && m.toUserId === userId2) ||
       (m.fromUserId === userId2 && m.toUserId === userId1))
    ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    res.json({ 
      success: true, 
      messages: messages.map(m => ({
        id: m.id,
        fromUserId: m.fromUserId,
        fromUserName: m.fromUserName,
        toUserId: m.toUserId,
        content: m.content,
        createdAt: m.createdAt,
        read: m.read,
        isMine: m.fromUserId === userId1
      }))
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Mark messages as read
app.post('/api/messages/read', (req, res) => {
  try {
    const { messageIds, userId } = req.body;
    const db = readDB();
    
    messageIds.forEach(id => {
      const msg = db.messages.find(m => m.id === id && m.toUserId === userId);
      if (msg) msg.read = true;
    });
    
    writeDB(db);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Get my bottles
app.get('/api/my/bottles', (req, res) => {
  try {
    const { userId } = req.query;
    const db = readDB();
    
    const bottles = db.bottles.filter(b => b.userId === userId);
    
    res.json({ 
      success: true, 
      bottles: bottles.map(b => ({
        id: b.id,
        content: b.content,
        color: b.color,
        createdAt: b.createdAt,
        replyCount: b.replyCount,
        messageCount: b.messageCount
      }))
    });
  } catch (error) {
    console.error('Error getting my bottles:', error);
    res.status(500).json({ error: 'Failed to get bottles' });
  }
});

// Get my replies
app.get('/api/my/replies', (req, res) => {
  try {
    const { userId } = req.query;
    const db = readDB();
    
    const replies = db.replies.filter(r => r.userId === userId);
    
    res.json({ 
      success: true, 
      replies: replies.map(r => {
        const bottle = db.bottles.find(b => b.id === r.bottleId);
        return {
          id: r.id,
          bottleId: r.bottleId,
          bottleContent: bottle ? bottle.content.substring(0, 50) + '...' : '瓶子已消失',
          content: r.content,
          createdAt: r.createdAt
        };
      })
    });
  } catch (error) {
    console.error('Error getting my replies:', error);
    res.status(500).json({ error: 'Failed to get replies' });
  }
});

// Get unread message count
app.get('/api/messages/unread', (req, res) => {
  try {
    const { userId } = req.query;
    const db = readDB();
    
    const count = db.messages.filter(m => m.toUserId === userId && !m.read).length;
    
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Get stats
app.get('/api/stats', (req, res) => {
  try {
    const db = readDB();
    res.json({ 
      success: true, 
      stats: {
        bottlesThrown: db.bottles.length,
        replies: db.replies.length
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Drift Bottle Server running on port ${PORT}`);
});
