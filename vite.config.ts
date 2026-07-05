import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

/** 开源默认：仅 dev / compose；业务环境通过未入库的 .env.{mode} 注入（见 .env.example） */
const Defaults: Record<string, { uc: string; host: string; base: string; loginMode: 'wx' | 'password' }> = {
  dev: { uc: 'http://admin.localhost:8088', host: 'admin.localhost:8088', base: '/', loginMode: 'password' },
  compose: { uc: '', host: 'localhost:8088', base: '/admin/', loginMode: 'password' },
  moicen: { uc: 'https://admin.moicen.com', host: 'admin.moicen.com', base: '/', loginMode: 'wx' },
  huiwing: { uc: 'https://admin.huiwings.cn', host: 'admin.huiwings.cn', base: '/', loginMode: 'wx' },
}

const mode = (process.env.mode || process.env.VITE_MODE || 'dev') as string
const env = loadEnv(mode, process.cwd(), '')
const fallback = Defaults[mode] || Defaults.dev

const wxApp = env.WX_APP ?? ''
const loginMode = (env.LOGIN_MODE || fallback.loginMode || (wxApp ? 'wx' : 'password')) as 'wx' | 'password'

if (loginMode === 'wx' && !wxApp) {
  throw new Error(`[authcoreadmin] LOGIN_MODE=wx requires WX_APP (.env.${mode})`)
}
if (loginMode === 'password' && wxApp) {
  throw new Error(`[authcoreadmin] LOGIN_MODE=password must not set WX_APP (.env.${mode})`)
}

const config = {
  main: env.UC_SERVER ?? fallback.uc,
  host: env.HOST ?? fallback.host,
  wx_app: loginMode === 'wx' ? wxApp : '',
  wx_redirect_host: env.WX_REDIRECT_HOST || env.HOST || fallback.host,
  wx_login_bridge_path: env.WX_LOGIN_BRIDGE_PATH ?? '',
  admin_allowed_role_keys: env.ADMIN_ALLOWED_ROLE_KEYS || 'ADMIN',
  login_mode: loginMode,
  enable_dev_unionid_login: env.ENABLE_DEV_UNIONID_LOGIN ?? (loginMode === 'password' ? 'true' : 'false'),
  sso_host: env.SSO_HOST || '',
  sso_enabled: env.SSO_ENABLED === 'true' || env.SSO_ENABLED === '1',
  base: env.VITE_BASE ?? fallback.base,
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  base: config.base,
  define: {
    UC_SERVER: JSON.stringify(config.main),
    HOST: JSON.stringify(config.host),
    WX_APP: JSON.stringify(config.wx_app),
    WX_REDIRECT_HOST: JSON.stringify(config.wx_redirect_host),
    WX_LOGIN_BRIDGE_PATH: JSON.stringify(config.wx_login_bridge_path),
    ADMIN_ALLOWED_ROLE_KEYS: JSON.stringify(config.admin_allowed_role_keys),
    LOGIN_MODE: JSON.stringify(config.login_mode),
    ENABLE_DEV_UNIONID_LOGIN: JSON.stringify(config.enable_dev_unionid_login),
    SSO_HOST: JSON.stringify(config.sso_host),
    SSO_ENABLED: JSON.stringify(config.sso_enabled),
  },
  server: {
    port: 8011,
    proxy: {
      '/api/v1/uc': { changeOrigin: true, target: config.main || 'http://127.0.0.1:8088' },
    },
  },
})
