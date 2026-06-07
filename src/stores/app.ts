import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AppSettings, DepartmentNode, Role, PermissionNode } from '@/types';
import { loadFromStorage, debouncedSave, clearStorage, migrateData } from '@/utils/storage';
import { initialDepartments, initialRoles, initialPermissions, initialSettings } from '@/mock/initialData';
import { cloneTree } from '@/utils/treeUtils';

export const useAppStore = defineStore('app', () => {
  const departments = ref<DepartmentNode[]>([]);
  const roles = ref<Role[]>([]);
  const permissions = ref<PermissionNode[]>([]);
  const settings = ref<AppSettings>({ ...initialSettings });
  const loading = ref(false);
  const lastSaveResult = ref<{ success: boolean; error?: string; warning?: string } | null>(null);
  const notification = ref<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const isInitialized = computed(() => departments.value.length > 0);

  const totalDepartments = computed(() => {
    function count(nodes: DepartmentNode[]): number {
      let c = nodes.length;
      for (const node of nodes) {
        c += count(node.children);
      }
      return c;
    }
    return count(departments.value);
  });

  const totalRoles = computed(() => roles.value.length);
  const totalPermissions = computed(() => {
    function count(nodes: PermissionNode[]): number {
      let c = nodes.length;
      for (const node of nodes) {
        c += count(node.children);
      }
      return c;
    }
    return count(permissions.value);
  });

  function initialize(): { success: boolean; message?: string; needsMigration?: boolean } {
    loading.value = true;
    try {
      const result = loadFromStorage();

      if (result.success && result.data) {
        if (result.needsMigration && result.storedVersion && result.currentVersion) {
          const migrated = migrateData(result.data, result.storedVersion, result.currentVersion);
          departments.value = migrated.departments;
          roles.value = migrated.roles;
          permissions.value = migrated.permissions;
          settings.value = migrated.settings;
          loading.value = false;
          return { success: true, message: '数据已迁移到最新版本', needsMigration: false };
        }

        departments.value = result.data.departments;
        roles.value = result.data.roles;
        permissions.value = result.data.permissions;
        settings.value = result.data.settings;
        loading.value = false;
        return { success: true, message: '已从本地存储加载数据' };
      }

      departments.value = cloneTree(initialDepartments);
      roles.value = JSON.parse(JSON.stringify(initialRoles));
      permissions.value = cloneTree(initialPermissions);
      settings.value = { ...initialSettings };
      loading.value = false;
      return { success: true, message: result.error || '已加载初始数据' };
    } catch (error) {
      departments.value = cloneTree(initialDepartments);
      roles.value = JSON.parse(JSON.stringify(initialRoles));
      permissions.value = cloneTree(initialPermissions);
      settings.value = { ...initialSettings };
      loading.value = false;
      return { success: false, message: '加载数据失败，已使用默认数据' };
    }
  }

  function triggerSave(showNotification = true): void {
    debouncedSave(
      departments.value,
      roles.value,
      permissions.value,
      settings.value,
      (result) => {
        lastSaveResult.value = result;
        if (showNotification) {
          if (result.success) {
            if (result.warning) {
              showNotificationMsg('warning', result.warning);
            }
          } else {
            showNotificationMsg('error', result.error || '保存失败');
          }
        }
      }
    );
  }

  function saveImmediate(): { success: boolean; error?: string; warning?: string } {
    const result = loadFromStorage();
    if (result.success && result.data) {
      return {
        success: true,
      };
    }
    return result as { success: boolean; error?: string; warning?: string };
  }

  function resetToDefaults(): boolean {
    try {
      clearStorage();
      departments.value = cloneTree(initialDepartments);
      roles.value = JSON.parse(JSON.stringify(initialRoles));
      permissions.value = cloneTree(initialPermissions);
      settings.value = { ...initialSettings };
      showNotificationMsg('success', '已重置为默认数据');
      return true;
    } catch {
      showNotificationMsg('error', '重置失败');
      return false;
    }
  }

  function updateSettings(newSettings: Partial<AppSettings>): void {
    settings.value = { ...settings.value, ...newSettings };
    triggerSave(false);
  }

  function showNotificationMsg(type: 'success' | 'error' | 'warning', message: string): void {
    notification.value = { type, message };
    setTimeout(() => {
      notification.value = null;
    }, 3000);
  }

  function clearNotification(): void {
    notification.value = null;
  }

  return {
    departments,
    roles,
    permissions,
    settings,
    loading,
    lastSaveResult,
    notification,
    isInitialized,
    totalDepartments,
    totalRoles,
    totalPermissions,
    initialize,
    triggerSave,
    saveImmediate,
    resetToDefaults,
    updateSettings,
    showNotificationMsg,
    clearNotification,
  };
});
