const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');
const dotenv = require('dotenv');
const { z } = require('zod');
const { computeScores, selectLotteryCandidates, securePick, buildDrawProof } = require('./logic');

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DB_PATH = process.env.DB_PATH || './data/app.db';
const QUESTION_TIME_LIMIT_SEC = Number(process.env.QUESTION_TIME_LIMIT_SEC || 25);
const POINTS_CORRECT = Number(process.env.POINTS_CORRECT || 1);

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const sessionSchema = z.object({
  grade: z.enum(['Α', 'Β', 'Γ']),
  section: z.number().min(1).max(8),
  groups: z.array(z.object({ name: z.string().min(1).optional(), player_count: z.number().int().positive() })).length(3),
});

function code() { return crypto.randomBytes(3).toString('hex').toUpperCase(); }
function pin() { return String(Math.floor(100000 + Math.random() * 900000)); }

function getSessionByCode(codeVal) {
  return db.prepare('SELECT * FROM sessions WHERE code=?').get(codeVal);
}

function getScoreboard(sessionId) {
  const answers = db.prepare('SELECT group_id, is_correct FROM answers WHERE session_id=?').all(sessionId);
  const groups = db.prepare('SELECT id, name FROM groups WHERE session_id=? ORDER BY id').all(sessionId);
  const scores = computeScores(answers, POINTS_CORRECT);
  return groups.map((g) => ({ group_id: g.id, name: g.name, score: scores.get(g.id) || 0 }));
}

app.post('/api/admin/login', (req, res) => {
  const ok = req.body.password === ADMIN_PASSWORD;
  return res.json({ ok });
});

app.post('/api/host/sessions', (req, res) => {
  const parsed = sessionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const now = new Date().toISOString();
  let c = code();
  while (getSessionByCode(c)) c = code();
  const hp = pin();
  const result = db.prepare('INSERT INTO sessions(code,grade,section,status,host_pin,created_at) VALUES(?,?,?,?,?,?)')
    .run(c, parsed.data.grade, parsed.data.section, 'draft', hp, now);
  const sid = result.lastInsertRowid;
  const insGroup = db.prepare('INSERT INTO groups(session_id,name,player_count) VALUES(?,?,?)');
  parsed.data.groups.forEach((g, idx) => insGroup.run(sid, g.name || `Ομάδα ${idx + 1}`, g.player_count));
  res.json({ session_id: sid, code: c, host_pin: hp });
});

app.post('/api/host/sessions/:code/start', (req, res) => {
  const session = getSessionByCode(req.params.code);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (req.body.host_pin !== session.host_pin) return res.status(403).json({ error: 'Invalid PIN' });

  const questions = db.prepare('SELECT id FROM questions ORDER BY RANDOM() LIMIT 15').all();
  const ins = db.prepare('INSERT INTO session_questions(session_id,question_id,order_index) VALUES(?,?,?)');
  const clear = db.prepare('DELETE FROM session_questions WHERE session_id=?');
  const upd = db.prepare('UPDATE sessions SET status=?, started_at=? WHERE id=?');
  const tx = db.transaction(() => {
    clear.run(session.id);
    questions.forEach((q, i) => ins.run(session.id, q.id, i + 1));
    upd.run('live', new Date().toISOString(), session.id);
  });
  tx();
  io.to(`session-${session.code}`).emit('session:started', { code: session.code });
  res.json({ ok: true });
});

app.get('/api/sessions/:code/state', (req, res) => {
  const session = getSessionByCode(req.params.code);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const groups = db.prepare('SELECT id,name,player_count FROM groups WHERE session_id=?').all(session.id);
  const scoreboard = getScoreboard(session.id);
  const total = db.prepare('SELECT COUNT(*) as c FROM session_questions WHERE session_id=?').get(session.id).c;
  res.json({ session, groups, scoreboard, total_questions: total, question_time_limit_sec: QUESTION_TIME_LIMIT_SEC });
});

app.post('/api/sessions/:code/answer', (req, res) => {
  const session = getSessionByCode(req.params.code);
  if (!session || session.status !== 'live') return res.status(400).json({ error: 'Session not live' });
  const schema = z.object({ group_id: z.number(), question_order_index: z.number(), selected_choice: z.enum(['A', 'B', 'C', 'D']).optional(), time_ms: z.number().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const mapping = db.prepare('SELECT question_id FROM session_questions WHERE session_id=? AND order_index=?').get(session.id, parsed.data.question_order_index);
  if (!mapping) return res.status(404).json({ error: 'Question not found' });
  const q = db.prepare('SELECT correct_choice FROM questions WHERE id=?').get(mapping.question_id);
  const isCorrect = parsed.data.selected_choice && parsed.data.selected_choice === q.correct_choice ? 1 : 0;

  db.prepare('INSERT INTO answers(session_id,group_id,question_id,selected_choice,is_correct,time_ms,created_at) VALUES(?,?,?,?,?,?,?)')
    .run(session.id, parsed.data.group_id, mapping.question_id, parsed.data.selected_choice || null, isCorrect, parsed.data.time_ms || null, new Date().toISOString());

  const scoreboard = getScoreboard(session.id);
  io.to(`session-${session.code}`).emit('scoreboard:update', { scoreboard });
  res.json({ is_correct: Boolean(isCorrect), scoreboard });
});

app.post('/api/admin/lottery/run', (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Unauthorized' });
  const ruleType = req.body.rule_type === 'B' ? 'B' : 'A';

  const groups = db.prepare(`
    SELECT g.id as group_id, g.name, s.grade, s.section
    FROM groups g JOIN sessions s ON s.id=g.session_id
    WHERE s.status='finished' OR s.status='live'
  `).all();

  const ranked = groups.map((g) => ({ ...g, score: (getScoreboardByGroupId(g.group_id)) }))
    .sort((a, b) => b.score - a.score);
  const candidates = selectLotteryCandidates(ruleType, ranked, 10);
  const { selected, randomHex } = securePick(candidates);
  const proof = buildDrawProof(ruleType, candidates.map((c) => c.group_id), selected.group_id, randomHex);
  db.prepare('INSERT INTO lottery_draws(rule_type,created_at,input_hash,result_group_id,proof_json) VALUES(?,?,?,?,?)')
    .run(ruleType, proof.timestamp, proof.inputHash, selected.group_id, JSON.stringify(proof));

  res.json({ winner: selected, proof });
});

function getScoreboardByGroupId(groupId) {
  const row = db.prepare('SELECT COUNT(*) as c FROM answers WHERE group_id=? AND is_correct=1').get(groupId);
  return row.c * POINTS_CORRECT;
}

io.on('connection', (socket) => {
  socket.on('session:join', ({ code, role, group_id }) => {
    socket.join(`session-${code}`);
    socket.data = { code, role, group_id };
  });

  socket.on('turn:open', ({ code, question_order_index }) => {
    const session = getSessionByCode(code);
    if (!session) return;
    const groups = db.prepare('SELECT id FROM groups WHERE session_id=? ORDER BY id').all(session.id);
    const group = groups[(question_order_index - 1) % 3];
    io.to(`session-${code}`).emit('turn:update', { question_order_index, active_group_id: group.id, time_limit_sec: QUESTION_TIME_LIMIT_SEC });
  });
});

server.listen(PORT, () => {
  console.log(`Server ready on http://localhost:${PORT}`);
});
