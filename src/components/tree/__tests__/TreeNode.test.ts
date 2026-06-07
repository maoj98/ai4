import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TreeNode from '../TreeNode.vue';
import TreeCheckbox from '../TreeCheckbox.vue';
import type { DepartmentNode, PermissionNode, TreeNode as TreeNodeType } from '@/types';

interface TreeNodeProps {
  node: TreeNodeType;
  level?: number;
  showCheckbox?: boolean;
  showIcon?: boolean;
  searchKeyword?: string;
  matchedIds?: Set<string>;
  expandedIds?: Set<string>;
  checkedIds?: Set<string>;
  indeterminateIds?: Set<string>;
  selectedId?: string | null;
  nodeType?: 'department' | 'permission';
  disabled?: boolean;
  selectable?: boolean;
}

const mockDepartmentNode: DepartmentNode = {
  id: 'dept-1',
  name: '技术部',
  code: 'TECH',
  parentId: null,
  children: [
    {
      id: 'dept-1-1',
      name: '前端组',
      code: 'FE',
      parentId: 'dept-1',
      children: [],
      level: 2,
      expanded: false,
      description: '前端开发组',
      leader: '张三',
      memberCount: 5,
      order: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'dept-1-2',
      name: '后端组',
      code: 'BE',
      parentId: 'dept-1',
      children: [
        {
          id: 'dept-1-2-1',
          name: 'Java组',
          code: 'JAVA',
          parentId: 'dept-1-2',
          children: [],
          level: 3,
          expanded: false,
          description: 'Java开发组',
          memberCount: 3,
          order: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      level: 2,
      expanded: false,
      description: '后端开发组',
      leader: '李四',
      memberCount: 6,
      order: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
  level: 1,
  expanded: false,
  description: '技术部门',
  leader: '王五',
  memberCount: 20,
  order: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockDepartmentNodeExpanded: DepartmentNode = {
  ...mockDepartmentNode,
  expanded: true,
  children: mockDepartmentNode.children.map((child) => ({
    ...child,
    expanded: child.id === 'dept-1-2',
  })),
};

const mockPermissionNode: PermissionNode = {
  id: 'perm-1',
  name: '用户管理',
  code: 'user:manage',
  type: 'menu',
  parentId: null,
  children: [
    {
      id: 'perm-1-1',
      name: '查看用户',
      code: 'user:view',
      type: 'button',
      parentId: 'perm-1',
      children: [],
      checked: false,
      indeterminate: false,
      disabled: false,
      conflictingPermissions: [],
      inherited: false,
      description: '查看用户列表',
      order: 1,
    },
    {
      id: 'perm-1-2',
      name: '创建用户',
      code: 'user:create',
      type: 'button',
      parentId: 'perm-1',
      children: [],
      checked: true,
      indeterminate: false,
      disabled: true,
      conflictingPermissions: [],
      inherited: true,
      inheritedFrom: 'role-admin',
      description: '创建新用户',
      order: 2,
    },
    {
      id: 'perm-1-3',
      name: '用户接口',
      code: 'user:api',
      type: 'api',
      parentId: 'perm-1',
      children: [
        {
          id: 'perm-1-3-1',
          name: '用户数据',
          code: 'user:data',
          type: 'data',
          parentId: 'perm-1-3',
          children: [],
          checked: false,
          indeterminate: false,
          disabled: false,
          conflictingPermissions: ['perm-conflict-1'],
          inherited: false,
          description: '用户数据权限',
          order: 1,
        },
      ],
      checked: false,
      indeterminate: true,
      disabled: false,
      conflictingPermissions: [],
      inherited: false,
      description: '用户管理API',
      order: 3,
    },
  ],
  checked: true,
  indeterminate: false,
  disabled: false,
  conflictingPermissions: [],
  inherited: false,
  description: '用户管理菜单',
  order: 1,
};

const defaultMount = (props: Partial<TreeNodeProps> & { node: TreeNodeType }) => {
  return mount(TreeNode, {
    props: props as TreeNodeProps,
    global: {
      components: {
        TreeCheckbox,
      },
      stubs: {
        transition: false,
      },
    },
  });
};

describe('TreeNode.vue', () => {
  describe('渲染测试', () => {
    it('节点内容正确渲染（名称、图标、标签）', () => {
      const wrapper = defaultMount({
        node: mockDepartmentNode,
        nodeType: 'department',
      });

      expect(wrapper.text()).toContain('技术部');
      expect(wrapper.text()).toContain('20人');
      expect(wrapper.find('svg').exists()).toBe(true);
    });

    it('子节点递归渲染', () => {
      const wrapper = defaultMount({
        node: mockDepartmentNodeExpanded,
        nodeType: 'department',
      });

      expect(wrapper.text()).toContain('技术部');
      expect(wrapper.text()).toContain('前端组');
      expect(wrapper.text()).toContain('后端组');
      expect(wrapper.text()).toContain('Java组');
    });

    it('折叠状态渲染', () => {
      const wrapper = defaultMount({
        node: mockDepartmentNode,
        nodeType: 'department',
      });

      expect(wrapper.text()).toContain('技术部');
      expect(wrapper.text()).not.toContain('前端组');
    });

    it('展开状态渲染', () => {
      const wrapper = defaultMount({
        node: mockDepartmentNodeExpanded,
        nodeType: 'department',
      });

      expect(wrapper.text()).toContain('前端组');
    });

    it('搜索高亮渲染', () => {
      const wrapper = defaultMount({
        node: mockDepartmentNode,
        nodeType: 'department',
        searchKeyword: '技术',
      });

      const highlighted = wrapper.find('mark');
      expect(highlighted.exists()).toBe(true);
      expect(highlighted.text()).toBe('技术');
    });
  });

  describe('状态测试', () => {
    it('选中状态样式', () => {
      const wrapper = defaultMount({
        node: mockDepartmentNode,
        nodeType: 'department',
        selectedId: 'dept-1',
      });

      const nodeContent = wrapper.find('.bg-blue-50');
      expect(nodeContent.exists()).toBe(true);
      expect(nodeContent.classes()).toContain('border-l-4');
      expect(nodeContent.classes()).toContain('border-blue-600');
    });

    it('勾选状态', () => {
      const wrapper = defaultMount({
        node: mockDepartmentNode,
        nodeType: 'department',
        showCheckbox: true,
        checkedIds: new Set(['dept-1']),
      });

      const checkbox = wrapper.findComponent(TreeCheckbox);
      expect(checkbox.props('modelValue')).toBe(true);
      expect(checkbox.props('indeterminate')).toBe(false);
    });

    it('半选状态显示', () => {
      const wrapper = defaultMount({
        node: mockPermissionNode,
        nodeType: 'permission',
        showCheckbox: true,
        indeterminateIds: new Set(['perm-1-3']),
        expandedIds: new Set(['perm-1', 'perm-1-3']),
      });

      const checkboxes = wrapper.findAllComponents(TreeCheckbox);
      expect(checkboxes).toHaveLength(5);
      expect(checkboxes[3].props('indeterminate')).toBe(true);
    });

    it('禁用状态', () => {
      const wrapper = defaultMount({
        node: mockPermissionNode,
        nodeType: 'permission',
        showCheckbox: true,
        expandedIds: new Set(['perm-1']),
      });

      const checkboxes = wrapper.findAllComponents(TreeCheckbox);
      const createCheckbox = checkboxes[2];
      expect(createCheckbox.props('disabled')).toBe(true);
    });
  });

  describe('交互测试', () => {
    it('点击展开/折叠按钮触发事件', async () => {
      const wrapper = defaultMount({
        node: mockDepartmentNode,
        nodeType: 'department',
      });

      const expandButton = wrapper.find('.cursor-pointer.transition-colors');
      await expandButton.trigger('click');

      const emits = wrapper.emitted('toggleExpand');
      expect(emits).toHaveLength(1);
      expect(emits?.[0]).toEqual(['dept-1']);
    });

    it('点击复选框触发 toggle-check 事件', async () => {
      const wrapper = defaultMount({
        node: mockDepartmentNode,
        nodeType: 'department',
        showCheckbox: true,
      });

      const checkbox = wrapper.findComponent(TreeCheckbox);
      await checkbox.vm.$emit('change', true);

      const emits = wrapper.emitted('toggleCheck');
      expect(emits).toHaveLength(1);
      expect(emits?.[0]).toEqual(['dept-1']);
    });

    it('点击节点触发 select 事件', async () => {
      const wrapper = defaultMount({
        node: mockDepartmentNode,
        nodeType: 'department',
      });

      const nodeContent = wrapper.find('.rounded-md');
      await nodeContent.trigger('click');

      const emits = wrapper.emitted('select');
      expect(emits).toHaveLength(1);
      expect(emits?.[0]).toEqual(['dept-1']);
    });

    it('禁用状态下 checkbox 交互被阻止', async () => {
      const wrapper = defaultMount({
        node: mockPermissionNode,
        nodeType: 'permission',
        showCheckbox: true,
        disabled: true,
        expandedIds: new Set(['perm-1']),
      });

      const checkboxes = wrapper.findAllComponents(TreeCheckbox);
      await checkboxes[0].vm.$emit('change', true);

      expect(wrapper.emitted('toggleCheck')).toBeUndefined();
    });

    it('selectable=false 时 select 事件被阻止', async () => {
      const wrapper = defaultMount({
        node: mockDepartmentNode,
        nodeType: 'department',
        selectable: false,
      });

      const nodeContent = wrapper.find('.rounded-md');
      await nodeContent.trigger('click');

      expect(wrapper.emitted('select')).toBeUndefined();
    });
  });

  describe('Props 测试', () => {
    it('level 层级缩进正确', () => {
      const wrapper = defaultMount({
        node: mockDepartmentNode,
        nodeType: 'department',
        level: 3,
      });

      const nodeContent = wrapper.find('[style*="padding-left"]');
      expect(nodeContent.attributes('style')).toContain('48px');
    });

    it('search-keyword 高亮生效', () => {
      const wrapper = defaultMount({
        node: mockDepartmentNode,
        nodeType: 'department',
        searchKeyword: '技术',
      });

      expect(wrapper.html()).toContain('<mark');
      expect(wrapper.find('mark').classes()).toContain('bg-yellow-200');
    });

    it('matched-ids 匹配标记生效', () => {
      const wrapper = defaultMount({
        node: mockDepartmentNode,
        nodeType: 'department',
        matchedIds: new Set(['dept-1']),
      });

      const nodeContent = wrapper.find('.bg-yellow-50');
      expect(nodeContent.exists()).toBe(true);
    });

    it('node-type 类型标签正确显示', () => {
      const wrapper = defaultMount({
        node: mockPermissionNode,
        nodeType: 'permission',
        expandedIds: new Set(['perm-1', 'perm-1-3']),
      });

      expect(wrapper.text()).toContain('菜单');
      expect(wrapper.text()).toContain('按钮');
      expect(wrapper.text()).toContain('接口');
      expect(wrapper.text()).toContain('数据');
    });
  });

  describe('特殊标记', () => {
    it('继承标记显示', () => {
      const wrapper = defaultMount({
        node: mockPermissionNode,
        nodeType: 'permission',
        expandedIds: new Set(['perm-1']),
      });

      expect(wrapper.text()).toContain('继承');
      const inheritedTag = wrapper.find('.bg-emerald-100');
      expect(inheritedTag.exists()).toBe(true);
      expect(inheritedTag.text()).toBe('继承');
    });

    it('冲突标记显示', () => {
      const wrapper = defaultMount({
        node: mockPermissionNode,
        nodeType: 'permission',
        expandedIds: new Set(['perm-1', 'perm-1-3']),
      });

      const conflictTag = wrapper.find('.bg-red-100');
      expect(conflictTag.exists()).toBe(true);
      expect(conflictTag.text()).toBe('!');
    });

    it('不同权限类型标签显示', () => {
      const wrapper = defaultMount({
        node: mockPermissionNode,
        nodeType: 'permission',
        expandedIds: new Set(['perm-1', 'perm-1-3']),
      });

      const typeTags = wrapper.findAll('.bg-purple-100');
      const tagTexts = typeTags.map((tag) => tag.text());

      expect(tagTexts).toContain('菜单');
      expect(tagTexts).toContain('按钮');
      expect(tagTexts).toContain('接口');
      expect(tagTexts).toContain('数据');
    });
  });
});
