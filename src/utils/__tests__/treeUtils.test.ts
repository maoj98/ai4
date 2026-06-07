import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as treeUtils from '../treeUtils';
import type { PermissionNode } from '@/types';

type TestNode = PermissionNode & { expanded: boolean; indeterminate: boolean; checked: boolean };

function createTestNode(
  id: string,
  name: string,
  children: TestNode[] = [],
  options: Partial<TestNode> = {}
): TestNode {
  return {
    id,
    name,
    code: id,
    type: 'menu',
    parentId: null,
    children,
    checked: false,
    indeterminate: false,
    disabled: false,
    conflictingPermissions: [],
    inherited: false,
    description: '',
    order: 0,
    expanded: false,
    ...options,
  };
}

describe('treeUtils', () => {
  let testTree: TestNode[];
  let emptyTree: TestNode[];
  let singleNodeTree: TestNode[];
  let deepNestedTree: TestNode[];

  beforeEach(() => {
    testTree = [
      createTestNode('1', '系统管理', [
        createTestNode('1-1', '用户管理', [
          createTestNode('1-1-1', '用户列表'),
          createTestNode('1-1-2', '用户新增'),
          createTestNode('1-1-3', '用户编辑'),
        ]),
        createTestNode('1-2', '角色管理', [
          createTestNode('1-2-1', '角色列表'),
          createTestNode('1-2-2', '角色分配'),
        ]),
      ]),
      createTestNode('2', '权限管理', [
        createTestNode('2-1', '菜单权限'),
        createTestNode('2-2', '按钮权限'),
      ]),
    ];

    emptyTree = [];

    singleNodeTree = [createTestNode('single', '单节点')];

    deepNestedTree = [
      createTestNode('l1', '层级1', [
        createTestNode('l2', '层级2', [
          createTestNode('l3', '层级3', [
            createTestNode('l4', '层级4', [
              createTestNode('l5', '层级5'),
            ]),
          ]),
        ]),
      ]),
    ];
  });

  describe('generateId', () => {
    it('should generate unique ids', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(treeUtils.generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('should generate string ids', () => {
      expect(typeof treeUtils.generateId()).toBe('string');
    });
  });

  describe('findNodeById', () => {
    it('should find root node by id', () => {
      const result = treeUtils.findNodeById('1', testTree);
      expect(result?.id).toBe('1');
      expect(result?.name).toBe('系统管理');
    });

    it('should find nested node by id', () => {
      const result = treeUtils.findNodeById('1-1-2', testTree);
      expect(result?.id).toBe('1-1-2');
      expect(result?.name).toBe('用户新增');
    });

    it('should return null for non-existent id', () => {
      const result = treeUtils.findNodeById('non-existent', testTree);
      expect(result).toBeNull();
    });

    it('should return null for empty tree', () => {
      const result = treeUtils.findNodeById('1', emptyTree);
      expect(result).toBeNull();
    });

    it('should find node in single node tree', () => {
      const result = treeUtils.findNodeById('single', singleNodeTree);
      expect(result?.id).toBe('single');
    });

    it('should find deeply nested node', () => {
      const result = treeUtils.findNodeById('l5', deepNestedTree);
      expect(result?.id).toBe('l5');
    });
  });

  describe('findParent', () => {
    it('should find parent of nested node', () => {
      const result = treeUtils.findParent('1-1-1', testTree);
      expect(result?.id).toBe('1-1');
      expect(result?.name).toBe('用户管理');
    });

    it('should find parent of second level node', () => {
      const result = treeUtils.findParent('1-2', testTree);
      expect(result?.id).toBe('1');
    });

    it('should return null for root node', () => {
      const result = treeUtils.findParent('1', testTree);
      expect(result).toBeNull();
    });

    it('should return null for non-existent node', () => {
      const result = treeUtils.findParent('non-existent', testTree);
      expect(result).toBeNull();
    });

    it('should return null for empty tree', () => {
      const result = treeUtils.findParent('1', emptyTree);
      expect(result).toBeNull();
    });

    it('should return null for single node tree', () => {
      const result = treeUtils.findParent('single', singleNodeTree);
      expect(result).toBeNull();
    });

    it('should find parent in deep nested tree', () => {
      const result = treeUtils.findParent('l5', deepNestedTree);
      expect(result?.id).toBe('l4');
    });
  });

  describe('findAncestors', () => {
    it('should find all ancestors for deeply nested node', () => {
      const result = treeUtils.findAncestors('1-1-1', testTree);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('1-1');
    });

    it('should return empty array for root node', () => {
      const result = treeUtils.findAncestors('1', testTree);
      expect(result).toEqual([]);
    });

    it('should return empty array for non-existent node', () => {
      const result = treeUtils.findAncestors('non-existent', testTree);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty tree', () => {
      const result = treeUtils.findAncestors('1', emptyTree);
      expect(result).toEqual([]);
    });

    it('should return all ancestors for deep nested tree', () => {
      const result = treeUtils.findAncestors('l5', deepNestedTree);
      expect(result).toHaveLength(4);
      expect(result.map((n) => n.id)).toEqual(['l1', 'l2', 'l3', 'l4']);
    });
  });

  describe('findAllChildrenIds', () => {
    it('should return all children ids including self', () => {
      const node = treeUtils.findNodeById('1-1', testTree)!;
      const ids = treeUtils.findAllChildrenIds(node);
      expect(ids).toHaveLength(4);
      expect(ids).toContain('1-1');
      expect(ids).toContain('1-1-1');
      expect(ids).toContain('1-1-2');
      expect(ids).toContain('1-1-3');
    });

    it('should return only self for leaf node', () => {
      const node = treeUtils.findNodeById('1-1-1', testTree)!;
      const ids = treeUtils.findAllChildrenIds(node);
      expect(ids).toEqual(['1-1-1']);
    });

    it('should return all ids for root node', () => {
      const node = treeUtils.findNodeById('1', testTree)!;
      const ids = treeUtils.findAllChildrenIds(node);
      expect(ids).toHaveLength(8);
      expect(ids).toContain('1');
      expect(ids).toContain('1-1');
      expect(ids).toContain('1-1-1');
      expect(ids).toContain('1-1-2');
      expect(ids).toContain('1-1-3');
      expect(ids).toContain('1-2');
      expect(ids).toContain('1-2-1');
      expect(ids).toContain('1-2-2');
    });

    it('should return all ids for deep nested tree', () => {
      const node = treeUtils.findNodeById('l1', deepNestedTree)!;
      const ids = treeUtils.findAllChildrenIds(node);
      expect(ids).toEqual(['l1', 'l2', 'l3', 'l4', 'l5']);
    });
  });

  describe('updateChildrenState', () => {
    it('should check all children when parent is checked', () => {
      const node = treeUtils.findNodeById('1-1', testTree)!;
      treeUtils.updateChildrenState(node, true);

      expect(node.checked).toBe(true);
      expect(node.indeterminate).toBe(false);
      expect(node.children[0].checked).toBe(true);
      expect(node.children[1].checked).toBe(true);
      expect(node.children[2].checked).toBe(true);
      expect(node.children[0].indeterminate).toBe(false);
    });

    it('should uncheck all children when parent is unchecked', () => {
      const node = treeUtils.findNodeById('1-1', testTree)!;
      treeUtils.updateChildrenState(node, true);
      treeUtils.updateChildrenState(node, false);

      expect(node.checked).toBe(false);
      expect(node.indeterminate).toBe(false);
      expect(node.children[0].checked).toBe(false);
      expect(node.children[1].checked).toBe(false);
    });

    it('should clear indeterminate state', () => {
      const node = treeUtils.findNodeById('1-1', testTree)!;
      node.indeterminate = true;
      node.children[0].indeterminate = true;

      treeUtils.updateChildrenState(node, true);

      expect(node.indeterminate).toBe(false);
      expect(node.children[0].indeterminate).toBe(false);
    });

    it('should work for leaf node', () => {
      const node = treeUtils.findNodeById('1-1-1', testTree)!;
      treeUtils.updateChildrenState(node, true);
      expect(node.checked).toBe(true);
      expect(node.indeterminate).toBe(false);
    });
  });

  describe('updateParentState', () => {
    it('should set parent to checked when all children are checked', () => {
      const node111 = treeUtils.findNodeById('1-1-1', testTree)!;
      const node112 = treeUtils.findNodeById('1-1-2', testTree)!;
      const node113 = treeUtils.findNodeById('1-1-3', testTree)!;

      node111.checked = true;
      node112.checked = true;
      node113.checked = true;

      treeUtils.updateParentState('1-1-1', testTree);

      const parent11 = treeUtils.findNodeById('1-1', testTree)!;
      expect(parent11.checked).toBe(true);
      expect(parent11.indeterminate).toBe(false);

      const parent1 = treeUtils.findNodeById('1', testTree)!;
      expect(parent1.checked).toBe(false);
      expect(parent1.indeterminate).toBe(true);
    });

    it('should set parent to indeterminate when some children are checked', () => {
      const node111 = treeUtils.findNodeById('1-1-1', testTree)!;
      node111.checked = true;

      treeUtils.updateParentState('1-1-1', testTree);

      const parent11 = treeUtils.findNodeById('1-1', testTree)!;
      expect(parent11.checked).toBe(false);
      expect(parent11.indeterminate).toBe(true);
    });

    it('should set parent to unchecked when no children are checked', () => {
      const node111 = treeUtils.findNodeById('1-1-1', testTree)!;
      const parent11 = treeUtils.findNodeById('1-1', testTree)!;

      parent11.checked = true;
      parent11.indeterminate = true;
      node111.checked = true;
      node111.checked = false;

      treeUtils.updateParentState('1-1-1', testTree);

      expect(parent11.checked).toBe(false);
      expect(parent11.indeterminate).toBe(false);
    });

    it('should propagate to all ancestors', () => {
      const node111 = treeUtils.findNodeById('1-1-1', testTree)!;
      node111.checked = true;

      treeUtils.updateParentState('1-1-1', testTree);

      const parent11 = treeUtils.findNodeById('1-1', testTree)!;
      const parent1 = treeUtils.findNodeById('1', testTree)!;

      expect(parent11.indeterminate).toBe(true);
      expect(parent1.indeterminate).toBe(true);
    });

    it('should do nothing for root node', () => {
      const node = treeUtils.findNodeById('1', testTree)!;
      node.checked = true;

      treeUtils.updateParentState('1', testTree);

      expect(node.checked).toBe(true);
    });

    it('should handle indeterminate child correctly', () => {
      const node11 = treeUtils.findNodeById('1-1', testTree)!;
      const node12 = treeUtils.findNodeById('1-2', testTree)!;

      node11.indeterminate = true;
      node12.checked = false;

      treeUtils.updateParentState('1-1', testTree);

      const parent1 = treeUtils.findNodeById('1', testTree)!;
      expect(parent1.checked).toBe(false);
      expect(parent1.indeterminate).toBe(true);
    });
  });

  describe('syncCheckboxState', () => {
    it('should sync all states from bottom to top', () => {
      const node111 = treeUtils.findNodeById('1-1-1', testTree)!;
      const node112 = treeUtils.findNodeById('1-1-2', testTree)!;
      const node113 = treeUtils.findNodeById('1-1-3', testTree)!;
      const node121 = treeUtils.findNodeById('1-2-1', testTree)!;

      node111.checked = true;
      node112.checked = true;
      node113.checked = true;
      node121.checked = true;

      treeUtils.syncCheckboxState(testTree);

      const node11 = treeUtils.findNodeById('1-1', testTree)!;
      const node12 = treeUtils.findNodeById('1-2', testTree)!;
      const node1 = treeUtils.findNodeById('1', testTree)!;

      expect(node11.checked).toBe(true);
      expect(node11.indeterminate).toBe(false);
      expect(node12.checked).toBe(false);
      expect(node12.indeterminate).toBe(true);
      expect(node1.checked).toBe(false);
      expect(node1.indeterminate).toBe(true);
    });

    it('should mark all parents as checked when all descendants are checked', () => {
      function checkAll(nodes: TestNode[]) {
        for (const node of nodes) {
          node.checked = true;
          if (node.children.length > 0) {
            checkAll(node.children as TestNode[]);
          }
        }
      }
      checkAll(testTree);

      treeUtils.syncCheckboxState(testTree);

      const node1 = treeUtils.findNodeById('1', testTree)!;
      const node2 = treeUtils.findNodeById('2', testTree)!;

      expect(node1.checked).toBe(true);
      expect(node1.indeterminate).toBe(false);
      expect(node2.checked).toBe(true);
      expect(node2.indeterminate).toBe(false);
    });

    it('should clear all states when nothing is checked', () => {
      treeUtils.syncCheckboxState(testTree);

      for (const node of treeUtils.flattenTree(testTree)) {
        expect(node.checked).toBe(false);
        expect(node.indeterminate).toBe(false);
      }
    });

    it('should handle empty tree', () => {
      expect(() => treeUtils.syncCheckboxState(emptyTree)).not.toThrow();
    });

    it('should handle single node tree', () => {
      singleNodeTree[0].checked = true;
      treeUtils.syncCheckboxState(singleNodeTree);
      expect(singleNodeTree[0].checked).toBe(true);
      expect(singleNodeTree[0].indeterminate).toBe(false);
    });
  });

  describe('getMaxDepth', () => {
    it('should return correct depth for normal tree', () => {
      expect(treeUtils.getMaxDepth(testTree)).toBe(3);
    });

    it('should return 0 for empty tree', () => {
      expect(treeUtils.getMaxDepth(emptyTree)).toBe(0);
    });

    it('should return 1 for single node tree', () => {
      expect(treeUtils.getMaxDepth(singleNodeTree)).toBe(1);
    });

    it('should return correct depth for deep nested tree', () => {
      expect(treeUtils.getMaxDepth(deepNestedTree)).toBe(5);
    });

    it('should return 2 for tree with one level of children', () => {
      const tree = [
        createTestNode('1', '1', [
          createTestNode('1-1', '1-1'),
          createTestNode('1-2', '1-2'),
        ]),
      ];
      expect(treeUtils.getMaxDepth(tree)).toBe(2);
    });
  });

  describe('getNodePath', () => {
    it('should return correct path for nested node', () => {
      const path = treeUtils.getNodePath('1-1-1', testTree);
      expect(path).toEqual(['1', '1-1', '1-1-1']);
    });

    it('should return single element for root node', () => {
      const path = treeUtils.getNodePath('1', testTree);
      expect(path).toEqual(['1']);
    });

    it('should return empty array for non-existent node', () => {
      const path = treeUtils.getNodePath('non-existent', testTree);
      expect(path).toEqual([]);
    });

    it('should return empty array for empty tree', () => {
      const path = treeUtils.getNodePath('1', emptyTree);
      expect(path).toEqual([]);
    });

    it('should return correct path for deep nested node', () => {
      const path = treeUtils.getNodePath('l5', deepNestedTree);
      expect(path).toEqual(['l1', 'l2', 'l3', 'l4', 'l5']);
    });

    it('should return correct path for sibling nodes', () => {
      const path1 = treeUtils.getNodePath('1-2-1', testTree);
      const path2 = treeUtils.getNodePath('2-1', testTree);

      expect(path1).toEqual(['1', '1-2', '1-2-1']);
      expect(path2).toEqual(['2', '2-1']);
    });
  });

  describe('toggleExpandAll', () => {
    it('should expand all nodes', () => {
      treeUtils.toggleExpandAll(testTree, true);

      const allNodes = treeUtils.flattenTree(testTree);
      for (const node of allNodes) {
        expect(node.expanded).toBe(true);
      }
    });

    it('should collapse all nodes', () => {
      treeUtils.toggleExpandAll(testTree, true);
      treeUtils.toggleExpandAll(testTree, false);

      const allNodes = treeUtils.flattenTree(testTree);
      for (const node of allNodes) {
        expect(node.expanded).toBe(false);
      }
    });

    it('should handle empty tree', () => {
      expect(() => treeUtils.toggleExpandAll(emptyTree, true)).not.toThrow();
    });

    it('should handle single node tree', () => {
      treeUtils.toggleExpandAll(singleNodeTree, true);
      expect(singleNodeTree[0].expanded).toBe(true);
    });

    it('should expand all nodes in deep nested tree', () => {
      treeUtils.toggleExpandAll(deepNestedTree, true);
      const allNodes = treeUtils.flattenTree(deepNestedTree);
      for (const node of allNodes) {
        expect(node.expanded).toBe(true);
      }
    });
  });

  describe('expandToLevel', () => {
    it('should expand to level 1 only', () => {
      treeUtils.expandToLevel(testTree, 1);

      expect(testTree[0].expanded).toBe(false);
      expect(testTree[1].expanded).toBe(false);

      const node11 = treeUtils.findNodeById('1-1', testTree)!;
      expect(node11.expanded).toBe(false);
    });

    it('should expand to level 2', () => {
      treeUtils.expandToLevel(testTree, 2);

      expect(testTree[0].expanded).toBe(true);
      expect(testTree[1].expanded).toBe(true);

      const node11 = treeUtils.findNodeById('1-1', testTree)!;
      expect(node11.expanded).toBe(false);
    });

    it('should expand to level 3 (all levels)', () => {
      treeUtils.expandToLevel(testTree, 3);

      expect(testTree[0].expanded).toBe(true);
      expect(testTree[1].expanded).toBe(true);

      const node11 = treeUtils.findNodeById('1-1', testTree)!;
      const node12 = treeUtils.findNodeById('1-2', testTree)!;
      expect(node11.expanded).toBe(true);
      expect(node12.expanded).toBe(true);
    });

    it('should expand beyond max depth', () => {
      treeUtils.expandToLevel(testTree, 10);

      const allNodes = treeUtils.flattenTree(testTree);
      for (const node of allNodes) {
        expect(node.expanded).toBe(true);
      }
    });

    it('should collapse all when target level is 0', () => {
      treeUtils.toggleExpandAll(testTree, true);
      treeUtils.expandToLevel(testTree, 0);

      const allNodes = treeUtils.flattenTree(testTree);
      for (const node of allNodes) {
        expect(node.expanded).toBe(false);
      }
    });

    it('should handle empty tree', () => {
      expect(() => treeUtils.expandToLevel(emptyTree, 2)).not.toThrow();
    });

    it('should handle deep nested tree', () => {
      treeUtils.expandToLevel(deepNestedTree, 3);

      expect(deepNestedTree[0].expanded).toBe(true);
      expect(deepNestedTree[0].children[0].expanded).toBe(true);
      expect(deepNestedTree[0].children[0].children[0].expanded).toBe(false);
    });
  });

  describe('cloneTree', () => {
    it('should create a deep copy of the tree', () => {
      const cloned = treeUtils.cloneTree(testTree);

      expect(cloned).toEqual(testTree);
      expect(cloned).not.toBe(testTree);
      expect(cloned[0]).not.toBe(testTree[0]);
      expect(cloned[0].children).not.toBe(testTree[0].children);
    });

    it('should not affect original when modifying clone', () => {
      const cloned = treeUtils.cloneTree(testTree);

      cloned[0].name = '修改后的名称';
      (cloned[0].children[0] as TestNode).name = '修改后的子节点';

      expect(testTree[0].name).toBe('系统管理');
      expect((testTree[0].children[0] as TestNode).name).toBe('用户管理');
    });

    it('should clone empty tree', () => {
      const cloned = treeUtils.cloneTree(emptyTree);
      expect(cloned).toEqual([]);
      expect(cloned).not.toBe(emptyTree);
    });

    it('should clone single node tree', () => {
      const cloned = treeUtils.cloneTree(singleNodeTree);
      expect(cloned).toEqual(singleNodeTree);
      expect(cloned).not.toBe(singleNodeTree);
      expect(cloned[0]).not.toBe(singleNodeTree[0]);
    });

    it('should clone deep nested tree', () => {
      const cloned = treeUtils.cloneTree(deepNestedTree);
      expect(cloned).toEqual(deepNestedTree);

      const l5 = treeUtils.findNodeById('l5', cloned)!;
      l5.name = '修改的深层节点';

      const originalL5 = treeUtils.findNodeById('l5', deepNestedTree)!;
      expect(originalL5.name).toBe('层级5');
    });
  });

  describe('insertNode', () => {
    it('should insert node at root level (append)', () => {
      const newNode = createTestNode('3', '新增的根节点');
      treeUtils.insertNode(testTree, null, newNode);

      expect(testTree).toHaveLength(3);
      expect(testTree[2].id).toBe('3');
    });

    it('should insert node at root level with position', () => {
      const newNode = createTestNode('0', '插入到开头');
      treeUtils.insertNode(testTree, null, newNode, 0);

      expect(testTree).toHaveLength(3);
      expect(testTree[0].id).toBe('0');
      expect(testTree[1].id).toBe('1');
    });

    it('should insert node as child of parent (append)', () => {
      const newNode = createTestNode('1-3', '新增的子节点');
      treeUtils.insertNode(testTree, '1', newNode);

      const parent = treeUtils.findNodeById('1', testTree)!;
      expect(parent.children).toHaveLength(3);
      expect(parent.children[2].id).toBe('1-3');
    });

    it('should insert node as child of parent with position', () => {
      const newNode = createTestNode('1-0', '插入到子节点开头');
      treeUtils.insertNode(testTree, '1', newNode, 0);

      const parent = treeUtils.findNodeById('1', testTree)!;
      expect(parent.children).toHaveLength(3);
      expect(parent.children[0].id).toBe('1-0');
      expect(parent.children[1].id).toBe('1-1');
    });

    it('should not insert when parent does not exist', () => {
      const newNode = createTestNode('x', '不存在的父节点');
      treeUtils.insertNode(testTree, 'non-existent', newNode);

      const allNodes = treeUtils.flattenTree(testTree);
      expect(allNodes.find((n) => n.id === 'x')).toBeUndefined();
    });

    it('should insert into empty tree at root', () => {
      const newNode = createTestNode('new', '新节点');
      treeUtils.insertNode(emptyTree, null, newNode);

      expect(emptyTree).toHaveLength(1);
      expect(emptyTree[0].id).toBe('new');
    });

    it('should insert as child of leaf node', () => {
      const newNode = createTestNode('1-1-1-1', '叶子节点的子节点');
      treeUtils.insertNode(testTree, '1-1-1', newNode);

      const leafParent = treeUtils.findNodeById('1-1-1', testTree)!;
      expect(leafParent.children).toHaveLength(1);
      expect(leafParent.children[0].id).toBe('1-1-1-1');
    });
  });

  describe('removeNode', () => {
    it('should remove root node', () => {
      const result = treeUtils.removeNode(testTree, '1');

      expect(result).toBe(true);
      expect(testTree).toHaveLength(1);
      expect(testTree[0].id).toBe('2');
    });

    it('should remove nested node', () => {
      const result = treeUtils.removeNode(testTree, '1-1');

      expect(result).toBe(true);
      const parent = treeUtils.findNodeById('1', testTree)!;
      expect(parent.children).toHaveLength(1);
      expect(parent.children[0].id).toBe('1-2');
    });

    it('should remove leaf node', () => {
      const result = treeUtils.removeNode(testTree, '1-1-1');

      expect(result).toBe(true);
      const parent = treeUtils.findNodeById('1-1', testTree)!;
      expect(parent.children).toHaveLength(2);
      expect(parent.children[0].id).toBe('1-1-2');
    });

    it('should return false for non-existent node', () => {
      const result = treeUtils.removeNode(testTree, 'non-existent');
      expect(result).toBe(false);
      expect(testTree).toHaveLength(2);
    });

    it('should return false for empty tree', () => {
      const result = treeUtils.removeNode(emptyTree, '1');
      expect(result).toBe(false);
    });

    it('should remove node and all its children', () => {
      treeUtils.removeNode(testTree, '1');

      const allIds = treeUtils.flattenTree(testTree).map((n) => n.id);
      expect(allIds).not.toContain('1');
      expect(allIds).not.toContain('1-1');
      expect(allIds).not.toContain('1-1-1');
    });

    it('should remove single node from single node tree', () => {
      const result = treeUtils.removeNode(singleNodeTree, 'single');
      expect(result).toBe(true);
      expect(singleNodeTree).toHaveLength(0);
    });
  });

  describe('sortTree', () => {
    beforeEach(() => {
      testTree = [
        createTestNode('1', '节点1', [
          createTestNode('1-2', '子节点2', [], { order: 2 }),
          createTestNode('1-1', '子节点1', [], { order: 1 }),
          createTestNode('1-3', '子节点3', [], { order: 3 }),
        ], { order: 2 }),
        createTestNode('2', '节点2', [], { order: 1 }),
        createTestNode('3', '节点3', [], { order: 3 }),
      ];
    });

    it('should sort root nodes by order', () => {
      treeUtils.sortTree(testTree);

      expect(testTree[0].id).toBe('2');
      expect(testTree[1].id).toBe('1');
      expect(testTree[2].id).toBe('3');
    });

    it('should sort children recursively', () => {
      treeUtils.sortTree(testTree);

      const node1 = testTree[1];
      expect(node1.children[0].id).toBe('1-1');
      expect(node1.children[1].id).toBe('1-2');
      expect(node1.children[2].id).toBe('1-3');
    });

    it('should handle empty tree', () => {
      expect(() => treeUtils.sortTree(emptyTree)).not.toThrow();
    });

    it('should handle single node tree', () => {
      expect(() => treeUtils.sortTree(singleNodeTree)).not.toThrow();
      expect(singleNodeTree[0].id).toBe('single');
    });

    it('should handle nodes with same order', () => {
      const tree = [
        createTestNode('a', 'A', [], { order: 1 }),
        createTestNode('b', 'B', [], { order: 1 }),
      ];
      treeUtils.sortTree(tree);
      expect(tree).toHaveLength(2);
    });
  });

  describe('boundary conditions', () => {
    it('should handle null children array', () => {
      const node: TestNode = {
        ...createTestNode('test', '测试'),
        children: [] as any,
      };
      expect(treeUtils.findAllChildrenIds(node)).toEqual(['test']);
    });

    it('should handle tree with mixed depths', () => {
      const mixedTree = [
        createTestNode('a', 'A'),
        createTestNode('b', 'B', [
          createTestNode('b-1', 'B1', [
            createTestNode('b-1-1', 'B11'),
          ]),
        ]),
        createTestNode('c', 'C', [
          createTestNode('c-1', 'C1'),
        ]),
      ];

      expect(treeUtils.getMaxDepth(mixedTree)).toBe(3);
      expect(treeUtils.getNodePath('b-1-1', mixedTree)).toEqual(['b', 'b-1', 'b-1-1']);
      expect(treeUtils.findAncestors('b-1-1', mixedTree).map((n) => n.id)).toEqual(['b', 'b-1']);
    });

    it('should handle large number of nodes', () => {
      const largeTree: TestNode[] = [];
      for (let i = 0; i < 100; i++) {
        largeTree.push(createTestNode(`node-${i}`, `节点${i}`, [], { order: 99 - i }));
      }

      treeUtils.sortTree(largeTree);
      expect(largeTree[0].id).toBe('node-99');
      expect(largeTree[99].id).toBe('node-0');
      expect(treeUtils.countNodes(largeTree)).toBe(100);
    });
  });
});
