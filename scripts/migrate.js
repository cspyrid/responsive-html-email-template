const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './data/app.db';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
const sql = fs.readFileSync(path.join(__dirname, '001_init.sql'), 'utf8');
db.exec(sql);
console.log('Migration applied at', dbPath);
