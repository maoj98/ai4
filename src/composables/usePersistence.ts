import { ref } from 'vue';
import type { DepartmentNode, Role, PermissionNode, AppSettings } from '@/types';
import {
  exportData,
  downloadExport,
  importData,
  readFileAsText,
  getStorageInfo,
  clearStorage,
} from '@/utils/storage';

interface UsePersistenceOptions {
  getDepartments: () => DepartmentNode[];
  getRoles: () => Role[];
  getPermissions: () => PermissionNode[];
  getSettings: () => AppSettings;
  onImport?: (data: {
    departments: DepartmentNode[];
    roles: Role[];
    permissions: PermissionNode[];
    settings: AppSettings;
  }) => void;
  onReset?: () => void;
}

export function usePersistence(options: UsePersistenceOptions) {
  const { getDepartments, getRoles, getPermissions, getSettings, onImport, onReset } = options;

  const isExporting = ref(false);
  const isImporting = ref(false);
  const importFile = ref<File | null>(null);
  const importResult = ref<{
    success: boolean;
    message?: string;
    warnings?: string[];
  } | null>(null);

  const storageInfo = ref(getStorageInfo());

  function refreshStorageInfo(): void {
    storageInfo.value = getStorageInfo();
  }

  function handleExport(filename = 'permission_system_data'): boolean {
    try {
      isExporting.value = true;
      const data = exportData(
        getDepartments(),
        getRoles(),
        getPermissions(),
        getSettings()
      );
      downloadExport(data, filename);
      refreshStorageInfo();
      isExporting.value = false;
      return true;
    } catch (error) {
      isExporting.value = false;
      importResult.value = {
        success: false,
        message: error instanceof Error ? error.message : '导出失败',
      };
      return false;
    }
  }

  async function handleImport(file: File): Promise<boolean> {
    try {
      isImporting.value = true;
      importFile.value = file;
      importResult.value = null;

      const jsonStr = await readFileAsText(file);
      const result = importData(jsonStr);

      if (!result.success || !result.data) {
        importResult.value = {
          success: false,
          message: result.error || '导入失败',
        };
        isImporting.value = false;
        return false;
      }

      if (onImport) {
        onImport({
          departments: result.data.departments,
          roles: result.data.roles,
          permissions: result.data.permissions,
          settings: result.data.settings,
        });
      }

      importResult.value = {
        success: true,
        message: '数据导入成功',
        warnings: result.warnings,
      };

      refreshStorageInfo();
      isImporting.value = false;
      return true;
    } catch (error) {
      importResult.value = {
        success: false,
        message: error instanceof Error ? error.message : '导入失败',
      };
      isImporting.value = false;
      return false;
    }
  }

  function handleFileInput(event: Event): Promise<boolean> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return Promise.resolve(false);
    return handleImport(file);
  }

  function triggerFileInput(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => handleFileInput(e);
    input.click();
  }

  function handleReset(): boolean {
    try {
      if (confirm('确定要重置所有数据吗？此操作不可撤销！')) {
        clearStorage();
        if (onReset) {
          onReset();
        }
        refreshStorageInfo();
        importResult.value = {
          success: true,
          message: '数据已重置为默认值',
        };
        return true;
      }
      return false;
    } catch (error) {
      importResult.value = {
        success: false,
        message: error instanceof Error ? error.message : '重置失败',
      };
      return false;
    }
  }

  function clearImportResult(): void {
    importResult.value = null;
    importFile.value = null;
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatDate(timestamp?: number): string {
    if (!timestamp) return '暂无';
    return new Date(timestamp).toLocaleString('zh-CN');
  }

  return {
    isExporting,
    isImporting,
    importFile,
    importResult,
    storageInfo,
    handleExport,
    handleImport,
    handleFileInput,
    triggerFileInput,
    handleReset,
    clearImportResult,
    refreshStorageInfo,
    formatBytes,
    formatDate,
  };
}
