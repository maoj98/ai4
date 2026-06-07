<script setup lang="ts">
import { computed, ref } from 'vue';
import { Search, ChevronDown, Maximize2, Minimize2 } from 'lucide-vue-next';
import TreeNode from './TreeNode.vue';
import type { TreeNode as TreeNodeType } from '@/types';
import { debounce } from '@/utils/searchUtils';

interface Props {
  data: TreeNodeType[];
  showCheckbox?: boolean;
  showIcon?: boolean;
  showSearch?: boolean;
  showToolbar?: boolean;
  searchPlaceholder?: string;
  searchFields?: Array<keyof TreeNodeType>;
  nodeType?: 'department' | 'permission';
  checkedIds?: Set<string>;
  indeterminateIds?: Set<string>;
  selectedId?: string | null;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showCheckbox: false,
  showIcon: true,
  showSearch: true,
  showToolbar: true,
  searchPlaceholder: '搜索...',
  searchFields: () => ['name'] as Array<keyof TreeNodeType>,
  nodeType: 'department',
  checkedIds: () => new Set(),
  indeterminateIds: () => new Set(),
  selectedId: null,
  disabled: false,
});

const emit = defineEmits<{
  'update:checkedIds': [ids: Set<string>];
  'update:selectedId': [id: string | null];
  toggleExpand: [nodeId: string];
  toggleCheck: [nodeId: string];
  select: [nodeId: string];
  search: [keyword: string];
}>();

const searchKeyword = ref('');
const matchedIds = ref<Set<string>>(new Set());
const expandedIds = ref<Set<string>>(new Set());
const isAllExpanded = ref(false);

const filteredData = computed(() => {
  if (!searchKeyword.value.trim()) return props.data;
  return props.data;
});

const resultCount = computed(() => matchedIds.value.size);

const debouncedSearch = debounce((keyword: string) => {
  searchKeyword.value = keyword;
  emit('search', keyword);
}, 300);

function handleSearchInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  debouncedSearch(target.value);
}

function clearSearch(): void {
  searchKeyword.value = '';
  matchedIds.value = new Set();
  emit('search', '');
}

function handleToggleExpand(nodeId: string): void {
  if (expandedIds.value.has(nodeId)) {
    expandedIds.value.delete(nodeId);
  } else {
    expandedIds.value.add(nodeId);
  }
  emit('toggleExpand', nodeId);
}

function handleToggleCheck(nodeId: string): void {
  emit('toggleCheck', nodeId);
}

function handleSelect(nodeId: string): void {
  emit('select', nodeId);
  emit('update:selectedId', nodeId);
}

function toggleExpandAll(): void {
  isAllExpanded.value = !isAllExpanded.value;
  expandedIds.value = new Set();
}

function expandAll(): void {
  function collectIds(nodes: TreeNodeType[]): void {
    for (const node of nodes) {
      if (node.children.length > 0) {
        expandedIds.value.add(node.id);
        collectIds(node.children);
      }
    }
  }
  collectIds(props.data);
  isAllExpanded.value = true;
}

function collapseAll(): void {
  expandedIds.value = new Set();
  isAllExpanded.value = false;
}
</script>

<template>
  <div class="tree-view flex flex-col h-full">
    <div v-if="showSearch" class="p-3 border-b border-gray-200">
      <div class="relative">
        <Search
          :size="18"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          :value="searchKeyword"
          :placeholder="searchPlaceholder"
          class="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      <div v-if="searchKeyword && resultCount > 0" class="mt-2 text-xs text-gray-500">
        找到 {{ resultCount }} 个匹配项
      </div>
    </div>

    <div v-if="showToolbar" class="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
      <span class="text-xs text-gray-500">
        共 {{ data.length }} 个根节点
      </span>
      <div class="flex items-center gap-1">
        <button
          class="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
          title="全部展开"
          @click="expandAll"
        >
          <Maximize2 :size="16" />
        </button>
        <button
          class="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
          title="全部折叠"
          @click="collapseAll"
        >
          <Minimize2 :size="16" />
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-2">
      <div v-if="data.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
        <ChevronDown :size="48" class="mb-2 opacity-50" />
        <span class="text-sm">暂无数据</span>
      </div>
      <div v-else>
        <TreeNode
          v-for="node in filteredData"
          :key="node.id"
          :node="node"
          :level="1"
          :show-checkbox="showCheckbox"
          :show-icon="showIcon"
          :search-keyword="searchKeyword"
          :matched-ids="matchedIds"
          :expanded-ids="expandedIds"
          :checked-ids="checkedIds"
          :indeterminate-ids="indeterminateIds"
          :selected-id="selectedId"
          :node-type="nodeType"
          :disabled="disabled"
          @toggle-expand="handleToggleExpand"
          @toggle-check="handleToggleCheck"
          @select="handleSelect"
        />
      </div>
    </div>
  </div>
</template>


