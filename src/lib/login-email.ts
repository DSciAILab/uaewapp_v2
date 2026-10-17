/**
 * Staff sign in with their PS number only (UAE-92): the account is
 * `<psNumber>@uaewhloapp.com`, so a value without "@" gets the domain appended.
 * Anything with "@" (admins on gmail etc.) is used as typed.
 */
export const STAFF_EMAIL_DOMAIN = 'uaewhloapp.com'

export function toLoginEmail(raw: string): string {
  const value = raw.trim()
  if (!value || value.includes('@')) return value
  return `${value}@${STAFF_EMAIL_DOMAIN}`
}
