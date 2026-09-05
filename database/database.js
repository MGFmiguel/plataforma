const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");

// O sistema de arquivos do bundle de uma Vercel Function é somente leitura.
// Em desenvolvimento mantemos o banco ao lado do projeto; na Vercel usamos
// /tmp, o único local gravável. Esse arquivo é efêmero: antes de usar o
// sistema em produção, migre os dados e as sessões para um banco gerenciado.
const defaultDatabasePath = process.env.VERCEL
  ? path.join(process.env.TMPDIR || "/tmp", "portal-mamae-margarida.sqlite")
  : path.join(__dirname, "..", "database.sqlite");
const database = new DatabaseSync(process.env.DATABASE_PATH || defaultDatabasePath);
database.exec("PRAGMA journal_mode = WAL");
database.exec("PRAGMA foreign_keys = ON");

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
`);

const userCount = database
  .prepare("SELECT COUNT(*) AS count FROM users")
  .get().count;
if (userCount === 0 && process.env.SEED_DEMO_DATA === "true") {
  database
    .prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)")
    .run(
      "Visitante Mamae Margarida",
      "demo@mamaemargarida.org",
      bcrypt.hashSync("margarida123", 12),
    );
}

const activityCount = database
  .prepare("SELECT COUNT(*) AS count FROM activities")
  .get().count;
if (activityCount === 0 && process.env.SEED_DEMO_DATA === "true") {
  const insert = database.prepare(
    "INSERT INTO activities (title, description, date, category) VALUES (?, ?, ?, ?)",
  );
  database.exec("BEGIN");
  try {
    insert.run(
      "Roda de conversa",
      "Um encontro leve para compartilhar experiências e fortalecer vínculos.",
      "2026-09-03",
      "Encontro",
    );
    insert.run(
      "Oficina de autocuidado",
      "Práticas simples para cuidar de si com mais presença no dia a dia.",
      "2026-09-10",
      "Oficina",
    );
    insert.run(
      "Aula de movimento",
      "Alongamento e movimento consciente para todos os corpos.",
      "2026-09-17",
      "Bem-estar",
    );
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

module.exports = {
  findUserByEmail: (email) =>
    database.prepare("SELECT * FROM users WHERE email = ?").get(email),
  findUserById: (id) =>
    database
      .prepare("SELECT id, name, email, created_at FROM users WHERE id = ?")
      .get(id),
  createUser: (name, email, password) =>
    database
      .prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)")
      .run(name, email, password),
  getSession: (sid) =>
    database
      .prepare("SELECT data FROM sessions WHERE sid = ? AND expires_at > ?")
      .get(sid, Date.now()),
  saveSession: (sid, data, expiresAt) =>
    database
      .prepare(
        "INSERT INTO sessions (sid, data, expires_at) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at",
      )
      .run(sid, data, expiresAt),
  touchSession: (sid, expiresAt) =>
    database.prepare("UPDATE sessions SET expires_at = ? WHERE sid = ?").run(expiresAt, sid),
  deleteSession: (sid) => database.prepare("DELETE FROM sessions WHERE sid = ?").run(sid),
  deleteExpiredSessions: (now) =>
    database.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now),
  listActivities: () =>
    database
      .prepare(
        "SELECT id, title, description, date, category FROM activities ORDER BY date ASC",
      )
      .all(),
  getStats: () => ({
    activities: database
      .prepare("SELECT COUNT(*) AS count FROM activities")
      .get().count,
    members: database.prepare("SELECT COUNT(*) AS count FROM users").get()
      .count,
    nextActivity:
      database
        .prepare(
          "SELECT date FROM activities WHERE date >= date('now') ORDER BY date ASC LIMIT 1",
        )
        .get()?.date || null,
  }),
};
