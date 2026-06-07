import type { TreeNode, SearchResult, TreeNodeWithPath } from '@/types';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function findNodeById<T extends TreeNode>(
  id: string,
  tree: T[]
): T | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children.length > 0) {
      const found = findNodeById(id, node.children as T[]);
      if (found) return found;
    }
  }
  return null;
}

export function findParent<T extends TreeNode>(
  nodeId: string,
  tree: T[]
): T | null {
  for (const node of tree) {
    if (node.children.some((c) => c.id === nodeId)) return node;
    if (node.children.length > 0) {
      const found = findParent(nodeId, node.children as T[]);
      if (found) return found;
    }
  }
  return null;
}

export function findAncestors<T extends TreeNode>(
  nodeId: string,
  tree: T[]
): T[] {
  const path: T[] = [];
  function traverse(nodes: T[]): boolean {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return true;
      }
      if (node.children.length > 0) {
        path.push(node);
        if (traverse(node.children as T[])) return true;
        path.pop();
      }
    }
    return false;
  }
  traverse(tree);
  return path;
}

export function findAllChildrenIds<T extends TreeNode>(node: T): string[] {
  const ids: string[] = [node.id];
  for (const child of node.children) {
    ids.push(...findAllChildrenIds(child as T));
  }
  return ids;
}

export function flattenTree<T extends TreeNode>(tree: T[]): T[] {
  const result: T[] = [];
  function traverse(nodes: T[]): void {
    for (const node of nodes) {
      result.push(node);
      if (node.children.length > 0) {
        traverse(node.children as T[]);
      }
    }
  }
  traverse(tree);
  return result;
}

export function updateChildrenState<T extends TreeNode & { checked: boolean; indeterminate: boolean }>(
  node: T,
  checked: boolean
): void {
  node.checked = checked;
  node.indeterminate = false;
  for (const child of node.children) {
    updateChildrenState(child as T, checked);
  }
}

export function updateParentState<T extends TreeNode & { checked: boolean; indeterminate: boolean }>(
  nodeId: string,
  tree: T[]
): void {
  const parent = findParent(nodeId, tree);
  if (!parent) return;

  const parentWithState = parent as any;
  const children = parentWithState.children as any;

  const allChecked = children.every((c) => c.checked && !c.indeterminate);
  const someChecked = children.some((c) => c.checked || c.indeterminate);

  parentWithState.checked = allChecked;
  parentWithState.indeterminate = !allChecked && someChecked;

  updateParentState(parent.id, tree);
}

export function syncCheckboxState<T extends TreeNode & { checked: boolean; indeterminate: boolean }>(
  tree: T[]
): void {
  function traverse(nodes: any[]): void {
    for (const node of nodes) {
      if (node.children.length === 0) continue;

      const children = node.children as any;
      traverse(children);

      const allChecked = children.every((c) => c.checked && !c.indeterminate);
      const someChecked = children.some((c) => c.checked || c.indeterminate);

      node.checked = allChecked;
      node.indeterminate = !allChecked && someChecked;
    }
  }
  traverse(tree);
}

export function toggleExpandAll<T extends TreeNode & { expanded: boolean }>(
  tree: T[],
  expanded: boolean
): void {
  for (const node of tree) {
    node.expanded = expanded;
    if (node.children.length > 0) {
      toggleExpandAll(node.children as T[], expanded);
    }
  }
}

export function expandToLevel<T extends TreeNode & { expanded: boolean }>(
  tree: T[],
  targetLevel: number,
  currentLevel = 1
): void {
  for (const node of tree) {
    node.expanded = currentLevel < targetLevel;
    if (node.children.length > 0) {
      expandToLevel(node.children as T[], targetLevel, currentLevel + 1);
    }
  }
}

export function getMaxDepth<T extends TreeNode>(tree: T[]): number {
  let maxDepth = 0;
  function traverse(nodes: T[], depth: number): void {
    for (const node of nodes) {
      maxDepth = Math.max(maxDepth, depth);
      if (node.children.length > 0) {
        traverse(node.children as T[], depth + 1);
      }
    }
  }
  traverse(tree, 1);
  return maxDepth;
}

export function getNodePath<T extends TreeNode>(
  nodeId: string,
  tree: T[]
): string[] {
  const path: string[] = [];
  function traverse(nodes: T[]): boolean {
    for (const node of nodes) {
      path.push(node.id);
      if (node.id === nodeId) return true;
      if (node.children.length > 0 && traverse(node.children as T[])) {
        return true;
      }
      path.pop();
    }
    return false;
  }
  traverse(tree);
  return path;
}

export function insertNode<T extends TreeNode>(
  tree: T[],
  parentId: string | null,
  newNode: T,
  position?: number
): void {
  if (parentId === null) {
    if (position !== undefined) {
      tree.splice(position, 0, newNode);
    } else {
      tree.push(newNode);
    }
    return;
  }

  const parent = findNodeById(parentId, tree);
  if (parent) {
    if (position !== undefined) {
      (parent.children as T[]).splice(position, 0, newNode);
    } else {
      (parent.children as T[]).push(newNode);
    }
  }
}

export function removeNode<T extends TreeNode>(tree: T[], nodeId: string): boolean {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === nodeId) {
      tree.splice(i, 1);
      return true;
    }
    if (removeNode(tree[i].children as T[], nodeId)) {
      return true;
    }
  }
  return false;
}

export function countNodes<T extends TreeNode>(tree: T[]): number {
  let count = 0;
  for (const node of tree) {
    count++;
    if (node.children.length > 0) {
      count += countNodes(node.children as T[]);
    }
  }
  return count;
}

export function calculateLevels<T extends TreeNode & { level: number }>(
  tree: T[],
  currentLevel = 1
): void {
  for (const node of tree) {
    node.level = currentLevel;
    if (node.children.length > 0) {
      calculateLevels(node.children as T[], currentLevel + 1);
    }
  }
}

export function buildTreeFromFlatList<T extends { id: string; parentId: string | null }>(
  flatList: T[]
): Array<T & { children: Array<T & { children: any[] }> }> {
  const map = new Map<string, T & { children: any[] }>();
  const roots: Array<T & { children: any[] }> = [];

  for (const item of flatList) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const item of flatList) {
    const node = map.get(item.id)!;
    if (item.parentId === null) {
      roots.push(node);
    } else {
      const parent = map.get(item.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  return roots;
}

export function findNodesWithPath<T extends TreeNode>(
  predicate: (node: T) => boolean,
  tree: T[]
): Array<TreeNodeWithPath<T>> {
  const results: Array<TreeNodeWithPath<T>> = [];

  function traverse(nodes: T[], path: string[]): void {
    for (const node of nodes) {
      const currentPath = [...path, node.id];
      if (predicate(node)) {
        results.push({ node, path: currentPath });
      }
      if (node.children.length > 0) {
        traverse(node.children as T[], currentPath);
      }
    }
  }

  traverse(tree, []);
  return results;
}

export function cloneTree<T extends TreeNode>(tree: T[]): T[] {
  return tree.map((node) => ({
    ...node,
    children: cloneTree(node.children as T[]),
  }));
}

export function sortTree<T extends TreeNode & { order: number }>(tree: T[]): void {
  tree.sort((a, b) => a.order - b.order);
  for (const node of tree) {
    if (node.children.length > 0) {
      sortTree(node.children as T[]);
    }
  }
}
