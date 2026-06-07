import type {
  PermissionNode,
  Role,
  PermissionConflict,
  DepartmentNode,
} from '@/types';
import { findNodeById, findAllChildrenIds, cloneTree } from './treeUtils';

export function calculateInheritedPermissions(
  roleId: string,
  roles: Role[],
  permissions: PermissionNode[],
  visited = new Set<string>()
): string[] {
  if (visited.has(roleId)) {
    console.warn(`Circular inheritance detected for role: ${roleId}`);
    return [];
  }
  visited.add(roleId);

  const role = roles.find((r) => r.id === roleId);
  if (!role) return [];

  const inherited = new Set<string>(role.permissionIds);

  if (role.inheritFromRole) {
    const parentPermissions = calculateInheritedPermissions(
      role.inheritFromRole,
      roles,
      permissions,
      visited
    );
    for (const p of parentPermissions) {
      inherited.add(p);
    }
  }

  return Array.from(inherited);
}

export function getRoleEffectivePermissions(
  roleId: string,
  roles: Role[],
  permissions: PermissionNode[]
): PermissionNode[] {
  const permissionIds = calculateInheritedPermissions(roleId, roles, permissions);
  const result: PermissionNode[] = [];

  function traverse(nodes: PermissionNode[]): void {
    for (const node of nodes) {
      if (permissionIds.includes(node.id)) {
        const cloned = cloneTree([node])[0];
        cloned.inherited = !roles.find((r) => r.id === roleId)?.permissionIds.includes(node.id);
        if (cloned.inherited) {
          cloned.inheritedFrom = roleId;
        }
        result.push(cloned);
      } else if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(permissions);
  return result;
}

export function expandPermissionIds(
  permissionIds: string[],
  permissions: PermissionNode[]
): string[] {
  const expanded = new Set<string>(permissionIds);

  for (const id of permissionIds) {
    const node = findNodeById(id, permissions);
    if (node) {
      const childrenIds = findAllChildrenIds(node);
      for (const cid of childrenIds) {
        expanded.add(cid);
      }
    }
  }

  return Array.from(expanded);
}

export function collapsePermissionIds(
  permissionIds: string[],
  permissions: PermissionNode[]
): string[] {
  const idSet = new Set(permissionIds);
  const result: string[] = [];

  function traverse(nodes: PermissionNode[]): boolean {
    let allChildrenIncluded = true;
    let hasChildren = false;

    for (const child of nodes) {
      hasChildren = true;
      if (child.children.length > 0) {
        const childAllIncluded = traverse(child.children);
        if (!childAllIncluded) {
          allChildrenIncluded = false;
        }
      }
      if (!idSet.has(child.id)) {
        allChildrenIncluded = false;
      }
    }

    if (hasChildren && allChildrenIncluded) {
      for (const child of nodes) {
        if (idSet.has(child.parentId!)) {
          return true;
        }
      }
    }

    return allChildrenIncluded && hasChildren;
  }

  for (const node of permissions) {
    if (node.children.length > 0) {
      const allChildrenIncluded = traverse(node.children);
      if (allChildrenIncluded && idSet.has(node.id)) {
        result.push(node.id);
        const childrenToExclude = findAllChildrenIds(node);
        for (const cid of childrenToExclude) {
          idSet.delete(cid);
        }
      }
    }
  }

  for (const id of idSet) {
    result.push(id);
  }

  return result;
}

export function checkPairConflict(
  permA: PermissionNode,
  permB: PermissionNode
): PermissionConflict | null {
  if (permA.id === permB.id) return null;

  if (permA.conflictingPermissions.includes(permB.id)) {
    return {
      id: `conflict-${permA.id}-${permB.id}`,
      type: 'mutex',
      permissionA: permA.id,
      permissionB: permB.id,
      severity: 'high',
      description: `权限 "${permA.name}" 与 "${permB.name}" 互斥，不能同时授予`,
      resolved: false,
    };
  }

  if (permB.conflictingPermissions.includes(permA.id)) {
    return {
      id: `conflict-${permB.id}-${permA.id}`,
      type: 'mutex',
      permissionA: permB.id,
      permissionB: permA.id,
      severity: 'high',
      description: `权限 "${permB.name}" 与 "${permA.name}" 互斥，不能同时授予`,
      resolved: false,
    };
  }

  if (permA.type === 'data' && permB.type === 'data') {
    const scopeOverlap = checkDataScopeOverlap(permA, permB);
    if (scopeOverlap) {
      return {
        id: `conflict-scope-${permA.id}-${permB.id}`,
        type: 'scope',
        permissionA: permA.id,
        permissionB: permB.id,
        severity: 'medium',
        description: `数据权限 "${permA.name}" 与 "${permB.name}" 存在范围重叠，建议确认`,
        resolved: false,
      };
    }
  }

  const aChildren = findAllChildrenIds(permA);
  const bChildren = findAllChildrenIds(permB);
  if (aChildren.includes(permB.id) || bChildren.includes(permA.id)) {
    return {
      id: `conflict-overlap-${permA.id}-${permB.id}`,
      type: 'overlap',
      permissionA: permA.id,
      permissionB: permB.id,
      severity: 'low',
      description: `权限存在父子包含关系，勾选父节点将自动包含子节点`,
      resolved: false,
    };
  }

  return null;
}

function checkDataScopeOverlap(permA: PermissionNode, permB: PermissionNode): boolean {
  const scopeA = permA.code.split(':').pop() || '';
  const scopeB = permB.code.split(':').pop() || '';

  if (scopeA === 'all' || scopeB === 'all') return true;
  if (scopeA === scopeB) return true;
  if (scopeA.includes(scopeB) || scopeB.includes(scopeA)) return true;

  return false;
}

export function detectConflicts(
  permissionIds: string[],
  allPermissions: PermissionNode[]
): PermissionConflict[] {
  const conflicts: PermissionConflict[] = [];
  const selected = permissionIds
    .map((id) => findNodeById(id, allPermissions))
    .filter((p): p is PermissionNode => p !== null);

  const seenPairs = new Set<string>();

  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      const pairKey = [selected[i].id, selected[j].id].sort().join('-');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const conflict = checkPairConflict(selected[i], selected[j]);
      if (conflict) {
        conflicts.push(conflict);
      }
    }
  }

  return conflicts;
}

export function resolveConflict(
  conflict: PermissionConflict,
  keepPermission: string
): string | null {
  if (keepPermission === conflict.permissionA) {
    return conflict.permissionB;
  } else if (keepPermission === conflict.permissionB) {
    return conflict.permissionA;
  }
  return null;
}

export function grantPermissionsToRole(
  role: Role,
  permissionIds: string[],
  permissions: PermissionNode[]
): Role {
  const expandedIds = expandPermissionIds(permissionIds, permissions);
  const collapsedIds = collapsePermissionIds(expandedIds, permissions);

  return {
    ...role,
    permissionIds: Array.from(new Set([...role.permissionIds, ...collapsedIds])),
    updatedAt: Date.now(),
  };
}

export function revokePermissionsFromRole(
  role: Role,
  permissionIds: string[]
): Role {
  const toRevoke = new Set(permissionIds);
  return {
    ...role,
    permissionIds: role.permissionIds.filter((id) => !toRevoke.has(id)),
    updatedAt: Date.now(),
  };
}

export function grantPermissionsToDepartment(
  department: DepartmentNode,
  roleIds: string[],
  roles: Role[]
): { updatedRoles: Role[]; affectedDepartments: string[] } {
  const deptAndChildrenIds = findAllChildrenIds(department);
  const updatedRoles = roles.map((role) => {
    if (roleIds.includes(role.id)) {
      return {
        ...role,
        departmentIds: Array.from(new Set([...role.departmentIds, ...deptAndChildrenIds])),
        updatedAt: Date.now(),
      };
    }
    return role;
  });

  return {
    updatedRoles,
    affectedDepartments: deptAndChildrenIds,
  };
}

export function batchGrantPermissions(
  targetRoleIds: string[],
  permissionIds: string[],
  roles: Role[],
  permissions: PermissionNode[]
): Role[] {
  return roles.map((role) => {
    if (targetRoleIds.includes(role.id)) {
      return grantPermissionsToRole(role, permissionIds, permissions);
    }
    return role;
  });
}

export function batchRevokePermissions(
  targetRoleIds: string[],
  permissionIds: string[],
  roles: Role[]
): Role[] {
  return roles.map((role) => {
    if (targetRoleIds.includes(role.id)) {
      return revokePermissionsFromRole(role, permissionIds);
    }
    return role;
  });
}

export function validatePermissionMatrix(
  roles: Role[],
  permissions: PermissionNode[]
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const role of roles) {
    const conflicts = detectConflicts(role.permissionIds, permissions);
    const highConflicts = conflicts.filter((c) => c.severity === 'high');

    if (highConflicts.length > 0) {
      errors.push(
        `角色 "${role.name}" 存在 ${highConflicts.length} 个严重权限冲突: ${highConflicts
          .map((c) => c.description)
          .join('; ')}`
      );
    }

    const mediumConflicts = conflicts.filter((c) => c.severity === 'medium');
    if (mediumConflicts.length > 0) {
      warnings.push(
        `角色 "${role.name}" 存在 ${mediumConflicts.length} 个中级权限冲突: ${mediumConflicts
          .map((c) => c.description)
          .join('; ')}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getPermissionInheritanceChain(
  roleId: string,
  roles: Role[]
): Role[] {
  const chain: Role[] = [];
  const visited = new Set<string>();
  let currentId: string | undefined = roleId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const role = roles.find((r) => r.id === currentId);
    if (role) {
      chain.push(role);
      currentId = role.inheritFromRole;
    } else {
      break;
    }
  }

  return chain;
}
