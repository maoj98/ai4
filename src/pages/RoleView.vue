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
  Shield,
  ChevronDown,
  ChevronRight,
  Key,
  Menu,
  MousePointerClick,
  Database,
  Globe,
  Lock,
} from 'lucide-vue-next';
import type { Role, PermissionNode } from '@/types';
import { useRoleStore } from '@/stores/role';
import { usePermissionStore } from '@/stores/permission';
import RoleCard from '@/components/business/RoleCard.vue';
import BatchActionBar from '@/components/common/BatchActionBar.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import RoleSelector from '@/components/business/RoleSelector.vue';
import TreeCheckbox from '@/components/tree/TreeCheckbox.vue';

const roleStore = useRoleStore();
const permissionStore = usePermissionStore();

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

const roleFormErrors = ref<Record<string, string>>({});
const isRoleFormSubmitting = ref(false);
const permissionSearchKeyword = ref('');

const configRole = computed(() => {
  if (!roleStore.configRoleId) return null;
  return roleStore.roles.find((r) => r.id === roleStore.configRoleId) || null;
});

const filteredPermissionTree = computed(() => {
  const keyword = permissionSearchKeyword.value.trim().toLowerCase();
  if (!keyword) return roleStore.configRolePermissionTree;

  function filter(nodes: PermissionNode[]): PermissionNode[] {
    return nodes
      .map((node) => {
        const filteredChildren = filter(node.children);
        const matchName = node.name.toLowerCase().includes(keyword);
        const matchCode = node.code.toLowerCase().includes(keyword);
        if (matchName || matchCode || filteredChildren.length > 0) {
          return {
            ...node,
            expanded: matchName || matchCode || filteredChildren.length > 0,
            children: filteredChildren,
          };
        }
        return null;
      })
      .filter((n) => n !== null) as PermissionNode[];
  }

  return filter(roleStore.configRolePermissionTree);
});

function validateRoleForm(): boolean {
  roleFormErrors.value = {};
  const data = roleStore.editingRole;

  if (!data) return false;

  if (!data.name.trim()) {
    roleFormErrors.value.name = '请输入角色名称';
  } else if (data.name.length > 50) {
    roleFormErrors.value.name = '角色名称不能超过50个字符';
  }

  if (!data.code.trim()) {
    roleFormErrors.value.code = '请输入角色编码';
  } else if (!/^[a-zA-Z0-9_-]+$/.test(data.code)) {
    roleFormErrors.value.code = '角色编码只能包含字母、数字、下划线和中划线';
  } else if (data.code.length > 30) {
    roleFormErrors.value.code = '角色编码不能超过30个字符';
  }

  if (data.description && data.description.length > 200) {
    roleFormErrors.value.description = '角色描述不能超过200个字符';
  }

  return Object.keys(roleFormErrors.value).length === 0;
}

async function handleRoleFormSubmit(): Promise<void> {
  if (!roleStore.editingRole) return;

  if (!validateRoleForm()) {
    return;
  }

  isRoleFormSubmitting.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const success = roleStore.saveRole(roleStore.editingRole);
    if (success) {
      roleFormErrors.value = {};
    }
  } finally {
    isRoleFormSubmitting.value = false;
  }
}

function handleRoleFormCancel(): void {
  roleStore.closeFormModal();
  roleFormErrors.value = {};
}

function handlePermissionToggle(nodeId: string): void {
  permissionStore.toggleCheck(nodeId);
}

function handlePermissionFormSubmit(): void {
  const permissionIds = permissionStore.checkedPermissionIds;
  roleStore.saveRolePermissions(permissionIds);
  permissionSearchKeyword.value = '';
}

function handlePermissionFormCancel(): void {
  roleStore.closePermissionConfig();
  permissionSearchKeyword.value = '';
}

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

    <Teleport to="body">
      <transition name="modal-overlay" appear>
        <div
          v-if="roleStore.showFormModal && roleStore.editingRole"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            class="absolute inset-0 bg-black/50 backdrop-blur-sm"
            @click="handleRoleFormCancel"
          />
          <transition name="modal-content" appear>
            <div
              v-if="roleStore.showFormModal && roleStore.editingRole"
              class="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
            >
              <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-semibold text-gray-900">
                    {{ roleStore.formMode === 'add' ? '新增角色' : '编辑角色' }}
                  </h3>
                  <button
                    type="button"
                    class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    @click="handleRoleFormCancel"
                  >
                    <X :size="20" />
                  </button>
                </div>
              </div>

              <div class="px-6 py-5 max-h-[70vh] overflow-y-auto">
                <div class="space-y-5">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">
                      角色名称
                      <span class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="roleStore.editingRole.name"
                      type="text"
                      :class="[
                        'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                        roleFormErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300',
                      ]"
                      placeholder="请输入角色名称"
                      maxlength="50"
                    />
                    <p v-if="roleFormErrors.name" class="mt-1 text-xs text-red-500">
                      {{ roleFormErrors.name }}
                    </p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">
                      角色编码
                      <span class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="roleStore.editingRole.code"
                      type="text"
                      :class="[
                        'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                        roleFormErrors.code ? 'border-red-500 bg-red-50' : 'border-gray-300',
                      ]"
                      placeholder="请输入角色编码（如：admin、user）"
                      maxlength="30"
                    />
                    <p v-if="roleFormErrors.code" class="mt-1 text-xs text-red-500">
                      {{ roleFormErrors.code }}
                    </p>
                    <p class="mt-1 text-xs text-gray-400">
                      只能包含字母、数字、下划线和中划线
                    </p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">
                      角色描述
                    </label>
                    <textarea
                      v-model="roleStore.editingRole.description"
                      :class="[
                        'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none',
                        roleFormErrors.description ? 'border-red-500 bg-red-50' : 'border-gray-300',
                      ]"
                      rows="3"
                      placeholder="请输入角色描述（可选）"
                      maxlength="200"
                    />
                    <div class="flex justify-between mt-1">
                      <p v-if="roleFormErrors.description" class="text-xs text-red-500">
                        {{ roleFormErrors.description }}
                      </p>
                      <p class="text-xs text-gray-400 ml-auto">
                        {{ roleStore.editingRole.description?.length || 0 }}/200
                      </p>
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">
                      状态
                    </label>
                    <div class="flex items-center gap-4">
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          v-model="roleStore.editingRole.status"
                          value="active"
                          class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span class="text-sm text-gray-700">启用</span>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          v-model="roleStore.editingRole.status"
                          value="disabled"
                          class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span class="text-sm text-gray-700">禁用</span>
                      </label>
                    </div>
                  </div>

                  <div v-if="roleStore.formMode === 'edit'" class="pt-4 border-t border-gray-100">
                    <div class="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span class="text-gray-500">创建时间：</span>
                        <span class="text-gray-700">{{ new Date(roleStore.editingRole.createdAt).toLocaleString('zh-CN') }}</span>
                      </div>
                      <div>
                        <span class="text-gray-500">更新时间：</span>
                        <span class="text-gray-700">{{ new Date(roleStore.editingRole.updatedAt).toLocaleString('zh-CN') }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  :disabled="isRoleFormSubmitting"
                  @click="handleRoleFormCancel"
                >
                  取消
                </button>
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="isRoleFormSubmitting"
                  @click="handleRoleFormSubmit"
                >
                  <span v-if="isRoleFormSubmitting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span v-else>
                    {{ roleStore.formMode === 'add' ? '新增' : '保存' }}
                  </span>
                </button>
              </div>
            </div>
          </transition>
        </div>
      </transition>
    </Teleport>

    <Teleport to="body">
      <transition name="modal-overlay" appear>
        <div
          v-if="roleStore.showPermissionConfig"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            class="absolute inset-0 bg-black/50 backdrop-blur-sm"
            @click="handlePermissionFormCancel"
          />
          <transition name="modal-content" appear>
            <div
              v-if="roleStore.showPermissionConfig && configRole"
              class="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
              role="dialog"
              aria-modal="true"
            >
              <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Shield :size="20" class="text-purple-600" />
                    </div>
                    <div>
                      <h3 class="text-lg font-semibold text-gray-900">
                        权限配置
                      </h3>
                      <p class="text-sm text-gray-500">
                        为角色「{{ configRole.name }}」配置权限
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    @click="handlePermissionFormCancel"
                  >
                    <X :size="20" />
                  </button>
                </div>
              </div>

              <div class="px-6 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <div class="relative">
                  <Search
                    :size="18"
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    v-model="permissionSearchKeyword"
                    type="text"
                    placeholder="搜索权限名称或编码..."
                    class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div class="flex-1 overflow-y-auto p-4">
                <div v-if="roleStore.inheritanceChain.length > 1" class="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div class="flex items-center gap-2 mb-2">
                    <GitBranch :size="16" class="text-emerald-600" />
                    <span class="text-sm font-medium text-emerald-700">权限继承链</span>
                  </div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <template v-for="(role, index) in roleStore.inheritanceChain" :key="role.id">
                      <span class="inline-flex items-center gap-1 px-2 py-1 bg-white rounded text-xs">
                        <Shield :size="12" class="text-emerald-600" />
                        {{ role.name }}
                      </span>
                      <ChevronRight v-if="index < roleStore.inheritanceChain.length - 1" :size="14" class="text-emerald-400" />
                    </template>
                  </div>
                  <p class="mt-2 text-xs text-emerald-600">
                    绿色标记的权限为继承自父角色的权限
                  </p>
                </div>

                <div class="space-y-1">
                  <template v-for="node in filteredPermissionTree" :key="node.id">
                    <div class="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-gray-50 transition-colors">
                      <div class="flex items-center gap-2 flex-1 min-w-0">
                        <TreeCheckbox
                          :modelValue="node.checked"
                          :indeterminate="node.indeterminate"
                          :disabled="node.inherited"
                          @update:modelValue="handlePermissionToggle(node.id)"
                        />
                        <span
                          v-if="node.children.length > 0"
                          class="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 cursor-pointer transition-colors"
                          @click="node.expanded = !node.expanded"
                        >
                          <component :is="node.expanded ? ChevronDown : ChevronRight" :size="16" class="text-gray-500" />
                        </span>
                        <span v-else class="w-6 flex-shrink-0" />
                        <component
                          :is="node.type === 'menu' ? Menu : node.type === 'button' ? MousePointerClick : node.type === 'api' ? Globe : Database"
                          :size="16"
                          :class="[
                            'flex-shrink-0',
                            node.inherited ? 'text-emerald-500' : 'text-gray-500',
                          ]"
                        />
                        <span
                          :class="[
                            'text-sm truncate',
                            node.inherited ? 'text-emerald-700' : 'text-gray-700',
                          ]"
                        >
                          {{ node.name }}
                        </span>
                        <span class="text-xs text-gray-400 flex-shrink-0">
                          {{ node.code }}
                        </span>
                        <span
                          :class="[
                            'inline-flex items-center px-1.5 py-0.5 text-xs rounded',
                            node.type === 'menu' ? 'bg-blue-100 text-blue-700' :
                            node.type === 'button' ? 'bg-green-100 text-green-700' :
                            node.type === 'api' ? 'bg-purple-100 text-purple-700' :
                            'bg-orange-100 text-orange-700',
                          ]"
                        >
                          {{ node.type === 'menu' ? '菜单' : node.type === 'button' ? '按钮' : node.type === 'api' ? 'API' : '数据' }}
                        </span>
                        <span
                          v-if="node.inherited"
                          class="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded"
                        >
                          <GitBranch :size="10" />
                          继承
                        </span>
                      </div>
                    </div>
                    <div v-if="node.expanded && node.children.length > 0" class="pl-6">
                      <template v-for="child in node.children" :key="child.id">
                        <div class="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-gray-50 transition-colors">
                          <div class="flex items-center gap-2 flex-1 min-w-0">
                            <TreeCheckbox
                              :modelValue="child.checked"
                              :indeterminate="child.indeterminate"
                              :disabled="child.inherited"
                              @update:modelValue="handlePermissionToggle(child.id)"
                            />
                            <span
                              v-if="child.children.length > 0"
                              class="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 cursor-pointer transition-colors"
                              @click="child.expanded = !child.expanded"
                            >
                              <component :is="child.expanded ? ChevronDown : ChevronRight" :size="16" class="text-gray-500" />
                            </span>
                            <span v-else class="w-6 flex-shrink-0" />
                            <component
                              :is="child.type === 'menu' ? Menu : child.type === 'button' ? MousePointerClick : child.type === 'api' ? Globe : Database"
                              :size="16"
                              :class="[
                                'flex-shrink-0',
                                child.inherited ? 'text-emerald-500' : 'text-gray-500',
                              ]"
                            />
                            <span
                              :class="[
                                'text-sm truncate',
                                child.inherited ? 'text-emerald-700' : 'text-gray-700',
                              ]"
                            >
                              {{ child.name }}
                            </span>
                            <span class="text-xs text-gray-400 flex-shrink-0">
                              {{ child.code }}
                            </span>
                            <span
                              :class="[
                                'inline-flex items-center px-1.5 py-0.5 text-xs rounded',
                                child.type === 'menu' ? 'bg-blue-100 text-blue-700' :
                                child.type === 'button' ? 'bg-green-100 text-green-700' :
                                child.type === 'api' ? 'bg-purple-100 text-purple-700' :
                                'bg-orange-100 text-orange-700',
                              ]"
                            >
                              {{ child.type === 'menu' ? '菜单' : child.type === 'button' ? '按钮' : child.type === 'api' ? 'API' : '数据' }}
                            </span>
                            <span
                              v-if="child.inherited"
                              class="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded"
                            >
                              <GitBranch :size="10" />
                              继承
                            </span>
                          </div>
                        </div>
                        <div v-if="child.expanded && child.children.length > 0" class="pl-6">
                          <template v-for="grandChild in child.children" :key="grandChild.id">
                            <div class="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-gray-50 transition-colors">
                              <div class="flex items-center gap-2 flex-1 min-w-0">
                                <TreeCheckbox
                                  :modelValue="grandChild.checked"
                                  :indeterminate="grandChild.indeterminate"
                                  :disabled="grandChild.inherited"
                                  @update:modelValue="handlePermissionToggle(grandChild.id)"
                                />
                                <span class="w-6 flex-shrink-0" />
                                <component
                                  :is="grandChild.type === 'menu' ? Menu : grandChild.type === 'button' ? MousePointerClick : grandChild.type === 'api' ? Globe : Database"
                                  :size="16"
                                  :class="[
                                    'flex-shrink-0',
                                    grandChild.inherited ? 'text-emerald-500' : 'text-gray-500',
                                  ]"
                                />
                                <span
                                  :class="[
                                    'text-sm truncate',
                                    grandChild.inherited ? 'text-emerald-700' : 'text-gray-700',
                                  ]"
                                >
                                  {{ grandChild.name }}
                                </span>
                                <span class="text-xs text-gray-400 flex-shrink-0">
                                  {{ grandChild.code }}
                                </span>
                                <span
                                  :class="[
                                    'inline-flex items-center px-1.5 py-0.5 text-xs rounded',
                                    grandChild.type === 'menu' ? 'bg-blue-100 text-blue-700' :
                                    grandChild.type === 'button' ? 'bg-green-100 text-green-700' :
                                    grandChild.type === 'api' ? 'bg-purple-100 text-purple-700' :
                                    'bg-orange-100 text-orange-700',
                                  ]"
                                >
                                  {{ grandChild.type === 'menu' ? '菜单' : grandChild.type === 'button' ? '按钮' : grandChild.type === 'api' ? 'API' : '数据' }}
                                </span>
                                <span
                                  v-if="grandChild.inherited"
                                  class="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded"
                                >
                                  <GitBranch :size="10" />
                                  继承
                                </span>
                              </div>
                            </div>
                          </template>
                        </div>
                      </template>
                    </div>
                  </template>
                </div>

                <div v-if="filteredPermissionTree.length === 0" class="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Lock :size="48" class="mb-3 opacity-30" />
                  <p class="text-sm">没有找到匹配的权限</p>
                </div>
              </div>

              <div class="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
                <div class="text-sm text-gray-500">
                  已选择 <span class="font-medium text-blue-600">{{ permissionStore.checkedPermissionIds.length }}</span> 项权限
                </div>
                <div class="flex items-center gap-3">
                  <button
                    type="button"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    @click="handlePermissionFormCancel"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    class="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                    @click="handlePermissionFormSubmit"
                  >
                    <Settings :size="16" />
                    保存配置
                  </button>
                </div>
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
