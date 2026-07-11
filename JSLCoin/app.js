(() => {
  "use strict";

  const C = window.JSL_CONFIG;
  const TOKEN_KEY = "jslcoin_session_token";
  const RESET_LOGIN_KEY = "jslcoin_reset_login";

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  function token() { return localStorage.getItem(TOKEN_KEY) || ""; }
  function setToken(v) { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY); }
  function money(v) { return `${Number(v || 0).toLocaleString()} JSL`; }
  function message(text, type = "") {
    const el = $("message") || $("msg");
    if (!el) return;
    el.textContent = text || "";
    el.className = `message ${type}`.trim();
  }
  function field(id) { return ($ (id)?.value || "").trim(); }

  async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token()) headers.Authorization = `Bearer ${token()}`;
    const res = await fetch(`${C.API_BASE}${path}`, { ...options, headers });
    let data;
    try { data = await res.json(); } catch { data = { ok: false, error: `HTTP ${res.status}` }; }
    if (!res.ok || data.ok === false) throw new Error(data.error || data.message || `HTTP ${res.status}`);
    return data;
  }

  function activeNav() {
    const file = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll("nav a").forEach(a => {
      if ((a.getAttribute("href") || "") === file) a.classList.add("active");
    });
  }

  async function requireUser(role = null) {
    try {
      const data = await api("/me");
      if (role && data.user.role !== role) throw new Error("Permission denied");
      return data.user;
    } catch {
      location.href = role === "owner" ? "login.html" : "wallet-login.html";
      return null;
    }
  }

  async function login() {
    try {
      const data = await api("/login", {
        method: "POST",
        body: JSON.stringify({ login: field("identity"), password: $("password")?.value || "" })
      });
      setToken(data.token);
      location.href = data.user.role === "owner" ? "ownerpage.html" : "dashboard.html";
    } catch (e) { message(e.message, "error"); }
  }

  async function ownerLogin() {
    try {
      const data = await api("/owner-login", {
        method: "POST",
        body: JSON.stringify({
          login: field("identity"),
          email: field("identity"),
          walletKey: field("walletKey"),
          password: $("password")?.value || ""
        })
      });
      setToken(data.token);
      location.href = "ownerpage.html";
    } catch (e) { message(e.message, "error"); }
  }

  async function register() {
    try {
      const data = await api("/register", {
        method: "POST",
        body: JSON.stringify({
          user: field("username"),
          name: field("name"),
          email: field("email"),
          phone: field("phone"),
          password: $("password")?.value || ""
        })
      });
      setToken(data.token);
      location.href = "dashboard.html";
    } catch (e) { message(e.message, "error"); }
  }

  async function logout() {
    try { await api("/logout", { method: "POST", body: "{}" }); } catch {}
    setToken("");
    location.href = "index.html";
  }

  async function renderDashboard() {
    if (!$("dashboardPage")) return;
    const user = await requireUser();
    if (!user) return;
    const tx = await api("/transactions");
    $("userName").textContent = user.displayName;
    $("userRole").textContent = user.role;
    $("userBalance").textContent = money(user.balance);
    $("walletAddress").textContent = user.wallet;
    renderTransactionsInto("recentTransactions", tx.transactions.slice(0, 8));
  }

  async function renderProfile() {
    if (!$("profilePage")) return;
    const user = await requireUser();
    if (!user) return;
    for (const [id, value] of Object.entries({
      profileName: user.displayName, profileUsername: user.username || "—",
      profileEmail: user.email || "—", profilePhone: user.phone || "—",
      profileRole: user.role, profileWallet: user.wallet
    })) if ($(id)) $(id).textContent = value;
  }

  async function renderWallet() {
    if (!$("walletPage")) return;
    const user = await requireUser();
    if (!user) return;
    $("walletName").textContent = user.displayName;
    $("walletBalance").textContent = money(user.balance);
    $("walletAddress").textContent = user.wallet;
  }

  function renderTransactionsInto(id, rows) {
    const el = $(id);
    if (!el) return;
    el.innerHTML = rows.length ? rows.map(t => `
      <tr>
        <td>${esc(new Date(t.time).toLocaleString())}</td>
        <td>${esc(t.type)}</td>
        <td>${esc(t.fromLabel)}</td>
        <td>${esc(t.toLabel)}</td>
        <td>${esc(money(t.amount))}</td>
        <td><span class="pill">${esc(t.status)}</span></td>
      </tr>`).join("") : `<tr><td colspan="6">No transactions.</td></tr>`;
  }

  async function renderTransactions() {
    if (!$("transactionsPage")) return;
    await requireUser();
    const data = await api("/transactions");
    renderTransactionsInto("transactionRows", data.transactions);
  }

  async function transfer() {
    try {
      const data = await api("/send", {
        method: "POST",
        body: JSON.stringify({ to: field("to"), amount: Number(field("amount")) })
      });
      message(data.message || "Transfer completed.", "success");
      setTimeout(() => location.href = "transactions.html", 700);
    } catch (e) { message(e.message, "error"); }
  }

  async function buy() {
    try {
      const data = await api("/buy", {
        method: "POST", body: JSON.stringify({ amount: Number(field("amount")) })
      });
      message(data.message, "success");
    } catch (e) { message(e.message, "error"); }
  }

  async function sell() {
    try {
      const data = await api("/sell", {
        method: "POST", body: JSON.stringify({ amount: Number(field("amount")) })
      });
      message(data.message, "success");
    } catch (e) { message(e.message, "error"); }
  }

  async function renderOwner() {
    if (!$("ownerPage")) return;
    const user = await requireUser("owner");
    if (!user) return;
    const s = await api("/status");
    $("ownerName").textContent = user.displayName;
    $("ownerBalance").textContent = money(user.balance);
    $("totalSupply").textContent = money(s.totalSupply);
    $("circulating").textContent = money(s.circulating);
    $("userCount").textContent = s.users;
  }

  async function ownerSend() {
    try {
      const data = await api("/owner-send", {
        method: "POST",
        body: JSON.stringify({ to: field("to"), amount: Number(field("amount")) })
      });
      message(data.message, "success");
    } catch (e) { message(e.message, "error"); }
  }

  async function renderUserList() {
    if (!$("userListPage")) return;
    await requireUser("owner");
    const data = await api("/users");
    $("userRows").innerHTML = data.users.map(u => `
      <tr><td>${esc(u.displayName)}</td><td>${esc(u.username || "—")}</td>
      <td>${esc(u.email || "—")}</td><td>${esc(u.phone || "—")}</td>
      <td>${esc(u.wallet)}</td><td>${esc(money(u.balance))}</td><td>${esc(u.role)}</td></tr>
    `).join("");
  }

  async function renderLedger() {
    if (!$("ledgerPage")) return;
    await requireUser("owner");
    const data = await api("/ledger");
    $("ledgerRows").innerHTML = data.transactions.map((t, i) => `
      <tr><td>${i + 1}</td><td>${esc(t.id)}</td><td>${esc(t.type)}</td>
      <td>${esc(t.fromLabel)}</td><td>${esc(t.toLabel)}</td>
      <td>${esc(money(t.amount))}</td><td>${esc(t.status)}</td></tr>`).join("");
  }

  async function genesis() {
    try {
      const data = await api("/genesis", { method: "POST", body: "{}" });
      message(data.message, "success");
    } catch (e) { message(e.message, "error"); }
  }

  async function forgotPassword() {
    try {
      const login = field("resetLogin");
      const data = await api("/forgot-password", {
        method: "POST", body: JSON.stringify({ login })
      });
      sessionStorage.setItem(RESET_LOGIN_KEY, login);
      if (data.resetCode) sessionStorage.setItem("jslcoin_test_reset_code", data.resetCode);
      message(data.message, "success");
      setTimeout(() => location.href = "reset-password.html", 900);
    } catch (e) { message(e.message, "error"); }
  }

  function fillResetForm() {
    if (!$("resetPasswordPage")) return;
    $("resetLogin").value = sessionStorage.getItem(RESET_LOGIN_KEY) || "";
    const testCode = sessionStorage.getItem("jslcoin_test_reset_code");
    if (testCode && $("resetCode")) $("resetCode").value = testCode;
  }

  async function resetPassword() {
    try {
      const data = await api("/reset-password", {
        method: "POST",
        body: JSON.stringify({
          login: field("resetLogin"),
          code: field("resetCode"),
          password: $("newPassword")?.value || ""
        })
      });
      message(data.message, "success");
      sessionStorage.removeItem(RESET_LOGIN_KEY);
      sessionStorage.removeItem("jslcoin_test_reset_code");
      setTimeout(() => location.href = "wallet-login.html", 900);
    } catch (e) { message(e.message, "error"); }
  }

  async function audit() {
    try {
      const data = await api("/audit", { method: "POST", body: "{}" });
      message(data.message, data.ok ? "success" : "error");
    } catch (e) { message(e.message, "error"); }
  }

  window.JSLApp = {
    login, ownerLogin, register, logout, transfer, buy, sell,
    ownerSend, genesis, forgotPassword, resetPassword, audit
  };

  document.addEventListener("DOMContentLoaded", () => {
    activeNav();
    fillResetForm();
    renderDashboard();
    renderProfile();
    renderWallet();
    renderTransactions();
    renderOwner();
    renderUserList();
    renderLedger();
  });
})();