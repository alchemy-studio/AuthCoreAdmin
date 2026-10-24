/**
 * SSO client helpers. Allowed apps come from SSO_ALLOWED_DOMAINS (build-time, comma-separated).
 */

function domainsFromEnv(): readonly string[] {
  const raw = typeof SSO_ALLOWED_DOMAINS === 'string' ? SSO_ALLOWED_DOMAINS : ''
  if (!raw) return []
  return raw.split(',').map((item) => item.trim()).filter((item) => item.length > 0)
}

export const SSO_ALLOWED_APP_DOMAINS = domainsFromEnv()

export type SsoAppDomain = string

export function isSsoEnabled(flag: string | boolean | undefined): boolean {
  return flag === true || flag === 'true' || flag === '1'
}

export function buildSsoLoginUrl(ssoHost: string, appDomain: string, returnTo = '/'): string {
  const url = new URL(`https://${ssoHost}/login`)
  url.searchParams.set('app', appDomain)
  url.searchParams.set('return_to', returnTo.startsWith('/') ? returnTo : `/${returnTo}`)
  return url.toString()
}

export function redirectToSso(ssoHost: string, appDomain: string, returnTo = '/'): void {
  window.location.href = buildSsoLoginUrl(ssoHost, appDomain, returnTo)
}

export function parseAuthCallbackParams(search: string): { code: string | null; returnTo: string } {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const returnTo = params.get('return_to') || '/'
  return {
    code: params.get('code'),
    returnTo: returnTo.startsWith('/') ? returnTo : `/${returnTo}`,
  }
}

export function buildAuthCallbackUrl(appDomain: string, code: string, returnTo = '/'): string {
  const url = new URL(`https://${appDomain}/auth/callback`)
  url.searchParams.set('code', code)
  url.searchParams.set('return_to', returnTo.startsWith('/') ? returnTo : `/${returnTo}`)
  return url.toString()
}

export function isAllowedSsoApp(domain: string): domain is SsoAppDomain {
  return SSO_ALLOWED_APP_DOMAINS.includes(domain)
}

/** 将 SSO exchange 后端/历史错误文案转为用户可读提示 */
export function formatSsoExchangeError(error: string | undefined): string {
  if (!error) return 'SSO 登录失败'
  const normalized = error.toLowerCase()
  if (
    normalized.includes('incompatible type') ||
    normalized.includes('expired') ||
    normalized.includes('already used') ||
    error.includes('已过期') ||
    error.includes('已使用')
  ) {
    return '登录链接已失效（可能已刷新页面或超时），请重新登录'
  }
  const reasonMatch = error.match(/AuthenticationFailed\s*->\s*(.+)$/i)
  if (reasonMatch?.[1]) return reasonMatch[1].trim()
  return error
}
