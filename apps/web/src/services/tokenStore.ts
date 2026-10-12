// Access tokens live in memory only; they are never persisted to
// localStorage, sessionStorage, or cookies we control.
let accessToken: string | null = null;

export const tokenStore = {
  getToken(): string | null {
    return accessToken;
  },

  setToken(token: string): void {
    accessToken = token;
  },

  clearToken(): void {
    accessToken = null;
  },
};
