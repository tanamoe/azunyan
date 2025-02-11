import Database from "better-sqlite3";

export class Scrobble {
  #db;

  constructor() {
    this.#db = new Database("azunyan.db");

    this.#prepare();
  }

  #prepare() {
    this.#db
      .prepare(
        "CREATE TABLE IF NOT EXISTS listenbrainz (user_id TEXT PRIMARY KEY, token TEXT)",
      )
      .run();
  }

  setToken(userId: string, token: string): boolean {
    const statement = this.#db
      .prepare(
        "INSERT INTO listenbrainz (user_id, token) VALUES (@userId, @token) ON CONFLICT (user_id) DO UPDATE SET token=excluded.token",
      )
      .run({ userId, token });

    if (statement.changes) return true;

    return false;
  }

  removeToken(userId: string): boolean {
    const statement = this.#db
      .prepare("DELETE FROM listenbrainz WHERE user_id = ?")
      .run(userId);

    if (statement.changes) return true;

    return false;
  }

  getTokenFromUserId(userId: string): string | undefined {
    const statement = this.#db.prepare(
      "SELECT token FROM listenbrainz WHERE user_id = ?",
    );

    return (statement.get(userId) as { token: string })?.token;
  }
}
