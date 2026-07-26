const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// This function connects to the local file and creates the table if it doesn't exist
async function getDb() {
  const db = await open({
    filename: './database.sqlite', // The file that will be created in your server folder
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      refreshToken TEXT
    )
  `);

  return db;
}

module.exports = getDb;