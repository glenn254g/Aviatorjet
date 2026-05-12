if (!isLoggedIn()) {
  window.location.href = '/';
}

let socket;
let currentMult = 1.00;
let gameState = 'waiting';
let userBalance = 0;
let userBonus = 0;
let bets = new Map(); // pid -> bet data
let history = [];

document.addEventListener('DOMContentLoaded', () => {
  initSocket();
  loadProfile();
  loadBalance();
  loadHistory();
  loadBets();
  loadTxns();
});

function initSocket() {
  socket = io({ auth: { token: getToken() } });

  socket.on('g:state', data => {
    gameState = data.state;
    currentMult = data.mult;
    history = data.history || [];
    updateUI();
  });

  socket.on('g:wait', data => {
    gameState = 'waiting';
    updateUI();
    startCountdown(data.cd);
  });

  socket.on('g:start', () => {
    gameState = 'flying';
    currentMult = 1.00;
    updateUI();
  });

  socket.on('g:tick', data => {
    currentMult = data.mult;
    updateUI();
  });

  socket.on('g:crash', data => {
    gameState = 'crashed';
    history = data.history || [];
    updateUI();
    showCrash(data.cp);
  });

  socket.on('b:ok', data => {
    userBalance = data.bal;
    updateBalance();
    bets.set(data.pid, { amt: data.amt, placed: true });
    updateBetButtons(data.pid);
  });

  socket.on('b:err', data => {
    alert(data.msg);
  });

  socket.on('b:cancelled', data => {
    bets.delete(data.pid);
    updateBetButtons(data.pid);
  });

  socket.on('b:won', data => {
    userBalance = data.bal;
    updateBalance();
    showCashoutPopup(data.mult, data.win);
  });

  socket.on('b:lost', data => {
    // Bet lost, no update needed
  });
}

function updateUI() {
  const multEl = document.getElementById('multVal');
  const multSub = document.getElementById('multSub');
  const multOv = document.getElementById('multOv');
  const waitOv = document.getElementById('waitOv');
  const crashOv = document.getElementById('crashOv');
  const crashVal = document.getElementById('crashVal');
  const histBar = document.getElementById('histBar');

  if (gameState === 'flying') {
    multOv.style.display = 'flex';
    multEl.textContent = currentMult.toFixed(2) + 'x';
    multSub.textContent = 'FLYING';
    waitOv.classList.remove('on');
    crashOv.style.display = 'none';
  } else if (gameState === 'waiting') {
    multOv.style.display = 'none';
    waitOv.classList.add('on');
    crashOv.style.display = 'none';
  } else if (gameState === 'crashed') {
    multOv.style.display = 'none';
    waitOv.classList.remove('on');
    crashOv.style.display = 'flex';
    crashVal.textContent = currentMult.toFixed(2) + 'x';
  }

  // Update history bar
  histBar.innerHTML = history.slice(0, 10).map(h => `<span class="hm" style="background:${h.c}">${h.m}x</span>`).join('') + '<button class="hist-btn" onclick="showHistOv()">🕐 History</button>';
}

function startCountdown(cd) {
  const cdEl = document.getElementById('cdNum');
  cdEl.textContent = cd;
  const int = setInterval(() => {
    cd--;
    if (cd > 0) cdEl.textContent = cd;
    else clearInterval(int);
  }, 1000);
}

function showCrash(cp) {
  // Optional: animate or something
}

function showCashoutPopup(mult, win) {
  const pop = document.getElementById('cashPop');
  document.getElementById('popMult').textContent = mult.toFixed(2) + 'x';
  document.getElementById('popWin').textContent = win.toFixed(2) + ' KES';
  pop.classList.add('on');
  setTimeout(() => pop.classList.remove('on'), 3000);
}

function updateBalance() {
  document.querySelectorAll('.bal-display').forEach(el => el.textContent = userBalance.toFixed(2) + ' KES');
}

function updateBetButtons(pid) {
  const btn = document.getElementById('ab' + pid);
  const bet = bets.get(pid);
  if (bet && bet.placed) {
    btn.textContent = 'CASHOUT';
    btn.classList.remove('bet-btn');
    btn.classList.add('cash-btn');
  } else {
    btn.textContent = 'BET';
    btn.classList.remove('cash-btn');
    btn.classList.add('bet-btn');
  }
}

function switchTab(pid, mode) {
  const panel = document.getElementById('panel' + pid);
  panel.querySelectorAll('.ptab').forEach((tab, i) => {
    tab.classList.toggle('on', (mode === 'bet' && i === 0) || (mode === 'auto' && i === 1));
  });
  const as = document.getElementById('as' + pid);
  as.style.display = mode === 'auto' ? 'block' : 'none';
}

function adjAmt(pid, delta) {
  const inp = document.getElementById('amt' + pid);
  let val = parseFloat(inp.value) || 0;
  val = Math.max(1, val + delta);
  inp.value = val.toFixed(2);
}

function setAmt(pid, val) {
  document.getElementById('amt' + pid).value = val.toFixed(2);
}

function handleAct(pid) {
  const bet = bets.get(pid);
  if (bet && bet.placed) {
    // Cashout
    socket.emit('b:cash', { pid });
  } else {
    // Place bet
    const amt = parseFloat(document.getElementById('amt' + pid).value);
    if (!amt || amt < 1) return alert('Min bet is 1 KES');
    if (amt > userBalance) return alert('Insufficient balance');
    const auto = parseFloat(document.getElementById('auto' + pid)?.value) || null;
    socket.emit('b:place', { pid, amt, auto });
  }
}

function toggleMenu() {
  const menu = document.getElementById('menuDrop');
  menu.classList.toggle('open');
}

function showView(view) {
  const views = ['gameView', 'promoView', 'refView', 'profView'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === view + 'View' ? 'block' : 'none';
  });
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('on'));
  document.querySelector(`[onclick="showView('${view}')"]`).classList.add('on');
}

function showHistOv() {
  const el = document.getElementById('histOv');
  if (el) el.classList.add('open');
  const grid = document.getElementById('histGrid');
  grid.innerHTML = history.map(h => `<div class="hist-item" style="background:${h.c}">${h.m}x</div>`).join('');
}

function closeHistOv() {
  const el = document.getElementById('histOv');
  if (el) el.classList.remove('open');
}

function openDep() {
  const el = document.getElementById('depSheet');
  if (el) el.classList.add('open');
}

function closeDep() {
  const el = document.getElementById('depSheet');
  if (el) el.classList.remove('open');
}

function openWdr() {
  const el = document.getElementById('wdrSheet');
  if (el) el.classList.add('open');
  document.getElementById('wdrAvail').textContent = userBalance.toFixed(2) + ' KES';
}

function closeWdr() {
  const el = document.getElementById('wdrSheet');
  if (el) el.classList.remove('open');
}

function setDepAmt(value) {
  document.getElementById('depAmt').value = value;
}

async function submitDep() {
  const amt = parseFloat(document.getElementById('depAmt').value);
  if (!amt || amt < 10) return alert('Min deposit is 10 KES');
  const btn = document.getElementById('depBtn');
  btn.disabled = true; btn.textContent = 'Processing…';
  try {
    const r = await fetch('/api/user/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
      body: JSON.stringify({ amount: amt })
    });
    const res = await r.json();
    if (res.ok) {
      userBalance = res.data.balance;
      updateBalance();
      closeDep();
      alert(res.msg);
    } else {
      alert(res.msg);
    }
  } catch {
    alert('Connection error');
  }
  btn.disabled = false; btn.textContent = 'Deposit';
}

async function submitWdr() {
  const amt = parseFloat(document.getElementById('wdrAmt').value);
  if (!amt || amt < 10) return alert('Min withdrawal is 10 KES');
  if (amt > userBalance) return alert('Insufficient balance');
  const btn = document.getElementById('wdrBtn');
  btn.disabled = true; btn.textContent = 'Processing…';
  try {
    const r = await fetch('/api/user/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
      body: JSON.stringify({ amount: amt })
    });
    const res = await r.json();
    if (res.ok) {
      userBalance = res.data.balance;
      updateBalance();
      closeWdr();
      alert(res.msg);
    } else {
      alert(res.msg);
    }
  } catch {
    alert('Connection error');
  }
  btn.disabled = false; btn.textContent = 'Withdraw';
}

function copyRef() {
  const url = location.origin + '?ref=' + getUser().username;
  navigator.clipboard.writeText(url).then(() => alert('Referral link copied!'));
}

function logout() {
  clearToken();
  window.location.href = '/';
}

async function loadProfile() {
  try {
    const r = await fetch('/api/user/profile', { headers: { Authorization: 'Bearer ' + getToken() } });
    const res = await r.json();
    if (res.ok) {
      const u = res.data;
      document.getElementById('profName').textContent = u.username;
      document.getElementById('profMob').textContent = u.mobile;
      document.getElementById('profAvatar').textContent = u.username[0].toUpperCase();
      if (u.role === 'admin') document.getElementById('adminLink').style.display = 'block';
    }
  } catch {}
}

async function loadBalance() {
  try {
    const r = await fetch('/api/user/balance', { headers: { Authorization: 'Bearer ' + getToken() } });
    const res = await r.json();
    if (res.ok) {
      userBalance = res.data.balance;
      userBonus = res.data.bonus;
      updateBalance();
      document.getElementById('profBonus').textContent = userBonus.toFixed(2) + ' KES';
    }
  } catch {}
}

async function loadHistory() {
  // History is loaded via socket
}

async function loadBets() {
  try {
    const r = await fetch('/api/user/bets', { headers: { Authorization: 'Bearer ' + getToken() } });
    const res = await r.json();
    if (res.ok) {
      const list = document.getElementById('betList');
      list.innerHTML = res.data.map(b => `
        <div class="bet-row">
          <div>${b.amount.toFixed(2)} KES @ ${b.cashoutAt ? b.cashoutAt.toFixed(2) + 'x' : '-'}</div>
          <div class="${b.winAmount > 0 ? 'pos' : b.winAmount < 0 ? 'neg' : 'neu'}">${b.winAmount.toFixed(2)} KES</div>
        </div>
      `).join('') || '<div style="padding:16px;text-align:center;color:#666">No bets yet</div>';
    }
  } catch {}
}

async function loadTxns() {
  try {
    const r = await fetch('/api/user/transactions', { headers: { Authorization: 'Bearer ' + getToken() } });
    const res = await r.json();
    if (res.ok) {
      const list = document.getElementById('txnList');
      list.innerHTML = res.data.map(t => `
        <div class="txn-row">
          <div><div class="txn-type">${t.type}</div><div class="txn-date">${new Date(t.createdAt).toLocaleString()}</div></div>
          <div class="${t.amount >= 0 ? 'pos' : 'neg'}">${t.amount >= 0 ? '+' : ''}${t.amount.toFixed(2)} KES</div>
        </div>
      `).join('') || '<div style="padding:16px;text-align:center;color:#666">No transactions</div>';
    }
  } catch {}
}
