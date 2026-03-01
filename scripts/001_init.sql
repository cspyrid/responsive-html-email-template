PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  grade TEXT NOT NULL CHECK(grade IN ('Α','Β','Γ')),
  section INTEGER NOT NULL CHECK(section BETWEEN 1 AND 8),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','live','finished')),
  host_pin TEXT NOT NULL,
  created_at TEXT NOT NULL,
  started_at TEXT,
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  player_count INTEGER NOT NULL CHECK(player_count > 0)
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  choice_a TEXT NOT NULL,
  choice_b TEXT NOT NULL,
  choice_c TEXT NOT NULL,
  choice_d TEXT NOT NULL,
  correct_choice TEXT NOT NULL CHECK(correct_choice IN ('A','B','C','D')),
  difficulty TEXT DEFAULT 'medium',
  source_ref TEXT
);

CREATE TABLE IF NOT EXISTS session_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id),
  order_index INTEGER NOT NULL,
  UNIQUE(session_id, order_index)
);

CREATE TABLE IF NOT EXISTS turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_order_index INTEGER NOT NULL,
  group_id INTEGER NOT NULL REFERENCES groups(id),
  opened_at TEXT,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id),
  question_id INTEGER NOT NULL REFERENCES questions(id),
  selected_choice TEXT,
  is_correct INTEGER NOT NULL,
  time_ms INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lottery_draws (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  result_group_id INTEGER NOT NULL REFERENCES groups(id),
  proof_json TEXT NOT NULL
);
