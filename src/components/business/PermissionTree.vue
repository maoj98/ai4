<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  Search,
  Maximize2,
  Minimize2,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
  Folder,
  File,
  Shield,
} from 'lucide-vue-next';
import TreeView from '@/components/tree/TreeView.vue';
import { usePermissionStore } from '@/stores/permission';
import type { PermissionNode } from '@/types';
import { debounce } from '@/utils/searchUtils';

interface Props {
  showSearch?: boolean;
  showToolbar?: boolean;
  showTypeFilter?: boolean;
  showStats?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showSearch: true,
  showToolbar: true,
  showTypeFilter: true,
  showStats: true,
  disabled: false,
});

const emit = defineEmits<{
  toggleCheck: [nodeId: string];
  select: [nodeId: string];
}>();

const permissionStore = usePermissionStore();

const searchKeyword = ref('');
const typeOptions: Array<{ value: 'all' | 'menu' | 'button' | 'api' | 'data'; label: string; icon: typeof Folder }> = [
  { value: 'all', label: '全部', icon: Square },
  { value: 'menu', label: '菜单', icon: Folder },
  { value: 'button', label: '按钮', icon: File },
  { value: 'api', label: '接口', icon: Shield },
  { value: 'data', label: '数据', icon: Shield },
];

const typeColors: Record<string, string> = {
  menu: 'bg-blue-100 text-blue-700',
  button: 'bg-green-100 text-green-700',
  api: 'bg-purple-100 text-purple-700',
  data: 'bg-orange-100 text-orange-700',
};

const selectedType = computed({
  get: () => permissionStore.selectedPermissionType,
  set: (val: 'all' | 'menu' | 'button' | 'api' | 'data') => {
    permissionStore.setPermissionType(val);
  },
});

const checkedCount = computed(() => permissionStore.checkedPermissionIds.length);

const checkedCountByType = computed(() => permissionStore.getCheckedCountByType());

const conflictCount = computed(() => permissionStore.unresolvedConflicts.length);

const searchResultCount = computed(() => permissionStore.searchResultCount);

const debouncedSearch = debounce((keyword: string) => {
  searchKeyword.value = keyword;
  permissionStore.setSearchKeyword(keyword);
}, 300);

function handleSearchInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  debouncedSearch(target.value);
}

function clearSearch(): void {
  searchKeyword.value = '';
  permissionStore.clearSearch();
}

function handleToggleCheck(nodeId: string): void {
  permissionStore.toggleCheck(nodeId);
  emit('toggleCheck', nodeId);
}

function handleSelect(nodeId: string): void {
  permissionStore.selectNode(nodeId);
  emit('select', nodeId);
}

function handleToggleExpand(nodeId: string): void {
  permissionStore.toggleExpand(nodeId);
}

function handleExpandAll(): void {
  permissionStore.expandAll();
}

function handleCollapseAll(): void {
  permissionStore.collapseAll();
}

function handleSelectAll(): void {
  permissionStore.selectAll();
}

function handleClearAll(): void {
  permissionStore.clearAll();
}

function collectExpandedIds(nodes: PermissionNode[]): Set<string> {
  const ids = new Set<string>();
  function traverse(nodeList: PermissionNode[]): void {
    for (const node of nodeList) {
      if (node.expanded === true) {
        ids.add(node.id);
      }
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  traverse(nodes);
  return ids;
}

const expandedIds = computed(() => collectExpandedIds(permissionStore.permissions));

const matchedIds = computed(() => permissionStore.treeState.matchedIds);

const checkedIds = computed(() => permissionStore.treeState.checkedIds);

const indeterminateIds = computed(() => permissionStore.treeState.indeterminateIds);

const selectedId = computed(() => permissionStore.treeState.selectedId);
</script>

<template>
  <div class="permission-tree flex flex-col h-full bg-white rounded-lg border border-gray-200">
    <div v-if="showSearch" class="p-3 border-b border-gray-200">
      <div class="relative">
        <Search
          :size="18"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          :value="searchKeyword"
          placeholder="搜索权限名称、编码、描述..."
          :disabled="disabled"
          class="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          @input="handleSearchInput"
        />
        <button
          v-if="searchKeyword"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          @click="clearSearch"
        >
          &times;
        </button>
      </div>
      <div v-if="searchKeyword && searchResultCount > 0" class="mt-2 text-xs text-gray-500">
        找到 {{ searchResultCount }} 个匹配项
      </div>
    </div>

    <div v-if="showTypeFilter" class="px-3 py-2 border-b border-gray-200 bg-gray-50">
      <div class="flex items-center gap-1 flex-wrap">
        <Filter :size="14" class="text-gray-400 mr-1" />
        <button
          v-for="option in typeOptions"
          :key="option.value"
          :class="[
            'flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors',
            selectedType === option.value
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ]"
          :disabled="disabled"
          @click="selectedType = option.value"
        >
          <component :is="option.icon" :size="12" />
          {{ option.label }}
        </button>
      </div>
    </div>

    <div v-if="showToolbar" class="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-200 text-gray-600 transition-colors"
          :disabled="disabled"
          @click="handleSelectAll"
        >
          <CheckSquare :size="14" />
          全选
        </button>
        <button
          class="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-200 text-gray-600 transition-colors"
          :disabled="disabled"
          @click="handleClearAll"
        >
          <Square :size="14" />
          清空
        </button>
      </div>
      <div class="flex items-center gap-1">
        <button
          class="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
          title="全部展开"
          :disabled="disabled"
          @click="handleExpandAll"
        >
          <Maximize2 :size="16" />
        </button>
        <button
          class="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
          title="全部折叠"
          :disabled="disabled"
          @click="handleCollapseAll"
        >
          <Minimize2 :size="16" />
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-hidden">
      <TreeView
        :data="permissionStore.filteredPermissions"
        :show-checkbox="true"
        :show-icon="true"
        :show-search="false"
        :show-toolbar="false"
        :node-type="'permission'"
        :checked-ids="checkedIds"
        :indeterminate-ids="indeterminateIds"
        :expanded-ids="expandedIds"
        :matched-ids="matchedIds"
        :selected-id="selectedId"
        :search-keyword="searchKeyword"
        :disabled="disabled"
        @toggle-expand="handleToggleExpand"
        @toggle-check="handleToggleCheck"
        @select="handleSelect"
      />
    </div>

    <div v-if="showStats" class="px-3 py-2 border-t border-gray-200 bg-gray-50">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 text-xs">
          <span class="text-gray-500">
            已选: <span class="font-medium text-gray-900">{{ checkedCount }}</span> 项
          </span>
          <div v-if="conflictCount > 0" class="flex items-center gap-1 text-red-600">
            <AlertTriangle :size="14" />
            <span>{{ conflictCount }} 个冲突</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span
            v-for="(count, type) in checkedCountByType"
            :key="type"
            v-show="count > 0"
            :class="['text-xs px-2 py-0.5 rounded-full', typeColors[type]]"
          >
            {{ typeOptions.find(o => o.value === (type as typeof typeOptions[number]['value']))?.label }}: {{ count }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
