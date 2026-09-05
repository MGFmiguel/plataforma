const session = require("express-session");

class SqliteSessionStore extends session.Store {
  constructor(database) {
    super();
    this.database = database;
    this.requestsSinceCleanup = 0;
  }

  get(sid, callback) {
    try {
      const row = this.database.getSession(sid);
      callback(null, row ? JSON.parse(row.data) : null);
    } catch (error) {
      callback(error);
    }
  }

  set(sid, sessionData, callback = () => {}) {
    try {
      this.database.saveSession(sid, JSON.stringify(sessionData), this.getExpiry(sessionData));
      this.cleanup();
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  destroy(sid, callback = () => {}) {
    try {
      this.database.deleteSession(sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  touch(sid, sessionData, callback = () => {}) {
    try {
      this.database.touchSession(sid, this.getExpiry(sessionData));
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  getExpiry(sessionData) {
    const expiry = new Date(sessionData.cookie?.expires).getTime();
    return Number.isFinite(expiry) ? expiry : Date.now() + 8 * 60 * 60 * 1000;
  }

  cleanup() {
    this.requestsSinceCleanup += 1;
    if (this.requestsSinceCleanup >= 100) {
      this.database.deleteExpiredSessions(Date.now());
      this.requestsSinceCleanup = 0;
    }
  }
}

module.exports = { SqliteSessionStore };
