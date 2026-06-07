export interface DepartmentNode {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  children: DepartmentNode[];
  level: number;
  expanded: boolean;
  description: string;
  leader?: string;
  memberCount: number;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface PermissionNode {
  id: string;
  name: string;
  code: string;
  type: 'menu' | 'button' | 'api' | 'data';
  parentId: string | null;
  children: PermissionNode[];
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  conflictingPermissions: string[];
  inherited: boolean;
  inheritedFrom?: string;
  description: string;
  order: number;
  expanded?: boolean;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  permissionIds: string[];
  departmentIds: string[];
  userIds: string[];
  isSystem: boolean;
  status: 'active' | 'disabled';
  inheritFromRole?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TreeState {
  searchKeyword: string;
  matchedIds: Set<string>;
  expandedIds: Set<string>;
  selectedId: string | null;
  checkedIds: Set<string>;
  indeterminateIds: Set<string>;
}

export interface PermissionConflict {
  id: string;
  type: 'mutex' | 'overlap' | 'scope';
  permissionA: string;
  permissionB: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  resolved: boolean;
}

export interface SearchResult {
  matchedIds: Set<string>;
  expandedIds: Set<string>;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  language: 'zh-CN' | 'en-US';
}

export interface PersistenceData {
  version: string;
  departments: DepartmentNode[];
  roles: Role[];
  permissions: PermissionNode[];
  settings: AppSettings;
  savedAt: number;
}

export type TreeNode = DepartmentNode | PermissionNode;

export interface TreeNodeWithPath<T extends TreeNode> {
  node: T;
  path: string[];
}
