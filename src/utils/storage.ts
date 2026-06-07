import type {
  PersistenceData,
  DepartmentNode,
  Role,
  PermissionNode,
  AppSettings,
} from '@/types';
import { debounce } from './searchUtils';

const STORAGE_KEY = 'permission_system_v1';
const STORAGE_VERSION = '1.0.0';
const MAX_STORAGE_SIZE = 4 * 1024 * 1024;

function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

export function getStorageSize(): number {
  if (!isLocalStorageAvailable()) return 0;
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value) {
        total += key.length + value.length;
      }
    }
  }
  return total;
}

export function checkStorageCapacity(): { ok: boolean; used: number; max: number; percentage: number } {
  const used = getStorageSize();
  const percentage = (used / MAX_STORAGE_SIZE) * 100;
  return {
    ok: used < MAX_STORAGE_SIZE,
    used,
    max: MAX_STORAGE_SIZE,
    percentage,
  };
}

export function saveToStorage(
  departments: DepartmentNode[],
  roles: Role[],
  permissions: PermissionNode[],
  settings: AppSettings
): { success: boolean; error?: string; warning?: string } {
  if (!isLocalStorageAvailable()) {
    return {
      success: false,
      error: 'localStorage 不可用，请检查浏览器隐私设置',
    };
  }

  const data: PersistenceData = {
    version: STORAGE_VERSION,
    departments,
    roles,
    permissions,
    settings,
    savedAt: Date.now(),
  };

  try {
    const jsonStr = JSON.stringify(data);
    const dataSize = new Blob([jsonStr]).size;

    if (dataSize > MAX_STORAGE_SIZE) {
      return {
        success: false,
        error: `数据量过大 (${(dataSize / 1024 / 1024).toFixed(2)}MB)，超过最大限制 4MB，请清理数据或导出备份`,
      };
    }

    localStorage.setItem(STORAGE_KEY, jsonStr);

    const capacity = checkStorageCapacity();
    if (capacity.percentage > 80) {
      return {
        success: true,
        warning: `存储空间已使用 ${capacity.percentage.toFixed(1)}%，建议导出数据备份`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '保存数据时发生未知错误',
    };
  }
}

export const debouncedSave = debounce(
  (
    departments: DepartmentNode[],
    roles: Role[],
    permissions: PermissionNode[],
    settings: AppSettings,
    callback?: (result: { success: boolean; error?: string; warning?: string }) => void
  ) => {
    const result = saveToStorage(departments, roles, permissions, settings);
    if (callback) callback(result);
  },
  300
);

export function loadFromStorage(): {
  success: boolean;
  data?: PersistenceData;
  error?: string;
  needsMigration?: boolean;
  currentVersion?: string;
  storedVersion?: string;
} {
  if (!isLocalStorageAvailable()) {
    return {
      success: false,
      error: 'localStorage 不可用，将使用默认数据',
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {
        success: false,
        error: '未找到存储数据，将使用默认数据',
      };
    }

    const data = JSON.parse(stored) as PersistenceData;

    if (data.version !== STORAGE_VERSION) {
      return {
        success: true,
        data,
        needsMigration: true,
        currentVersion: STORAGE_VERSION,
        storedVersion: data.version,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '读取数据时发生未知错误，将使用默认数据',
    };
  }
}

export function clearStorage(): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function exportData(
  departments: DepartmentNode[],
  roles: Role[],
  permissions: PermissionNode[],
  settings: AppSettings
): string {
  const data: PersistenceData = {
    version: STORAGE_VERSION,
    departments,
    roles,
    permissions,
    settings,
    savedAt: Date.now(),
  };
  return JSON.stringify(data, null, 2);
}

export function downloadExport(data: string, filename: string): void {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importData(jsonStr: string): {
  success: boolean;
  data?: PersistenceData;
  error?: string;
  warnings?: string[];
} {
  try {
    const data = JSON.parse(jsonStr) as PersistenceData;

    const warnings: string[] = [];

    if (!data.version) {
      warnings.push('导入数据缺少版本信息，可能存在兼容性问题');
    } else if (data.version !== STORAGE_VERSION) {
      warnings.push(
        `导入数据版本 (${data.version}) 与当前版本 (${STORAGE_VERSION}) 不匹配，建议迁移数据`
      );
    }

    if (!data.departments || !Array.isArray(data.departments)) {
      return {
        success: false,
        error: '导入数据格式错误：缺少 departments 字段',
      };
    }
    if (!data.roles || !Array.isArray(data.roles)) {
      return {
        success: false,
        error: '导入数据格式错误：缺少 roles 字段',
      };
    }
    if (!data.permissions || !Array.isArray(data.permissions)) {
      return {
        success: false,
        error: '导入数据格式错误：缺少 permissions 字段',
      };
    }

    return { success: true, data, warnings };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '导入数据解析失败，请检查文件格式',
    };
  }
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

export function migrateData(
  oldData: PersistenceData,
  fromVersion: string,
  toVersion: string
): PersistenceData {
  console.log(`Migrating data from ${fromVersion} to ${toVersion}`);

  const migrated: PersistenceData = {
    ...oldData,
    version: toVersion,
    savedAt: Date.now(),
  };

  return migrated;
}

export function getStorageInfo(): {
  available: boolean;
  usedBytes: number;
  maxBytes: number;
  percentage: number;
  lastSaved?: number;
  version?: string;
} {
  const available = isLocalStorageAvailable();
  const capacity = checkStorageCapacity();

  let lastSaved: number | undefined;
  let version: string | undefined;

  if (available) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as PersistenceData;
        lastSaved = data.savedAt;
        version = data.version;
      } catch {
        // ignore
      }
    }
  }

  return {
    available,
    usedBytes: capacity.used,
    maxBytes: capacity.max,
    percentage: capacity.percentage,
    lastSaved,
    version,
  };
}
