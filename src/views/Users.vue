<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-xl font-semibold">用户管理</h1>
    </div>

    <div v-if="flashMessage" class="mb-3 px-3 py-2 rounded-lg text-sm bg-green-50 text-green-800 border border-green-200">
      {{ flashMessage }}
    </div>
    <div v-if="actionError" class="mb-3 px-3 py-2 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
      {{ actionError }}
    </div>

    <div class="flex gap-2 mb-3">
      <button :class="['px-4 py-1.5 rounded-full text-sm border border-border bg-surface cursor-pointer flex items-center gap-1.5',
        activeTab === 'Approved' ? '!bg-primary !text-white !border-primary' : '']"
        @click="activeTab = 'Approved'">
        已认证 <span class="opacity-80 text-xs">{{ approvedList.length }}</span>
      </button>
      <button :class="['px-4 py-1.5 rounded-full text-sm border border-border bg-surface cursor-pointer flex items-center gap-1.5',
        activeTab === 'Waiting' ? '!bg-primary !text-white !border-primary' : '']"
        @click="activeTab = 'Waiting'">
        待审核 <span class="opacity-80 text-xs">{{ waitingList.length }}</span>
      </button>
      <button :class="['px-4 py-1.5 rounded-full text-sm border border-border bg-surface cursor-pointer flex items-center gap-1.5',
        activeTab === 'Rejected' ? '!bg-primary !text-white !border-primary' : '']"
        @click="activeTab = 'Rejected'">
        已驳回 <span class="opacity-80 text-xs">{{ rejectedList.length }}</span>
      </button>
    </div>

    <p v-if="activeTab === 'Waiting'" class="mb-3 text-xs text-text-muted">
      展开用户行，在各应用卡片上操作「通过」或「驳回」；行右侧仅「启用/禁用」账号。
    </p>

    <div v-if="activeTab === 'Approved'" class="mb-3">
      <input v-model="keyword" placeholder="搜索用户姓名..."
        class="w-full border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary" />
    </div>

    <div class="flex gap-2 mb-3">
      <span class="text-xs font-semibold text-text-muted self-center">排序:</span>
      <button :class="['px-3 py-1 rounded text-xs border border-border bg-surface cursor-pointer',
        sortBy === 'name' ? '!bg-primary !text-white !border-primary' : '']"
        @click="toggleSort('name')">
        姓名 {{ sortBy === 'name' ? (sortAsc ? '↑' : '↓') : '' }}
      </button>
      <button :class="['px-3 py-1 rounded text-xs border border-border bg-surface cursor-pointer',
        sortBy === 'created_at' ? '!bg-primary !text-white !border-primary' : '']"
        @click="toggleSort('created_at')">
        创建时间 {{ sortBy === 'created_at' ? (sortAsc ? '↑' : '↓') : '' }}
      </button>
      <button :class="['px-3 py-1 rounded text-xs border border-border bg-surface cursor-pointer',
        sortBy === 'status' ? '!bg-primary !text-white !border-primary' : '']"
        @click="toggleSort('status')">
        审核状态 {{ sortBy === 'status' ? (sortAsc ? '↑' : '↓') : '' }}
      </button>
    </div>

    <div class="flex flex-col gap-2 pb-4">
      <div v-if="loading" class="text-center py-10 text-text-muted">加载中...</div>
      <div v-else-if="filteredList.length === 0" class="text-center py-10 text-text-muted">暂无数据</div>
      <template v-for="item in filteredList" :key="item.hty_id">
        <div :class="['bg-surface rounded-lg shadow-sm p-3.5 flex items-center gap-3',
          openRows.has(item.hty_id) ? '!rounded-b-none' : '']">
          <span class="flex-shrink-0 w-6 text-center cursor-pointer text-text-muted text-lg font-semibold select-none hover:text-primary"
            @click="toggleRow(item.hty_id)">{{ openRows.has(item.hty_id) ? '−' : '+' }}</span>
          <div class="flex-shrink-0 w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center text-lg font-semibold">
            {{ (item.real_name || '?')[0] }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium">{{ item.real_name }}<span v-if="item.meta?.nickName" class="text-text-muted text-xs"> ({{ item.meta.nickName }})</span></div>
            <div class="mt-1 flex gap-1.5 flex-wrap">
              <span :class="['inline-block px-2 py-0.5 rounded-full text-xs',
                item.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500']">
                {{ item.enabled ? '账号已启用' : '账号未启用' }}
              </span>
              <button
                v-if="item.union_id && hasAdminAccess()"
                type="button"
                class="inline-flex items-center gap-1.5 max-w-full px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700 cursor-pointer border-0"
                @click.stop="toggleSecret(unionOpen, item.hty_id, item.union_id || '')"
              >
                <span>unionid</span>
                <span v-if="unionOpen.has(item.hty_id)" class="font-mono break-all text-left">{{ item.union_id }}</span>
              </button>
              <span v-else-if="item.union_id" class="inline-block px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700">unionid</span>
              <span v-if="pendingInfos(item).length" class="inline-block px-2 py-0.5 rounded-full text-xs bg-orange-50 text-orange-800">
                {{ pendingInfos(item).length }} 个应用待审
              </span>
            </div>
          </div>
          <div class="flex-shrink-0 flex gap-1.5" data-row-actions="account" title="账号级操作">
            <button v-if="!item.enabled" class="bg-green-50 text-green-700 px-3 py-1.5 rounded text-xs cursor-pointer border-0" @click="toggleEnabled(item, true)">启用账号</button>
            <button v-if="item.enabled" class="bg-red-50 text-red-600 px-3 py-1.5 rounded text-xs cursor-pointer border-0" @click="toggleEnabled(item, false)">禁用账号</button>
          </div>
        </div>
        <!-- Expandable detail -->
        <div v-if="openRows.has(item.hty_id)" class="bg-gray-50 border border-border border-t-0 rounded-b-lg px-4 py-3 -mt-1.5 mb-1.5">
          <div v-if="!item.infos?.length" class="text-center py-4 text-text-muted text-xs">无关联应用</div>
          <div v-for="info in item.infos" :key="`${info.id}:${info.is_registered}:${info.reject_reason || ''}`" class="bg-surface rounded-lg p-2.5 mb-2 shadow-sm last:mb-0" :data-app-id="info.app_id">
            <div class="flex justify-between items-center mb-1.5">
              <span class="text-xs font-semibold text-text font-mono">{{ appNameMap[info.app_id || ''] || info.app_id }}</span>
              <span :class="['px-2 py-0.5 rounded-full text-xs',
                info.is_registered ? 'bg-green-50 text-green-700' : info.reject_reason ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-800']">
                {{ info.is_registered ? '已认证' : info.reject_reason ? '已驳回' : '未认证' }}
              </span>
            </div>
            <div v-if="info.reject_reason" class="text-xs text-red-600 mb-1.5">驳回原因：{{ info.reject_reason }}</div>
            <div class="flex gap-2 text-xs mb-1">
              <span class="text-text-muted flex-shrink-0">用户名</span>
              <span class="break-all">{{ appUserName(info) }}</span>
            </div>
            <div v-if="info.openid" class="mb-1">
              <button
                v-if="hasAdminAccess()"
                type="button"
                class="inline-flex items-center gap-1.5 max-w-full px-2 py-0.5 rounded-full text-xs bg-sky-50 text-sky-700 cursor-pointer border-0 text-left"
                @click.stop="toggleSecret(openidOpen, info.id, info.openid)"
              >
                <span>openid</span>
                <span v-if="openidOpen.has(info.id)" class="font-mono break-all">{{ info.openid }}</span>
              </button>
              <span v-else class="inline-block px-2 py-0.5 rounded-full text-xs bg-sky-50 text-sky-700">openid</span>
            </div>
            <div class="flex gap-2 text-xs mb-1.5">
              <span class="text-text-muted flex-shrink-0">角色</span>
              <div class="flex gap-1 flex-wrap">
                <span v-for="r in info.roles || []" :key="r.hty_role_id" class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{{ roleLabel(r) }}</span>
                <span v-if="!(info.roles || []).length" class="text-text-muted">未分配</span>
              </div>
            </div>
            <div class="flex gap-1.5 mt-1 flex-wrap">
              <button class="bg-white border border-border px-2.5 py-1 text-xs rounded cursor-pointer text-text-muted hover:bg-gray-50" @click="openEditApp(item, info)">编辑角色</button>
              <button class="bg-white border border-border px-2.5 py-1 text-xs rounded cursor-pointer text-text-muted hover:bg-gray-50" @click="resetPwd(item, info)">重置密码</button>
              <template v-if="canVerifyInfo(info)">
                <button
                  class="bg-green-50 text-green-700 px-2.5 py-1 text-xs rounded cursor-pointer border-0 disabled:opacity-50"
                  :disabled="!item.enabled || isVerifying(item.hty_id, info.app_id || '')"
                  data-action="approve-app"
                  @click="approve(item, info)">
                  {{ isVerifying(item.hty_id, info.app_id || '') ? '处理中…' : '通过' }}
                </button>
                <button
                  class="bg-red-50 text-red-600 px-2.5 py-1 text-xs rounded cursor-pointer border-0 disabled:opacity-50"
                  :disabled="!item.enabled || isVerifying(item.hty_id, info.app_id || '')"
                  data-action="reject-app"
                  @click="startReject(item.hty_id, info.app_id || '', item.real_name || '')">
                  驳回
                </button>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Edit app detail modal -->
    <div v-if="showEditApp" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="closeEditApp">
      <div class="bg-surface rounded-xl p-6 w-[90%] max-w-md">
        <h3 class="text-base font-semibold mb-3">编辑角色 | {{ appNameMap[editForm.app_id] || editForm.app_id }}</h3>
        <div class="mb-3">
          <label class="block text-xs font-semibold text-text mb-1">认证状态</label>
          <div class="flex gap-3 text-xs">
            <label class="flex items-center gap-1 cursor-pointer"><input type="radio" v-model="editForm.is_registered" :value="true" /> 已认证</label>
            <label class="flex items-center gap-1 cursor-pointer"><input type="radio" v-model="editForm.is_registered" :value="false" /> 未认证</label>
          </div>
        </div>
        <div class="mb-3">
          <label class="block text-xs font-semibold text-text mb-1">角色</label>
          <div class="flex gap-2 flex-wrap text-xs">
            <label v-for="role in allRoles" :key="role.hty_role_id" class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" :value="role.hty_role_id"
                :checked="editRoleIds.has(role.hty_role_id)"
                @change="toggleEditRole(role.hty_role_id)" />
              {{ role.role_key }}
            </label>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-3">
          <button class="bg-gray-100 text-text px-4 py-2 rounded text-xs cursor-pointer border-0" @click="closeEditApp">取消</button>
          <button class="bg-primary text-white px-4 py-2 rounded text-xs cursor-pointer border-0" @click="submitEditApp">保存</button>
        </div>
      </div>
    </div>

    <!-- Reject dialog -->
    <div v-if="showRejectDialog" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="cancelReject">
      <div class="bg-surface rounded-xl p-6 w-[90%] max-w-sm">
        <h3 class="text-base font-semibold mb-3">请输入驳回原因</h3>
        <p v-if="rejectTargetAppId" class="text-xs text-text-muted mb-2">
          用户：{{ rejectTargetName || rejectTargetId }} · 应用：{{ appNameMap[rejectTargetAppId] || rejectTargetAppId }}
        </p>
        <textarea v-model="rejectReason" rows="3" placeholder="驳回原因..."
          class="w-full border border-border rounded-lg p-2.5 text-sm resize-y outline-none focus:border-primary font-inherit"></textarea>
        <div class="flex justify-end gap-2 mt-3">
          <button class="bg-gray-100 text-text px-4 py-2 rounded text-xs cursor-pointer border-0" @click="cancelReject">取消</button>
          <button class="bg-primary text-white px-4 py-2 rounded text-xs cursor-pointer border-0" :disabled="!rejectReason.trim()" @click="confirmReject">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import useUser from '@/store/user'
import request from '@/utils/request'
import useRole from '@/store/role'
import useApp from '@/store/app'
import type { HtyRole, HtyUser, HtyUserApp } from '@/types'

const { store, getAllUsers, approveUser, rejectUser, hasAdminAccess } = useUser()
const { store: roleStore, fetchAll: fetchRoles } = useRole()
const allRoles = computed(() => roleStore.list)
const { store: appStore, fetchAll: fetchApps } = useApp()

const appNameMap = computed(() => {
  const map: Record<string, string> = {}
  for (const app of appStore.list) {
    map[app.app_id] = app.app_desc || app.domain || app.app_id
  }
  return map
})

function appUserName(info: HtyUserApp): string {
  const name = info.username?.trim()
  if (name) return name
  return info.meta?.nickName?.trim() || '-'
}

function roleLabel(role: HtyRole): string {
  const name = role.role_name?.trim()
  const key = role.role_key?.trim()
  if (name && key && name !== key) return `${name}（${key}）`
  return name || key || '-'
}

function pendingInfos(user: HtyUser): HtyUserApp[] {
  return (user.infos || []).filter((info) => !info.is_registered && !info.reject_reason)
}

function rejectedInfos(user: HtyUser): HtyUserApp[] {
  return (user.infos || []).filter((info) => !info.is_registered && !!info.reject_reason)
}

function hasRegisteredApp(user: HtyUser): boolean {
  return (user.infos || []).some((info) => info.is_registered)
}

function allRegistered(user: HtyUser): boolean {
  const infos = user.infos || []
  return infos.length > 0 && infos.every((info) => info.is_registered)
}

/** 待审核 Tab：尚无已认证应用的新用户；已有任一应用认证则归入已认证 Tab */
function isWaitingUser(user: HtyUser): boolean {
  return pendingInfos(user).length > 0 && !hasRegisteredApp(user)
}

function canVerifyInfo(info: HtyUserApp): boolean {
  return !info.is_registered && !info.reject_reason
}

const showEditApp = ref(false)
const editForm = reactive<{ hty_id: string; user_app_info_id: string; app_id: string; is_registered: boolean }>({
  hty_id: '', user_app_info_id: '', app_id: '', is_registered: true,
})
const editRoleIds = ref(new Set<string>())

function openEditApp(user: HtyUser, info: HtyUserApp) {
  editForm.hty_id = user.hty_id
  editForm.user_app_info_id = info.id
  editForm.app_id = info.app_id || ''
  editForm.is_registered = info.is_registered || false
  editRoleIds.value = new Set((info.roles || []).map((r) => r.hty_role_id))
  fetchRoles()
  showEditApp.value = true
}
function closeEditApp() { showEditApp.value = false }
function toggleEditRole(roleId: string) {
  const s = editRoleIds.value
  if (s.has(roleId)) s.delete(roleId)
  else s.add(roleId)
  editRoleIds.value = new Set(s)
}
async function submitEditApp() {
  const selectedRoles = roleStore.list.filter(r => editRoleIds.value.has(r.hty_role_id))
  const payload = {
    id: editForm.user_app_info_id, hty_id: editForm.hty_id,
    app_id: editForm.app_id, is_registered: editForm.is_registered,
    roles: selectedRoles.map(r => ({ hty_role_id: r.hty_role_id, role_key: r.role_key })),
  }
  const { r } = await request({ url: '/api/v1/uc/create_or_update_userinfo_with_roles', method: 'POST', data: payload })
  if (r) { showEditApp.value = false; await fetchData() }
}

async function toggleEnabled(user: HtyUser, enabled: boolean) {
  const { r } = await request({
    url: '/api/v1/uc/create_or_update_user_with_info', method: 'POST',
    data: { hty_id: user.hty_id, enabled },
  })
  if (r) await fetchData()
}

async function resetPwd(user: HtyUser, info: HtyUserApp) {
  if (!confirm(`确认重置 ${user.real_name} 在 ${info.app_id} 的密码为 123456？`)) return
  const payload = { id: info.id, hty_id: user.hty_id, app_id: info.app_id, password: '123456' }
  const { r } = await request({ url: '/api/v1/uc/create_or_update_userinfo_with_roles', method: 'POST', data: payload })
  if (r) await fetchData()
}

const activeTab = ref('Approved')
const keyword = ref('')
const loading = ref(false)
const showRejectDialog = ref(false)
const rejectReason = ref('')
const rejectTargetId = ref('')
const rejectTargetAppId = ref('')
const rejectTargetName = ref('')
const verifyingKey = ref('')
const flashMessage = ref('')
const actionError = ref('')
const openRows = ref(new Set<string>())
const unionOpen = ref(new Set<string>())
const openidOpen = ref(new Set<string>())
const sortBy = ref<'name' | 'created_at' | 'status'>('name')
const sortAsc = ref(true)

function toggleSort(field: 'name' | 'created_at' | 'status') {
  if (sortBy.value === field) {
    sortAsc.value = !sortAsc.value
  } else {
    sortBy.value = field
    sortAsc.value = true
  }
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const input = document.createElement('textarea')
    input.value = value
    input.setAttribute('readonly', '')
    input.style.position = 'fixed'
    input.style.left = '-9999px'
    document.body.appendChild(input)
    input.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(input)
    flashMessage.value = ok ? '已复制' : '复制失败'
    return
  }
  flashMessage.value = '已复制'
}

function toggleSecret(open: typeof unionOpen, id: string, value: string) {
  const next = new Set(open.value)
  if (next.has(id)) {
    next.delete(id)
    open.value = next
    return
  }
  next.add(id)
  open.value = next
  if (value) void copyText(value)
}

function toggleRow(id: string) {
  const s = openRows.value
  if (s.has(id)) s.delete(id)
  else s.add(id)
  openRows.value = new Set(s)
}

const approvedList = computed(() => store.users.filter((user) => hasRegisteredApp(user)))
const waitingList = computed(() => store.users.filter((user) => isWaitingUser(user)))
const rejectedList = computed(() => store.users.filter((user) => rejectedInfos(user).length > 0))

const filteredList = computed(() => {
  let list = activeTab.value === 'Approved' ? approvedList.value
    : activeTab.value === 'Waiting' ? waitingList.value : rejectedList.value
  if (keyword.value && activeTab.value === 'Approved') {
    list = list.filter((user) => user.real_name?.includes(keyword.value))
  }
  const sorted = [...list]
  const dir = sortAsc.value ? 1 : -1
  switch (sortBy.value) {
    case 'name':
      sorted.sort((a, b) => dir * (a.real_name || '').localeCompare(b.real_name || '', 'zh-CN'))
      break
    case 'created_at':
      sorted.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0
        return dir * (ta - tb)
      })
      break
    case 'status':
      sorted.sort((a, b) => {
        const scoreA = (a.enabled ? 2 : 0) + (hasRegisteredApp(a) ? 1 : 0) + (allRegistered(a) ? 1 : 0)
        const scoreB = (b.enabled ? 2 : 0) + (hasRegisteredApp(b) ? 1 : 0) + (allRegistered(b) ? 1 : 0)
        return dir * (scoreB - scoreA)
      })
      break
  }
  return sorted
})

function isVerifying(userId: string, appId: string): boolean {
  return verifyingKey.value === `${userId}:${appId}`
}

function clearFeedbackSoon() {
  window.setTimeout(() => {
    flashMessage.value = ''
    actionError.value = ''
  }, 4000)
}

function notifySuccess(message: string) {
  actionError.value = ''
  flashMessage.value = message
  clearFeedbackSoon()
}

function notifyError(message: string) {
  flashMessage.value = ''
  actionError.value = message
  clearFeedbackSoon()
}

async function fetchData() {
  loading.value = true
  await Promise.all([getAllUsers(), fetchApps()])
  loading.value = false
}

async function approve(user: HtyUser, info: HtyUserApp) {
  const appId = info.app_id || ''
  if (!appId) {
    notifyError('缺少 app_id，无法审核')
    return
  }
  const appLabel = appNameMap.value[appId] || appId
  verifyingKey.value = `${user.hty_id}:${appId}`
  actionError.value = ''
  flashMessage.value = ''
  const { ok, error } = await approveUser(user.hty_id, appId)
  verifyingKey.value = ''
  if (!ok) {
    notifyError(error || '通过失败')
    return
  }

  const stillWaiting = pendingInfos(store.users.find((u) => u.hty_id === user.hty_id) || user).length > 0
  if (stillWaiting) {
    notifySuccess(`${user.real_name || '用户'} · ${appLabel} 已通过，仍有其他应用待审`)
  } else if (activeTab.value === 'Waiting') {
    openRows.value.delete(user.hty_id)
    openRows.value = new Set(openRows.value)
    notifySuccess(`${user.real_name || '用户'} 已全部通过，已从待审核列表移除`)
  } else {
    notifySuccess(`${user.real_name || '用户'} · ${appLabel} 已通过`)
  }
  await fetchData()
}

function startReject(userId: string, appId: string, realName = '') {
  rejectTargetId.value = userId
  rejectTargetAppId.value = appId
  rejectTargetName.value = realName
  rejectReason.value = ''
  showRejectDialog.value = true
}

function cancelReject() {
  showRejectDialog.value = false
  rejectTargetId.value = ''
  rejectTargetAppId.value = ''
  rejectTargetName.value = ''
  rejectReason.value = ''
}

async function confirmReject() {
  if (!rejectReason.value.trim() || !rejectTargetAppId.value) return
  const appId = rejectTargetAppId.value
  const userId = rejectTargetId.value
  const appLabel = appNameMap.value[appId] || appId
  verifyingKey.value = `${userId}:${appId}`
  const { ok, error } = await rejectUser(userId, appId, rejectReason.value.trim())
  verifyingKey.value = ''
  if (!ok) {
    notifyError(error || '驳回失败')
    return
  }
  notifySuccess(`${rejectTargetName.value || '用户'} · ${appLabel} 已驳回`)
  cancelReject()
  await fetchData()
}

function expandAllInList(users: HtyUser[]) {
  openRows.value = new Set(users.map((u) => u.hty_id))
}

watch(activeTab, (tab) => {
  if (tab === 'Waiting') {
    expandAllInList(waitingList.value)
  } else if (tab === 'Approved') {
    const partial = approvedList.value.filter((u) => pendingInfos(u).length > 0)
    if (partial.length > 0 && partial.length <= 5) {
      expandAllInList(partial)
    }
  }
})

onMounted(() => {
  fetchData()
})
</script>
