import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { DepartmentNode, TreeState } from '@/types';
import { useAppStore } from './app';
import {
  findNodeById,
  findParent,
  findAncestors,
  findAllChildrenIds,
  toggleExpandAll,
  expandToLevel,
  getMaxDepth,
  getNodePath,
  insertNode,
  removeNode,
  calculateLevels,
  generateId,
  cloneTree,
  sortTree,
} from '@/utils/treeUtils';
import { searchTree } from '@/utils/searchUtils';

export const useDepartmentStore = defineStore('department', () => {
  const appStore = useAppStore();

  const treeState = ref<TreeState>({
    searchKeyword: '',
    matchedIds: new Set<string>(),
    expandedIds: new Set<string>(),
    selectedId: null,
    checkedIds: new Set<string>(),
    indeterminateIds: new Set<string>(),
  });

  const editingDepartment = ref<DepartmentNode | null>(null);
  const showFormModal = ref(false);
  const formMode = ref<'add' | 'edit'>('add');
  const parentDepartmentId = ref<string | null>(null);

  const departments = computed(() => appStore.departments);

  const selectedDepartment = computed(() => {
    if (!treeState.value.selectedId) return null;
    return findNodeById(treeState.value.selectedId, departments.value);
  });

  const selectedDepartmentPath = computed(() => {
    if (!treeState.value.selectedId) return [];
    return getNodePath(treeState.value.selectedId, departments.value);
  });

  const maxDepth = computed(() => getMaxDepth(departments.value));

  const searchResultCount = computed(() => treeState.value.matchedIds.size);

  function setSearchKeyword(keyword: string): void {
    treeState.value.searchKeyword = keyword;
    if (keyword.trim()) {
      const result = searchTree(keyword, departments.value, ['name', 'code']);
      treeState.value.matchedIds = result.matchedIds;

      for (const id of result.expandedIds) {
        const node = findNodeById(id, departments.value);
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
    const node = findNodeById(nodeId, departments.value);
    if (node) {
      node.expanded = !node.expanded;
      if (node.expanded) {
        treeState.value.expandedIds.add(nodeId);
      } else {
        treeState.value.expandedIds.delete(nodeId);
      }
    }
  }

  function expandAll(): void {
    toggleExpandAll(departments.value, true);
  }

  function collapseAll(): void {
    toggleExpandAll(departments.value, false);
    treeState.value.expandedIds = new Set();
  }

  function expandToTargetLevel(level: number): void {
    expandToLevel(departments.value, level);
  }

  function selectNode(nodeId: string | null): void {
    treeState.value.selectedId = nodeId;
  }

  function toggleCheck(nodeId: string): void {
    if (treeState.value.checkedIds.has(nodeId)) {
      treeState.value.checkedIds.delete(nodeId);
      const node = findNodeById(nodeId, departments.value);
      if (node) {
        const childrenIds = findAllChildrenIds(node);
        for (const id of childrenIds) {
          treeState.value.checkedIds.delete(id);
          treeState.value.indeterminateIds.delete(id);
        }
      }
    } else {
      treeState.value.checkedIds.add(nodeId);
      const node = findNodeById(nodeId, departments.value);
      if (node) {
        const childrenIds = findAllChildrenIds(node);
        for (const id of childrenIds) {
          treeState.value.checkedIds.add(id);
          treeState.value.indeterminateIds.delete(id);
        }
      }
    }
    updateIndeterminateState();
  }

  function updateIndeterminateState(): void {
    treeState.value.indeterminateIds = new Set();

    function traverse(nodes: DepartmentNode[]): { allChecked: boolean; someChecked: boolean } {
      let allChecked = true;
      let someChecked = false;

      for (const node of nodes) {
        if (node.children.length > 0) {
          const childState = traverse(node.children);
          if (!childState.allChecked) allChecked = false;
          if (childState.someChecked) someChecked = true;

          if (!childState.allChecked && childState.someChecked) {
            treeState.value.indeterminateIds.add(node.id);
          }
        }

        const isChecked = treeState.value.checkedIds.has(node.id);
        const isIndeterminate = treeState.value.indeterminateIds.has(node.id);

        if (!isChecked && !isIndeterminate) allChecked = false;
        if (isChecked || isIndeterminate) someChecked = true;
      }

      return { allChecked, someChecked };
    }

    traverse(departments.value);
  }

  function selectAll(): void {
    function collectIds(nodes: DepartmentNode[]): void {
      for (const node of nodes) {
        treeState.value.checkedIds.add(node.id);
        treeState.value.indeterminateIds.delete(node.id);
        if (node.children.length > 0) {
          collectIds(node.children);
        }
      }
    }
    collectIds(departments.value);
  }

  function clearSelection(): void {
    treeState.value.checkedIds = new Set();
    treeState.value.indeterminateIds = new Set();
  }

  function openAddModal(parentId: string | null = null): void {
    formMode.value = 'add';
    parentDepartmentId.value = parentId;
    editingDepartment.value = {
      id: generateId(),
      name: '',
      code: '',
      parentId,
      children: [],
      level: 1,
      expanded: true,
      description: '',
      memberCount: 0,
      order: 999,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    showFormModal.value = true;
  }

  function openEditModal(nodeId: string): void {
    const node = findNodeById(nodeId, departments.value);
    if (node) {
      formMode.value = 'edit';
      editingDepartment.value = cloneTree([node])[0];
      parentDepartmentId.value = node.parentId;
      showFormModal.value = true;
    }
  }

  function closeFormModal(): void {
    showFormModal.value = false;
    editingDepartment.value = null;
    parentDepartmentId.value = null;
  }

  function saveDepartment(data: DepartmentNode): boolean {
    try {
      data.updatedAt = Date.now();

      if (formMode.value === 'add') {
        const parent = parentDepartmentId.value
          ? findNodeById(parentDepartmentId.value, departments.value)
          : null;
        data.level = parent ? parent.level + 1 : 1;
        insertNode(departments.value, parentDepartmentId.value, data);
        calculateLevels(departments.value);
        sortTree(departments.value);
      } else {
        const existing = findNodeById(data.id, departments.value);
        if (existing) {
          Object.assign(existing, {
            name: data.name,
            code: data.code,
            description: data.description,
            leader: data.leader,
            memberCount: data.memberCount,
            order: data.order,
            updatedAt: data.updatedAt,
          });
          sortTree(departments.value);
        }
      }

      closeFormModal();
      appStore.triggerSave();
      appStore.showNotificationMsg('success', '部门保存成功');
      return true;
    } catch (error) {
      appStore.showNotificationMsg('error', '部门保存失败');
      return false;
    }
  }

  function deleteDepartment(nodeId: string): boolean {
    try {
      const node = findNodeById(nodeId, departments.value);
      if (!node) return false;

      const hasChildren = node.children.length > 0;
      if (hasChildren) {
        appStore.showNotificationMsg('error', '该部门下有子部门，无法删除');
        return false;
      }

      const removed = removeNode(departments.value, nodeId);
      if (removed) {
        if (treeState.value.selectedId === nodeId) {
          treeState.value.selectedId = null;
        }
        treeState.value.checkedIds.delete(nodeId);
        treeState.value.indeterminateIds.delete(nodeId);
        appStore.triggerSave();
        appStore.showNotificationMsg('success', '部门删除成功');
        return true;
      }
      return false;
    } catch {
      appStore.showNotificationMsg('error', '部门删除失败');
      return false;
    }
  }

  function getDepartmentPathNames(nodeId: string): string[] {
    const path = getNodePath(nodeId, departments.value);
    return path
      .map((id) => findNodeById(id, departments.value)?.name)
      .filter((n): n is string => n !== undefined);
  }

  function getChildDepartments(nodeId: string): DepartmentNode[] {
    const node = findNodeById(nodeId, departments.value);
    return node ? node.children : [];
  }

  function getAllDepartmentIds(): string[] {
    const ids: string[] = [];
    function collect(nodes: DepartmentNode[]): void {
      for (const node of nodes) {
        ids.push(node.id);
        if (node.children.length > 0) {
          collect(node.children);
        }
      }
    }
    collect(departments.value);
    return ids;
  }

  function isAncestor(ancestorId: string, descendantId: string): boolean {
    const ancestors = findAncestors(descendantId, departments.value);
    return ancestors.some((a) => a.id === ancestorId);
  }

  return {
    treeState,
    editingDepartment,
    showFormModal,
    formMode,
    parentDepartmentId,
    departments,
    selectedDepartment,
    selectedDepartmentPath,
    maxDepth,
    searchResultCount,
    setSearchKeyword,
    clearSearch,
    toggleExpand,
    expandAll,
    collapseAll,
    expandToTargetLevel,
    selectNode,
    toggleCheck,
    selectAll,
    clearSelection,
    openAddModal,
    openEditModal,
    closeFormModal,
    saveDepartment,
    deleteDepartment,
    getDepartmentPathNames,
    getChildDepartments,
    getAllDepartmentIds,
    isAncestor,
  };
});
