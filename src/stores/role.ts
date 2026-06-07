import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Role, PermissionNode } from '@/types';
import { useAppStore } from './app';
import { usePermissionStore } from './permission';
import { findNodeById, generateId, cloneTree } from '@/utils/treeUtils';
import {
  calculateInheritedPermissions,
  getRoleEffectivePermissions,
  grantPermissionsToRole,
  revokePermissionsFromRole,
  batchGrantPermissions,
  batchRevokePermissions,
  validatePermissionMatrix,
  getPermissionInheritanceChain,
} from '@/utils/permissionUtils';

export const useRoleStore = defineStore('role', () => {
  const appStore = useAppStore();
  const permissionStore = usePermissionStore();

  const selectedRoleId = ref<string | null>(null);
  const editingRole = ref<Role | null>(null);
  const showFormModal = ref(false);
  const formMode = ref<'add' | 'edit'>('add');
  const showPermissionConfig = ref(false);
  const batchSelectedRoleIds = ref<Set<string>>(new Set());
  const configRoleId = ref<string | null>(null);

  const roles = computed(() => appStore.roles);
  const permissions = computed(() => appStore.permissions);

  const selectedRole = computed(() => {
    if (!selectedRoleId.value) return null;
    return roles.value.find((r) => r.id === selectedRoleId.value) || null;
  });

  const activeRoles = computed(() => roles.value.filter((r) => r.status === 'active'));
  const systemRoles = computed(() => roles.value.filter((r) => r.isSystem));
  const customRoles = computed(() => roles.value.filter((r) => !r.isSystem));

  const configRolePermissions = computed(() => {
    if (!configRoleId.value) return [];
    return getRoleEffectivePermissions(configRoleId.value, roles.value, permissions.value);
  });

  const configRoleInheritedPermissionIds = computed(() => {
    if (!configRoleId.value) return [];
    return calculateInheritedPermissions(configRoleId.value, roles.value, permissions.value);
  });

  const configRolePermissionTree = computed(() => {
    if (!configRoleId.value) return [];
    const role = roles.value.find((r) => r.id === configRoleId.value);
    if (!role) return [];

    const permissionStore = usePermissionStore();
    const inheritedIds = new Set(configRoleInheritedPermissionIds.value);
    const directIds = new Set(role.permissionIds);
    const checkedIds = permissionStore.treeState.checkedIds;
    const indeterminateIds = permissionStore.treeState.indeterminateIds;

    function buildTree(nodes: PermissionNode[]): PermissionNode[] {
      return nodes
        .map((node) => {
          const children = buildTree(node.children);
          const isInherited = inheritedIds.has(node.id);
          const isChecked = isInherited || checkedIds.has(node.id);
          const isIndeterminate = indeterminateIds.has(node.id);

          return {
            ...node,
            checked: isChecked,
            indeterminate: isIndeterminate,
            inherited: isInherited,
            inheritedFrom: isInherited ? configRoleId.value || undefined : undefined,
            children,
            expanded: node.expanded !== false,
          };
        })
        .filter((n) => n !== null) as PermissionNode[];
    }

    return buildTree(cloneTree(permissions.value));
  });

  const inheritanceChain = computed(() => {
    if (!configRoleId.value) return [];
    return getPermissionInheritanceChain(configRoleId.value, roles.value);
  });

  const batchSelectionCount = computed(() => batchSelectedRoleIds.value.size);

  const selectedRoles = computed(() =>
    roles.value.filter((r) => batchSelectedRoleIds.value.has(r.id))
  );

  function selectRole(roleId: string | null): void {
    selectedRoleId.value = roleId;
  }

  function toggleBatchSelect(roleId: string): void {
    if (batchSelectedRoleIds.value.has(roleId)) {
      batchSelectedRoleIds.value.delete(roleId);
    } else {
      batchSelectedRoleIds.value.add(roleId);
    }
  }

  function selectAllRoles(): void {
    for (const role of roles.value) {
      batchSelectedRoleIds.value.add(role.id);
    }
  }

  function clearBatchSelection(): void {
    batchSelectedRoleIds.value = new Set();
  }

  function openAddModal(): void {
    formMode.value = 'add';
    editingRole.value = {
      id: generateId(),
      name: '',
      code: '',
      description: '',
      permissionIds: [],
      departmentIds: [],
      userIds: [],
      isSystem: false,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    showFormModal.value = true;
  }

  function openEditModal(roleId: string): void {
    const role = roles.value.find((r) => r.id === roleId);
    if (role) {
      formMode.value = 'edit';
      editingRole.value = JSON.parse(JSON.stringify(role));
      showFormModal.value = true;
    }
  }

  function closeFormModal(): void {
    showFormModal.value = false;
    editingRole.value = null;
  }

  function saveRole(data: Role): boolean {
    try {
      data.updatedAt = Date.now();

      if (formMode.value === 'add') {
        appStore.roles.push(data);
      } else {
        const index = appStore.roles.findIndex((r) => r.id === data.id);
        if (index !== -1) {
          appStore.roles[index] = data;
        }
      }

      closeFormModal();
      appStore.triggerSave();
      appStore.showNotificationMsg('success', '角色保存成功');
      return true;
    } catch {
      appStore.showNotificationMsg('error', '角色保存失败');
      return false;
    }
  }

  function deleteRole(roleId: string): boolean {
    try {
      const role = roles.value.find((r) => r.id === roleId);
      if (!role) return false;

      if (role.isSystem) {
        appStore.showNotificationMsg('error', '系统角色无法删除');
        return false;
      }

      const hasChildren = roles.value.some((r) => r.inheritFromRole === roleId);
      if (hasChildren) {
        appStore.showNotificationMsg('error', '该角色有继承关系，无法删除');
        return false;
      }

      const index = appStore.roles.findIndex((r) => r.id === roleId);
      if (index !== -1) {
        appStore.roles.splice(index, 1);
        if (selectedRoleId.value === roleId) {
          selectedRoleId.value = null;
        }
        batchSelectedRoleIds.value.delete(roleId);
        appStore.triggerSave();
        appStore.showNotificationMsg('success', '角色删除成功');
        return true;
      }
      return false;
    } catch {
      appStore.showNotificationMsg('error', '角色删除失败');
      return false;
    }
  }

  function openPermissionConfig(roleId: string): void {
    configRoleId.value = roleId;
    const role = roles.value.find((r) => r.id === roleId);
    if (role) {
      permissionStore.clearAll();
      permissionStore.setCheckedIds(role.permissionIds);
    }
    showPermissionConfig.value = true;
  }

  function closePermissionConfig(): void {
    showPermissionConfig.value = false;
    configRoleId.value = null;
    permissionStore.clearAll();
  }

  function saveRolePermissions(permissionIds: string[]): boolean {
    try {
      if (!configRoleId.value) return false;

      const index = appStore.roles.findIndex((r) => r.id === configRoleId.value);
      if (index === -1) return false;

      appStore.roles[index] = {
        ...appStore.roles[index],
        permissionIds,
        updatedAt: Date.now(),
      };

      closePermissionConfig();
      appStore.triggerSave();
      appStore.showNotificationMsg('success', '权限配置保存成功');
      return true;
    } catch {
      appStore.showNotificationMsg('error', '权限配置保存失败');
      return false;
    }
  }

  function grantPermissionsToSelectedRoles(permissionIds: string[]): boolean {
    try {
      if (batchSelectionCount.value === 0) {
        appStore.showNotificationMsg('warning', '请先选择角色');
        return false;
      }

      const targetIds = Array.from(batchSelectedRoleIds.value);
      appStore.roles = batchGrantPermissions(
        targetIds,
        permissionIds,
        appStore.roles,
        permissions.value
      );

      appStore.triggerSave();
      appStore.showNotificationMsg('success', `已为 ${targetIds.length} 个角色分配权限`);
      return true;
    } catch {
      appStore.showNotificationMsg('error', '批量授权失败');
      return false;
    }
  }

  function revokePermissionsFromSelectedRoles(permissionIds: string[]): boolean {
    try {
      if (batchSelectionCount.value === 0) {
        appStore.showNotificationMsg('warning', '请先选择角色');
        return false;
      }

      const targetIds = Array.from(batchSelectedRoleIds.value);
      appStore.roles = batchRevokePermissions(
        targetIds,
        permissionIds,
        appStore.roles
      );

      clearBatchSelection();
      appStore.triggerSave();
      appStore.showNotificationMsg('success', `已为 ${targetIds.length} 个角色撤销权限`);
      return true;
    } catch {
      appStore.showNotificationMsg('error', '批量撤销失败');
      return false;
    }
  }

  function validateAllRoles(): { valid: boolean; errors: string[]; warnings: string[] } {
    return validatePermissionMatrix(appStore.roles, permissions.value);
  }

  function toggleRoleStatus(roleId: string): boolean {
    try {
      const role = appStore.roles.find((r) => r.id === roleId);
      if (!role) return false;

      if (role.isSystem) {
        appStore.showNotificationMsg('error', '系统角色状态无法修改');
        return false;
      }

      role.status = role.status === 'active' ? 'disabled' : 'active';
      role.updatedAt = Date.now();
      appStore.triggerSave();
      appStore.showNotificationMsg(
        'success',
        `角色已${role.status === 'active' ? '启用' : '禁用'}`
      );
      return true;
    } catch {
      appStore.showNotificationMsg('error', '状态修改失败');
      return false;
    }
  }

  function setRoleInheritance(roleId: string, parentRoleId: string | null): boolean {
    try {
      const role = appStore.roles.find((r) => r.id === roleId);
      if (!role) return false;

      if (role.isSystem) {
        appStore.showNotificationMsg('error', '系统角色无法设置继承关系');
        return false;
      }

      if (parentRoleId) {
        const chain = getPermissionInheritanceChain(parentRoleId, appStore.roles);
        if (chain.some((r) => r.id === roleId)) {
          appStore.showNotificationMsg('error', '检测到循环继承，无法设置');
          return false;
        }
      }

      role.inheritFromRole = parentRoleId || undefined;
      role.updatedAt = Date.now();
      appStore.triggerSave();
      appStore.showNotificationMsg('success', '继承关系已更新');
      return true;
    } catch {
      appStore.showNotificationMsg('error', '设置继承关系失败');
      return false;
    }
  }

  function getRolesByDepartment(departmentId: string): Role[] {
    return roles.value.filter((r) => r.departmentIds.includes(departmentId));
  }

  function getRoleMemberCount(roleId: string): number {
    const role = roles.value.find((r) => r.id === roleId);
    return role ? role.userIds.length : 0;
  }

  return {
    selectedRoleId,
    editingRole,
    showFormModal,
    formMode,
    showPermissionConfig,
    batchSelectedRoleIds,
    configRoleId,
    roles,
    selectedRole,
    activeRoles,
    systemRoles,
    customRoles,
    configRolePermissions,
    configRoleInheritedPermissionIds,
    configRolePermissionTree,
    inheritanceChain,
    batchSelectionCount,
    selectedRoles,
    selectRole,
    toggleBatchSelect,
    selectAllRoles,
    clearBatchSelection,
    openAddModal,
    openEditModal,
    closeFormModal,
    saveRole,
    deleteRole,
    openPermissionConfig,
    closePermissionConfig,
    saveRolePermissions,
    grantPermissionsToSelectedRoles,
    revokePermissionsFromSelectedRoles,
    validateAllRoles,
    toggleRoleStatus,
    setRoleInheritance,
    getRolesByDepartment,
    getRoleMemberCount,
  };
});