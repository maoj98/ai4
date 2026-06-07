<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Building2,
  User,
  Users,
  Hash,
  Clock,
  FileText,
  Plus,
  Edit,
  Trash2,
  FolderPlus,
  ChevronRight,
  Home,
  Shield,
  X,
} from 'lucide-vue-next';
import { useDepartmentStore } from '@/stores/department';
import { useRoleStore } from '@/stores/role';
import { useAppStore } from '@/stores/app';
import DepartmentTree from '@/components/business/DepartmentTree.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import type { DepartmentNode, Role } from '@/types';

const departmentStore = useDepartmentStore();
const roleStore = useRoleStore();
const appStore = useAppStore();

const selectedId = ref<string | null>(null);
const showDeleteModal = ref(false);
const deletingDepartment = ref<DepartmentNode | null>(null);
const deleteLoading = ref(false);

const selectedDepartment = computed(() => {
  if (!selectedId.value) return null;
  return departmentStore.departments.length > 0
    ? findDepartmentById(selectedId.value, departmentStore.departments)
    : null;
});

const departmentPath = computed(() => {
  if (!selectedId.value) return [];
  return getDepartmentPath(selectedId.value, departmentStore.departments);
});

const departmentRoles = computed((): Role[] => {
  if (!selectedId.value) return [];
  return roleStore.getRolesByDepartment(selectedId.value);
});

function findDepartmentById(id: string, nodes: DepartmentNode[]): DepartmentNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children.length > 0) {
      const found = findDepartmentById(id, node.children);
      if (found) return found;
    }
  }
  return null;
}

function getDepartmentPath(id: string, nodes: DepartmentNode[], path: DepartmentNode[] = []): DepartmentNode[] {
  for (const node of nodes) {
    const currentPath = [...path, node];
    if (node.id === id) return currentPath;
    if (node.children.length > 0) {
      const found = getDepartmentPath(id, node.children, currentPath);
      if (found.length > 0) return found;
    }
  }
  return [];
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function handleSelect(nodeId: string): void {
  selectedId.value = nodeId;
}

function handleAddRoot(): void {
  departmentStore.openAddModal(null);
}

function handleAddChild(): void {
  if (selectedId.value) {
    departmentStore.openAddModal(selectedId.value);
  }
}

function handleEdit(): void {
  if (selectedId.value) {
    departmentStore.openEditModal(selectedId.value);
  }
}

function handleDeleteClick(): void {
  if (!selectedDepartment.value) return;

  const dept = selectedDepartment.value;
  const hasChildren = dept.children.length > 0;
  const hasMembers = dept.memberCount > 0;

  if (hasChildren || hasMembers) {
    let errorMsg = '';
    if (hasChildren && hasMembers) {
      errorMsg = '该部门下有子部门和成员，无法删除';
    } else if (hasChildren) {
      errorMsg = '该部门下有子部门，无法删除';
    } else {
      errorMsg = '该部门下有成员，无法删除';
    }
    appStore.showNotificationMsg('error', errorMsg);
    return;
  }

  deletingDepartment.value = dept;
  showDeleteModal.value = true;
}

async function handleDeleteConfirm(): Promise<void> {
  if (!deletingDepartment.value) return;

  deleteLoading.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const success = departmentStore.deleteDepartment(deletingDepartment.value.id);
    if (success) {
      selectedId.value = null;
      showDeleteModal.value = false;
      deletingDepartment.value = null;
    }
  } finally {
    deleteLoading.value = false;
  }
}

function handleDeleteCancel(): void {
  showDeleteModal.value = false;
  deletingDepartment.value = null;
}

function canDelete(): boolean {
  if (!selectedDepartment.value) return false;
  return selectedDepartment.value.children.length === 0 && selectedDepartment.value.memberCount === 0;
}

const formErrors = ref<Record<string, string>>({});
const isSubmitting = ref(false);

const parentDepartmentName = computed(() => {
  if (!departmentStore.editingDepartment?.parentId) return '无（根部门）';
  const parent = findDepartmentById(departmentStore.editingDepartment.parentId, departmentStore.departments);
  return parent?.name || '未知';
});

function validateForm(): boolean {
  formErrors.value = {};
  const data = departmentStore.editingDepartment;

  if (!data) return false;

  if (!data.name.trim()) {
    formErrors.value.name = '请输入部门名称';
  } else if (data.name.length > 50) {
    formErrors.value.name = '部门名称不能超过50个字符';
  }

  if (!data.code.trim()) {
    formErrors.value.code = '请输入部门编码';
  } else if (!/^[a-zA-Z0-9_-]+$/.test(data.code)) {
    formErrors.value.code = '部门编码只能包含字母、数字、下划线和中划线';
  } else if (data.code.length > 30) {
    formErrors.value.code = '部门编码不能超过30个字符';
  }

  if (data.leader && data.leader.length > 20) {
    formErrors.value.leader = '负责人姓名不能超过20个字符';
  }

  if (data.memberCount < 0) {
    formErrors.value.memberCount = '成员数量不能为负数';
  }

  if (data.description && data.description.length > 500) {
    formErrors.value.description = '部门描述不能超过500个字符';
  }

  return Object.keys(formErrors.value).length === 0;
}

async function handleSubmit(): Promise<void> {
  if (!departmentStore.editingDepartment) return;

  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const success = departmentStore.saveDepartment(departmentStore.editingDepartment);
    if (success) {
      formErrors.value = {};
    }
  } finally {
    isSubmitting.value = false;
  }
}

function handleCancel(): void {
  departmentStore.closeFormModal();
  formErrors.value = {};
}
</script>

<template>
  <div class="department-view flex h-full bg-gray-50">
    <div class="w-80 flex-shrink-0 p-4">
      <div class="h-full flex flex-col">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-gray-800">部门结构</h2>
          <button
            class="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            @click="handleAddRoot"
          >
            <Plus :size="16" />
            <span>新增部门</span>
          </button>
        </div>
        <div class="flex-1 overflow-hidden">
          <DepartmentTree
            :selected-id="selectedId"
            @select="handleSelect"
          />
        </div>
      </div>
    </div>

    <div class="flex-1 p-4 pl-0 overflow-hidden">
      <div class="h-full bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
        <template v-if="selectedDepartment">
          <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div class="flex items-center gap-1 text-sm text-gray-500 mb-3">
              <Home :size="14" class="text-gray-400" />
              <ChevronRight :size="14" class="text-gray-300" />
              <template v-for="(item, index) in departmentPath" :key="item.id">
                <span
                  :class="[
                    'hover:text-blue-600 cursor-pointer transition-colors',
                    index === departmentPath.length - 1 ? 'text-gray-800 font-medium' : '',
                  ]"
                  @click="handleSelect(item.id)"
                >
                  {{ item.name }}
                </span>
                <ChevronRight v-if="index < departmentPath.length - 1" :size="14" class="text-gray-300" />
              </template>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 :size="24" class="text-blue-600" />
                </div>
                <div>
                  <h2 class="text-xl font-semibold text-gray-800">{{ selectedDepartment.name }}</h2>
                  <div class="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <Hash :size="14" />
                    <span>{{ selectedDepartment.code }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  @click="handleAddChild"
                >
                  <FolderPlus :size="16" />
                  <span>添加子部门</span>
                </button>
                <button
                  class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  @click="handleEdit"
                >
                  <Edit :size="16" />
                  <span>编辑</span>
                </button>
                <button
                  :class="[
                    'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    canDelete()
                      ? 'text-red-600 bg-white border border-red-300 hover:bg-red-50'
                      : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed',
                  ]"
                  :disabled="!canDelete()"
                  :title="canDelete() ? '删除部门' : '该部门下有子部门或成员，无法删除'"
                  @click="handleDeleteClick"
                >
                  <Trash2 :size="16" />
                  <span>删除</span>
                </button>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-6">
            <div class="grid grid-cols-2 gap-6 mb-8">
              <div class="space-y-4">
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <User :size="16" class="text-gray-500" />
                  </div>
                  <div>
                    <div class="text-sm text-gray-500 mb-0.5">负责人</div>
                    <div class="text-sm font-medium text-gray-800">
                      {{ selectedDepartment.leader || '-' }}
                    </div>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Users :size="16" class="text-gray-500" />
                  </div>
                  <div>
                    <div class="text-sm text-gray-500 mb-0.5">成员数量</div>
                    <div class="text-sm font-medium text-gray-800">
                      {{ selectedDepartment.memberCount }} 人
                    </div>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Clock :size="16" class="text-gray-500" />
                  </div>
                  <div>
                    <div class="text-sm text-gray-500 mb-0.5">创建时间</div>
                    <div class="text-sm font-medium text-gray-800">
                      {{ formatDate(selectedDepartment.createdAt) }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Clock :size="16" class="text-gray-500" />
                  </div>
                  <div>
                    <div class="text-sm text-gray-500 mb-0.5">更新时间</div>
                    <div class="text-sm font-medium text-gray-800">
                      {{ formatDate(selectedDepartment.updatedAt) }}
                    </div>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Hash :size="16" class="text-gray-500" />
                  </div>
                  <div>
                    <div class="text-sm text-gray-500 mb-0.5">层级</div>
                    <div class="text-sm font-medium text-gray-800">
                      第 {{ selectedDepartment.level }} 级
                    </div>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Building2 :size="16" class="text-gray-500" />
                  </div>
                  <div>
                    <div class="text-sm text-gray-500 mb-0.5">子部门数量</div>
                    <div class="text-sm font-medium text-gray-800">
                      {{ selectedDepartment.children.length }} 个
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="mb-8">
              <div class="flex items-center gap-2 mb-3">
                <FileText :size="16" class="text-gray-500" />
                <h3 class="text-sm font-semibold text-gray-700">部门描述</h3>
              </div>
              <div class="p-4 bg-gray-50 rounded-lg text-sm text-gray-600 leading-relaxed">
                {{ selectedDepartment.description || '暂无描述' }}
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <Shield :size="16" class="text-gray-500" />
                  <h3 class="text-sm font-semibold text-gray-700">部门角色</h3>
                  <span class="text-xs text-gray-400">({{ departmentRoles.length }} 个)</span>
                </div>
              </div>

              <div v-if="departmentRoles.length === 0" class="p-8 bg-gray-50 rounded-lg text-center">
                <Shield :size="32" class="mx-auto text-gray-300 mb-2" />
                <p class="text-sm text-gray-400">该部门暂无角色</p>
              </div>

              <div v-else class="grid grid-cols-2 gap-3">
                <div
                  v-for="role in departmentRoles"
                  :key="role.id"
                  class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div
                    :class="[
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      role.isSystem ? 'bg-purple-100' : 'bg-blue-100',
                    ]"
                  >
                    <Shield
                      :size="20"
                      :class="role.isSystem ? 'text-purple-600' : 'text-blue-600'"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-gray-800 truncate">{{ role.name }}</span>
                      <span
                        v-if="role.isSystem"
                        class="px-1.5 py-0.5 text-xs font-medium text-purple-600 bg-purple-100 rounded"
                      >
                        系统
                      </span>
                      <span
                        :class="[
                          'px-1.5 py-0.5 text-xs font-medium rounded',
                          role.status === 'active'
                            ? 'text-green-600 bg-green-100'
                            : 'text-gray-500 bg-gray-200',
                        ]"
                      >
                        {{ role.status === 'active' ? '启用' : '禁用' }}
                      </span>
                    </div>
                    <div class="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <Hash :size="12" />
                      <span class="truncate">{{ role.code }}</span>
                      <span class="flex-shrink-0">·</span>
                      <Users :size="12" />
                      <span>{{ role.userIds.length }} 人</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Building2 :size="64" class="mb-4 opacity-30" />
            <p class="text-lg font-medium">请选择一个部门</p>
            <p class="text-sm mt-1">在左侧部门树中点击选择部门查看详情</p>
          </div>
        </template>
      </div>
    </div>

    <ConfirmModal
      :visible="showDeleteModal"
      title="确认删除"
      type="danger"
      :loading="deleteLoading"
      confirm-text="确认删除"
      cancel-text="取消"
      @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    >
      <template #content>
        <div class="mt-2">
          <p class="text-sm text-gray-600">
            确定要删除部门
            <span class="font-semibold text-red-600">{{ deletingDepartment?.name }}</span>
            吗？
          </p>
          <p class="mt-2 text-xs text-gray-400">
            删除后数据将无法恢复，请谨慎操作。
          </p>
        </div>
      </template>
    </ConfirmModal>

    <Teleport to="body">
      <transition name="modal-overlay" appear>
        <div
          v-if="departmentStore.showFormModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            class="absolute inset-0 bg-black/50 backdrop-blur-sm"
            @click="handleCancel"
          />
          <transition name="modal-content" appear>
            <div
              v-if="departmentStore.showFormModal && departmentStore.editingDepartment"
              class="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
            >
              <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-semibold text-gray-900">
                    {{ departmentStore.formMode === 'add' ? '新增部门' : '编辑部门' }}
                  </h3>
                  <button
                    type="button"
                    class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    @click="handleCancel"
                  >
                    <X :size="20" />
                  </button>
                </div>
              </div>

              <div class="px-6 py-5 max-h-[70vh] overflow-y-auto">
                <div class="space-y-5">
                  <div v-if="departmentStore.formMode === 'edit'">
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">
                      上级部门
                    </label>
                    <div class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">
                      {{ parentDepartmentName }}
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">
                      部门名称
                      <span class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="departmentStore.editingDepartment.name"
                      type="text"
                      :class="[
                        'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                        formErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300',
                      ]"
                      placeholder="请输入部门名称"
                      maxlength="50"
                    />
                    <p v-if="formErrors.name" class="mt-1 text-xs text-red-500">
                      {{ formErrors.name }}
                    </p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">
                      部门编码
                      <span class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="departmentStore.editingDepartment.code"
                      type="text"
                      :class="[
                        'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                        formErrors.code ? 'border-red-500 bg-red-50' : 'border-gray-300',
                      ]"
                      placeholder="请输入部门编码（如：tech、hr）"
                      maxlength="30"
                    />
                    <p v-if="formErrors.code" class="mt-1 text-xs text-red-500">
                      {{ formErrors.code }}
                    </p>
                    <p class="mt-1 text-xs text-gray-400">
                      只能包含字母、数字、下划线和中划线
                    </p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">
                      负责人
                    </label>
                    <input
                      v-model="departmentStore.editingDepartment.leader"
                      type="text"
                      :class="[
                        'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                        formErrors.leader ? 'border-red-500 bg-red-50' : 'border-gray-300',
                      ]"
                      placeholder="请输入负责人姓名"
                      maxlength="20"
                    />
                    <p v-if="formErrors.leader" class="mt-1 text-xs text-red-500">
                      {{ formErrors.leader }}
                    </p>
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1.5">
                        成员数量
                      </label>
                      <input
                        v-model.number="departmentStore.editingDepartment.memberCount"
                        type="number"
                        min="0"
                        :class="[
                          'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                          formErrors.memberCount ? 'border-red-500 bg-red-50' : 'border-gray-300',
                        ]"
                        placeholder="0"
                      />
                      <p v-if="formErrors.memberCount" class="mt-1 text-xs text-red-500">
                        {{ formErrors.memberCount }}
                      </p>
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1.5">
                        排序
                      </label>
                      <input
                        v-model.number="departmentStore.editingDepartment.order"
                        type="number"
                        :class="[
                          'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                          'border-gray-300',
                        ]"
                        placeholder="999"
                      />
                      <p class="mt-1 text-xs text-gray-400">
                        数值越小排序越靠前
                      </p>
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">
                      部门描述
                    </label>
                    <textarea
                      v-model="departmentStore.editingDepartment.description"
                      :class="[
                        'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none',
                        formErrors.description ? 'border-red-500 bg-red-50' : 'border-gray-300',
                      ]"
                      rows="4"
                      placeholder="请输入部门描述（可选）"
                      maxlength="500"
                    />
                    <div class="flex justify-between mt-1">
                      <p v-if="formErrors.description" class="text-xs text-red-500">
                        {{ formErrors.description }}
                      </p>
                      <p class="text-xs text-gray-400 ml-auto">
                        {{ departmentStore.editingDepartment.description?.length || 0 }}/500
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  :disabled="isSubmitting"
                  @click="handleCancel"
                >
                  取消
                </button>
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="isSubmitting"
                  @click="handleSubmit"
                >
                  <span v-if="isSubmitting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span v-else>
                    {{ departmentStore.formMode === 'add' ? '新增' : '保存' }}
                  </span>
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
