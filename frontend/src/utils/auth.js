const TOKEN_KEY = "govcon_access_token";
const REFRESH_KEY = "govcon_refresh_token";
const USER_KEY = "govcon_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY);
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAuth({ accessToken, refreshToken, user }, remember = false) {
  const store = remember ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) store.setItem(REFRESH_KEY, refreshToken);
  if (user) store.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  [localStorage, sessionStorage].forEach((s) => {
    s.removeItem(TOKEN_KEY);
    s.removeItem(REFRESH_KEY);
    s.removeItem(USER_KEY);
  });
}
