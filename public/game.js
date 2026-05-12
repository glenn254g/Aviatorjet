if (!isLoggedIn()) {
  window.location.href = '/';
}

function toggleMenu() {
  const menu = document.querySelector('.menu-box');
  if (menu) menu.classList.toggle('open');
}

function showView(view) {
  const views = ['game', 'promo', 'ref', 'prof'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === view ? 'block' : 'none';
  });
}

function showHistOv() {
  const el = document.getElementById('histOv');
  if (el) el.classList.add('open');
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
}

function closeWdr() {
  const el = document.getElementById('wdrSheet');
  if (el) el.classList.remove('open');
}

function setDepAmt(value) {
  const field = document.getElementById('depAmt');
  if (field) field.value = value;
}

function setAmt() {
  console.warn('Bet selection is not implemented in the current build.');
}

function adjAmt() {
  console.warn('Bet amount adjustment is not implemented in the current build.');
}

function handleAct() {
  alert('Game actions are not available in this deployment build.');
}

function copyRef() {
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(location.href).then(() => {
    alert('Referral URL copied');
  });
}

function submitDep() {
  alert('Deposit function is not available here.');
}

function submitWdr() {
  alert('Withdraw function is not available here.');
}

function logout() {
  clearToken();
  window.location.href = '/';
}
