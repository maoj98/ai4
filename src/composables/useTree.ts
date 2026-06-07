import { ref, computed, watch } from 'vue';
import type { TreeNode, TreeState } from '@/types';
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
} from '@/utils/treeUtils';
import { searchTree } from '@/utils/searchUtils';

interface UseTreeOptions<T extends TreeNode> {
  treeData: () => T[];
  searchFields?: Array<keyof T>;
  enableCheckbox?: boolean;
  autoSync?: boolean;
}

export function useTree<T extends TreeNode & { checked?: boolean; indeterminate?: boolean; expanded?: boolean }>(
  options: UseTreeOptions<T>
) {
  const {
    treeData,
    searchFields = ['name'] as Array<keyof T>,
    enableCheckbox = false,
    autoSync = true,
  } = options;

  const treeState = ref<TreeState>({
    searchKeyword: '',
    matchedIds: new Set<string>(),
    expandedIds: new Set<string>(),
    selectedId: null,
    checkedIds: new Set<string>(),
    indeterminateIds: new Set<string>(),
  });

  const maxDepth = computed(() => getMaxDepth(treeData()));
  const searchResultCount = computed(() => treeState.value.matchedIds.size);

  const selectedNode = computed(() => {
    if (!treeState.value.selectedId) return null;
    return findNodeById(treeState.value.selectedId, treeData());
  });

  const selectedNodePath = computed(() => {
    if (!treeState.value.selectedId) return [];
    return getNodePath(treeState.value.selectedId, treeData());
  });

  const checkedIdsArray = computed(() => Array.from(treeState.value.checkedIds));

  function setSearchKeyword(keyword: string): void {
    treeState.value.searchKeyword = keyword;
    if (keyword.trim()) {
      const result = searchTree(keyword, treeData(), searchFields);
      treeState.value.matchedIds = result.matchedIds;

      for (const id of result.expandedIds) {
        const node = findNodeById(id, treeData());
        if (node && 'expanded' in node) {
          (node as any).expanded = true;
        }
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
    const node = findNodeById(nodeId, treeData());
    if (node && 'expanded' in node) {
      (node as any).expanded = !(node as any).expanded;
      if ((node as any).expanded) {
        treeState.value.expandedIds.add(nodeId);
      } else {
        treeState.value.expandedIds.delete(nodeId);
      }
    }
  }

  function expandAll(): void {
    const data = treeData();
    if (data.length > 0 && 'expanded' in data[0]) {
      toggleExpandAll(data as any, true);
    }
  }

  function collapseAll(): void {
    const data = treeData();
    if (data.length > 0 && 'expanded' in data[0]) {
      toggleExpandAll(data as any, false);
      treeState.value.expandedIds = new Set();
    }
  }

  function expandToTargetLevel(level: number): void {
    const data = treeData();
    if (data.length > 0 && 'expanded' in data[0]) {
      expandToLevel(data as any, level);
    }
  }

  function selectNode(nodeId: string | null): void {
    treeState.value.selectedId = nodeId;
  }

  function toggleCheck(nodeId: string): void {
    if (!enableCheckbox) return;

    const node = findNodeById(nodeId, treeData());
    if (!node || (node as any).disabled) return;

    const newChecked = !(node as any).checked;

    if ('children' in node && node.children.length > 0) {
      updateChildrenState(
        node as any,
        newChecked
      );
    } else {
      (node as any).checked = newChecked;
      (node as any).indeterminate = false;
    }

    updateParentState(nodeId, treeData() as any);
    syncCheckedStateFromTree();
    syncIndeterminateStateFromTree();
  }

  function syncCheckedStateFromTree(): void {
    treeState.value.checkedIds = new Set();

    function traverse(nodes: T[]): void {
      for (const node of nodes) {
        if ('checked' in node && node.checked) {
          treeState.value.checkedIds.add(node.id);
        }
        if (node.children.length > 0) {
          traverse(node.children as T[]);
        }
      }
    }

    traverse(treeData());
  }

  function syncIndeterminateStateFromTree(): void {
    treeState.value.indeterminateIds = new Set();

    function traverse(nodes: T[]): void {
      for (const node of nodes) {
        if ('indeterminate' in node && node.indeterminate) {
          treeState.value.indeterminateIds.add(node.id);
        }
        if (node.children.length > 0) {
          traverse(node.children as T[]);
        }
      }
    }

    traverse(treeData());
  }

  function syncTreeStateFromCheckedIds(): void {
    if (!enableCheckbox) return;

    function traverse(nodes: T[]): void {
      for (const node of nodes) {
        if ('checked' in node) {
          (node as any).checked = treeState.value.checkedIds.has(node.id);
        }
        if ('indeterminate' in node) {
          (node as any).indeterminate = treeState.value.indeterminateIds.has(node.id);
        }
        if (node.children.length > 0) {
          traverse(node.children as T[]);
        }
      }
    }

    traverse(treeData());

    if (autoSync) {
      syncCheckboxState(treeData() as any);
      syncCheckedStateFromTree();
      syncIndeterminateStateFromTree();
    }
  }

  function setCheckedIds(ids: string[]): void {
    if (!enableCheckbox) return;
    treeState.value.checkedIds = new Set(ids);
    treeState.value.indeterminateIds = new Set();
    syncTreeStateFromCheckedIds();
  }

  function selectAll(): void {
    if (!enableCheckbox) return;

    function traverse(nodes: T[]): void {
      for (const node of nodes) {
        if ('checked' in node && !(node as any).disabled) {
          (node as any).checked = true;
          (node as any).indeterminate = false;
        }
        if (node.children.length > 0) {
          traverse(node.children as T[]);
        }
      }
    }

    traverse(treeData());
    syncCheckedStateFromTree();
  }

  function clearAll(): void {
    if (!enableCheckbox) return;

    function traverse(nodes: T[]): void {
      for (const node of nodes) {
        if ('checked' in node) {
          (node as any).checked = false;
          (node as any).indeterminate = false;
        }
        if (node.children.length > 0) {
          traverse(node.children as T[]);
        }
      }
    }

    traverse(treeData());
    treeState.value.checkedIds = new Set();
    treeState.value.indeterminateIds = new Set();
  }

  function isNodeMatched(nodeId: string): boolean {
    return treeState.value.matchedIds.has(nodeId);
  }

  function isNodeChecked(nodeId: string): boolean {
    return treeState.value.checkedIds.has(nodeId);
  }

  function isNodeIndeterminate(nodeId: string): boolean {
    return treeState.value.indeterminateIds.has(nodeId);
  }

  function isNodeExpanded(nodeId: string): boolean {
    const node = findNodeById(nodeId, treeData());
    if (node && 'expanded' in node) {
      return (node as any).expanded === true;
    }
    return false;
  }

  function isNodeSelected(nodeId: string): boolean {
    return treeState.value.selectedId === nodeId;
  }

  function getNodePathNames(nodeId: string): string[] {
    const path = getNodePath(nodeId, treeData());
    return path
      .map((id) => findNodeById(id, treeData())?.name)
      .filter((n): n is string => n !== undefined);
  }

  function getAllChildIds(nodeId: string): string[] {
    const node = findNodeById(nodeId, treeData());
    if (!node) return [];
    return findAllChildrenIds(node);
  }

  watch(
    () => treeData(),
    () => {
      if (enableCheckbox && autoSync) {
        syncCheckboxState(treeData() as any);
        syncCheckedStateFromTree();
        syncIndeterminateStateFromTree();
      }
    },
    { deep: true }
  );

  return {
    treeState,
    maxDepth,
    searchResultCount,
    selectedNode,
    selectedNodePath,
    checkedIdsArray,
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
    syncCheckboxState,
    syncCheckedStateFromTree,
    syncIndeterminateStateFromTree,
    syncTreeStateFromCheckedIds,
    isNodeMatched,
    isNodeChecked,
    isNodeIndeterminate,
    isNodeExpanded,
    isNodeSelected,
    getNodePathNames,
    getAllChildIds,
  };
}
