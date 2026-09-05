const path = require("path");
const os = require("os");
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

function seedSqliteData(database) {
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
}

function createSqliteDatabase() {
  const defaultDatabasePath = process.env.VERCEL
    ? path.join(os.tmpdir(), "portal-mamae-margarida.sqlite")
    : path.join(__dirname, "..", "database.sqlite");
  const database = new DatabaseSync(
    process.env.DATABASE_PATH || defaultDatabasePath,
  );
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
  seedSqliteData(database);
  return database;
}

function sqliteRepository() {
  const database = createSqliteDatabase();
  return {
    findUserByEmail: async (email) =>
      database.prepare("SELECT * FROM users WHERE email = ?").get(email),
    findUserById: async (id) =>
      database
        .prepare("SELECT id, name, email, created_at FROM users WHERE id = ?")
        .get(id),
    createUser: async (name, email, password) =>
      database
        .prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)")
        .run(name, email, password),
    getSession: async (sid) =>
      database
        .prepare("SELECT data FROM sessions WHERE sid = ? AND expires_at > ?")
        .get(sid, Date.now()),
    saveSession: async (sid, data, expiresAt) =>
      database
        .prepare(
          "INSERT INTO sessions (sid, data, expires_at) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at",
        )
        .run(sid, data, expiresAt),
    touchSession: async (sid, expiresAt) =>
      database
        .prepare("UPDATE sessions SET expires_at = ? WHERE sid = ?")
        .run(expiresAt, sid),
    deleteSession: async (sid) =>
      database.prepare("DELETE FROM sessions WHERE sid = ?").run(sid),
    deleteExpiredSessions: async (now) =>
      database.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now),
    listActivities: async () =>
      database
        .prepare(
          "SELECT id, title, description, date, category FROM activities ORDER BY date ASC",
        )
        .all(),
    getStats: async () => ({
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
}

function postgresRepository(connectionString) {
  const { neon } = require("@neondatabase/serverless");
  const sql = neon(connectionString);
  let initialize;

  async function ready() {
    if (!initialize) initialize = initializeSchema();
    return initialize;
  }

  async function initializeSchema() {
    await sql(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await sql(`
      CREATE TABLE IF NOT EXISTS activities (
        id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        date DATE NOT NULL,
        category TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await sql(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        expires_at BIGINT NOT NULL
      );
    `);
    await sql(
      "CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)",
    );
    await seedPostgresData();
  }

  async function seedPostgresData() {
    if (process.env.SEED_DEMO_DATA !== "true") return;

    const [{ count: userCount }] = await sql(
      "SELECT COUNT(*)::int AS count FROM users",
    );
    if (userCount === 0) {
      await sql(
        "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING",
        [
          "Visitante Mamae Margarida",
          "demo@mamaemargarida.org",
          bcrypt.hashSync("margarida123", 12),
        ],
      );
    }

    const [{ count: activityCount }] = await sql(
      "SELECT COUNT(*)::int AS count FROM activities",
    );
    if (activityCount === 0) {
      await sql(
        `INSERT INTO activities (title, description, date, category) VALUES
          ($1, $2, $3, $4),
          ($5, $6, $7, $8),
          ($9, $10, $11, $12)`,
        [
          "Roda de conversa",
          "Um encontro leve para compartilhar experiências e fortalecer vínculos.",
          "2026-09-03",
          "Encontro",
          "Oficina de autocuidado",
          "Práticas simples para cuidar de si com mais presença no dia a dia.",
          "2026-09-10",
          "Oficina",
          "Aula de movimento",
          "Alongamento e movimento consciente para todos os corpos.",
          "2026-09-17",
          "Bem-estar",
        ],
      );
    }
  }

  async function query(statement, parameters = []) {
    await ready();
    return sql(statement, parameters);
  }

  return {
    findUserByEmail: async (email) => {
      const rows = await query("SELECT * FROM users WHERE email = $1", [email]);
      return rows[0];
    },
    findUserById: async (id) => {
      const rows = await query(
        "SELECT id, name, email, created_at FROM users WHERE id = $1",
        [id],
      );
      return rows[0];
    },
    createUser: async (name, email, password) => {
      const rows = await query(
        "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id",
        [name, email, password],
      );
      return { lastInsertRowid: rows[0].id };
    },
    getSession: async (sid) => {
      const rows = await query(
        "SELECT data FROM sessions WHERE sid = $1 AND expires_at > $2",
        [sid, Date.now()],
      );
      return rows[0];
    },
    saveSession: async (sid, data, expiresAt) =>
      query(
        `INSERT INTO sessions (sid, data, expires_at) VALUES ($1, $2, $3)
         ON CONFLICT (sid) DO UPDATE SET data = EXCLUDED.data, expires_at = EXCLUDED.expires_at`,
        [sid, data, expiresAt],
      ),
    touchSession: async (sid, expiresAt) =>
      query("UPDATE sessions SET expires_at = $1 WHERE sid = $2", [
        expiresAt,
        sid,
      ]),
    deleteSession: async (sid) =>
      query("DELETE FROM sessions WHERE sid = $1", [sid]),
    deleteExpiredSessions: async (now) =>
      query("DELETE FROM sessions WHERE expires_at <= $1", [now]),
    listActivities: async () =>
      query(
        "SELECT id, title, description, date::text AS date, category FROM activities ORDER BY date ASC",
      ),
    getStats: async () => {
      const [activityRows, memberRows, nextActivityRows] = await Promise.all([
        query("SELECT COUNT(*)::int AS count FROM activities"),
        query("SELECT COUNT(*)::int AS count FROM users"),
        query(
          "SELECT date::text AS date FROM activities WHERE date >= CURRENT_DATE ORDER BY date ASC LIMIT 1",
        ),
      ]);
      return {
        activities: activityRows[0].count,
        members: memberRows[0].count,
        nextActivity: nextActivityRows[0]?.date || null,
      };
    },
  };
}

if (databaseUrl) {
  module.exports = postgresRepository(databaseUrl);
} else {
  if (process.env.VERCEL) {
    console.warn(
      "DATABASE_URL não definido: usando SQLite temporário. Configure Postgres para persistir usuários e sessões.",
    );
  }
  module.exports = sqliteRepository();
}
