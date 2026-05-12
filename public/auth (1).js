const TK = 'bft_token';
const UK = 'bft_user';

function getToken()  { return localStorage.getItem(TK); }
function getUser()   { try { return JSON.parse(localStorage.getItem(UK)); } catch { return null; } }
function setAuth(t, u) { localStorage.setItem(TK, t); localStorage.setItem(UK, JSON.stringify(u)); }
function clearAuth() { localStorage.removeItem(TK); localStorage.removeItem(UK); }
function isLoggedIn(){ return !!getToken(); }

async function api(method, url, body, token) {
  const h = { 'Content-Type': 'application/json' };
  const t = token !== false ? getToken() : null;
  if (t) h['Authorization'] = 'Bearer ' + t;
  const r = await fetch(url, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

async function login(username, password) {
  const r = await api('POST', '/api/auth/login', { username, password }, false);
  if (r.ok) setAuth(r.data.token, { username: r.data.username, balance: r.data.balance, role: r.data.role });
  return r;
}

async function register(name, mobile, password, promo) {
  const r = await api('POST', '/api/auth/register', { name, mobile, password, promo }, false);
  if (r.ok) setAuth(r.data.token, { username: r.data.username, balance: r.data.balance, role: r.data.role });
  return r;
}

function logout() { clearAuth(); window.location.href = '/'; }

async function getBalance()      { return api('GET',  '/api/user/balance'); }
async function getProfile()      { return api('GET',  '/api/user/profile'); }
async function getTransactions() { return api('GET',  '/api/user/transactions'); }
async function getBets()         { return api('GET',  '/api/user/bets'); }
async function doDeposit(amt)    { return api('POST', '/api/user/deposit',  { amount: amt }); }
async function doWithdraw(amt)   { return api('POST', '/api/user/withdraw', { amount: amt }); }

function saveBalance(bal) {
  const u = getUser() || {};
  u.balance = bal;
  localStorage.setItem(UK, JSON.stringify(u));
}
