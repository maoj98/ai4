<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  Plus,
  Edit3,
  Trash2,
  Shield,
  ShieldAlert,
  ChevronRight,
  Home,
  X,
  Check,
  Folder,
  File,
  Search,
  AlertTriangle,
  Loader2,
} from 'lucide-vue-next';
import PermissionTree from '@/components/business/PermissionTree.vue';
import ConflictPanel from '@/components/business/ConflictPanel.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import { usePermissionStore } from '@/stores/permission';
import type { PermissionNode } from '@/types';
import { findNodeById, flattenTree } from '@/utils/treeUtils';

const permissionStore = usePermissionStore();

const showAddModal = ref(false);
const showEditModal = ref(false);
const showMutexModal = ref(false);
const showDeleteModal = ref(false);
const isSaving = ref(false);
const mutexSearchKeyword = ref('');

const formData = ref({
  name: '',
  code: '',
  type: 'menu' as PermissionNode['type'],
  description: '',
  order: 0,
  disabled: false,
});

const selectedPermission = computed(() => permissionStore.selectedPermission);

const permissionPath = computed(() => {
  if (!selectedPermission.value) return [];
  return permissionStore.getPermissionPathNames(selectedPermission.value.id);
});

const typeOptions: Array<{ value: PermissionNode['type']; label: string; icon: typeof Folder }> = [
  { value: 'menu', label: '菜单', icon: Folder },
  { value: 'button', label: '按钮', icon: File },
  { value: 'api', label: '接口', icon: Shield },
  { value: 'data', label: '数据', icon: Shield },
];

const typeColors: Record<string, string> = {
  menu: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  button: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  api: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  data: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
};

const allPermissions = computed(() => flattenTree(permissionStore.permissions));

const filteredMutexPermissions = computed(() => {
  if (!selectedPermission.value) return [];
  const keyword = mutexSearchKeyword.value.toLowerCase().trim();
  return allPermissions.value.filter((p) => {
    if (p.id === selectedPermission.value!.id) return false;
    if (!keyword) return true;
    return (
      p.name.toLowerCase().includes(keyword) ||
      p.code.toLowerCase().includes(keyword) ||
      p.description.toLowerCase().includes(keyword)
    );
  });
});

const conflictingPermissionNames = computed(() => {
  if (!selectedPermission.value) return [];
  return selectedPermission.value.conflictingPermissions
    .map((id) => findNodeById(id, permissionStore.permissions)?.name)
    .filter((n): n is string => n !== undefined);
});

const deleteConfirmContent = computed(() => {
  if (!selectedPermission.value) return '';
  return `确定要删除权限 "${selectedPermission.value.name}" 吗？此操作将同时删除其所有子权限，且不可恢复。`;
});

function handleSelect(nodeId: string): void {
  permissionStore.selectNode(nodeId);
}

function openAddModal(): void {
  formData.value = {
    name: '',
    code: '',
    type: 'menu',
    description: '',
    order: 0,
    disabled: false,
  };
  showAddModal.value = true;
}

function openEditModal(): void {
  if (!selectedPermission.value) return;
  formData.value = {
    name: selectedPermission.value.name,
    code: selectedPermission.value.code,
    type: selectedPermission.value.type,
    description: selectedPermission.value.description,
    order: selectedPermission.value.order,
    disabled: selectedPermission.value.disabled,
  };
  showEditModal.value = true;
}

function openMutexModal(): void {
  mutexSearchKeyword.value = '';
  showMutexModal.value = true;
}

function openDeleteModal(): void {
  showDeleteModal.value = true;
}

async function handleAdd(): Promise<void> {
  if (!formData.value.name.trim() || !formData.value.code.trim()) return;

  isSaving.value = true;
  try {
    const parentId = selectedPermission.value?.id || null;
    const success = permissionStore.addPermission(parentId, {
      name: formData.value.name.trim(),
      code: formData.value.code.trim(),
      type: formData.value.type,
      description: formData.value.description.trim(),
      order: formData.value.order,
      disabled: formData.value.disabled,
      conflictingPermissions: [],
    });

    if (success) {
      showAddModal.value = false;
    }
  } finally {
    isSaving.value = false;
  }
}

async function handleEdit(): Promise<void> {
  if (!selectedPermission.value || !formData.value.name.trim() || !formData.value.code.trim()) return;

  isSaving.value = true;
  try {
    const success = permissionStore.updatePermission(selectedPermission.value.id, {
      name: formData.value.name.trim(),
      code: formData.value.code.trim(),
      type: formData.value.type,
      description: formData.value.description.trim(),
      order: formData.value.order,
      disabled: formData.value.disabled,
    });

    if (success) {
      showEditModal.value = false;
    }
  } finally {
    isSaving.value = false;
  }
}

async function handleDelete(): Promise<void> {
  if (!selectedPermission.value) return;

  isSaving.value = true;
  try {
    const success = permissionStore.deletePermission(selectedPermission.value.id);
    if (success) {
      showDeleteModal.value = false;
    }
  } finally {
    isSaving.value = false;
  }
}

function handleToggleMutex(permissionId: string): void {
  if (!selectedPermission.value) return;
  permissionStore.toggleConflictingPermission(selectedPermission.value.id, permissionId);
}

function handleResolveConflict(conflictId: string, keepPermissionId: string): void {
  permissionStore.resolveCurrentConflict(conflictId, keepPermissionId);
}

function handleMarkResolved(conflictId: string): void {
  permissionStore.markConflictResolved(conflictId);
}

function handleClearResolved(): void {
  permissionStore.conflicts = permissionStore.conflicts.filter((c) => !c.resolved);
}

function handleDetectConflicts(): void {
  permissionStore.detectCurrentConflicts();
}

function isMutexPermission(permissionId: string): boolean {
  return selectedPermission.value?.conflictingPermissions.includes(permissionId) || false;
}

watch(
  () => selectedPermission.value?.id,
  () => {
    showAddModal.value = false;
    showEditModal.value = false;
    showMutexModal.value = false;
    showDeleteModal.value = false;
  }
);
</script>

<template>
  <div class="permission-view h-full flex flex-col bg-gray-50 dark:bg-gray-900">
    <div class="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white">权限管理</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">管理系统权限配置，检测权限冲突</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            @click="openAddModal"
          >
            <Plus :size="16" />
            新增权限
          </button>
        </div>
      </div>

      <div v-if="permissionPath.length > 0" class="flex items-center gap-1 mt-4 text-sm">
        <Home :size="14" class="text-gray-400" />
        <ChevronRight :size="14" class="text-gray-300" />
        <span
          v-for="(name, index) in permissionPath"
          :key="index"
          class="flex items-center gap-1"
        >
          <span
            :class="[
              'cursor-pointer hover:text-blue-500 transition-colors',
              index === permissionPath.length - 1
                ? 'text-blue-500 font-medium'
                : 'text-gray-600 dark:text-gray-400',
            ]"
          >
            {{ name }}
          </span>
          <ChevronRight
            v-if="index < permissionPath.length - 1"
            :size="14"
            class="text-gray-300"
          />
        </span>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden p-6 gap-6">
      <div class="w-96 flex-shrink-0">
        <PermissionTree @select="handleSelect" />
      </div>

      <div class="flex-1 flex flex-col gap-6 overflow-hidden">
        <div v-if="selectedPermission" class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Shield :size="20" class="text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ selectedPermission.name }}
                  </h2>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    编码: {{ selectedPermission.code }}
                  </p>
                </div>
                <span
                  :class="[
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    typeColors[selectedPermission.type],
                  ]"
                >
                  {{ typeOptions.find((o) => o.value === selectedPermission.type)?.label }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  title="编辑"
                  @click="openEditModal"
                >
                  <Edit3 :size="18" />
                </button>
                <button
                  class="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                  title="互斥权限"
                  @click="openMutexModal"
                >
                  <ShieldAlert :size="18" />
                </button>
                <button
                  class="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="删除"
                  @click="openDeleteModal"
                >
                  <Trash2 :size="18" />
                </button>
              </div>
            </div>
          </div>

          <div class="p-6 space-y-6">
            <div class="grid grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  权限名称
                </label>
                <p class="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg">
                  {{ selectedPermission.name }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  权限编码
                </label>
                <p class="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg font-mono">
                  {{ selectedPermission.code }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  权限类型
                </label>
                <p class="text-sm">
                  <span
                    :class="[
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      typeColors[selectedPermission.type],
                    ]"
                  >
                    {{ typeOptions.find((o) => o.value === selectedPermission.type)?.label }}
                  </span>
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  排序
                </label>
                <p class="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg">
                  {{ selectedPermission.order }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  状态
                </label>
                <p class="text-sm">
                  <span
                    :class="[
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      selectedPermission.disabled
                        ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
                    ]"
                  >
                    {{ selectedPermission.disabled ? '禁用' : '启用' }}
                  </span>
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  子权限数量
                </label>
                <p class="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg">
                  {{ selectedPermission.children.length }} 个
                </p>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                描述
              </label>
              <p class="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg min-h-[60px]">
                {{ selectedPermission.description || '暂无描述' }}
              </p>
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  互斥权限
                </label>
                <button
                  class="text-xs text-blue-500 hover:text-blue-600 transition-colors"
                  @click="openMutexModal"
                >
                  管理互斥权限
                </button>
              </div>
              <div v-if="conflictingPermissionNames.length > 0" class="flex flex-wrap gap-2">
                <span
                  v-for="name in conflictingPermissionNames"
                  :key="name"
                  class="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg flex items-center gap-1"
                >
                  <ShieldAlert :size="12" />
                  {{ name }}
                </span>
              </div>
              <p v-else class="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg">
                暂无互斥权限
              </p>
            </div>
          </div>
        </div>

        <div v-else class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex-1 flex items-center justify-center">
          <div class="text-center">
            <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <Shield :size="32" class="text-gray-400" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              请选择一个权限
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              从左侧树形结构中选择一个权限查看详情
            </p>
          </div>
        </div>

        <ConflictPanel
          :conflicts="permissionStore.conflicts"
          :permissions="permissionStore.permissions"
          @resolve="handleResolveConflict"
          @mark-resolved="handleMarkResolved"
          @clear-resolved="handleClearResolved"
          @detect="handleDetectConflicts"
        />
      </div>
    </div>

    <Teleport to="body">
      <transition name="modal-overlay" appear>
        <div
          v-if="showAddModal || showEditModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showAddModal = showEditModal = false" />
          <transition name="modal-content" appear>
            <div
              v-if="showAddModal || showEditModal"
              class="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
            >
              <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ showAddModal ? '新增权限' : '编辑权限' }}
                  </h3>
                  <button
                    class="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    :disabled="isSaving"
                    @click="showAddModal = showEditModal = false"
                  >
                    <X :size="20" />
                  </button>
                </div>
                <p v-if="showAddModal && selectedPermission" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  将在 "{{ selectedPermission.name }}" 下添加子权限
                </p>
                <p v-else-if="showAddModal" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  将添加为顶级权限
                </p>
              </div>

              <div class="p-6 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    权限名称 <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="formData.name"
                    type="text"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入权限名称"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    权限编码 <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="formData.code"
                    type="text"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder="例如: system:user:add"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    权限类型
                  </label>
                  <div class="flex items-center gap-2">
                    <button
                      v-for="option in typeOptions"
                      :key="option.value"
                      :class="[
                        'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                        formData.type === option.value
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600',
                      ]"
                      @click="formData.type = option.value"
                    >
                      <component :is="option.icon" :size="16" />
                      {{ option.label }}
                    </button>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    排序
                  </label>
                  <input
                    v-model.number="formData.order"
                    type="number"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    描述
                  </label>
                  <textarea
                    v-model="formData.description"
                    rows="3"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="请输入权限描述"
                  />
                </div>

                <div class="flex items-center gap-2">
                  <input
                    v-model="formData.disabled"
                    type="checkbox"
                    id="disabled"
                    class="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label for="disabled" class="text-sm text-gray-700 dark:text-gray-300">
                    禁用此权限
                  </label>
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                <button
                  class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="isSaving"
                  @click="showAddModal = showEditModal = false"
                >
                  取消
                </button>
                <button
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  :disabled="isSaving || !formData.name.trim() || !formData.code.trim()"
                  @click="showAddModal ? handleAdd() : handleEdit()"
                >
                  <Loader2 v-if="isSaving" :size="16" class="animate-spin" />
                  {{ isSaving ? '保存中...' : '保存' }}
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
          v-if="showMutexModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showMutexModal = false" />
          <transition name="modal-content" appear>
            <div
              v-if="showMutexModal"
              class="relative w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
            >
              <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <ShieldAlert :size="16" class="text-orange-500 dark:text-orange-400" />
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                      设置互斥权限
                    </h3>
                  </div>
                  <button
                    class="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    @click="showMutexModal = false"
                  >
                    <X :size="20" />
                  </button>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  选择与 "{{ selectedPermission?.name }}" 互斥的权限（不能同时授予）
                </p>
              </div>

              <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                <div class="relative">
                  <Search
                    :size="18"
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    v-model="mutexSearchKeyword"
                    type="text"
                    placeholder="搜索权限名称、编码..."
                    class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div class="max-h-96 overflow-y-auto">
                <div v-if="filteredMutexPermissions.length === 0" class="py-12 text-center">
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    没有找到可设置的权限
                  </p>
                </div>
                <div v-else class="divide-y divide-gray-100 dark:divide-gray-700">
                  <div
                    v-for="perm in filteredMutexPermissions"
                    :key="perm.id"
                    class="flex items-center justify-between px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                    @click="handleToggleMutex(perm.id)"
                  >
                    <div class="flex items-center gap-3">
                      <div
                        :class="[
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          perm.disabled ? 'bg-gray-100 dark:bg-gray-700' : typeColors[perm.type],
                        ]"
                      >
                        <component
                          :is="typeOptions.find((o) => o.value === perm.type)?.icon || Folder"
                          :size="16"
                          :class="perm.disabled ? 'text-gray-400' : ''"
                        />
                      </div>
                      <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-white">
                          {{ perm.name }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {{ perm.code }}
                        </p>
                      </div>
                    </div>
                    <div
                      :class="[
                        'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                        isMutexPermission(perm.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300 dark:border-gray-600',
                      ]"
                    >
                      <Check
                        v-if="isMutexPermission(perm.id)"
                        :size="12"
                        class="text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <AlertTriangle :size="14" class="text-orange-500" />
                    <span>已选择 {{ selectedPermission?.conflictingPermissions.length || 0 }} 个互斥权限</span>
                  </div>
                  <button
                    class="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors"
                    @click="showMutexModal = false"
                  >
                    完成
                  </button>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </transition>
    </Teleport>

    <ConfirmModal
      :visible="showDeleteModal"
      title="确认删除"
      :content="deleteConfirmContent"
      type="danger"
      confirm-text="删除"
      :loading="isSaving"
      @confirm="handleDelete"
      @close="showDeleteModal = false"
    />
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
