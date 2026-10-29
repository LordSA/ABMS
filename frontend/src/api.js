const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('abms_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('abms_token', token);
  } else {
    localStorage.removeItem('abms_token');
  }
}

export async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
}
