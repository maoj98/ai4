<script setup lang="ts">
import { computed } from 'vue';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Check,
  Trash2,
  RefreshCw,
  Loader2,
  FolderOpen,
  CheckCircle2,
} from 'lucide-vue-next';
import type { PermissionConflict, PermissionNode } from '@/types';
import { findNodeById, getNodePath } from '@/utils/treeUtils';

interface Props {
  conflicts: PermissionConflict[];
  permissions: PermissionNode[];
  loading?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
});

const emit = defineEmits<{
  resolve: [conflictId: string, keepPermissionId: string];
  markResolved: [conflictId: string];
  clearResolved: [];
  detect: [];
}>();

const severityConfig = {
  high: {
    label: '严重',
    icon: ShieldX,
    iconClass: 'text-red-500 dark:text-red-400',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    borderClass: 'border-red-200 dark:border-red-800',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  },
  medium: {
    label: '中等',
    icon: AlertTriangle,
    iconClass: 'text-yellow-500 dark:text-yellow-400',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    borderClass: 'border-yellow-200 dark:border-yellow-800',
    badgeClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  },
  low: {
    label: '轻微',
    icon: Info,
    iconClass: 'text-blue-500 dark:text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    borderClass: 'border-blue-200 dark:border-blue-800',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  },
};

const typeConfig = {
  mutex: {
    label: '互斥',
    icon: ShieldAlert,
    description: '两个权限不能同时授予',
  },
  overlap: {
    label: '重叠',
    icon: ShieldCheck,
    description: '权限存在父子包含关系',
  },
  scope: {
    label: '范围',
    icon: AlertCircle,
    description: '数据权限范围重叠',
  },
};

const totalCount = computed(() => props.conflicts.length);

const unresolvedCount = computed(() =>
  props.conflicts.filter((c) => !c.resolved).length
);

const resolvedCount = computed(() =>
  props.conflicts.filter((c) => c.resolved).length
);

const groupedConflicts = computed(() => {
  const groups: Record<string, PermissionConflict[]> = {
    high: [],
    medium: [],
    low: [],
  };

  for (const conflict of props.conflicts) {
    groups[conflict.severity].push(conflict);
  }

  return groups;
});

const unresolvedGroupedConflicts = computed(() => {
  const groups: Record<string, PermissionConflict[]> = {
    high: [],
    medium: [],
    low: [],
  };

  for (const conflict of props.conflicts) {
    if (!conflict.resolved) {
      groups[conflict.severity].push(conflict);
    }
  }

  return groups;
});

function getPermissionName(permissionId: string): string {
  const node = findNodeById(permissionId, props.permissions);
  return node?.name || '未知权限';
}

function getPermissionPath(permissionId: string): string[] {
  const pathIds = getNodePath(permissionId, props.permissions);
  return pathIds
    .map((id) => findNodeById(id, props.permissions)?.name)
    .filter((n): n is string => n !== undefined);
}

function handleResolve(conflictId: string, keepPermissionId: string): void {
  if (props.disabled || props.loading) return;
  emit('resolve', conflictId, keepPermissionId);
}

function handleMarkResolved(conflictId: string): void {
  if (props.disabled || props.loading) return;
  emit('markResolved', conflictId);
}

function handleClearResolved(): void {
  if (props.disabled || props.loading) return;
  emit('clearResolved');
}

function handleDetect(): void {
  if (props.disabled || props.loading) return;
  emit('detect');
}
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <ShieldAlert :size="20" class="text-orange-500 dark:text-orange-400" />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">权限冲突检测</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              共 {{ totalCount }} 个冲突，
              <span class="text-red-500 dark:text-red-400 font-medium">{{ unresolvedCount }} 个未解决</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            :disabled="disabled || loading || resolvedCount === 0"
            @click="handleClearResolved"
          >
            <Trash2 :size="16" />
            清除已解决
          </button>
          <button
            class="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            :disabled="disabled || loading"
            @click="handleDetect"
          >
            <Loader2 v-if="loading" :size="16" class="animate-spin" />
            <RefreshCw v-else :size="16" />
            检测冲突
          </button>
        </div>
      </div>

      <div class="flex items-center gap-4 mt-4">
        <div
          v-for="severity in ['high', 'medium', 'low'] as const"
          :key="severity"
          class="flex items-center gap-2"
        >
          <component
            :is="severityConfig[severity].icon"
            :size="16"
            :class="severityConfig[severity].iconClass"
          />
          <span class="text-sm text-gray-600 dark:text-gray-300">
            {{ severityConfig[severity].label }}:
          </span>
          <span
            :class="[
              'px-2 py-0.5 text-xs font-medium rounded-full',
              severityConfig[severity].badgeClass,
            ]"
          >
            {{ unresolvedGroupedConflicts[severity].length }}
          </span>
        </div>
      </div>
    </div>

    <div
      v-if="totalCount === 0"
      class="py-16 flex flex-col items-center justify-center text-center"
    >
      <div class="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
        <CheckCircle2 :size="40" class="text-green-500 dark:text-green-400" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        暂无权限冲突
      </h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
        当前选择的权限组合没有冲突。点击"检测冲突"按钮可重新检测。
      </p>
    </div>

    <div v-else class="p-4 space-y-6 max-h-[600px] overflow-y-auto">
      <template v-for="severity in ['high', 'medium', 'low'] as const" :key="severity">
        <div v-if="unresolvedGroupedConflicts[severity].length > 0">
          <div class="flex items-center gap-2 mb-3">
            <div
              :class="[
                'w-6 h-6 rounded-full flex items-center justify-center',
                severityConfig[severity].bgClass,
              ]"
            >
              <component
                :is="severityConfig[severity].icon"
                :size="14"
                :class="severityConfig[severity].iconClass"
              />
            </div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ severityConfig[severity].label }}冲突
            </h3>
            <span
              :class="[
                'px-2 py-0.5 text-xs font-medium rounded-full',
                severityConfig[severity].badgeClass,
              ]"
            >
              {{ unresolvedGroupedConflicts[severity].length }}
            </span>
          </div>

          <div class="space-y-3">
            <div
              v-for="conflict in unresolvedGroupedConflicts[severity]"
              :key="conflict.id"
              :class="[
                'rounded-lg border p-4 transition-all hover:shadow-md',
                severityConfig[conflict.severity].borderClass,
                'bg-white dark:bg-gray-800',
              ]"
            >
              <div class="flex items-start gap-3">
                <div
                  :class="[
                    'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                    severityConfig[conflict.severity].bgClass,
                  ]"
                >
                  <component
                    :is="typeConfig[conflict.type].icon"
                    :size="20"
                    :class="severityConfig[conflict.severity].iconClass"
                  />
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-2">
                    <span
                      :class="[
                        'px-2 py-0.5 text-xs font-medium rounded-full',
                        severityConfig[conflict.severity].badgeClass,
                      ]"
                    >
                      {{ typeConfig[conflict.type].label }}
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {{ typeConfig[conflict.type].description }}
                    </span>
                  </div>

                  <p class="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    {{ conflict.description }}
                  </p>

                  <div class="space-y-2 mb-4">
                    <div class="flex items-start gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <span class="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded">
                        A
                      </span>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ getPermissionName(conflict.permissionA) }}
                          </span>
                        </div>
                        <div class="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <FolderOpen :size="12" />
                          <span class="truncate">
                            {{ getPermissionPath(conflict.permissionA).join(' / ') }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center justify-center py-1">
                      <div class="w-px h-4 bg-gray-200 dark:bg-gray-600" />
                    </div>

                    <div class="flex items-start gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <span class="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded">
                        B
                      </span>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ getPermissionName(conflict.permissionB) }}
                          </span>
                        </div>
                        <div class="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <FolderOpen :size="12" />
                          <span class="truncate">
                            {{ getPermissionPath(conflict.permissionB).join(' / ') }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 flex-wrap">
                    <button
                      class="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      :disabled="disabled || loading"
                      @click="handleResolve(conflict.id, conflict.permissionA)"
                    >
                      <Check :size="14" />
                      保留 A
                    </button>
                    <button
                      class="px-3 py-1.5 text-xs font-medium text-white bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      :disabled="disabled || loading"
                      @click="handleResolve(conflict.id, conflict.permissionB)"
                    >
                      <Check :size="14" />
                      保留 B
                    </button>
                    <button
                      class="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      :disabled="disabled || loading"
                      @click="handleMarkResolved(conflict.id)"
                    >
                      <CheckCircle2 :size="14" />
                      标记为已解决
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div
        v-if="resolvedCount > 0"
        class="pt-4 border-t border-gray-200 dark:border-gray-700"
      >
        <div class="flex items-center gap-2 mb-3">
          <div class="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 :size="14" class="text-green-500 dark:text-green-400" />
          </div>
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
            已解决
          </h3>
          <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
            {{ resolvedCount }}
          </span>
        </div>

        <div class="space-y-2">
          <div
            v-for="conflict in conflicts.filter((c) => c.resolved)"
            :key="conflict.id"
            class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 opacity-60"
          >
            <div class="flex items-center gap-3">
              <CheckCircle2 :size="18" class="text-green-500 dark:text-green-400 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {{ conflict.description }}
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {{ getPermissionName(conflict.permissionA) }} ↔ {{ getPermissionName(conflict.permissionB) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
