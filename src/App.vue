<template>
  <div id="app-root">
    <div v-if="initializing" class="init-loading">加载中...</div>

    <!-- Login page: no nav -->
    <router-view v-else-if="isLoginPage" />

    <!-- Authenticated pages: unified nav header -->
    <template v-else>
      <header class="bg-white border-b border-border">
        <div class="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <div class="flex items-center gap-6">
            <span class="font-semibold text-sm text-text">AuthCore 管理后台</span>
            <nav class="flex gap-1">
              <router-link
                v-for="r in navRoutes"
                :key="r.path"
                :to="r.path"
                class="px-3 py-1.5 rounded text-sm text-text-muted hover:bg-gray-100 no-underline"
                active-class="!bg-primary !text-white"
              >{{ r.name }}</router-link>
            </nav>
          </div>
          <div class="flex items-center gap-3 text-sm">
            <span class="text-text-muted">
              v20260624.001
              <template v-if="store.currentUser?.real_name"> | {{ store.currentUser.real_name }}</template>
            </span>
            <button class="text-primary hover:underline bg-transparent border-0 cursor-pointer text-sm" @click="logout">退出</button>
          </div>
        </div>
      </header>
      <main class="max-w-6xl mx-auto p-4">
        <router-view />
      </main>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import useUser from '@/store/user'
import { getToken } from '@/utils/index'
import { authLog, authWarn, tokenSnapshot } from '@/utils/authLog'
import { isSsoEnabled, redirectToSso } from '@/utils/ssoClient'

const { store, read, logout, hasAdminAccess } = useUser()
const route = useRoute()
const router = useRouter()
const initializing = ref(true)

const isLoginPage = computed(() =>
  route.name === 'login' || route.name === 'wx-login' || route.name === 'auth-callback'
)

const navRoutes = [
  { path: '/users', name: '用户管理' },
  { path: '/apps', name: '应用管理' },
  { path: '/roles', name: '角色管理' },
  { path: '/tags', name: '标签管理' },
  { path: '/labels', name: 'Label' },
  { path: '/actions', name: '动作管理' },
  { path: '/profile', name: '个人中心' },
]

onMounted(async () => {
  console.log('[authcoreadmin] deploy_ver=20260624.001')
  await router.isReady()

  authLog('App bootstrap: start', {
    route: route.name,
    path: route.path,
    ...tokenSnapshot(),
  })

  if (isLoginPage.value) {
    authLog('App bootstrap: login page, skip auth')
    initializing.value = false
    return
  }

  const token = getToken()
  if (!token) {
    if (isSsoEnabled(SSO_ENABLED) && SSO_HOST) {
      authLog('App bootstrap: no token → SSO', { ssoHost: SSO_HOST, app: HOST })
      redirectToSso(SSO_HOST, HOST, route.fullPath)
      return
    }
    authWarn('App bootstrap: no token → /login')
    router.replace('/login')
    initializing.value = false
    return
  }

  const ok = await read()
  if (!ok) {
    authWarn('App bootstrap: read failed → /login', tokenSnapshot())
    router.replace('/login')
    initializing.value = false
    return
  }

  if (!hasAdminAccess()) {
    authWarn('App bootstrap: no ADMIN → logout', {
      roles: store.roles.map((r) => r.role_key),
    })
    logout('no_admin')
    return
  }

  authLog('App bootstrap: ok', {
    user: store.currentUser?.real_name,
    roles: store.roles.map((r) => r.role_key),
  })
  initializing.value = false
})
</script>

<style>
.init-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: #999;
  font-size: 16px;
}
</style>
