/**
 * The MuseID sign-in's own error — in a file of its own so that
 * `MuseIdContext.tsx` exports only its provider and hook: a class
 * export in that module broke Vite's Fast Refresh for it
 * ("MuseIdSignInCancelledError export is incompatible"), so every hot
 * update touching the context re-mounted the whole provider subtree
 * instead of patching in place (2026-10-23; the desktop log repeated
 * the notice on each update).
 */

/** Thrown by `ensureSignedIn()` when the MuseIdAuthDialog closes without
 *  completing sign-up/sign-in — mirrors AdieuContext's SignInCancelledError. */
export class MuseIdSignInCancelledError extends Error {
  constructor() {
    super('muse_id_sign_in_cancelled');
    this.name = 'MuseIdSignInCancelledError';
  }
}
