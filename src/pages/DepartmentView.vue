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
  </div>
</template>
