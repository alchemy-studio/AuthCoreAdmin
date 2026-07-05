<template>
  <div class="flex flex-col items-center justify-center min-h-screen text-text-muted gap-4 px-6 text-center">
    <p>{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import useUser from '@/store/user'
import { parseAuthCallbackParams } from '@/utils/ssoClient'

const { complete_sso_login } = useUser()
const message = ref('登录中…')

onMounted(async () => {
  const { code, returnTo } = parseAuthCallbackParams(window.location.search)
  if (!code) {
    message.value = '缺少 SSO 授权码'
    return
  }
  try {
    const result = await complete_sso_login(code)
    if (!result.ok) {
      message.value = result.error || 'SSO 登录失败'
      return
    }
    window.location.href = returnTo || '/'
  } catch (e: unknown) {
    message.value = e instanceof Error ? e.message : 'SSO 登录失败'
  }
})
</script>
