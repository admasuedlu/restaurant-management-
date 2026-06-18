let _token: string | null = null;

export function setAuthToken(token: string | null): void {
  _token = token;
}

export function getAuthToken(): string | null {
  return _token;
}

/**
 * Central fetch wrapper. Automatically attaches the current JWT as
 * `Authorization: Bearer <token>` if one has been set via setAuthToken().
 *
 * Backwards-compatible: if the second argument is a string (legacy tenantCode),
 * it is silently ignored — auth is now handled by JWT, not X-Tenant-Code.
 */
export async function apiFetch(
  url: string,
  initOrLegacyCode?: string | RequestInit,
  init?: RequestInit
): Promise<Response> {
  const actualInit: RequestInit =
    typeof initOrLegacyCode === "string" ? (init ?? {}) : (initOrLegacyCode ?? {});

  const headers = new Headers(actualInit.headers as HeadersInit | undefined);
  if (_token) headers.set("Authorization", `Bearer ${_token}`);

  return fetch(url, { ...actualInit, headers });
}
