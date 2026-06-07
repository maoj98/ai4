<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  LayoutDashboard,
  Building2,
  Shield,
  UserCog,
  Settings,
  Bell,
  Menu,
  X,
  Moon,
  Sun,
  Download,
  Upload,
  RotateCcw,
  ChevronRight,
  Users,
  KeyRound,
} from 'lucide-vue-next';
import { useAppStore } from '@/stores/app';
import { useTheme } from '@/composables/useTheme';
import { usePersistence } from '@/composables/usePersistence';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const { isDark, toggleTheme } = useTheme();

const {
  handleExport: exportData,
  handleImport: handleFileImport,
} = usePersistence({
  getDepartments: () => appStore.departments,
  getRoles: () => appStore.roles,
  getPermissions: () => appStore.permissions,
  getSettings: () => appStore.settings,
  onImport: (data) => {
    appStore.departments = data.departments;
    appStore.roles = data.roles;
    appStore.permissions = data.permissions;
    appStore.settings = data.settings;
    appStore.triggerSave();
    appStore.showNotificationMsg('success', '数据导入成功');
  },
});

const sidebarCollapsed = computed(() => appStore.settings.sidebarCollapsed);

const menuItems = [
  { path: '/', name: '仪表盘', icon: LayoutDashboard },
  { path: '/departments', name: '部门管理', icon: Building2 },
  { path: '/roles', name: '角色管理', icon: UserCog },
  { path: '/permissions', name: '权限管理', icon: Shield },
  { path: '/auth', name: '授权管理', icon: KeyRound },
];

function toggleSidebar() {
  appStore.updateSettings({ sidebarCollapsed: !sidebarCollapsed.value });
}

async function handleImportClick() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      await handleFileImport(file);
    }
  };
  input.click();
}

function handleReset() {
  if (confirm('确定要重置所有数据吗？此操作不可恢复！')) {
    appStore.resetToDefaults();
  }
}

function handleExport() {
  exportData('permission_system_data');
}
</script>

<template>
  <div
    class="app-container min-h-screen flex flex-col"
    :class="{ 'theme-dark': isDark, 'theme-light': !isDark }"
  >
    <!-- 顶部导航栏 -->
    <header class="app-header bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-14 flex items-center justify-between px-4 flex-shrink-0 z-50">
      <div class="flex items-center gap-4">
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          @click="toggleSidebar"
        >
          <Menu v-if="sidebarCollapsed" ize="20" class="text-gray-600 dark:text-gray-300" />
          <X v-else ize="20" class="text-gray-600 dark:text-gray-300" />
        </button>
        <div class="flex items-center gap-2">
          <Shield :size="24" class="text-blue-600" />
          <h1
            class="text-lg font-bold text-gray-800 dark:text-white transition-all duration-300"
            :class="{ 'w-0 opacity-0 overflow-hidden': sidebarCollapsed }"
          >
            权限管理系统
          </h1>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
          title="导入数据"
          @click="handleImportClick"
        >
          <Upload :size="18" class="text-gray-600 dark:text-gray-300" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="导出数据"
          @click="handleExport"
        >
          <Download :size="18" class="text-gray-600 dark:text-gray-300" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="重置数据"
          @click="handleReset"
        >
          <RotateCcw :size="18" class="text-gray-600 dark:text-gray-300" />
        </button>
        <div class="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
          title="通知"
        >
          <Bell :size="18" class="text-gray-600 dark:text-gray-300" />
          <span
            v-if="appStore.notification"
            class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"
          />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="切换主题"
          @click="toggleTheme"
        >
          <Moon v-if="!isDark" :size="18" class="text-gray-600" />
          <Sun v-else :size="18" class="text-yellow-400" />
        </button>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- 侧边栏 -->
      <aside
        class="sidebar bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 transition-all duration-300 overflow-hidden"
        :class="sidebarCollapsed ? 'w-16' : 'w-56'"
      >
        <nav class="py-4 px-2">
          <div
            v-for="item in menuItems"
            :key="item.path"
            class="nav-item mb-1"
          >
            <router-link
              :to="item.path"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group"
              :class="[
                route.path === item.path
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
              ]"
            >
              <component :is="item.icon" ize="20" class="flex-shrink-0" />
              <span
                class="text-sm font-medium whitespace-nowrap transition-all duration-300"
                :class="{ 'w-0 opacity-0 overflow-hidden': sidebarCollapsed }"
              >
                {{ item.name }}
              </span>
              <ChevronRight
                v-if="route.path === item.path && !sidebarCollapsed"
                :size="16"
                class="ml-auto"
              />
            </router-link>
          </div>
        </nav>

        <div
          class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300"
          :class="{ 'opacity-0 pointer-events-none': sidebarCollapsed }"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              <Users ize="20" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-800 dark:text-white truncate">系统管理员</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 truncate">admin@company.com</div>
            </div>
          </div>
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="main-content flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- 通知提示 -->
    <transition name="slide-up">
      <div
        v-if="appStore.notification"
        class="fixed bottom-4 right-4 z-50 max-w-md w-full sm:w-96"
      >
        <div
          class="rounded-lg shadow-lg p-4 flex items-start gap-3"
          :class="{
            'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800':
              appStore.notification.type === 'success',
            'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800':
              appStore.notification.type === 'error',
            'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800':
              appStore.notification.type === 'warning',
          }"
        >
          <div class="flex-1">
            <p
              class="text-sm font-medium"
              :class="{
                'text-green-800 dark:text-green-200': appStore.notification.type === 'success',
                'text-red-800 dark:text-red-200': appStore.notification.type === 'error',
                'text-yellow-800 dark:text-yellow-200': appStore.notification.type === 'warning',
              }"
            >
              {{ appStore.notification.message }}
            </p>
          </div>
          <button
            class="p-1 hover:opacity-70 transition-opacity"
            @click="appStore.clearNotification"
          >
            <X :size="16" class="text-gray-500" />
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.theme-dark {
  color-scheme: dark;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 56px;
    bottom: 0;
    left: 0;
    z-index: 40;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }

  .sidebar.w-16 {
    transform: translateX(-100%);
  }

  .main-content {
    padding: 1rem !important;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .main-content {
    padding: 1.25rem !important;
  }
}

@media (min-width: 1025px) and (max-width: 1440px) {
  .main-content {
    padding: 1.5rem !important;
  }
}

@media (min-width: 1441px) and (max-width: 1920px) {
  .main-content {
    padding: 1.75rem !important;
  }
}

@media (min-width: 1921px) {
  .main-content {
    padding: 2rem !important;
  }
}
</style>