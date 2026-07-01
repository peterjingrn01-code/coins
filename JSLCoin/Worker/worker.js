const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Owner-Key"
};

const state = {
  coin: "JSLCoin",
  genesis: false,
  ownerKey: null,
  totalSupply: 0,
  circulating: 0,
  treasury: 0,
  users: {},
  ledger: []
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS }
  });
}

function tx(type, from, to, amount, status = "confirmed") {
  const row = {
    id: "TX-" + String(state.ledger.length + 1).padStart(6, "0"),
    type,
    from,
    to,
    amount: Number(amount || 0),
    status,
    time: new Date().toISOString()
  };
  state.ledger.unshift(row);
  return row;
}

async function body(req) {
  try { return await req.json(); } catch { return {}; }
}

function ensureGenesis() {
  if (!state.genesis) throw new Error("Genesis has not been started");
}

function ensureUser(name) {
  const key = String(name || "").trim();
  if (!key) throw new Error("User name is required");
  if (!state.users[key]) state.users[key] = { name: key, balance: 0, created: new Date().toISOString() };
  return state.users[key];
}

async function handle(req) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (req.method === "GET" && path === "/") {
    return json({ ok: true, service: "JSLCoin Worker API", routes: ["/status", "/transactions", "/genesis", "/issue", "/register", "/buy", "/sell", "/send", "/pair-confirm"] });
  }

  if (req.method === "GET" && path === "/status") {
    return json({
      ok: true,
      coin: state.coin,
      genesis: state.genesis,
      totalSupply: state.totalSupply,
      circulating: state.circulating,
      treasury: state.treasury,
      users: Object.keys(state.users).length,
      ledgerCount: state.ledger.length
    });
  }

  if (req.method === "GET" && path === "/transactions") {
    return json({ ok: true, transactions: state.ledger, ledger: state.ledger });
  }

  if (req.method === "POST" && path === "/genesis") {
    if (!state.genesis) {
      state.genesis = true;
      state.ownerKey = crypto.randomUUID();
      tx("GENESIS", "SYSTEM", "OWNER", 0, "confirmed");
    }
    return json({ ok: true, genesis: true, owner_key: state.ownerKey, ownerKey: state.ownerKey });
  }

  if (req.method === "POST" && path === "/issue") {
    ensureGenesis();
    const data = await body(req);
    const amount = Number(data.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Issue amount must be positive");
    state.totalSupply += amount;
    state.treasury += amount;
    tx("ISSUE", "OWNER", "TREASURY", amount, "confirmed");
    return json({ ok: true, totalSupply: state.totalSupply, circulating: state.circulating, treasury: state.treasury });
  }

  if (req.method === "POST" && path === "/register") {
    ensureGenesis();
    const data = await body(req);
    const user = ensureUser(data.user || data.name || data.username);
    tx("REGISTER", "USER", user.name, 0, "confirmed");
    return json({ ok: true, user });
  }

  if (req.method === "POST" && path === "/buy") {
    ensureGenesis();
    const data = await body(req);
    const user = ensureUser(data.user);
    const amount = Number(data.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Buy amount must be positive");
    if (state.treasury < amount) throw new Error("Treasury balance is insufficient");
    state.treasury -= amount;
    state.circulating += amount;
    user.balance += amount;
    const row = tx("BUY", "TREASURY", user.name, amount, "confirmed");
    return json({ ok: true, user, treasury: state.treasury, circulating: state.circulating, transaction: row });
  }

  if (req.method === "POST" && path === "/sell") {
    ensureGenesis();
    const data = await body(req);
    const user = ensureUser(data.user);
    const amount = Number(data.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Sell amount must be positive");
    if (user.balance < amount) throw new Error("User balance is insufficient");
    user.balance -= amount;
    state.treasury += amount;
    state.circulating -= amount;
    const row = tx("SELL", user.name, "TREASURY", amount, "confirmed");
    return json({ ok: true, user, treasury: state.treasury, circulating: state.circulating, transaction: row });
  }

  if (req.method === "POST" && path === "/send") {
    ensureGenesis();
    const data = await body(req);
    const from = ensureUser(data.from);
    const to = ensureUser(data.to);
    const amount = Number(data.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Send amount must be positive");
    if (from.balance < amount) throw new Error("Sender balance is insufficient");
    from.balance -= amount;
    to.balance += amount;
    const row = tx("SEND", from.name, to.name, amount, "confirmed");
    return json({ ok: true, from, to, transaction: row });
  }

  if (req.method === "POST" && path === "/pair-confirm") {
    ensureGenesis();
    const data = await body(req);
    const receiver = ensureUser(data.receiver || data.user);
    const row = tx("PAIR_CONFIRM", "PAIR", receiver.name, 0, "confirmed");
    return json({ ok: true, receiver, transaction: row });
  }

  return json({ ok: false, error: "Not found", path }, 404);
}

export default {
  async fetch(req, env, ctx) {
    try { return await handle(req); }
    catch (e) { return json({ ok: false, error: e.message || String(e) }, 400); }
  }
};
