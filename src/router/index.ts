import { createRouter, createWebHistory } from 'vue-router'
import { authLog, authWarn, tokenSnapshot } from '@/utils/authLog'
import { isSsoEnabled, redirectToSso } from '@/utils/ssoClient'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LOGIN_MODE === 'wx'
        ? () => import('@/views/WxQrLoginView.vue')
        : () => import('@/views/PasswordLoginView.vue'),
    },
    {
      path: '/wx-login',
      name: 'wx-login',
      component: () => import('@/views/WxLoginView.vue'),
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('@/views/AuthCallbackView.vue'),
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Users.vue'),
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/Users.vue'),
    },
    {
      path: '/apps',
      name: 'apps',
      component: () => import('@/views/Apps.vue'),
    },
    {
      path: '/roles',
      name: 'roles',
      component: () => import('@/views/Roles.vue'),
    },
    {
      path: '/tags',
      name: 'tags',
      component: () => import('@/views/Tags.vue'),
    },
    {
      path: '/labels',
      name: 'labels',
      component: () => import('@/views/Labels.vue'),
    },
    {
      path: '/actions',
      name: 'actions',
      component: () => import('@/views/Actions.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/Profile.vue'),
    },
  ],
})

router.beforeEach((to) => {
  const token = window.localStorage.getItem('Authorization')
  authLog('router', {
    to: to.fullPath,
    name: to.name,
    hasToken: !!token,
    ...tokenSnapshot(),
  })
  if (to.name === 'login' || to.name === 'wx-login' || to.name === 'auth-callback' || token) {
    return true
  }
  if (isSsoEnabled(SSO_ENABLED) && SSO_HOST) {
    authLog('router: no token → SSO', { ssoHost: SSO_HOST, app: HOST })
    redirectToSso(SSO_HOST, HOST, to.fullPath)
    return false
  }
  authWarn('router: blocked, no token → /login')
  return '/login'
})

export default router
