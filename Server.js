const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 4000;
const SECRET = process.env.JWT_SECRET || 'change-me-please';

// DB init
const db = new Database(path.join(__dirname,'audioryx.db'));
db.pragma('journal_mode = WAL');

// Create tables
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password_hash TEXT,
  display_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  filename TEXT,
  title TEXT,
  artist TEXT,
  duration INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS settings (
  user_id INTEGER PRIMARY KEY,
  data TEXT
)`).run();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname,'uploads')));

// Multer for upload
const uploadDir = path.join(__dirname,'uploads');
if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + file.originalname.replace(/\\s+/g,'_');
    cb(null, safe);
  }
});
const upload = multer({ storage });

// Helpers
function sign(user){
  return jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' });
}
function authMiddleware(req,res,next){
  const header = req.headers.authorization;
  if(!header) return res.status(401).json({ error:'No token' });
  const token = header.split(' ')[1];
  try{
    const payload = jwt.verify(token, SECRET);
    req.user = payload;
    next();
  } catch(e){ res.status(401).json({ error:'Invalid token' }) }
}

// Routes

// Register
app.post('/api/auth/register', async (req,res)=>{
  const { email, password, displayName } = req.body;
  if(!email || !password) return res.status(400).json({ error:'Missing' });
  const hash = await bcrypt.hash(password, 12);
  try{
    const info = db.prepare('INSERT INTO users (email,password_hash,display_name) VALUES (?,?,?)').run(email,hash,displayName||email);
    const user = { id: info.lastInsertRowid, email, display_name: displayName||email };
    const token = sign(user);
    res.json({ user, token });
  } catch(err){
    res.status(400).json({ error: 'Email already used' });
  }
});

// Login
app.post('/api/auth/login', async (req,res)=>{
  const { email, password } = req.body;
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if(!row) return res.status(400).json({ error:'Invalid' });
  const ok = await bcrypt.compare(password, row.password_hash);
  if(!ok) return res.status(400).json({ error:'Invalid' });
  const user = { id: row.id, email: row.email, display_name: row.display_name };
  const token = sign(user);
  res.json({ user, token });
});

// Upload tracks (authenticated)
app.post('/api/tracks/upload', authMiddleware, upload.single('file'), (req,res)=>{
  const file = req.file;
  if(!file) return res.status(400).json({ error:'No file' });
  // Minimal metadata extraction — you can extend with music-metadata
  const title = file.originalname.replace(/\.[^/.]+$/, "");
  const stmt = db.prepare('INSERT INTO tracks (user_id, filename, title, artist) VALUES (?,?,?,?)');
  const info = stmt.run(req.user.id, file.filename, title, 'Local');
  res.json({ id: info.lastInsertRowid, filename: file.filename, url: `/uploads/${file.filename}` });
});

// List user tracks
app.get('/api/tracks', authMiddleware, (req,res)=>{
  const rows = db.prepare('SELECT id, filename, title, artist FROM tracks WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  const mapped = rows.map(r => ({ ...r, url: `/uploads/${r.filename}` }));
  res.json(mapped);
});

// Playlists CRUD
app.post('/api/playlists', authMiddleware, (req,res)=>{
  const { name } = req.body;
  const info = db.prepare('INSERT INTO playlists (user_id, name, metadata) VALUES (?,?,?)').run(req.user.id, name, JSON.stringify({ tracks:[] }));
  res.json({ id: info.lastInsertRowid, name });
});
app.get('/api/playlists', authMiddleware, (req,res)=>{
  const rows = db.prepare('SELECT id,name,metadata FROM playlists WHERE user_id = ?').all(req.user.id);
  const parsed = rows.map(r => ({ id:r.id, name:r.name, ...JSON.parse(r.metadata) }));
  res.json(parsed);
});
app.put('/api/playlists/:id', authMiddleware, (req,res)=>{
  const id = req.params.id; const metadata = JSON.stringify(req.body.metadata || {});
  db.prepare('UPDATE playlists SET metadata = ? WHERE id = ? AND user_id = ?').run(metadata, id, req.user.id);
  res.json({ ok:true });
});
app.delete('/api/playlists/:id', authMiddleware, (req,res)=>{
  db.prepare('DELETE FROM playlists WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok:true });
});

// Settings (save theme etc)
app.post('/api/settings', authMiddleware, (req,res)=>{
  const s = JSON.stringify(req.body);
  db.prepare('INSERT INTO settings (user_id, data) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data').run(req.user.id, s);
  res.json({ ok:true });
});
app.get('/api/settings', authMiddleware, (req,res)=>{
  const row = db.prepare('SELECT data FROM settings WHERE user_id = ?').get(req.user.id);
  res.json(row ? JSON.parse(row.data) : {});
});

// Server static (optional front-end hosting)
app.use('/', express.static(path.join(__dirname,'../frontend')));

app.listen(PORT, ()=> console.log('Server running on', PORT));
