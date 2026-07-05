/**
 * SSO client helpers (sync with monorepo/AuthCoreJS/src/sso-client.ts).
 */

export const SSO_ALLOWED_APP_DOMAINS = [
  'admin.moicen.com',
  'ts.moicen.com',
  'teacher.moicen.com',
  'admin.huiwings.cn',
  'ts.huiwings.cn',
  'teacher.huiwings.cn',
] as const

export type SsoAppDomain = (typeof SSO_ALLOWED_APP_DOMAINS)[number]

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
  return (SSO_ALLOWED_APP_DOMAINS as readonly string[]).includes(domain)
}
