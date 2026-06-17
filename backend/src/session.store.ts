import Database from 'better-sqlite3';
import session from 'express-session';

/**
 * Store de session SQLite minimal, basé sur better-sqlite3 (déjà présent en dépendance).
 * Persiste les sessions entre les redémarrages du serveur (hot-reload dev inclus).
 */
export function createSqliteSessionStore(dbPath: string): session.Store {
  const db = new Database(dbPath);

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS sessions (
      sid     TEXT    PRIMARY KEY,
      sess    TEXT    NOT NULL,
      expired INTEGER NOT NULL
    )
  `,
  ).run();

  // Nettoyage toutes les minutes.
  setInterval(() => {
    db.prepare('DELETE FROM sessions WHERE expired < ?').run(Date.now());
  }, 60_000).unref();

  class SqliteStore extends session.Store {
    get(
      sid: string,
      cb: (err: unknown, session?: session.SessionData | null) => void,
    ): void {
      try {
        const row = db
          .prepare('SELECT sess, expired FROM sessions WHERE sid = ?')
          .get(sid) as { sess: string; expired: number } | undefined;

        if (!row || row.expired < Date.now()) return cb(null, null);
        cb(null, JSON.parse(row.sess) as session.SessionData);
      } catch (err) {
        cb(err);
      }
    }

    set(
      sid: string,
      sess: session.SessionData,
      cb?: (err?: unknown) => void,
    ): void {
      try {
        const maxAge = (sess.cookie?.maxAge ?? 86_400) * 1000;
        const expired = Date.now() + maxAge;
        db.prepare(
          'INSERT OR REPLACE INTO sessions (sid, sess, expired) VALUES (?, ?, ?)',
        ).run(sid, JSON.stringify(sess), expired);
        cb?.();
      } catch (err) {
        cb?.(err);
      }
    }

    destroy(sid: string, cb?: (err?: unknown) => void): void {
      try {
        db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
        cb?.();
      } catch (err) {
        cb?.(err);
      }
    }
  }

  return new SqliteStore();
}
