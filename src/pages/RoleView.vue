<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Search,
  Plus,
  Trash2,
  Play,
  Pause,
  GitBranch,
  Settings,
  X,
} from 'lucide-vue-next';
import type { Role } from '@/types';
import { useRoleStore } from '@/stores/role';
import RoleCard from '@/components/business/RoleCard.vue';
import BatchActionBar from '@/components/common/BatchActionBar.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import RoleSelector from '@/components/business/RoleSelector.vue';

const roleStore = useRoleStore();

const searchKeyword = ref('');
const showDeleteConfirm = ref(false);
const showBatchDeleteConfirm = ref(false);
const showInheritModal = ref(false);
const currentRoleId = ref<string | null>(null);
const inheritParentRoleId = ref<string | null>(null);
const isDeleting = ref(false);
const isBatchOperating = ref(false);

const filteredRoles = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) return roleStore.roles;
  return roleStore.roles.filter(
    (r) =>
      r.name.toLowerCase().includes(keyword) ||
      r.code.toLowerCase().includes(keyword)
  );
});

const allSelected = computed(() => {
  if (filteredRoles.value.length === 0) return false;
  return filteredRoles.value.every((r) =>
    roleStore.batchSelectedRoleIds.has(r.id)
  );
});

const hasSystemRoleInSelection = computed(() => {
  return roleStore.selectedRoles.some((r) => r.isSystem);
});

const selectedParentRoleIds = computed({
  get: () => inheritParentRoleId.value ? [inheritParentRoleId.value] : [],
  set: (ids: string[]) => {
    inheritParentRoleId.value = ids.length > 0 ? ids[0] : null;
  },
});

const batchActions = computed(() => [
  {
    key: 'enable',
    label: '批量启用',
    icon: Play,
    type: 'success' as const,
    disabled: roleStore.batchSelectionCount === 0,
  },
  {
    key: 'disable',
    label: '批量禁用',
    icon: Pause,
    type: 'default' as const,
    disabled: roleStore.batchSelectionCount === 0 || hasSystemRoleInSelection.value,
  },
  {
    key: 'delete',
    label: '批量删除',
    icon: Trash2,
    type: 'danger' as const,
    disabled:
      roleStore.batchSelectionCount === 0 || hasSystemRoleInSelection.value,
  },
]);

function handleSearch(): void {
  // 搜索已通过 computed 实现响应式
}

function handleClearSearch(): void {
  searchKeyword.value = '';
}

function handleAddRole(): void {
  roleStore.openAddModal();
}

function handleEditRole(roleId: string): void {
  roleStore.openEditModal(roleId);
}

function handleConfigurePermissions(roleId: string): void {
  roleStore.openPermissionConfig(roleId);
}

function handleDeleteRole(roleId: string): void {
  currentRoleId.value = roleId;
  showDeleteConfirm.value = true;
}

function confirmDelete(): void {
  if (!currentRoleId.value) return;
  isDeleting.value = true;
  setTimeout(() => {
    roleStore.deleteRole(currentRoleId.value!);
    isDeleting.value = false;
    showDeleteConfirm.value = false;
    currentRoleId.value = null;
  }, 300);
}

function handleCardClick(roleId: string): void {
  roleStore.selectRole(roleId);
}

function handleSelectAll(): void {
  if (allSelected.value) {
    for (const role of filteredRoles.value) {
      roleStore.batchSelectedRoleIds.delete(role.id);
    }
  } else {
    for (const role of filteredRoles.value) {
      roleStore.batchSelectedRoleIds.add(role.id);
    }
  }
}

function handleClearSelection(): void {
  roleStore.clearBatchSelection();
}

function handleBatchAction(action: string): void {
  switch (action) {
    case 'enable':
      handleBatchEnable();
      break;
    case 'disable':
      handleBatchDisable();
      break;
    case 'delete':
      showBatchDeleteConfirm.value = true;
      break;
  }
}

function handleBatchEnable(): void {
  isBatchOperating.value = true;
  setTimeout(() => {
    for (const role of roleStore.selectedRoles) {
      if (role.status !== 'active') {
        roleStore.toggleRoleStatus(role.id);
      }
    }
    isBatchOperating.value = false;
    roleStore.clearBatchSelection();
  }, 300);
}

function handleBatchDisable(): void {
  isBatchOperating.value = true;
  setTimeout(() => {
    for (const role of roleStore.selectedRoles) {
      if (!role.isSystem && role.status === 'active') {
        roleStore.toggleRoleStatus(role.id);
      }
    }
    isBatchOperating.value = false;
    roleStore.clearBatchSelection();
  }, 300);
}

function confirmBatchDelete(): void {
  isBatchOperating.value = true;
  setTimeout(() => {
    const ids = Array.from(roleStore.batchSelectedRoleIds);
    for (const id of ids) {
      const role = roleStore.roles.find((r) => r.id === id);
      if (role && !role.isSystem) {
        roleStore.deleteRole(id);
      }
    }
    isBatchOperating.value = false;
    showBatchDeleteConfirm.value = false;
  }, 300);
}

function handleSetInheritance(roleId: string): void {
  currentRoleId.value = roleId;
  const role = roleStore.roles.find((r) => r.id === roleId);
  inheritParentRoleId.value = role?.inheritFromRole || null;
  showInheritModal.value = true;
}

function confirmInheritance(): void {
  if (!currentRoleId.value) return;
  roleStore.setRoleInheritance(currentRoleId.value, inheritParentRoleId.value);
  showInheritModal.value = false;
  currentRoleId.value = null;
  inheritParentRoleId.value = null;
}

function cancelInheritance(): void {
  showInheritModal.value = false;
  currentRoleId.value = null;
  inheritParentRoleId.value = null;
}

function isRoleSelected(roleId: string): boolean {
  return roleStore.batchSelectedRoleIds.has(roleId);
}

function toggleRoleSelection(roleId: string, value: boolean): void {
  roleStore.toggleBatchSelect(roleId);
}

const currentRole = computed(() => {
  if (!currentRoleId.value) return null;
  return roleStore.roles.find((r) => r.id === currentRoleId.value) || null;
});

const availableParentRoles = computed(() => {
  if (!currentRoleId.value) return [];
  return roleStore.roles.filter((r) => r.id !== currentRoleId.value);
});

onMounted(() => {
  roleStore.clearBatchSelection();
  roleStore.selectRole(null);
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">角色管理</h1>
        <p class="mt-1 text-sm text-gray-500">
          管理系统角色、配置权限和继承关系
        </p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="relative w-full sm:w-80">
            <Search
              :size="18"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索角色名称或编码..."
              class="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              @input="handleSearch"
            />
            <button
              v-if="searchKeyword"
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              @click="handleClearSearch"
            >
              <X :size="16" />
            </button>
          </div>

          <div class="flex items-center gap-3 w-full sm:w-auto">
            <button
              v-if="roleStore.batchSelectionCount > 0"
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              @click="handleClearSelection"
            >
              <X :size="16" />
              取消选择
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              @click="handleAddRole"
            >
              <Plus :size="18" />
              新增角色
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="filteredRoles.length === 0"
        class="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200"
      >
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Search :size="28" class="text-gray-400" />
        </div>
        <p class="text-gray-500 text-base">
          {{ searchKeyword ? '没有找到匹配的角色' : '暂无角色数据' }}
        </p>
        <p
          v-if="searchKeyword"
          class="text-sm text-gray-400 mt-1"
        >
          请尝试其他搜索关键词
        </p>
        <button
          v-if="searchKeyword"
          type="button"
          class="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          @click="handleClearSearch"
        >
          清除搜索
        </button>
      </div>

      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-24"
      >
        <RoleCard
          v-for="role in filteredRoles"
          :key="role.id"
          :role="role"
          :selectable="true"
          :selected="isRoleSelected(role.id)"
          :disabled="false"
          @click="handleCardClick"
          @update:selected="(val) => toggleRoleSelection(role.id, val)"
          @edit="handleEditRole"
          @delete="handleDeleteRole"
          @configure="handleConfigurePermissions"
        />
      </div>
    </div>

    <BatchActionBar
      v-if="roleStore.batchSelectionCount > 0"
      :selected-count="roleStore.batchSelectionCount"
      :total-count="filteredRoles.length"
      :actions="batchActions"
      :show-select-all="true"
      :show-clear="true"
      :all-selected="allSelected"
      @select-all="handleSelectAll"
      @clear-selection="handleClearSelection"
      @action="handleBatchAction"
    />

    <ConfirmModal
      :visible="showDeleteConfirm"
      title="删除角色"
      :content="currentRole ? `确定要删除角色「${currentRole.name}」吗？此操作不可撤销。` : ''"
      type="danger"
      confirm-text="删除"
      cancel-text="取消"
      :loading="isDeleting"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
      @close="showDeleteConfirm = false"
    />

    <ConfirmModal
      :visible="showBatchDeleteConfirm"
      title="批量删除角色"
      :content="`确定要删除选中的 ${roleStore.batchSelectionCount} 个角色吗？此操作不可撤销。系统角色将被跳过。`"
      type="danger"
      confirm-text="批量删除"
      cancel-text="取消"
      :loading="isBatchOperating"
      @confirm="confirmBatchDelete"
      @cancel="showBatchDeleteConfirm = false"
      @close="showBatchDeleteConfirm = false"
    />

    <Teleport to="body">
      <transition name="modal-overlay" appear>
        <div
          v-if="showInheritModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            class="absolute inset-0 bg-black/50 backdrop-blur-sm"
            @click="cancelInheritance"
          />
          <transition name="modal-content" appear>
            <div
              v-if="showInheritModal"
              class="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
            >
              <div class="p-6">
                <div class="flex items-start gap-4">
                  <div class="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <GitBranch :size="24" class="text-blue-600" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="text-lg font-semibold text-gray-900">
                      设置角色继承
                    </h3>
                    <p class="mt-1 text-sm text-gray-500">
                      选择一个父角色，当前角色将继承父角色的所有权限
                    </p>
                  </div>
                </div>

                <div class="mt-6">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    父角色
                  </label>
                  <RoleSelector
                    v-model="selectedParentRoleIds"
                    :roles="availableParentRoles"
                    placeholder="选择父角色（可选）"
                    :exclude-system-roles="false"
                    :show-status-filter="false"
                  />
                  <p
                    v-if="inheritParentRoleId"
                    class="mt-2 text-xs text-emerald-600 flex items-center gap-1"
                  >
                    <GitBranch :size="12" />
                    将继承所选角色的权限
                  </p>
                  <p
                    v-else
                    class="mt-2 text-xs text-gray-500"
                  >
                    不选择则清除继承关系
                  </p>
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  @click="cancelInheritance"
                >
                  取消
                </button>
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  @click="confirmInheritance"
                >
                  <Settings :size="16" />
                  确认设置
                </button>
              </div>
            </div>
          </transition>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-overlay-enter-active,
.modal-overlay-leave-active {
  transition: opacity 0.2s ease;
}
.modal-overlay-enter-from,
.modal-overlay-leave-to {
  opacity: 0;
}

.modal-content-enter-active,
.modal-content-leave-active {
  transition: all 0.2s ease;
}
.modal-content-enter-from,
.modal-content-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}
</style>
