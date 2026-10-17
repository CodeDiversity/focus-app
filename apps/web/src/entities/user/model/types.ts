// Auth Types — entity-layer home
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  emailVerifiedAt: string | null;
  /** IANA identifier; present on GET/PATCH /users/me payloads. Undefined on
   * login/refresh session users whose backend shape predates SP-106A. */
  timeZone?: string;
  /** Plain JSON preferences bag (null until first set; SP-106A/B). */
  preferences?: Record<string, unknown> | null;
}

export interface User extends SessionUser {
  createdAt: string;
  updatedAt: string;
}

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
}
