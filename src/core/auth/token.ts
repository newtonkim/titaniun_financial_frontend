const TOKEN_KEY = 'titanium.auth_token'

/** Remembered sign-ins survive closing the browser; others end with the browser session. */
function stores(): Storage[] {
  try {
    return [localStorage, sessionStorage]
  } catch {
    return []
  }
}

export function getToken(): string | null {
  for (const store of stores()) {
    try {
      const token = store.getItem(TOKEN_KEY)
      if (token) return token
    } catch {
      // Storage unavailable (private mode).
    }
  }
  return null
}

export function setToken(token: string, remember = true): void {
  clearToken()
  try {
    ;(remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token)
  } catch {
    // Storage unavailable; the session lasts until reload.
  }
}

export function clearToken(): void {
  for (const store of stores()) {
    try {
      store.removeItem(TOKEN_KEY)
    } catch {
      // Nothing to clear.
    }
  }
}
