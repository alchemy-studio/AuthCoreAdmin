<template>
  <div class="flex items-center justify-center min-h-screen" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
    <div class="bg-surface rounded-2xl p-10 shadow-xl text-center w-[400px]">
      <h1 class="text-2xl mb-2 text-text font-semibold">AuthCore 管理后台</h1>
      <p class="text-text-muted mb-6 text-sm">请使用微信扫码登录（需管理员角色）</p>
      <div id="login-qr" class="flex justify-center my-4 min-h-[400px]"></div>
      <p v-if="error" class="text-danger mt-3 text-sm">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { mountWxLoginQr } from '@/utils/wxLogin'
import { isSsoEnabled, redirectToSso } from '@/utils/ssoClient'

const route = useRoute()
const error = ref('')

onMounted(() => {
  if (isSsoEnabled(SSO_ENABLED) && SSO_HOST) {
    redirectToSso(SSO_HOST, HOST, '/')
    return
  }

  const err = route.query.err
  if (typeof err === 'string') {
    if (err === 'no_admin') {
      error.value = '当前微信账号没有 ADMIN 管理员角色，无法进入管理后台'
    } else {
      error.value = decodeURIComponent(err)
    }
  }

  nextTick(() => {
    if (!mountWxLoginQr('login-qr')) {
      error.value = error.value || '微信登录未配置（构建时缺少 WX_APP）'
    }
  })
})
</script>
