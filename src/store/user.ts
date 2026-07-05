import { reactive } from 'vue'
import request from '@/utils/request'
import { saveToken, clearTokens, HtySudoToken, loginPath } from '@/utils/index'
import { authLog, authWarn, tokenSnapshot } from '@/utils/authLog'
import type { HtyUser, HtyRole } from '@/types'

interface UserState {
  currentUser: HtyUser | null
  currentRole?: string
  roles: HtyRole[]
  loading: boolean
  users: HtyUser[]
}

export type LoginResult = { ok: boolean; error?: string }

const store = reactive<UserState>({
  currentUser: null,
  roles: [],
  loading: false,
  users: [],
})

function adminRoleKeys(): string[] {
  const raw = typeof ADMIN_ALLOWED_ROLE_KEYS === 'string' ? ADMIN_ALLOWED_ROLE_KEYS : 'ADMIN'
  return raw.split(',').map((k) => k.trim()).filter(Boolean)
}

function hasAdminAccess(): boolean {
  const allowed = adminRoleKeys()
  return store.roles.some((r) => allowed.includes(r.role_key))
}

export default function useUser() {
  async function sudo() {
    authLog('sudo: request')
    store.loading = true
    const { r, d, e, statusCode } = await request({
      url: '/api/v1/uc/sudo',
      method: 'POST',
      skipAuthHandler: true,
    })
    store.loading = false
    authLog('sudo: response', { r, statusCode, hasToken: !!d, error: e, ...tokenSnapshot() })
    if (r && d) {
      window.localStorage.setItem(HtySudoToken, d)
      return true
    }
    authWarn('sudo: failed', e)
    return false
  }

  async function read() {
    authLog('read: request')
    store.loading = true
    const { r, d, e, statusCode } = await request({
      url: '/api/v1/uc/find_user_with_info_by_token',
      skipAuthHandler: true,
    })
    store.loading = false
    if (r && d) {
      store.currentUser = d as HtyUser
      const userApp = d.infos?.[0]
      if (userApp?.roles) {
        store.roles = userApp.roles
      }
      authLog('read: ok', {
        statusCode,
        hty_id: d.hty_id,
        real_name: d.real_name,
        roleKeys: store.roles.map((role) => role.role_key),
      })
      return true
    }
    authWarn('read: failed', { statusCode, error: e, ...tokenSnapshot() })
    return false
  }

  async function finalizeAdminLogin(): Promise<LoginResult> {
    authLog('finalizeAdminLogin: start', tokenSnapshot())
    const sudoOk = await sudo()
    if (!sudoOk) {
      clearTokens()
      authWarn('finalizeAdminLogin: sudo failed → clearTokens')
      return { ok: false, error: '无法获取管理员权限（sudo 失败）' }
    }
    const readOk = await read()
    if (!readOk) {
      clearTokens()
      authWarn('finalizeAdminLogin: read failed → clearTokens')
      return { ok: false, error: '无法读取用户信息' }
    }
    const allowed = adminRoleKeys()
    const roleKeys = store.roles.map((r) => r.role_key)
    if (!hasAdminAccess()) {
      clearTokens()
      authWarn('finalizeAdminLogin: no admin role', { allowed, roleKeys })
      return { ok: false, error: `需要以下角色之一才可进入管理后台：${allowed.join('、')}（当前：${roleKeys.join('、') || '无'}）` }
    }
    authLog('finalizeAdminLogin: ok', { roleKeys })
    return { ok: true }
  }

  async function loginWithPassword(username: string, password: string): Promise<LoginResult> {
    store.loading = true
    const { r, d } = await request({
      url: '/api/v1/uc/login_with_password',
      method: 'POST',
      data: { username, password },
    })
    store.loading = false
    if (r && d) {
      saveToken(d)
      return finalizeAdminLogin()
    }
    return { ok: false, error: '用户名或密码错误' }
  }

  async function login(unionid: string): Promise<LoginResult> {
    store.loading = true
    const { r, d } = await request({
      url: '/api/v1/uc/login2_with_unionid',
      headers: { Unionid: unionid },
    })
    store.loading = false
    if (r && d) {
      saveToken(d)
      return finalizeAdminLogin()
    }
    return { ok: false, error: 'union_id 登录失败' }
  }

  async function complete_sso_login(ssoCode: string): Promise<LoginResult> {
    authLog('complete_sso_login: POST sso/exchange')
    store.loading = true
    const { r, d, e, statusCode } = await request({
      url: '/api/v1/uc/sso/exchange',
      method: 'POST',
      data: { code: ssoCode },
      skipAuthHandler: true,
    })
    store.loading = false
    authLog('complete_sso_login: response', { r, statusCode, hasToken: !!d, error: e })
    if (r && d) {
      saveToken(d)
      return finalizeAdminLogin()
    }
    return { ok: false, error: typeof e === 'string' ? e : 'SSO 登录失败' }
  }

  async function wx_login(code: string): Promise<LoginResult> {
    authLog('wx_login: POST wx_qr_login', { codePrefix: code.slice(0, 8) + '…' })
    store.loading = true
    const { r, d, e, statusCode } = await request({
      url: '/api/v1/uc/wx_qr_login',
      method: 'POST',
      data: { code },
      skipAuthHandler: true,
    })
    store.loading = false
    authLog('wx_login: wx_qr_login response', { r, statusCode, hasToken: !!d, error: e })
    if (r && d) {
      saveToken(d)
      authLog('wx_login: token saved', tokenSnapshot())
      return finalizeAdminLogin()
    }
    const reason = typeof e === 'string' ? e : ''
    if (reason.includes('not registered')) {
      authWarn('wx_login: user not registered')
      return { ok: false, error: '该微信账号尚未在管理后台完成注册，请联系管理员审核' }
    }
    authWarn('wx_login: wx_qr_login failed', reason)
    return {
      ok: false,
      error: reason || '微信登录失败，请确认账号已注册且具备管理员角色',
    }
  }

  async function getAllUsers() {
    const { r, d } = await request({
      url: '/api/v1/uc/find_all_users',
    })
    if (r && Array.isArray(d)) {
      store.users = d as HtyUser[]
    } else {
      store.users = []
    }
  }

  async function verifyUserForApp(
    userId: string,
    appId: string,
    validate: boolean,
    rejectReason?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const { r, e } = await request({
      url: '/api/v1/uc/register/verify',
      method: 'POST',
      data: { hty_id: userId, app_id: appId, validate, reject_reason: rejectReason },
    })
    if (!r) {
      return { ok: false, error: typeof e === 'string' ? e : '审核请求失败' }
    }

    const user = store.users.find((u) => u.hty_id === userId)
    const info = user?.infos?.find((i) => i.app_id === appId)
    if (info) {
      info.is_registered = validate
      if (validate) info.reject_reason = undefined
      else if (rejectReason) info.reject_reason = rejectReason
    }

    await getAllUsers()
    return { ok: true }
  }

  async function approveUser(userId: string, appId: string) {
    return verifyUserForApp(userId, appId, true)
  }

  async function rejectUser(userId: string, appId: string, reason: string) {
    return verifyUserForApp(userId, appId, false, reason)
  }

  function checkRole(roleKey: string): boolean {
    return store.roles.some((r) => r.role_key === roleKey)
  }

  function logout(reason?: string) {
    authWarn('logout', { reason, ...tokenSnapshot() })
    store.currentUser = null
    store.roles = []
    store.users = []
    clearTokens()
    const suffix = reason ? `?err=${encodeURIComponent(reason)}` : ''
    window.location.href = `${loginPath()}${suffix}`
  }

  return {
    store,
    loginWithPassword,
    login,
    wx_login,
    complete_sso_login,
    sudo,
    read,
    getAllUsers,
    approveUser,
    rejectUser,
    verifyUserForApp,
    checkRole,
    hasAdminAccess,
    logout,
  }
}
