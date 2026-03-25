// ESM shim for 'cookie' package — compatible with Turbopack
// Implements the API used by @supabase/ssr v0.9.0

/**
 * Parse a Cookie header string into an object of name-value pairs.
 */
export function parseCookie(str) {
  if (typeof str !== 'string') return {}
  const result = {}
  const pairs = str.split(';')
  for (const pair of pairs) {
    const idx = pair.indexOf('=')
    if (idx < 0) continue
    const key = pair.slice(0, idx).trim()
    if (!key) continue
    let val = pair.slice(idx + 1).trim()
    if (val.startsWith('"')) val = val.slice(1, -1)
    try { result[key] = decodeURIComponent(val) } catch { result[key] = val }
  }
  return result
}

export const parse = parseCookie

/**
 * Serialize a name-value pair into a Set-Cookie header string.
 */
export function stringifySetCookie(name, val, options = {}) {
  let str = name + '=' + encodeURIComponent(val)
  if (options.maxAge != null) str += '; Max-Age=' + Math.floor(options.maxAge)
  if (options.domain) str += '; Domain=' + options.domain
  if (options.path != null) str += '; Path=' + options.path
  else str += '; Path=/'
  if (options.expires) str += '; Expires=' + options.expires.toUTCString()
  if (options.httpOnly) str += '; HttpOnly'
  if (options.secure) str += '; Secure'
  if (options.sameSite) str += '; SameSite=' + options.sameSite
  return str
}

export const stringifyCookie = stringifySetCookie
export const serialize = stringifySetCookie

/**
 * Parse a Set-Cookie header string into an object.
 */
export function parseSetCookie(str) {
  if (typeof str !== 'string') return null
  const parts = str.split(';')
  const [nameVal] = parts
  const eqIdx = nameVal.indexOf('=')
  if (eqIdx < 0) return null
  const name = nameVal.slice(0, eqIdx).trim()
  let value = nameVal.slice(eqIdx + 1).trim()
  if (value.startsWith('"')) value = value.slice(1, -1)
  try { value = decodeURIComponent(value) } catch {}
  const cookie = { name, value }
  for (let i = 1; i < parts.length; i++) {
    const attr = parts[i].trim()
    const eqI = attr.indexOf('=')
    const attrName = (eqI >= 0 ? attr.slice(0, eqI) : attr).trim().toLowerCase()
    const attrVal = eqI >= 0 ? attr.slice(eqI + 1).trim() : ''
    if (attrName === 'max-age') cookie.maxAge = parseInt(attrVal, 10)
    else if (attrName === 'domain') cookie.domain = attrVal
    else if (attrName === 'path') cookie.path = attrVal
    else if (attrName === 'expires') cookie.expires = new Date(attrVal)
    else if (attrName === 'httponly') cookie.httpOnly = true
    else if (attrName === 'secure') cookie.secure = true
    else if (attrName === 'samesite') cookie.sameSite = attrVal
  }
  return cookie
}

export default { parseCookie, parse, stringifySetCookie, stringifyCookie, serialize, parseSetCookie }
