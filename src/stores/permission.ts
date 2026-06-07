import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PermissionNode, PermissionConflict, TreeState } from '@/types';
import { useAppStore } from './app';
import {
  findNodeById,
  findAllChildrenIds,
  toggleExpandAll,
  expandToLevel,
  getMaxDepth,
  getNodePath,
  updateChildrenState,
  updateParentState,
  syncCheckboxState,
  generateId,
  removeNode,
  findParent,
  flattenTree,
} from '@/utils/treeUtils';
import { searchTree } from '@/utils/searchUtils';
import {
  detectConflicts,
  expandPermissionIds,
  collapsePermissionIds,
  resolveConflict,
} from '@/utils/permissionUtils';

export const usePermissionStore = defineStore('permission', () => {
  const appStore = useAppStore();

  const treeState = ref<TreeState>({
    searchKeyword: '',
    matchedIds: new Set<string>(),
    expandedIds: new Set<string>(),
    selectedId: null,
    checkedIds: new Set<string>(),
    indeterminateIds: new Set<string>(),
  });

  const conflicts = ref<PermissionConflict[]>([]);
  const autoDetectConflicts = ref(true);
  const selectedPermissionType = ref<'all' | 'menu' | 'button' | 'api' | 'data'>('all');

  const permissions = computed(() => appStore.permissions);

  const filteredPermissions = computed(() => {
    if (selectedPermissionType.value === 'all') {
      return permissions.value;
    }

    function filter(nodes: PermissionNode[]): PermissionNode[] {
      return nodes
        .map((node) => {
          const filteredChildren = filter(node.children);
          if (node.type === selectedPermissionType.value || filteredChildren.length > 0) {
            return { ...node, children: filteredChildren };
          }
          return null;
        })
        .filter((n): n is PermissionNode => n !== null);
    }

    return filter(permissions.value);
  });

  const selectedPermission = computed(() => {
    if (!treeState.value.selectedId) return null;
    return findNodeById(treeState.value.selectedId, permissions.value);
  });

  const checkedPermissionIds = computed(() => Array.from(treeState.value.checkedIds));

  const expandedCheckedPermissionIds = computed(() =>
    expandPermissionIds(checkedPermissionIds.value, permissions.value)
  );

  const collapsedCheckedPermissionIds = computed(() =>
    collapsePermissionIds(expandedCheckedPermissionIds.value, permissions.value)
  );

  const maxDepth = computed(() => getMaxDepth(permissions.value));

  const searchResultCount = computed(() => treeState.value.matchedIds.size);

  const unresolvedConflicts = computed(() =>
    conflicts.value.filter((c) => !c.resolved)
  );

  const highSeverityConflicts = computed(() =>
    unresolvedConflicts.value.filter((c) => c.severity === 'high')
  );

  function setSearchKeyword(keyword: string): void {
    treeState.value.searchKeyword = keyword;
    if (keyword.trim()) {
      const result = searchTree(keyword, permissions.value, ['name', 'code', 'description']);
      treeState.value.matchedIds = result.matchedIds;

      for (const id of result.expandedIds) {
        const node = findNodeById(id, permissions.value);
        if (node) node.expanded = true;
      }
    } else {
      treeState.value.matchedIds = new Set();
    }
  }

  function clearSearch(): void {
    treeState.value.searchKeyword = '';
    treeState.value.matchedIds = new Set();
  }

  function toggleExpand(nodeId: string): void {
    const node = findNodeById(nodeId, permissions.value);
    if (node) {
      node.expanded = !node.expanded;
    }
  }

  function expandAll(): void {
    toggleExpandAll(permissions.value as Array<PermissionNode & { expanded: boolean }>, true);
  }

  function collapseAll(): void {
    toggleExpandAll(permissions.value as Array<PermissionNode & { expanded: boolean }>, false);
  }

  function expandToTargetLevel(level: number): void {
    expandToLevel(permissions.value as Array<PermissionNode & { expanded: boolean }>, level);
  }

  function selectNode(nodeId: string | null): void {
    treeState.value.selectedId = nodeId;
  }

  function toggleCheck(nodeId: string): void {
    const node = findNodeById(nodeId, permissions.value);
    if (!node || node.disabled) return;

    const newChecked = !node.checked;
    updateChildrenState(node, newChecked);
    updateParentState(nodeId, permissions.value);

    syncCheckedStateFromTree();
    syncIndeterminateStateFromTree();

    if (autoDetectConflicts.value) {
      detectCurrentConflicts();
    }

    appStore.triggerSave();
  }

  function syncCheckedStateFromTree(): void {
    treeState.value.checkedIds = new Set();

    function traverse(nodes: PermissionNode[]): void {
      for (const node of nodes) {
        if (node.checked) {
          treeState.value.checkedIds.add(node.id);
        }
        if (node.children.length > 0) {
          traverse(node.children);
        }
      }
    }

    traverse(permissions.value);
  }

  function syncIndeterminateStateFromTree(): void {
    treeState.value.indeterminateIds = new Set();

    function traverse(nodes: PermissionNode[]): void {
      for (const node of nodes) {
        if (node.indeterminate) {
          treeState.value.indeterminateIds.add(node.id);
        }
        if (node.children.length > 0) {
          traverse(node.children);
        }
      }
    }

    traverse(permissions.value);
  }

  function syncTreeStateFromCheckedIds(): void {
    function traverse(nodes: PermissionNode[]): void {
      for (const node of nodes) {
        node.checked = treeState.value.checkedIds.has(node.id);
        node.indeterminate = treeState.value.indeterminateIds.has(node.id);
        if (node.children.length > 0) {
          traverse(node.children);
        }
      }
    }

    traverse(permissions.value);
    syncCheckboxState(permissions.value);
    syncCheckedStateFromTree();
    syncIndeterminateStateFromTree();
  }

  function setCheckedIds(ids: string[]): void {
    treeState.value.checkedIds = new Set(ids);
    treeState.value.indeterminateIds = new Set();
    syncTreeStateFromCheckedIds();

    if (autoDetectConflicts.value) {
      detectCurrentConflicts();
    }
  }

  function selectAll(): void {
    function traverse(nodes: PermissionNode[]): void {
      for (const node of nodes) {
        if (!node.disabled) {
          node.checked = true;
          node.indeterminate = false;
        }
        if (node.children.length > 0) {
          traverse(node.children);
        }
      }
    }

    traverse(permissions.value);
    syncCheckedStateFromTree();

    if (autoDetectConflicts.value) {
      detectCurrentConflicts();
    }

    appStore.triggerSave();
  }

  function clearAll(): void {
    function traverse(nodes: PermissionNode[]): void {
      for (const node of nodes) {
        node.checked = false;
        node.indeterminate = false;
        if (node.children.length > 0) {
          traverse(node.children);
        }
      }
    }

    traverse(permissions.value);
    treeState.value.checkedIds = new Set();
    treeState.value.indeterminateIds = new Set();
    conflicts.value = [];

    appStore.triggerSave();
  }

  function detectCurrentConflicts(): void {
    conflicts.value = detectConflicts(
      expandedCheckedPermissionIds.value,
      permissions.value
    );
  }

  function resolveCurrentConflict(conflictId: string, keepPermissionId: string): void {
    const conflict = conflicts.value.find((c) => c.id === conflictId);
    if (!conflict) return;

    const toRemove = resolveConflict(conflict, keepPermissionId);
    if (toRemove) {
      const node = findNodeById(toRemove, permissions.value);
      if (node) {
        updateChildrenState(node, false);
        updateParentState(toRemove, permissions.value);
        syncCheckedStateFromTree();
        syncIndeterminateStateFromTree();
      }
    }

    conflict.resolved = true;

    if (autoDetectConflicts.value) {
      detectCurrentConflicts();
    }

    appStore.triggerSave();
  }

  function markConflictResolved(conflictId: string): void {
    const conflict = conflicts.value.find((c) => c.id === conflictId);
    if (conflict) {
      conflict.resolved = true;
    }
  }

  function clearConflicts(): void {
    conflicts.value = [];
  }

  function setPermissionType(type: 'all' | 'menu' | 'button' | 'api' | 'data'): void {
    selectedPermissionType.value = type;
  }

  function toggleAutoDetect(): void {
    autoDetectConflicts.value = !autoDetectConflicts.value;
    if (autoDetectConflicts.value) {
      detectCurrentConflicts();
    }
  }

  function getPermissionPathNames(nodeId: string): string[] {
    const path = getNodePath(nodeId, permissions.value);
    return path
      .map((id) => findNodeById(id, permissions.value)?.name)
      .filter((n): n is string => n !== undefined);
  }

  function getPermissionsByType(type: PermissionNode['type']): PermissionNode[] {
    const result: PermissionNode[] = [];

    function traverse(nodes: PermissionNode[]): void {
      for (const node of nodes) {
        if (node.type === type) {
          result.push(node);
        }
        if (node.children.length > 0) {
          traverse(node.children);
        }
      }
    }

    traverse(permissions.value);
    return result;
  }

  function hasPermission(code: string): boolean {
    function traverse(nodes: PermissionNode[]): boolean {
      for (const node of nodes) {
        if (node.code === code && node.checked) return true;
        if (node.children.length > 0 && traverse(node.children)) return true;
      }
      return false;
    }

    return traverse(permissions.value);
  }

  function addPermission(
    parentId: string | null,
    data: Omit<PermissionNode, 'id' | 'parentId' | 'children' | 'checked' | 'indeterminate' | 'inherited' | 'expanded'>
  ): boolean {
    try {
      const newPerm: PermissionNode = {
        ...data,
        id: generateId(),
        parentId,
        children: [],
        checked: false,
        indeterminate: false,
        inherited: false,
        expanded: false,
      };

      if (parentId === null) {
        permissions.value.push(newPerm);
      } else {
        const parent = findNodeById(parentId, permissions.value);
        if (parent) {
          parent.children.push(newPerm);
        }
      }

      appStore.triggerSave();
      return true;
    } catch {
      return false;
    }
  }

  function getCheckedCountByType(): Record<string, number> {
    const counts: Record<string, number> = {
      menu: 0,
      button: 0,
      api: 0,
      data: 0,
    };

    function traverse(nodes: PermissionNode[]): void {
      for (const node of nodes) {
        if (node.checked && counts[node.type] !== undefined) {
          counts[node.type]++;
        }
        if (node.children.length > 0) {
          traverse(node.children);
        }
      }
    }

    traverse(permissions.value);
    return counts;
  }

  function updatePermission(
    nodeId: string,
    data: Partial<Omit<PermissionNode, 'id' | 'parentId' | 'children' | 'checked' | 'indeterminate' | 'inherited' | 'expanded'>>
  ): boolean {
    const node = findNodeById(nodeId, permissions.value);
    if (!node) return false;

    Object.assign(node, data);
    appStore.triggerSave();
    return true;
  }

  function deletePermission(nodeId: string): boolean {
    const node = findNodeById(nodeId, permissions.value);
    if (!node) return false;

    const childIds = findAllChildrenIds(node);
    const allPermissions = flattenTree(permissions.value);

    for (const perm of allPermissions) {
      perm.conflictingPermissions = perm.conflictingPermissions.filter(
        (id) => !childIds.includes(id)
      );
    }

    const success = removeNode(permissions.value, nodeId);
    if (success) {
      if (treeState.value.selectedId === nodeId) {
        treeState.value.selectedId = null;
      }
      syncCheckedStateFromTree();
      syncIndeterminateStateFromTree();
      if (autoDetectConflicts.value) {
        detectCurrentConflicts();
      }
      appStore.triggerSave();
    }
    return success;
  }

  function toggleConflictingPermission(nodeId: string, targetId: string): boolean {
    const node = findNodeById(nodeId, permissions.value);
    const target = findNodeById(targetId, permissions.value);
    if (!node || !target || nodeId === targetId) return false;

    const index = node.conflictingPermissions.indexOf(targetId);
    if (index > -1) {
      node.conflictingPermissions.splice(index, 1);
      const targetIndex = target.conflictingPermissions.indexOf(nodeId);
      if (targetIndex > -1) {
        target.conflictingPermissions.splice(targetIndex, 1);
      }
    } else {
      node.conflictingPermissions.push(targetId);
      if (!target.conflictingPermissions.includes(nodeId)) {
        target.conflictingPermissions.push(nodeId);
      }
    }

    if (autoDetectConflicts.value) {
      detectCurrentConflicts();
    }
    appStore.triggerSave();
    return true;
  }

  return {
    treeState,
    conflicts,
    autoDetectConflicts,
    selectedPermissionType,
    permissions,
    filteredPermissions,
    selectedPermission,
    checkedPermissionIds,
    expandedCheckedPermissionIds,
    collapsedCheckedPermissionIds,
    maxDepth,
    searchResultCount,
    unresolvedConflicts,
    highSeverityConflicts,
    setSearchKeyword,
    clearSearch,
    toggleExpand,
    expandAll,
    collapseAll,
    expandToTargetLevel,
    selectNode,
    toggleCheck,
    setCheckedIds,
    selectAll,
    clearAll,
    detectCurrentConflicts,
    resolveCurrentConflict,
    markConflictResolved,
    clearConflicts,
    setPermissionType,
    toggleAutoDetect,
    getPermissionPathNames,
    getPermissionsByType,
    hasPermission,
    addPermission,
    updatePermission,
    deletePermission,
    toggleConflictingPermission,
    getCheckedCountByType,
    syncCheckboxState,
    syncTreeStateFromCheckedIds,
    syncCheckedStateFromTree,
    syncIndeterminateStateFromTree,
  };
});
