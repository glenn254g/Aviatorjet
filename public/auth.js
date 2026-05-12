const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function clearToken() {
  localStorage.removeItem('token');
}

function isLoggedIn() {
  return !!getToken();
}

async function requestJson(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Network error');
  }

  return response.json();
}

async function register(name, mobile, password, promo = '') {
  const result = await requestJson(`${API_BASE}/auth/register`, {
    name,
    username: name,
    mobile,
    password,
    promo
  });

  if (result.ok && result.data?.token) {
    setToken(result.data.token);
  }

  return result;
}

async function login(username, password) {
  const result = await requestJson(`${API_BASE}/auth/login`, {
    username,
    password
  });

  if (result.ok && result.data?.token) {
    setToken(result.data.token);
  }

  return result;
}

function logout() {
  clearToken();
  window.location.href = '/';
}
