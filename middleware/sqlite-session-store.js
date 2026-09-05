const session = require("express-session");

class SqliteSessionStore extends session.Store {
  constructor(database) {
    super();
    this.database = database;
    this.requestsSinceCleanup = 0;
  }

  get(sid, callback) {
    this.database
      .getSession(sid)
      .then((row) => callback(null, row ? JSON.parse(row.data) : null))
      .catch(callback);
  }

  set(sid, sessionData, callback = () => {}) {
    this.database
      .saveSession(sid, JSON.stringify(sessionData), this.getExpiry(sessionData))
      .then(() => this.cleanup())
      .then(() => callback(null))
      .catch(callback);
  }

  destroy(sid, callback = () => {}) {
    this.database.deleteSession(sid).then(() => callback(null)).catch(callback);
  }

  touch(sid, sessionData, callback = () => {}) {
    this.database
      .touchSession(sid, this.getExpiry(sessionData))
      .then(() => callback(null))
      .catch(callback);
  }

  getExpiry(sessionData) {
    const expiry = new Date(sessionData.cookie?.expires).getTime();
    return Number.isFinite(expiry) ? expiry : Date.now() + 8 * 60 * 60 * 1000;
  }

  async cleanup() {
    this.requestsSinceCleanup += 1;
    if (this.requestsSinceCleanup >= 100) {
      await this.database.deleteExpiredSessions(Date.now());
      this.requestsSinceCleanup = 0;
    }
  }
}

module.exports = { SqliteSessionStore };
