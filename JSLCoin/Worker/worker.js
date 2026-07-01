const JSL_PROGRAM = `
Ω
SYSTEM JSL_COIN_NETWORK
VERSION 1.1
LANGUAGE JSL
ENGINE JSL_NATIVE_RUNTIME
DATABASE jsl_coin_network_db
NODE api.jsl-ian.com

COMMAND STATUS
COMMAND GENESIS
COMMAND TABLES
COMMAND REGISTER
COMMAND LOGIN
COMMAND WALLET
COMMAND TRANSFER
COMMAND TREASURY_SETTLE
COMMAND ISSUE
COMMAND TRANSACTIONS
COMMAND USERS
COMMAND OWNER

PAIR USER WALLET
PAIR TRANSACTION WALLET
PAIR NODE DATABASE
PAIR OWNER GENESIS

RETURN SYSTEM
RETURN STATUS
RETURN TABLES
RETURN USER
RETURN WALLET
RETURN TRANSACTION
RETURN GENESIS
RETURN OWNER
Ω
`;

const CORS_HEADERS = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,x-owner-key"
};

function response(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: CORS_HEADERS });
}

function parseJSL(src) {
  const s = { data: {}, commands: [], pairs: [], returns: [] };
  for (const line of src.split("\n").map(x => x.trim()).filter(Boolean)) {
    if (line === "Ω") continue;
    if (line === "END") break;
    if (line.startsWith("COMMAND ")) { s.commands.push(line.slice(8)); continue; }
    if (line.startsWith("PAIR ")) { s.pairs.push(line.slice(5)); continue; }
    if (line.startsWith("RETURN ")) { s.returns.push(line.slice(7)); continue; }
    const p = line.split(" ");
    const k = p.shift();
    s.data[k] = p.join(" ");
  }
  return s;
}

function makeId(prefix) {
  return prefix + "_" + crypto.randomUUID().replaceAll("-", "").slice(0, 16);
}

async function sha256(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function bodyJson(request) {
  if (request.method !== "POST") return {};
  try { return await request.json(); } catch { return {}; }
}

async function ensureTables(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jsl_id TEXT UNIQUE,
    username TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    status TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS wallets (
    wallet_id TEXT PRIMARY KEY,
    user_id INTEGER,
    balance REAL DEFAULT 0,
    locked_balance REAL DEFAULT 0,
    status TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS treasury (
    treasury_id TEXT PRIMARY KEY,
    balance REAL DEFAULT 0,
    status TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS transactions (
    tx_id TEXT PRIMARY KEY,
    request_id TEXT,
    omega_pair_proof TEXT,
    proof_hash TEXT,
    from_wallet TEXT,
    to_wallet TEXT,
    amount REAL,
    type TEXT,
    status TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS genesis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coin_id TEXT UNIQUE,
    genesis_id TEXT UNIQUE,
    omega_pair_proof TEXT,
    proof_hash TEXT,
    owner_key_hash TEXT,
    status TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    user_id INTEGER,
    device TEXT,
    ip TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS owner (
    owner_id TEXT PRIMARY KEY,
    owner_key_hash TEXT,
    status TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`INSERT OR IGNORE INTO treasury (treasury_id, balance, status)
    VALUES ('TREASURY', 1000000, 'active')`).run();
}

async function ownerOK(request, env, body = {}) {
  const owner = await env.DB.prepare("SELECT owner_key_hash FROM owner WHERE owner_id='OWNER' AND status='active'").first();
  if (!owner) return true; // before genesis, allow initialization
  const key = request.headers.get("x-owner-key") || body.owner_key || "";
  if (!key) return false;
  return await sha256(key) === owner.owner_key_hash;
}

async function nativeExecute(command, request, env, state) {
  await ensureTables(env);

  if (!state.commands.includes(command)) {
    return response({ status: "error", message: "Command not allowed by JSL program", command }, 403);
  }

  if (command === "STATUS") {
    const genesis = await env.DB.prepare("SELECT coin_id, genesis_id, status, created_at FROM genesis ORDER BY id ASC LIMIT 1").first();
    return response({
      status: "online",
      system: state.data.SYSTEM,
      version: state.data.VERSION,
      language: state.data.LANGUAGE,
      engine: state.data.ENGINE,
      database: state.data.DATABASE,
      node: state.data.NODE,
      genesis: genesis || null,
      pairs: state.pairs,
      commands: state.commands,
      returns: state.returns,
      time: new Date().toISOString()
    });
  }

  if (command === "GENESIS") {
    const b = await bodyJson(request);
    const existing = await env.DB.prepare("SELECT * FROM genesis ORDER BY id ASC LIMIT 1").first();
    if (existing) {
      return response({ status: "success", command: "GENESIS", message: "Omega Coin Genesis already initialized", genesis: existing });
    }

    const owner_key = b.owner_key || makeId("OWNERKEY");
    const owner_key_hash = await sha256(owner_key);
    const coin_id = makeId("OMEGA");
    const genesis_id = makeId("GENESIS");
    const omega_pair_proof = "OMEGA_PAIR_PROOF";
    const proof_hash = await sha256(coin_id + genesis_id + omega_pair_proof + owner_key_hash + Date.now().toString());

    await env.DB.prepare("INSERT INTO genesis (coin_id, genesis_id, omega_pair_proof, proof_hash, owner_key_hash, status) VALUES (?,?,?,?,?,?)")
      .bind(coin_id, genesis_id, omega_pair_proof, proof_hash, owner_key_hash, "active").run();

    await env.DB.prepare("INSERT OR REPLACE INTO owner (owner_id, owner_key_hash, status) VALUES ('OWNER', ?, 'active')")
      .bind(owner_key_hash).run();

    await env.DB.prepare("INSERT INTO transactions (tx_id, request_id, omega_pair_proof, proof_hash, from_wallet, to_wallet, amount, type, status) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(genesis_id, coin_id, omega_pair_proof, proof_hash, "OMEGA", "TREASURY", 0, "GENESIS", "completed").run();

    return response({
      status: "success",
      command: "GENESIS",
      coin_id,
      genesis_id,
      omega_pair_proof,
      proof_hash,
      owner_key,
      message: "Omega Coin Genesis initialized. Save owner_key securely."
    });
  }

  if (command === "TABLES") {
    const r = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    return response({ status: "success", command: "TABLES", tables: r.results.map(x => x.name) });
  }

  if (command === "REGISTER") {
    const b = await bodyJson(request);
    const username = (b.username || "").trim();
    const email = (b.email || "").trim().toLowerCase();
    const password = b.password || "";
    if (!username || !email || !password) return response({ status: "error", message: "username, email and password required" }, 400);

    const exists = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
    if (exists) return response({ status: "error", message: "account already exists" }, 409);

    const jsl_id = makeId("JSL");
    const wallet_id = makeId("WALLET");
    const password_hash = await sha256(password);
    const u = await env.DB.prepare("INSERT INTO users (jsl_id, username, email, password_hash, status) VALUES (?,?,?,?,?)")
      .bind(jsl_id, username, email, password_hash, "active").run();
    const user_id = u.meta.last_row_id;
    await env.DB.prepare("INSERT INTO wallets (wallet_id, user_id, balance, locked_balance, status) VALUES (?,?,?,?,?)")
      .bind(wallet_id, user_id, 0, 0, "active").run();

    return response({ status: "success", command: "REGISTER", message: "JSL-ian Account created", user: { id: user_id, jsl_id, username, email, status: "active" }, wallet: { wallet_id, balance: 0, status: "active" } });
  }

  if (command === "LOGIN") {
    const b = await bodyJson(request);
    const email = (b.email || "").trim().toLowerCase();
    const password_hash = await sha256(b.password || "");
    const user = await env.DB.prepare("SELECT id, jsl_id, username, email, status FROM users WHERE email=? AND password_hash=?")
      .bind(email, password_hash).first();
    if (!user) return response({ status: "error", message: "invalid login" }, 401);
    const session_id = makeId("SESSION");
    await env.DB.prepare("INSERT INTO sessions (session_id, user_id, device, ip) VALUES (?,?,?,?)")
      .bind(session_id, user.id, request.headers.get("user-agent") || "device", request.headers.get("cf-connecting-ip") || "").run();
    return response({ status: "success", command: "LOGIN", session_id, user });
  }

  if (command === "WALLET") {
    const url = new URL(request.url);
    const email = (url.searchParams.get("email") || "").toLowerCase();
    const row = await env.DB.prepare("SELECT users.id, users.jsl_id, users.username, users.email, wallets.wallet_id, wallets.balance, wallets.status FROM users JOIN wallets ON users.id=wallets.user_id WHERE users.email=?")
      .bind(email).first();
    if (!row) return response({ status: "error", message: "wallet not found" }, 404);
    return response({ status: "success", command: "WALLET", wallet: row });
  }

  if (command === "ISSUE") {
    const b = await bodyJson(request);
    if (!(await ownerOK(request, env, b))) return response({ status: "error", message: "owner authorization required" }, 401);
    const to = (b.to || b.email || "").trim().toLowerCase();
    const amount = Number(b.amount || 0);
    if (!to || amount <= 0) return response({ status: "error", message: "invalid issue" }, 400);

    const userWallet = await env.DB.prepare("SELECT wallet_id FROM users JOIN wallets ON users.id=wallets.user_id WHERE users.email=?")
      .bind(to).first();
    if (!userWallet) return response({ status: "error", message: "receiver wallet not found" }, 404);

    const treasury = await env.DB.prepare("SELECT balance FROM treasury WHERE treasury_id='TREASURY'").first();
    if (!treasury || treasury.balance < amount) return response({ status: "error", message: "treasury balance insufficient" }, 400);

    const tx_id = makeId("TX");
    const request_id = makeId("REQ");
    const omega_pair_proof = makeId("OP");
    const proof_hash = await sha256(request_id + omega_pair_proof + Date.now().toString());

    await env.DB.prepare("UPDATE treasury SET balance=balance-?, updated_at=CURRENT_TIMESTAMP WHERE treasury_id='TREASURY'").bind(amount).run();
    await env.DB.prepare("UPDATE wallets SET balance=balance+?, updated_at=CURRENT_TIMESTAMP WHERE wallet_id=?").bind(amount, userWallet.wallet_id).run();
    await env.DB.prepare("INSERT INTO transactions (tx_id, request_id, omega_pair_proof, proof_hash, from_wallet, to_wallet, amount, type, status) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(tx_id, request_id, omega_pair_proof, proof_hash, "TREASURY", userWallet.wallet_id, amount, "ISSUE", "completed").run();

    return response({ status: "success", command: "ISSUE", tx_id, request_id, omega_pair_proof, proof_hash, from: "TREASURY", to: userWallet.wallet_id, amount, message: "Owner Issue completed through Omega Pair Proof" });
  }

  if (command === "TRANSFER") {
    const b = await bodyJson(request);
    const from_email = (b.from_email || "").trim().toLowerCase();
    const to_email = (b.to_email || "").trim().toLowerCase();
    const amount = Number(b.amount || 0);
    if (!from_email || !to_email || amount <= 0) return response({ status: "error", message: "invalid transfer" }, 400);

    const from = await env.DB.prepare("SELECT wallets.wallet_id, wallets.balance FROM users JOIN wallets ON users.id=wallets.user_id WHERE users.email=?")
      .bind(from_email).first();
    const to = await env.DB.prepare("SELECT wallets.wallet_id FROM users JOIN wallets ON users.id=wallets.user_id WHERE users.email=?")
      .bind(to_email).first();
    if (!from || !to) return response({ status: "error", message: "wallet not found" }, 404);
    if (from.balance < amount) return response({ status: "error", message: "insufficient balance" }, 400);

    const tx_id = makeId("TX");
    const request_id = makeId("REQ");
    const omega_pair_proof = makeId("OP");
    const proof_hash = await sha256(request_id + omega_pair_proof + from.wallet_id + to.wallet_id + amount + Date.now().toString());

    await env.DB.prepare("UPDATE wallets SET balance=balance-?, updated_at=CURRENT_TIMESTAMP WHERE wallet_id=?").bind(amount, from.wallet_id).run();
    await env.DB.prepare("UPDATE wallets SET balance=balance+?, updated_at=CURRENT_TIMESTAMP WHERE wallet_id=?").bind(amount, to.wallet_id).run();
    await env.DB.prepare("INSERT INTO transactions (tx_id, request_id, omega_pair_proof, proof_hash, from_wallet, to_wallet, amount, type, status) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(tx_id, request_id, omega_pair_proof, proof_hash, from.wallet_id, to.wallet_id, amount, "TRANSFER", "completed").run();

    return response({ status: "success", command: "TRANSFER", tx_id, from_wallet: from.wallet_id, to_wallet: to.wallet_id, amount, proof_hash });
  }

  if (command === "TREASURY_SETTLE") {
    const treasury = await env.DB.prepare("SELECT * FROM treasury WHERE treasury_id='TREASURY'").first();
    return response({ status: "success", command: "TREASURY_SETTLE", treasury });
  }

  if (command === "TRANSACTIONS") {
    const rows = await env.DB.prepare("SELECT tx_id, request_id, omega_pair_proof, proof_hash, from_wallet, to_wallet, amount, type, status, created_at FROM transactions ORDER BY created_at DESC LIMIT 50").all();
    return response({ status: "success", command: "TRANSACTIONS", transactions: rows.results });
  }

  if (command === "USERS") {
    const rows = await env.DB.prepare("SELECT users.id, users.jsl_id, users.username, users.email, users.status, wallets.wallet_id, wallets.balance FROM users LEFT JOIN wallets ON users.id=wallets.user_id ORDER BY users.id DESC LIMIT 100").all();
    return response({ status: "success", command: "USERS", users: rows.results });
  }

  if (command === "OWNER") {
    const owner = await env.DB.prepare("SELECT owner_id, status, created_at FROM owner WHERE owner_id='OWNER'").first();
    return response({ status: "success", command: "OWNER", owner });
  }

  return response({ status: "error", message: "unknown command", command }, 404);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return response({ ok: true });
    const state = parseJSL(JSL_PROGRAM);
    const url = new URL(request.url);
    let command = "STATUS";

    if (url.pathname === "/status" || url.pathname === "/") command = "STATUS";
    if (url.pathname === "/genesis") command = "GENESIS";
    if (url.pathname === "/tables") command = "TABLES";
    if (url.pathname === "/register") command = "REGISTER";
    if (url.pathname === "/login") command = "LOGIN";
    if (url.pathname === "/wallet") command = "WALLET";
    if (url.pathname === "/issue") command = "ISSUE";
    if (url.pathname === "/transfer") command = "TRANSFER";
    if (url.pathname === "/treasury") command = "TREASURY_SETTLE";
    if (url.pathname === "/transactions") command = "TRANSACTIONS";
    if (url.pathname === "/users") command = "USERS";
    if (url.pathname === "/owner") command = "OWNER";

    return nativeExecute(command, request, env, state);
  }
};
