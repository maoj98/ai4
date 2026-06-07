import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PermissionNode, Role } from '@/types';
import {
  calculateInheritedPermissions,
  getRoleEffectivePermissions,
  grantPermissionsToRole,
  revokePermissionsFromRole,
  batchGrantPermissions,
  batchRevokePermissions,
  detectConflicts,
  resolveConflict,
  expandPermissionIds,
  collapsePermissionIds,
  validatePermissionMatrix,
  getPermissionInheritanceChain,
  checkPairConflict,
} from '../permissionUtils';

describe('permissionUtils', () => {
  let permissions: PermissionNode[];
  let roles: Role[];

  const now = Date.now();

  const createPermission = (
    id: string,
    name: string,
    code: string,
    type: PermissionNode['type'] = 'menu',
    parentId: string | null = null,
    conflictingPermissions: string[] = [],
    children: PermissionNode[] = []
  ): PermissionNode => ({
    id,
    name,
    code,
    type,
    parentId,
    children,
    checked: false,
    indeterminate: false,
    disabled: false,
    conflictingPermissions,
    inherited: false,
    description: `${name}描述`,
    order: 0,
  });

  const createRole = (
    id: string,
    name: string,
    code: string,
    permissionIds: string[] = [],
    inheritFromRole?: string
  ): Role => ({
    id,
    name,
    code,
    description: `${name}描述`,
    permissionIds,
    departmentIds: [],
    userIds: [],
    isSystem: false,
    status: 'active',
    inheritFromRole,
    createdAt: now,
    updatedAt: now,
  });

  beforeEach(() => {
    permissions = [
      createPermission('system', '系统管理', 'system', 'menu', null, [], [
        createPermission('user', '用户管理', 'system:user', 'menu', 'system', [], [
          createPermission('user:view', '查看用户', 'system:user:view', 'button', 'user'),
          createPermission('user:create', '创建用户', 'system:user:create', 'button', 'user'),
          createPermission('user:edit', '编辑用户', 'system:user:edit', 'button', 'user'),
          createPermission('user:delete', '删除用户', 'system:user:delete', 'button', 'user', ['user:create']),
        ]),
        createPermission('role', '角色管理', 'system:role', 'menu', 'system', [], [
          createPermission('role:view', '查看角色', 'system:role:view', 'button', 'role'),
          createPermission('role:edit', '编辑角色', 'system:role:edit', 'button', 'role'),
        ]),
      ]),
      createPermission('data', '数据管理', 'data', 'menu', null, [], [
        createPermission('data:all', '全部数据', 'data:all', 'data', 'data'),
        createPermission('data:dept', '部门数据', 'data:dept', 'data', 'data'),
        createPermission('data:personal', '个人数据', 'data:personal', 'data', 'data'),
      ]),
    ];

    roles = [
      createRole('super-admin', '超级管理员', 'super-admin', ['system', 'data:all']),
      createRole('admin', '管理员', 'admin', ['user', 'data:dept'], 'super-admin'),
      createRole('operator', '操作员', 'operator', ['user:view', 'user:create'], 'admin'),
      createRole('viewer', '查看员', 'viewer', ['user:view']),
    ];
  });

  describe('calculateInheritedPermissions', () => {
    it('应正确计算无继承角色的权限', () => {
      const result = calculateInheritedPermissions('viewer', roles, permissions);
      expect(result).toEqual(expect.arrayContaining(['user:view']));
      expect(result).toHaveLength(1);
    });

    it('应正确计算单层继承的权限', () => {
      const result = calculateInheritedPermissions('admin', roles, permissions);
      expect(result).toEqual(expect.arrayContaining(['user', 'data:dept', 'system', 'data:all']));
      expect(result).toHaveLength(4);
    });

    it('应正确计算多层继承的权限', () => {
      const result = calculateInheritedPermissions('operator', roles, permissions);
      expect(result).toEqual(
        expect.arrayContaining(['user:view', 'user:create', 'user', 'data:dept', 'system', 'data:all'])
      );
      expect(result).toHaveLength(6);
    });

    it('对于不存在的角色应返回空数组', () => {
      const result = calculateInheritedPermissions('non-existent', roles, permissions);
      expect(result).toEqual([]);
    });

    it('应去重重复的权限ID', () => {
      const customRoles = [
        createRole('role-a', '角色A', 'role-a', ['perm1', 'perm2']),
        createRole('role-b', '角色B', 'role-b', ['perm2', 'perm3'], 'role-a'),
      ];
      const result = calculateInheritedPermissions('role-b', customRoles, permissions);
      expect(result).toEqual(expect.arrayContaining(['perm1', 'perm2', 'perm3']));
      expect(result).toHaveLength(3);
    });

    it('应检测循环继承并保留已收集的权限', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const circularRoles: Role[] = [
        createRole('role-a', '角色A', 'role-a', ['perm1'], 'role-b'),
        createRole('role-b', '角色B', 'role-b', ['perm2'], 'role-a'),
      ];
      const result = calculateInheritedPermissions('role-a', circularRoles, permissions);
      expect(result).toEqual(expect.arrayContaining(['perm1', 'perm2']));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Circular inheritance detected'));
      warnSpy.mockRestore();
    });

    it('应检测深层循环继承并保留已收集的权限', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const circularRoles: Role[] = [
        createRole('role-a', '角色A', 'role-a', ['perm1'], 'role-b'),
        createRole('role-b', '角色B', 'role-b', ['perm2'], 'role-c'),
        createRole('role-c', '角色C', 'role-c', ['perm3'], 'role-a'),
      ];
      const result = calculateInheritedPermissions('role-a', circularRoles, permissions);
      expect(result).toEqual(expect.arrayContaining(['perm1', 'perm2', 'perm3']));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('getRoleEffectivePermissions', () => {
    it('应返回角色的有效权限节点', () => {
      const result = getRoleEffectivePermissions('viewer', roles, permissions);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('user:view');
      expect(result[0].inherited).toBe(false);
    });

    it('应标记继承的权限', () => {
      const result = getRoleEffectivePermissions('admin', roles, permissions);
      const permIds = result.map((p) => p.id);

      expect(permIds).toContain('system');
      expect(permIds).toContain('data:all');
      expect(permIds).toContain('data:dept');

      const systemPerm = result.find((p) => p.id === 'system');
      const dataAllPerm = result.find((p) => p.id === 'data:all');
      const dataDeptPerm = result.find((p) => p.id === 'data:dept');

      expect(systemPerm?.inherited).toBe(true);
      expect(systemPerm?.inheritedFrom).toBe('admin');
      expect(dataAllPerm?.inherited).toBe(true);
      expect(dataDeptPerm?.inherited).toBe(false);
    });

    it('对于不存在的角色应返回空数组', () => {
      const result = getRoleEffectivePermissions('non-existent', roles, permissions);
      expect(result).toEqual([]);
    });

    it('应正确处理多层继承的权限标记', () => {
      const customRoles = [
        createRole('base', '基础角色', 'base', ['user:view', 'user:create']),
        createRole('operator', '操作员', 'operator', ['data:personal'], 'base'),
      ];
      const result = getRoleEffectivePermissions('operator', customRoles, permissions);
      const permIds = result.map((p) => p.id);

      expect(permIds).toContain('data:personal');
      expect(permIds).toContain('user:view');
      expect(permIds).toContain('user:create');

      const userViewPerm = result.find((p) => p.id === 'user:view');
      const dataPersonalPerm = result.find((p) => p.id === 'data:personal');
      expect(userViewPerm?.inherited).toBe(true);
      expect(userViewPerm?.inheritedFrom).toBe('operator');
      expect(dataPersonalPerm?.inherited).toBe(false);
    });

    it('应返回权限节点的深拷贝', () => {
      const result = getRoleEffectivePermissions('viewer', roles, permissions);
      result[0].name = '修改后的名称';
      const originalPerm = permissions[0].children[0].children[0];
      expect(originalPerm.name).toBe('查看用户');
    });
  });

  describe('expandPermissionIds', () => {
    it('应展开权限ID包含所有子权限', () => {
      const result = expandPermissionIds(['user'], permissions);
      expect(result).toEqual(
        expect.arrayContaining(['user', 'user:view', 'user:create', 'user:edit', 'user:delete'])
      );
      expect(result).toHaveLength(5);
    });

    it('应展开多级子权限', () => {
      const result = expandPermissionIds(['system'], permissions);
      expect(result).toContain('system');
      expect(result).toContain('user');
      expect(result).toContain('role');
      expect(result).toContain('user:view');
      expect(result).toContain('role:view');
    });

    it('应处理不存在的权限ID', () => {
      const result = expandPermissionIds(['user', 'non-existent'], permissions);
      expect(result).toContain('user');
      expect(result).toContain('non-existent');
    });

    it('空输入应返回空数组', () => {
      const result = expandPermissionIds([], permissions);
      expect(result).toEqual([]);
    });

    it('应去重重复的权限ID', () => {
      const result = expandPermissionIds(['user', 'user:view'], permissions);
      expect(result).toHaveLength(5);
    });

    it('叶子节点展开应只包含自身', () => {
      const result = expandPermissionIds(['user:view'], permissions);
      expect(result).toEqual(['user:view']);
    });
  });

  describe('collapsePermissionIds', () => {
    it('当所有子权限都存在时应折叠到根父节点', () => {
      const allSystemPerms = expandPermissionIds(['system'], permissions);
      const result = collapsePermissionIds(allSystemPerms, permissions);
      expect(result).toContain('system');
      expect(result).not.toContain('user');
      expect(result).not.toContain('user:view');
      expect(result).not.toContain('role');
    });

    it('当缺少部分子权限时不应折叠', () => {
      const partialPerms = ['system', 'user', 'user:view', 'user:create'];
      const result = collapsePermissionIds(partialPerms, permissions);
      expect(result).toContain('system');
      expect(result).toContain('user');
      expect(result).toContain('user:view');
      expect(result).toContain('user:create');
    });

    it('空输入应返回空数组', () => {
      const result = collapsePermissionIds([], permissions);
      expect(result).toEqual([]);
    });

    it('叶子节点应保持不变', () => {
      const result = collapsePermissionIds(['user:view', 'user:create'], permissions);
      expect(result).toEqual(expect.arrayContaining(['user:view', 'user:create']));
      expect(result).toHaveLength(2);
    });

    it('应处理多级折叠', () => {
      const allSystemPerms = expandPermissionIds(['system'], permissions);
      const result = collapsePermissionIds(allSystemPerms, permissions);
      expect(result).toContain('system');
      expect(result).not.toContain('user');
      expect(result).not.toContain('user:view');
    });

    it('不存在的权限ID应保持不变', () => {
      const result = collapsePermissionIds(['user:view', 'non-existent'], permissions);
      expect(result).toContain('user:view');
      expect(result).toContain('non-existent');
    });
  });

  describe('checkPairConflict', () => {
    it('相同权限ID不应检测为冲突', () => {
      const permA = permissions[0].children[0].children[0];
      const result = checkPairConflict(permA, permA);
      expect(result).toBeNull();
    });

    it('应检测互斥冲突', () => {
      const permA = permissions[0].children[0].children[3];
      const permB = permissions[0].children[0].children[1];
      const result = checkPairConflict(permA, permB);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('mutex');
      expect(result?.severity).toBe('high');
      expect(result?.permissionA).toBe('user:delete');
      expect(result?.permissionB).toBe('user:create');
    });

    it('应双向检测互斥冲突', () => {
      const permA = permissions[0].children[0].children[3];
      const permB = permissions[0].children[0].children[1];
      const result1 = checkPairConflict(permA, permB);
      const result2 = checkPairConflict(permB, permA);
      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
    });

    it('应检测父子重叠冲突', () => {
      const permA = permissions[0].children[0];
      const permB = permissions[0].children[0].children[0];
      const result = checkPairConflict(permA, permB);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('overlap');
      expect(result?.severity).toBe('low');
    });

    it('应检测数据范围冲突', () => {
      const dataPerms = permissions[1].children;
      const permA = dataPerms[0];
      const permB = dataPerms[1];
      const result = checkPairConflict(permA, permB);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('scope');
      expect(result?.severity).toBe('medium');
    });

    it('相同范围的数据权限应检测为冲突', () => {
      const permA = createPermission('data:test1', '测试1', 'data:dept', 'data');
      const permB = createPermission('data:test2', '测试2', 'data:dept', 'data');
      const result = checkPairConflict(permA, permB);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('scope');
    });

    it('all范围与其他范围应检测为冲突', () => {
      const permA = createPermission('data:all', '全部', 'data:all', 'data');
      const permB = createPermission('data:personal', '个人', 'data:personal', 'data');
      const result = checkPairConflict(permA, permB);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('scope');
    });

    it('非数据类型权限不应检测范围冲突', () => {
      const permA = createPermission('btn1', '按钮1', 'btn:1', 'button');
      const permB = createPermission('btn2', '按钮2', 'btn:2', 'button');
      const result = checkPairConflict(permA, permB);
      expect(result).toBeNull();
    });
  });

  describe('detectConflicts', () => {
    it('应检测互斥冲突', () => {
      const result = detectConflicts(['user:delete', 'user:create'], permissions);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('mutex');
    });

    it('应检测重叠冲突', () => {
      const result = detectConflicts(['user', 'user:view'], permissions);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('overlap');
    });

    it('应检测数据范围冲突', () => {
      const result = detectConflicts(['data:all', 'data:dept'], permissions);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('scope');
    });

    it('应检测多种冲突类型', () => {
      const result = detectConflicts(
        ['user:delete', 'user:create', 'user', 'data:all', 'data:dept'],
        permissions
      );
      const types = result.map((c) => c.type);
      expect(types).toContain('mutex');
      expect(types).toContain('overlap');
      expect(types).toContain('scope');
    });

    it('无冲突时应返回空数组', () => {
      const result = detectConflicts(['user:view', 'user:edit'], permissions);
      expect(result).toEqual([]);
    });

    it('空输入应返回空数组', () => {
      const result = detectConflicts([], permissions);
      expect(result).toEqual([]);
    });

    it('应跳过不存在的权限ID', () => {
      const result = detectConflicts(['user:view', 'non-existent'], permissions);
      expect(result).toEqual([]);
    });

    it('应去重重复的冲突对', () => {
      const result = detectConflicts(['user:delete', 'user:create', 'user:delete'], permissions);
      expect(result).toHaveLength(1);
    });

    it('应检测多个互斥冲突', () => {
      const permA = createPermission('perm1', '权限1', 'perm:1', 'button', null, ['perm2', 'perm3']);
      const permB = createPermission('perm2', '权限2', 'perm:2', 'button', null, []);
      const permC = createPermission('perm3', '权限3', 'perm:3', 'button', null, []);
      const testPerms = [permA, permB, permC];

      const result = detectConflicts(['perm1', 'perm2', 'perm3'], testPerms);
      expect(result).toHaveLength(2);
      expect(result.every((c) => c.type === 'mutex')).toBe(true);
    });
  });

  describe('resolveConflict', () => {
    it('保留A应返回B', () => {
      const conflict = {
        id: 'conflict-1',
        type: 'mutex' as const,
        permissionA: 'perm-a',
        permissionB: 'perm-b',
        severity: 'high' as const,
        description: '冲突描述',
        resolved: false,
      };
      const result = resolveConflict(conflict, 'perm-a');
      expect(result).toBe('perm-b');
    });

    it('保留B应返回A', () => {
      const conflict = {
        id: 'conflict-1',
        type: 'mutex' as const,
        permissionA: 'perm-a',
        permissionB: 'perm-b',
        severity: 'high' as const,
        description: '冲突描述',
        resolved: false,
      };
      const result = resolveConflict(conflict, 'perm-b');
      expect(result).toBe('perm-a');
    });

    it('保留的权限不在冲突中应返回null', () => {
      const conflict = {
        id: 'conflict-1',
        type: 'mutex' as const,
        permissionA: 'perm-a',
        permissionB: 'perm-b',
        severity: 'high' as const,
        description: '冲突描述',
        resolved: false,
      };
      const result = resolveConflict(conflict, 'perm-c');
      expect(result).toBeNull();
    });
  });

  describe('grantPermissionsToRole', () => {
    it('应授予新权限', () => {
      const role = roles[3];
      const result = grantPermissionsToRole(role, ['user:create'], permissions);
      expect(result.permissionIds).toContain('user:view');
      expect(result.permissionIds).toContain('user:create');
      expect(result.updatedAt).toBeGreaterThan(role.updatedAt);
    });

    it('应自动展开权限并保留子权限', () => {
      const role = createRole('test', '测试', 'test', []);
      const result = grantPermissionsToRole(role, ['user'], permissions);
      expect(result.permissionIds).toContain('user');
      expect(result.permissionIds).toContain('user:view');
      expect(result.permissionIds).toContain('user:create');
      expect(result.permissionIds).toContain('user:edit');
      expect(result.permissionIds).toContain('user:delete');
    });

    it('授予已存在的权限应去重', () => {
      const role = roles[3];
      const result = grantPermissionsToRole(role, ['user:view'], permissions);
      expect(result.permissionIds).toEqual(['user:view']);
    });

    it('不应修改原始角色对象', () => {
      const role = roles[3];
      const originalPerms = [...role.permissionIds];
      const originalUpdatedAt = role.updatedAt;
      grantPermissionsToRole(role, ['user:create'], permissions);
      expect(role.permissionIds).toEqual(originalPerms);
      expect(role.updatedAt).toBe(originalUpdatedAt);
    });

    it('空权限列表应只更新时间戳', () => {
      const role = roles[3];
      const result = grantPermissionsToRole(role, [], permissions);
      expect(result.permissionIds).toEqual(role.permissionIds);
      expect(result.updatedAt).toBeGreaterThan(role.updatedAt);
    });
  });

  describe('revokePermissionsFromRole', () => {
    it('应撤销指定权限', () => {
      const role = createRole('test', '测试', 'test', ['user:view', 'user:create']);
      const result = revokePermissionsFromRole(role, ['user:create']);
      expect(result.permissionIds).toEqual(['user:view']);
      expect(result.updatedAt).toBeGreaterThan(role.updatedAt);
    });

    it('撤销不存在的权限不应影响其他权限', () => {
      const role = createRole('test', '测试', 'test', ['user:view']);
      const result = revokePermissionsFromRole(role, ['non-existent']);
      expect(result.permissionIds).toEqual(['user:view']);
    });

    it('应返回新对象不修改原对象', () => {
      const role = createRole('test', '测试', 'test', ['user:view', 'user:create']);
      const originalPerms = [...role.permissionIds];
      revokePermissionsFromRole(role, ['user:create']);
      expect(role.permissionIds).toEqual(originalPerms);
    });

    it('空权限列表应只更新时间戳', () => {
      const role = createRole('test', '测试', 'test', ['user:view']);
      const result = revokePermissionsFromRole(role, []);
      expect(result.permissionIds).toEqual(['user:view']);
      expect(result.updatedAt).toBeGreaterThan(role.updatedAt);
    });
  });

  describe('batchGrantPermissions', () => {
    it('应批量授予多个角色权限', () => {
      const targetRoles = ['viewer', 'operator'];
      const result = batchGrantPermissions(targetRoles, ['role:view'], roles, permissions);
      const viewer = result.find((r) => r.id === 'viewer');
      const operator = result.find((r) => r.id === 'operator');
      const admin = result.find((r) => r.id === 'admin');

      expect(viewer?.permissionIds).toContain('role:view');
      expect(operator?.permissionIds).toContain('role:view');
      expect(admin?.permissionIds).not.toContain('role:view');
    });

    it('不应修改不在目标列表中的角色', () => {
      const originalAdmin = { ...roles[1] };
      const result = batchGrantPermissions(['viewer'], ['role:view'], roles, permissions);
      const admin = result.find((r) => r.id === 'admin');
      expect(admin).toEqual(originalAdmin);
    });

    it('空目标角色列表应返回原角色数组', () => {
      const result = batchGrantPermissions([], ['role:view'], roles, permissions);
      expect(result).toEqual(roles);
    });

    it('不存在的目标角色应被忽略', () => {
      const result = batchGrantPermissions(
        ['non-existent', 'viewer'],
        ['role:view'],
        roles,
        permissions
      );
      expect(result).toHaveLength(roles.length);
      const viewer = result.find((r) => r.id === 'viewer');
      expect(viewer?.permissionIds).toContain('role:view');
    });
  });

  describe('batchRevokePermissions', () => {
    it('应批量撤销多个角色的权限', () => {
      const customRoles = [
        createRole('role1', '角色1', 'role1', ['perm1', 'perm2']),
        createRole('role2', '角色2', 'role2', ['perm2', 'perm3']),
        createRole('role3', '角色3', 'role3', ['perm1', 'perm3']),
      ];
      const result = batchRevokePermissions(['role1', 'role2'], ['perm2'], customRoles);
      expect(result[0].permissionIds).toEqual(['perm1']);
      expect(result[1].permissionIds).toEqual(['perm3']);
      expect(result[2].permissionIds).toEqual(['perm1', 'perm3']);
    });

    it('不应修改不在目标列表中的角色', () => {
      const originalRole3 = { ...roles[2] };
      const result = batchRevokePermissions(['viewer'], ['user:view'], roles);
      const operator = result.find((r) => r.id === 'operator');
      expect(operator).toEqual(originalRole3);
    });

    it('空目标角色列表应返回原角色数组', () => {
      const result = batchRevokePermissions([], ['perm1'], roles);
      expect(result).toEqual(roles);
    });
  });

  describe('validatePermissionMatrix', () => {
    it('无冲突的权限矩阵应返回valid为true', () => {
      const validRoles = [
        createRole('role1', '角色1', 'role1', ['user:view', 'user:edit']),
        createRole('role2', '角色2', 'role2', ['role:view']),
      ];
      const result = validatePermissionMatrix(validRoles, permissions);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('严重冲突应返回valid为false并在errors中', () => {
      const invalidRoles = [
        createRole('role1', '角色1', 'role1', ['user:delete', 'user:create']),
      ];
      const result = validatePermissionMatrix(invalidRoles, permissions);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('角色1');
      expect(result.warnings).toHaveLength(0);
    });

    it('中级冲突应在warnings中', () => {
      const rolesWithWarning = [
        createRole('role1', '角色1', 'role1', ['data:all', 'data:dept']),
      ];
      const result = validatePermissionMatrix(rolesWithWarning, permissions);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
    });

    it('低级冲突不应在errors或warnings中', () => {
      const rolesWithLow = [createRole('role1', '角色1', 'role1', ['user', 'user:view'])];
      const result = validatePermissionMatrix(rolesWithLow, permissions);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('应验证所有角色', () => {
      const mixedRoles = [
        createRole('role1', '角色1', 'role1', ['user:delete', 'user:create']),
        createRole('role2', '角色2', 'role2', ['data:all', 'data:dept']),
        createRole('role3', '角色3', 'role3', ['user:view']),
      ];
      const result = validatePermissionMatrix(mixedRoles, permissions);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
    });

    it('空角色数组应返回valid为true', () => {
      const result = validatePermissionMatrix([], permissions);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('getPermissionInheritanceChain', () => {
    it('应正确获取无继承角色的链', () => {
      const result = getPermissionInheritanceChain('viewer', roles);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('viewer');
    });

    it('应正确获取单层继承链', () => {
      const result = getPermissionInheritanceChain('admin', roles);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('admin');
      expect(result[1].id).toBe('super-admin');
    });

    it('应正确获取多层继承链', () => {
      const result = getPermissionInheritanceChain('operator', roles);
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual(['operator', 'admin', 'super-admin']);
    });

    it('不存在的角色应返回空数组', () => {
      const result = getPermissionInheritanceChain('non-existent', roles);
      expect(result).toEqual([]);
    });

    it('应检测循环继承并终止', () => {
      const circularRoles: Role[] = [
        createRole('role-a', '角色A', 'role-a', [], 'role-b'),
        createRole('role-b', '角色B', 'role-b', [], 'role-c'),
        createRole('role-c', '角色C', 'role-c', [], 'role-a'),
      ];
      const result = getPermissionInheritanceChain('role-a', circularRoles);
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual(['role-a', 'role-b', 'role-c']);
    });

    it('应返回角色对象的引用', () => {
      const result = getPermissionInheritanceChain('viewer', roles);
      expect(result[0]).toBe(roles[3]);
    });
  });
});
