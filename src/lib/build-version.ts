/**
 * The identity of the running build (UAE-50).
 *
 * The wall display loads its HTML once and then only re-fetches DATA, so a
 * deploy never reaches a screen that is already open — the board kept showing
 * the old page until somebody walked over and pressed F5. The API stamps every
 * response with this, the page compares it against the stamp it booted with,
 * and reloads itself when they differ.
 *
 * It MUST be constant for the lifetime of a deployment. A value that varies per
 * request (a timestamp, a random id) would make every poll look like a new
 * deploy and put the wall in a reload loop during an event — worse than the bug
 * this fixes. VERCEL_GIT_COMMIT_SHA is set at build time and is per-deployment,
 * which is exactly that guarantee; locally there is no deploy to detect, so a
 * fixed literal keeps dev from ever triggering a reload.
 */
export const BUILD_VERSION: string =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? 'dev';
