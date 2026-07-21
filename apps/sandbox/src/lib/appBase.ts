// Base-path-aware URL helpers.
//
// Vite's `import.meta.env.BASE_URL` is the configured `base` option — `/` in
// dev and in most hosting, but `/audacity-design-system/` on the GitHub
// Pages project site (set via BASE_PATH in the deploy workflow). Vite
// guarantees it has a trailing slash.
//
// The OAuth flows redirect the whole browser to a service and back to the
// sandbox's `/oauth/callback` route. Building that URL from
// `window.location.origin` alone drops the base path, so on Pages the
// callback would land on `https://<host>/oauth/callback` instead of
// `https://<host>/audacity-design-system/oauth/callback` — a 404, and a
// redirect_uri that muse-id's exact-match check would reject. These helpers
// fold the base path in. On `/` hosting they return exactly what the old
// inline `${origin}/oauth/callback` did, so dev/localhost is unaffected.

/** The app's base path, always with a trailing slash (`/` or `/sub/`). */
export const APP_BASE_PATH = import.meta.env.BASE_URL;

/** Absolute redirect_uri for the shared OAuth callback route. Must match
 *  byte-for-byte what each service has registered for this client. */
export function oauthCallbackUri(): string {
  return `${window.location.origin}${APP_BASE_PATH}oauth/callback`;
}

/** The app's home path (base-path-relative), for post-callback redirects.
 *  A path, not a full URL, so `window.location.replace(appHomePath())`
 *  stays same-origin. */
export function appHomePath(): string {
  return APP_BASE_PATH;
}

/** True when the current location is the OAuth callback route, accounting
 *  for the base path. */
export function isOAuthCallbackPath(pathname: string): boolean {
  return pathname === `${APP_BASE_PATH}oauth/callback`;
}
