<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Building2,
  Shield,
  Key,
  Users,
  Menu,
  MousePointerClick,
  Server,
  Database,
  Clock,
  UserPlus,
  Edit3,
  Trash2,
  Settings,
  ArrowRight,
  AlertTriangle,
  ShieldX,
  ChevronRight,
  Activity,
  Layers,
  UserCheck,
  ListChecks,
} from 'lucide-vue-next';
import { useAppStore } from '@/stores/app';
import { usePermissionStore } from '@/stores/permission';

const router = useRouter();
const appStore = useAppStore();
const permissionStore = usePermissionStore();

interface OperationRecord {
  id: string;
  type: 'create' | 'update' | 'delete' | 'grant';
  target: string;
  user: string;
  time: number;
  description: string;
}

const mockOperations = ref<OperationRecord[]>([
  {
    id: '1',
    type: 'create',
    target: '角色',
    user: '管理员',
    time: Date.now() - 1000 * 60 * 5,
    description: '创建了新角色"财务审核员"',
  },
  {
    id: '2',
    type: 'grant',
    target: '权限',
    user: '张三',
    time: Date.now() - 1000 * 60 * 15,
    description: '为"运营经理"角色分配了"订单管理"权限',
  },
  {
    id: '3',
    type: 'update',
    target: '部门',
    user: '李四',
    time: Date.now() - 1000 * 60 * 30,
    description: '更新了"技术研发部"的部门信息',
  },
  {
    id: '4',
    type: 'delete',
    target: '权限',
    user: '管理员',
    time: Date.now() - 1000 * 60 * 60,
    description: '删除了已过期的"数据导出"权限',
  },
  {
    id: '5',
    type: 'create',
    target: '用户',
    user: '王五',
    time: Date.now() - 1000 * 60 * 120,
    description: '添加了新用户"赵六"到"市场部"',
  },
]);

const activeUsers = ref(128);

const checkedCounts = computed(() => permissionStore.getCheckedCountByType());

const totalChecked = computed(() => {
  const counts = checkedCounts.value;
  return counts.menu + counts.button + counts.api + counts.data;
});

const permissionTypeConfig = {
  menu: {
    label: '菜单权限',
    icon: Menu,
    colorClass: 'text-blue-500 dark:text-blue-400',
    bgClass: 'bg-blue-500',
    bgLightClass: 'bg-blue-100 dark:bg-blue-900/30',
  },
  button: {
    label: '按钮权限',
    icon: MousePointerClick,
    colorClass: 'text-green-500 dark:text-green-400',
    bgClass: 'bg-green-500',
    bgLightClass: 'bg-green-100 dark:bg-green-900/30',
  },
  api: {
    label: '接口权限',
    icon: Server,
    colorClass: 'text-purple-500 dark:text-purple-400',
    bgClass: 'bg-purple-500',
    bgLightClass: 'bg-purple-100 dark:bg-purple-900/30',
  },
  data: {
    label: '数据权限',
    icon: Database,
    colorClass: 'text-orange-500 dark:text-orange-400',
    bgClass: 'bg-orange-500',
    bgLightClass: 'bg-orange-100 dark:bg-orange-900/30',
  },
};

const operationTypeConfig = {
  create: {
    label: '创建',
    icon: UserPlus,
    colorClass: 'text-green-500 dark:text-green-400',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
  },
  update: {
    label: '更新',
    icon: Edit3,
    colorClass: 'text-blue-500 dark:text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
  },
  delete: {
    label: '删除',
    icon: Trash2,
    colorClass: 'text-red-500 dark:text-red-400',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
  },
  grant: {
    label: '授权',
    icon: Key,
    colorClass: 'text-purple-500 dark:text-purple-400',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
  },
};

const quickActions = [
  {
    id: 'department',
    label: '部门管理',
    description: '管理组织架构和部门信息',
    icon: Building2,
    colorClass: 'text-blue-500 dark:text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    hoverBgClass: 'hover:bg-blue-50 dark:hover:bg-blue-900/50',
    path: '/departments',
  },
  {
    id: 'role',
    label: '角色管理',
    description: '创建和配置系统角色',
    icon: Shield,
    colorClass: 'text-purple-500 dark:text-purple-400',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    hoverBgClass: 'hover:bg-purple-50 dark:hover:bg-purple-900/50',
    path: '/roles',
  },
  {
    id: 'permission',
    label: '权限管理',
    description: '配置和分配权限资源',
    icon: Key,
    colorClass: 'text-green-500 dark:text-green-400',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    hoverBgClass: 'hover:bg-green-50 dark:hover:bg-green-900/50',
    path: '/permissions',
  },
  {
    id: 'batch',
    label: '批量授权',
    description: '为多个角色批量分配权限',
    icon: ListChecks,
    colorClass: 'text-orange-500 dark:text-orange-400',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    hoverBgClass: 'hover:bg-orange-50 dark:hover:bg-orange-900/50',
    path: '/batch-grant',
  },
];

const statCards = computed(() => [
  {
    id: 'departments',
    label: '部门总数',
    value: appStore.totalDepartments,
    icon: Building2,
    colorClass: 'text-blue-500 dark:text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    trend: '+2',
    trendUp: true,
  },
  {
    id: 'roles',
    label: '角色总数',
    value: appStore.totalRoles,
    icon: Shield,
    colorClass: 'text-purple-500 dark:text-purple-400',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    trend: '+5',
    trendUp: true,
  },
  {
    id: 'permissions',
    label: '权限总数',
    value: appStore.totalPermissions,
    icon: Key,
    colorClass: 'text-green-500 dark:text-green-400',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    trend: '+12',
    trendUp: true,
  },
  {
    id: 'users',
    label: '活跃用户',
    value: activeUsers.value,
    icon: UserCheck,
    colorClass: 'text-orange-500 dark:text-orange-400',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    trend: '+8%',
    trendUp: true,
  },
]);

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  return `${days} 天前`;
}

function getPercentage(count: number): number {
  if (totalChecked.value === 0) return 0;
  return Math.round((count / totalChecked.value) * 100);
}

function handleQuickAction(path: string): void {
  router.push(path);
}

onMounted(() => {
  if (permissionStore.autoDetectConflicts) {
    permissionStore.detectCurrentConflicts();
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          系统概览
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          查看权限管理系统的关键数据和运行状态
        </p>
      </div>

      <div
        v-if="permissionStore.highSeverityConflicts.length > 0"
        class="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ShieldX :size="20" class="text-red-500 dark:text-red-400" />
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
              权限冲突预警
            </h3>
            <p class="text-sm text-red-700 dark:text-red-400">
              检测到
              <span class="font-bold">{{ permissionStore.highSeverityConflicts.length }}</span>
              个高优先级权限冲突未解决，请及时处理以避免安全风险。
            </p>
          </div>
          <button
            class="flex-shrink-0 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
            @click="handleQuickAction('/permissions')"
          >
            立即处理
            <ChevronRight :size="16" />
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div
          v-for="stat in statCards"
          :key="stat.id"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between mb-4">
            <div
              :class="[
                'w-12 h-12 rounded-xl flex items-center justify-center',
                stat.bgClass,
              ]"
            >
              <component :is="stat.icon" :size="24" :class="stat.colorClass" />
            </div>
            <div
              :class="[
                'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                stat.trendUp
                  ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
                  : 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
              ]"
            >
              <Activity :size="12" />
              {{ stat.trend }}
            </div>
          </div>
          <div class="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {{ stat.value }}
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ stat.label }}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Layers :size="20" class="text-purple-500 dark:text-purple-400" />
              </div>
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  权限类型分布
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  已授权权限共 {{ totalChecked }} 个
                </p>
              </div>
            </div>
          </div>
          <div class="p-6 space-y-5">
            <div
              v-for="(config, type) in permissionTypeConfig"
              :key="type"
              class="space-y-2"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <component
                    :is="config.icon"
                    :size="16"
                    :class="config.colorClass"
                  />
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ config.label }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-gray-900 dark:text-white">
                    {{ checkedCounts[type as keyof typeof checkedCounts] }}
                  </span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    ({{ getPercentage(checkedCounts[type as keyof typeof checkedCounts]) }}%)
                  </span>
                </div>
              </div>
              <div class="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  :class="['h-full rounded-full transition-all duration-500', config.bgClass]"
                  :style="{ width: `${getPercentage(checkedCounts[type as keyof typeof checkedCounts])}%` }"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Clock :size="20" class="text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                    最近操作记录
                  </h2>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    系统最新操作日志
                  </p>
                </div>
              </div>
              <button
                class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
              >
                查看全部
                <ChevronRight :size="14" />
              </button>
            </div>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-700 max-h-[360px] overflow-y-auto">
            <div
              v-for="record in mockOperations"
              :key="record.id"
              class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <div class="flex items-start gap-3">
                <div
                  :class="[
                    'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5',
                    operationTypeConfig[record.type].bgClass,
                  ]"
                >
                  <component
                    :is="operationTypeConfig[record.type].icon"
                    :size="16"
                    :class="operationTypeConfig[record.type].colorClass"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <span class="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {{ record.description }}
                    </span>
                    <span class="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                      {{ formatTime(record.time) }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span class="flex items-center gap-1">
                      <Users :size="12" />
                      {{ record.user }}
                    </span>
                    <span class="text-gray-300 dark:text-gray-600">•</span>
                    <span
                      :class="[
                        'px-1.5 py-0.5 rounded text-xs font-medium',
                        operationTypeConfig[record.type].bgClass,
                        operationTypeConfig[record.type].colorClass,
                      ]"
                    >
                      {{ operationTypeConfig[record.type].label }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Settings :size="20" class="text-green-500 dark:text-green-400" />
              </div>
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  快捷操作
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  快速访问常用管理功能
                </p>
              </div>
            </div>
          </div>
          <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              v-for="action in quickActions"
              :key="action.id"
              :class="[
                'group flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left transition-all duration-200',
                action.hoverBgClass,
              ]"
              @click="handleQuickAction(action.path)"
            >
              <div
                :class="[
                  'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110',
                  action.bgClass,
                ]"
              >
                <component :is="action.icon" :size="24" :class="action.colorClass" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                    {{ action.label }}
                  </h3>
                  <ArrowRight
                    :size="16"
                    class="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-all group-hover:translate-x-1"
                  />
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ action.description }}
                </p>
              </div>
            </button>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <AlertTriangle :size="20" class="text-orange-500 dark:text-orange-400" />
              </div>
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  冲突状态
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  权限冲突检测结果
                </p>
              </div>
            </div>
          </div>
          <div class="p-6 space-y-6">
            <div class="grid grid-cols-2 gap-4">
              <div class="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                <div class="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {{ permissionStore.unresolvedConflicts.length }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  未解决冲突
                </div>
              </div>
              <div class="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <div class="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
                  {{ permissionStore.highSeverityConflicts.length }}
                </div>
                <div class="text-xs text-red-500 dark:text-red-400">
                  高优先级
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                严重程度分布
              </h4>
              <div class="space-y-2">
                <div class="flex items-center gap-3">
                  <div class="w-3 h-3 rounded-full bg-red-500" />
                  <span class="text-sm text-gray-600 dark:text-gray-400 flex-1">
                    严重
                  </span>
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {{
                      permissionStore.unresolvedConflicts.filter(
                        (c) => c.severity === 'high'
                      ).length
                    }}
                  </span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-3 h-3 rounded-full bg-yellow-500" />
                  <span class="text-sm text-gray-600 dark:text-gray-400 flex-1">
                    中等
                  </span>
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {{
                      permissionStore.unresolvedConflicts.filter(
                        (c) => c.severity === 'medium'
                      ).length
                    }}
                  </span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-3 h-3 rounded-full bg-blue-500" />
                  <span class="text-sm text-gray-600 dark:text-gray-400 flex-1">
                    轻微
                  </span>
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {{
                      permissionStore.unresolvedConflicts.filter(
                        (c) => c.severity === 'low'
                      ).length
                    }}
                  </span>
                </div>
              </div>
            </div>

            <button
              class="w-full px-4 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 rounded-lg transition-colors flex items-center justify-center gap-2"
              @click="handleQuickAction('/permissions')"
            >
              <ShieldX :size="16" />
              去处理冲突
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
