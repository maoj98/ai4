<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
  Shield,
  Building2,
  Users,
  Key,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Menu,
  Eye,
  Zap,
  Trash2,
  ArrowRightLeft,
  Crown,
} from 'lucide-vue-next';
import DepartmentTree from '@/components/business/DepartmentTree.vue';
import RoleSelector from '@/components/business/RoleSelector.vue';
import PermissionTree from '@/components/business/PermissionTree.vue';
import ConflictPanel from '@/components/business/ConflictPanel.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import { useDepartmentStore } from '@/stores/department';
import { useRoleStore } from '@/stores/role';
import { usePermissionStore } from '@/stores/permission';
import { useAppStore } from '@/stores/app';
import type { Role, PermissionNode, PermissionConflict } from '@/types';
import { getRoleEffectivePermissions, calculateInheritedPermissions } from '@/utils/permissionUtils';
import { findNodeById } from '@/utils/treeUtils';

const departmentStore = useDepartmentStore();
const roleStore = useRoleStore();
const permissionStore = usePermissionStore();
const appStore = useAppStore();

const leftCollapsed = ref(false);
const rightCollapsed = ref(false);
const showRolePermissions = ref(false);
const viewRoleId = ref<string | null>(null);
const isAuthorizing = ref(false);
const isDetectingConflicts = ref(false);

const showConfirmModal = ref(false);
const confirmModalType = ref<'authorize' | 'clear' | 'conflict'>('authorize');
const pendingConflictCount = ref(0);

const selectedRoleIds = ref<string[]>([]);

const selectedDepartment = computed(() => departmentStore.selectedDepartment);

const filteredRoles = computed(() => {
  if (!selectedDepartment.value) {
    return roleStore.roles.filter((r) => r.status === 'active');
  }
  const deptId = selectedDepartment.value.id;
  return roleStore.roles.filter(
    (r) => r.status === 'active' && r.departmentIds.includes(deptId)
  );
});

const selectedRoles = computed(() =>
  roleStore.roles.filter((r) => selectedRoleIds.value.includes(r.id))
);

const selectedDepartmentName = computed(() =>
  selectedDepartment.value ? selectedDepartment.value.name : '全部部门'
);

const selectedRoleCount = computed(() => selectedRoleIds.value.length);

const selectedPermissionCount = computed(
  () => permissionStore.checkedPermissionIds.length
);

const conflictCount = computed(() => permissionStore.unresolvedConflicts.length);

const viewRole = computed(() => {
  if (!viewRoleId.value) return null;
  return roleStore.roles.find((r) => r.id === viewRoleId.value) || null;
});

const viewRolePermissions = computed(() => {
  if (!viewRoleId.value) return [];
  return getRoleEffectivePermissions(
    viewRoleId.value,
    roleStore.roles,
    permissionStore.permissions
  );
});

const viewRolePermissionIds = computed(() => {
  return viewRolePermissions.value.map((p) => p.id);
});

const viewRoleInheritedPermissionIds = computed(() => {
  if (!viewRoleId.value) return new Set<string>();
  return new Set(
    calculateInheritedPermissions(
      viewRoleId.value,
      roleStore.roles,
      permissionStore.permissions
    )
  );
});

const viewRolePermissionTree = computed(() => {
  if (!viewRoleId.value) return [];
  const role = viewRole.value;
  if (!role) return [];

  const effectiveIds = viewRoleInheritedPermissionIds.value;
  const directIds = new Set(role.permissionIds);

  function buildTree(nodes: PermissionNode[]): PermissionNode[] {
    return nodes
      .map((node) => {
        const children = buildTree(node.children);
        const isEffective = effectiveIds.has(node.id);
        const isDirect = directIds.has(node.id);
        const isInherited = isEffective && !isDirect;

        if (isEffective || children.length > 0) {
          return {
            ...node,
            checked: isEffective,
            indeterminate: false,
            inherited: isInherited,
            inheritedFrom: isInherited ? role.inheritFromRole : undefined,
            children,
          } as PermissionNode;
        }
        return null;
      })
      .filter((n) => n !== null);
  }

  return buildTree(JSON.parse(JSON.stringify(permissionStore.permissions)));
});

const inheritanceChain = computed(() => {
  if (!viewRoleId.value) return [];
  const chain: Role[] = [];
  let currentId: string | undefined = viewRoleId.value;
  while (currentId) {
    const role = roleStore.roles.find((r) => r.id === currentId);
    if (role) {
      chain.push(role);
      currentId = role.inheritFromRole;
    } else {
      break;
    }
  }
  return chain;
});

function handleDepartmentSelect(nodeId: string): void {
  selectedRoleIds.value = [];
  permissionStore.clearAll();
}

function handleRoleChange(ids: string[]): void {
  selectedRoleIds.value = ids;
  if (ids.length > 0) {
    syncPermissionsFromRoles();
  } else {
    permissionStore.clearAll();
  }
}

function syncPermissionsFromRoles(): void {
  const allPermissionIds = new Set<string>();
  for (const roleId of selectedRoleIds.value) {
    const effectiveNodes = getRoleEffectivePermissions(
      roleId,
      roleStore.roles,
      permissionStore.permissions
    );
    for (const node of effectiveNodes) {
      allPermissionIds.add(node.id);
    }
  }
  permissionStore.setCheckedIds(Array.from(allPermissionIds));
  detectConflicts();
}

function detectConflicts(): void {
  isDetectingConflicts.value = true;
  setTimeout(() => {
    permissionStore.detectCurrentConflicts();
    isDetectingConflicts.value = false;
  }, 300);
}

function handleClearAll(): void {
  confirmModalType.value = 'clear';
  showConfirmModal.value = true;
}

function confirmClear(): void {
  permissionStore.clearAll();
  showConfirmModal.value = false;
}

function handleAuthorize(): void {
  if (selectedRoleCount.value === 0) {
    appStore.showNotificationMsg('warning', '请先选择角色');
    return;
  }
  if (selectedPermissionCount.value === 0) {
    appStore.showNotificationMsg('warning', '请先选择权限');
    return;
  }

  detectConflicts();

  if (conflictCount.value > 0) {
    pendingConflictCount.value = conflictCount.value;
    confirmModalType.value = 'conflict';
    showConfirmModal.value = true;
    return;
  }

  confirmModalType.value = 'authorize';
  showConfirmModal.value = true;
}

function confirmAuthorize(): void {
  isAuthorizing.value = true;
  showConfirmModal.value = false;

  setTimeout(() => {
    try {
      const permissionIds = permissionStore.collapsedCheckedPermissionIds;
      const success = roleStore.grantPermissionsToSelectedRoles(permissionIds);

      if (success) {
        roleStore.batchSelectedRoleIds = new Set(selectedRoleIds.value);
        syncPermissionsFromRoles();
        appStore.showNotificationMsg(
          'success',
          `已为 ${selectedRoleCount.value} 个角色授予 ${selectedPermissionCount.value} 项权限`
        );
      }
    } catch (error) {
      appStore.showNotificationMsg('error', '授权失败，请重试');
    } finally {
      isAuthorizing.value = false;
    }
  }, 500);
}

function handleProceedWithConflicts(): void {
  confirmAuthorize();
}

function handleResolveConflict(
  conflictId: string,
  keepPermissionId: string
): void {
  permissionStore.resolveCurrentConflict(conflictId, keepPermissionId);
}

function handleMarkResolved(conflictId: string): void {
  permissionStore.markConflictResolved(conflictId);
}

function handleClearResolvedConflicts(): void {
  permissionStore.conflicts = permissionStore.conflicts.filter((c) => !c.resolved);
}

function handleViewRolePermissions(roleId: string): void {
  viewRoleId.value = roleId;
  showRolePermissions.value = true;
}

function closeRolePermissions(): void {
  showRolePermissions.value = false;
  viewRoleId.value = null;
}

function getPermissionName(permissionId: string): string {
  const node = findNodeById(permissionId, permissionStore.permissions);
  return node?.name || '未知权限';
}

function toggleLeftSidebar(): void {
  leftCollapsed.value = !leftCollapsed.value;
}

function toggleRightSidebar(): void {
  rightCollapsed.value = !rightCollapsed.value;
}

function handleCancel(): void {
  showConfirmModal.value = false;
}

watch(selectedDepartment, () => {
  selectedRoleIds.value = [];
  permissionStore.clearAll();
});

onMounted(() => {
  permissionStore.clearAll();
});
</script>

<template>
  <div class="auth-view flex flex-col h-full bg-gray-50">
    <div class="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Shield :size="20" class="text-white" />
        </div>
        <div>
          <h1 class="text-xl font-semibold text-gray-900">授权管理</h1>
          <p class="text-sm text-gray-500">为角色配置权限，支持批量授权和冲突检测</p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-4 text-sm">
          <div class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
            <Building2 :size="14" class="text-blue-600" />
            <span class="text-gray-600">部门:</span>
            <span class="font-medium text-blue-600">{{ selectedDepartmentName }}</span>
          </div>
          <div class="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 rounded-lg">
            <Users :size="14" class="text-purple-600" />
            <span class="text-gray-600">角色:</span>
            <span class="font-medium text-purple-600">{{ selectedRoleCount }} 个</span>
          </div>
          <div class="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg">
            <Key :size="14" class="text-green-600" />
            <span class="text-gray-600">权限:</span>
            <span class="font-medium text-green-600">{{ selectedPermissionCount }} 项</span>
          </div>
        </div>

        <div class="h-6 w-px bg-gray-200" />

        <button
          class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isDetectingConflicts"
          @click="detectConflicts"
        >
          <AlertTriangle v-if="conflictCount > 0" :size="16" class="text-orange-500" />
          <CheckCircle v-else :size="16" class="text-green-500" />
          {{ isDetectingConflicts ? '检测中...' : conflictCount > 0 ? `${conflictCount} 个冲突` : '检测冲突' }}
        </button>

        <button
          class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          @click="handleClearAll"
        >
          <RotateCcw :size="16" />
          清空配置
        </button>

        <button
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="selectedRoleCount === 0 || selectedPermissionCount === 0 || isAuthorizing"
          @click="handleAuthorize"
        >
          <Zap :size="16" />
          {{ isAuthorizing ? '授权中...' : '批量授权' }}
        </button>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <div
        :class="[
          'flex flex-col border-r border-gray-200 bg-white transition-all duration-300',
          leftCollapsed ? 'w-12' : 'w-72',
        ]"
      >
        <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
          <span v-if="!leftCollapsed" class="text-sm font-medium text-gray-700">
            选择部门
          </span>
          <button
            class="p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors"
            @click="toggleLeftSidebar"
          >
            <ChevronLeft v-if="!leftCollapsed" :size="16" />
            <Menu v-else :size="16" />
          </button>
        </div>
        <div v-if="!leftCollapsed" class="flex-1 overflow-hidden">
          <DepartmentTree
            :show-search="true"
            :show-toolbar="true"
            :show-checkbox="false"
            @select="handleDepartmentSelect"
          />
        </div>
      </div>

      <div class="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <div class="px-6 py-4 border-b border-gray-200 bg-white">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <Users :size="18" class="text-purple-600" />
              <span class="text-sm font-medium text-gray-700">选择角色</span>
              <span class="text-xs text-gray-400">(可多选)</span>
            </div>
            <span class="text-xs text-gray-500">
              共 {{ filteredRoles.length }} 个可用角色
            </span>
          </div>
          <RoleSelector
            v-model="selectedRoleIds"
            :roles="filteredRoles"
            :exclude-system-roles="false"
            :show-status-filter="true"
            placeholder="选择一个或多个角色进行授权"
            @change="handleRoleChange"
          />
        </div>

        <div v-if="selectedRoles.length > 0" class="px-6 py-3 border-b border-gray-200 bg-white">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs font-medium text-gray-500">已选角色:</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="role in selectedRoles"
              :key="role.id"
              :class="[
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
                role.isSystem
                  ? 'bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200'
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200',
              ]"
            >
              <div
                :class="[
                  'w-6 h-6 rounded flex items-center justify-center',
                  role.isSystem ? 'bg-amber-500' : 'bg-blue-500',
                ]"
              >
                <Shield :size="12" class="text-white" />
              </div>
              <span :class="role.isSystem ? 'text-amber-700' : 'text-blue-700'">
                {{ role.name }}
              </span>
              <Crown v-if="role.isSystem" :size="12" class="text-amber-500" />
              <button
                class="ml-1 p-0.5 rounded hover:bg-white/50 text-gray-400 hover:text-gray-600 transition-colors"
                title="查看已有权限"
                @click="handleViewRolePermissions(role.id)"
              >
                <Eye :size="14" />
              </button>
              <button
                class="p-0.5 rounded hover:bg-white/50 text-gray-400 hover:text-red-500 transition-colors"
                title="移除"
                @click="selectedRoleIds = selectedRoleIds.filter(id => id !== role.id)"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>

        <div class="flex-1 flex overflow-hidden">
          <div class="flex-1 p-4 overflow-hidden">
            <PermissionTree
              :show-search="true"
              :show-toolbar="true"
              :show-type-filter="true"
              :show-stats="true"
            />
          </div>

          <div
            :class="[
              'border-l border-gray-200 bg-white transition-all duration-300 overflow-hidden',
              rightCollapsed ? 'w-12' : 'w-96',
            ]"
          >
            <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
              <span v-if="!rightCollapsed" class="text-sm font-medium text-gray-700">
                冲突检测
              </span>
              <button
                class="p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors"
                @click="toggleRightSidebar"
              >
                <ChevronRight v-if="!rightCollapsed" :size="16" />
                <Menu v-else :size="16" />
              </button>
            </div>
            <div v-if="!rightCollapsed" class="h-full overflow-y-auto">
              <ConflictPanel
                :conflicts="permissionStore.conflicts"
                :permissions="permissionStore.permissions"
                :loading="isDetectingConflicts"
                @resolve="handleResolveConflict"
                @mark-resolved="handleMarkResolved"
                @clear-resolved="handleClearResolvedConflicts"
                @detect="detectConflicts"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <transition name="fade" appear>
        <div
          v-if="showRolePermissions"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            class="absolute inset-0 bg-black/50 backdrop-blur-sm"
            @click="closeRolePermissions"
          />
          <transition name="slide-up" appear>
            <div
              v-if="showRolePermissions"
              class="relative w-full max-w-3xl max-h-[80vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Eye :size="20" class="text-white" />
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">
                      {{ viewRole?.name }} 的权限
                    </h3>
                    <p class="text-sm text-gray-500">
                      编码: {{ viewRole?.code }}
                      <span
                        v-if="viewRole?.isSystem"
                        class="ml-2 inline-flex items-center gap-1 text-amber-600"
                      >
                        <Crown :size="12" />
                        系统角色
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  class="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
                  @click="closeRolePermissions"
                >
                  &times;
                </button>
              </div>

              <div v-if="inheritanceChain.length > 1" class="px-6 py-3 border-b border-gray-200 bg-blue-50">
                <div class="flex items-center gap-2 text-sm">
                  <ArrowRightLeft :size="14" class="text-blue-600" />
                  <span class="text-gray-600">权限继承链:</span>
                  <div class="flex items-center gap-1">
                    <template v-for="(role, index) in inheritanceChain" :key="role.id">
                      <span
                        :class="[
                          'px-2 py-0.5 rounded text-xs font-medium',
                          index === 0
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-blue-600 border border-blue-200',
                        ]"
                      >
                        {{ role.name }}
                      </span>
                      <span v-if="index < inheritanceChain.length - 1" class="text-blue-400">
                        →
                      </span>
                    </template>
                  </div>
                </div>
              </div>

              <div class="flex-1 overflow-y-auto p-4">
                <div v-if="viewRolePermissionTree.length === 0" class="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Shield :size="48" class="mb-3 opacity-50" />
                  <p class="text-sm">该角色暂无权限配置</p>
                </div>
                <div v-else class="space-y-1">
                  <div
                    v-for="node in viewRolePermissionTree"
                    :key="node.id"
                    class="permission-item"
                  >
                    <div
                      :class="[
                        'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                        node.inherited
                          ? 'bg-amber-50 border border-amber-200'
                          : 'bg-blue-50 border border-blue-200',
                      ]"
                    >
                      <div
                        :class="[
                          'w-5 h-5 rounded flex items-center justify-center flex-shrink-0',
                          node.inherited ? 'bg-amber-500' : 'bg-blue-500',
                        ]"
                      >
                        <CheckCircle :size="12" class="text-white" />
                      </div>
                      <span class="text-sm font-medium text-gray-900">
                        {{ node.name }}
                      </span>
                      <span
                        :class="[
                          'text-xs px-1.5 py-0.5 rounded',
                          node.type === 'menu'
                            ? 'bg-blue-100 text-blue-700'
                            : node.type === 'button'
                            ? 'bg-green-100 text-green-700'
                            : node.type === 'api'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-orange-100 text-orange-700',
                        ]"
                      >
                        {{ node.type === 'menu' ? '菜单' : node.type === 'button' ? '按钮' : node.type === 'api' ? '接口' : '数据' }}
                      </span>
                      <span v-if="node.inherited" class="ml-auto text-xs text-amber-600 flex items-center gap-1">
                        <ArrowRightLeft :size="12" />
                        继承
                      </span>
                    </div>
                    <div
                      v-if="node.children.length > 0"
                      class="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 pl-3"
                    >
                      <div
                        v-for="child in node.children"
                        :key="child.id"
                        :class="[
                          'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
                          child.inherited
                            ? 'bg-amber-50/50 border-l-2 border-amber-300'
                            : 'bg-blue-50/50 border-l-2 border-blue-300',
                        ]"
                      >
                        <div
                          :class="[
                            'w-4 h-4 rounded flex items-center justify-center flex-shrink-0',
                            child.inherited ? 'bg-amber-400' : 'bg-blue-400',
                          ]"
                        >
                          <CheckCircle :size="10" class="text-white" />
                        </div>
                        <span class="text-sm text-gray-700">
                          {{ child.name }}
                        </span>
                        <span
                          v-if="child.inherited"
                          class="ml-auto text-xs text-amber-600"
                        >
                          继承
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-6 flex items-center gap-4 pt-4 border-t border-gray-200">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded bg-blue-500" />
                    <span class="text-xs text-gray-600">直接权限</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded bg-amber-500" />
                    <span class="text-xs text-gray-600">继承权限</span>
                  </div>
                  <div class="ml-auto text-sm text-gray-500">
                    共 {{ viewRolePermissions.length }} 项有效权限
                  </div>
                </div>
              </div>

              <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  @click="closeRolePermissions"
                >
                  关闭
                </button>
              </div>
            </div>
          </transition>
        </div>
      </transition>
    </Teleport>

    <ConfirmModal
      :visible="showConfirmModal"
      :title="
        confirmModalType === 'clear'
          ? '确认清空'
          : confirmModalType === 'conflict'
          ? '存在权限冲突'
          : '确认授权'
      "
      :content="
        confirmModalType === 'clear'
          ? '确定要清空当前所有权限配置吗？此操作不会影响已保存的角色权限。'
          : confirmModalType === 'conflict'
          ? `检测到 ${pendingConflictCount} 个未解决的权限冲突，继续授权可能导致权限异常。是否仍然继续？`
          : `确定要将选中的 ${selectedPermissionCount} 项权限授予 ${selectedRoleCount} 个角色吗？`
      "
      :type="
        confirmModalType === 'clear'
          ? 'warning'
          : confirmModalType === 'conflict'
          ? 'danger'
          : 'info'
      "
      :confirm-text="
        confirmModalType === 'conflict' ? '仍要继续' : confirmModalType === 'clear' ? '确认清空' : '确认授权'
      "
      :loading="isAuthorizing"
      @confirm="
        confirmModalType === 'clear'
          ? confirmClear()
          : confirmAuthorize()
      "
      @cancel="handleCancel"
      @close="handleCancel"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

@media (max-width: 1024px) {
  .auth-view {
    min-width: 768px;
  }
}
</style>
