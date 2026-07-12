
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(
 id TEXT PRIMARY KEY,username TEXT UNIQUE,display_name TEXT NOT NULL,email TEXT UNIQUE,phone TEXT UNIQUE,wallet TEXT UNIQUE NOT NULL,
 role TEXT NOT NULL CHECK(role IN('owner','user')),password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ledger(
 id TEXT PRIMARY KEY,tx_type TEXT NOT NULL,from_account TEXT NOT NULL,to_account TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>0),
 note TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'confirmed',created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet);
CREATE INDEX IF NOT EXISTS idx_ledger_from ON ledger(from_account);
CREATE INDEX IF NOT EXISTS idx_ledger_to ON ledger(to_account);
INSERT OR IGNORE INTO settings(key,value) VALUES('version','7.1'),('genesis','false'),('total_supply','0'),('owner_id','');
