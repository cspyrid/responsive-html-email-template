const fs = require('fs');
const Database = require('better-sqlite3');
require('dotenv').config();

const db = new Database(process.env.DB_PATH || './data/app.db');
const questions = JSON.parse(fs.readFileSync('./data/questions_25_march.json', 'utf8'));
const ins = db.prepare(`INSERT INTO questions
(text, choice_a, choice_b, choice_c, choice_d, correct_choice, difficulty, source_ref)
VALUES (@text,@choice_a,@choice_b,@choice_c,@choice_d,@correct_choice,@difficulty,@source_ref)`);
const tx = db.transaction(() => {
  db.prepare('DELETE FROM questions').run();
  for (const q of questions) ins.run(q);
});
tx();
console.log(`Seeded ${questions.length} questions.`);
