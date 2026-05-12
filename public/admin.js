document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) { window.location.href = '/'; return; }
  const u = getUser();
  if (u?.role !== 'admin') { window.location.href = '/game'; return; }

  async function adm(url) {
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + getToken() } });
    return r.json();
  }
  async function admPost(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() }, body: JSON.stringify(body) });
    return r.json();
  }

  // Stats
  try {
    const s = await adm('/api/admin/stats');
    if (s.ok) {
      document.getElementById('sUsers').textContent = s.data.users;
      document.getElementById('sBets').textContent  = s.data.bets;
      document.getElementById('sDep').textContent   = s.data.deposits.toFixed(0);
      document.getElementById('sWit').textContent   = s.data.withdrawals.toFixed(0);
    }
  } catch {}

  // Tab switching
  window.switchTab = function(t) {
    document.querySelectorAll('.adm-tab').forEach((el, i) => el.classList.toggle('on', (t === 'users' && i === 0) || (t === 'txns' && i === 1)));
    document.getElementById('tabUsers').classList.toggle('on', t === 'users');
    document.getElementById('tabTxns').classList.toggle('on', t === 'txns');
    if (t === 'txns') loadTxns();
  };

  // Users
  async function loadUsers() {
    const el = document.getElementById('userList');
    try {
      const r = await adm('/api/admin/users');
      if (!r.ok || !r.data.length) { el.innerHTML = '<div class="adm-loader">No users found</div>'; return; }
      el.innerHTML = r.data.map(u => `
        <div class="user-row">
          <div>
            <div class="ur-name">${u.username}${u.blocked ? '<span class="blk-badge">Blocked</span>' : ''}</div>
            <div class="ur-mob">${u.mobile || '-'} &bull; ${u.role}</div>
          </div>
          <div>
            <div class="ur-bal">${(u.balance || 0).toFixed(2)} KES</div>
            <button class="${u.blocked ? 'ublk-btn' : 'blk-btn'}" onclick="toggleBlock('${u._id || u.id}', ${!u.blocked})">${u.blocked ? 'Unblock' : 'Block'}</button>
          </div>
        </div>`).join('');
    } catch { el.innerHTML = '<div class="adm-loader">Failed to load</div>'; }
  }

  window.toggleBlock = async function(id, blocked) {
    await admPost('/api/admin/block', { userId: id, blocked });
    loadUsers();
  };

  // Transactions
  async function loadTxns() {
    const el = document.getElementById('txnList');
    try {
      const r = await adm('/api/admin/txns');
      if (!r.ok || !r.data.length) { el.innerHTML = '<div class="adm-loader">No transactions</div>'; return; }
      el.innerHTML = r.data.map(t => `
        <div class="txn-row">
          <div><div class="txn-type">${t.username || '-'} &bull; ${t.type}</div><div class="txn-date">${new Date(t.createdAt).toLocaleString()}</div></div>
          <div class="${t.amount >= 0 ? 'pos' : 'neg'}">${t.amount >= 0 ? '+' : ''}${t.amount.toFixed(2)} KES</div>
        </div>`).join('');
    } catch { el.innerHTML = '<div class="adm-loader">Failed to load</div>'; }
  }

  loadUsers();
});
