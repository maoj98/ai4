<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Building2,
  Users,
  User,
  Hash,
  Maximize2,
  Minimize2,
  MoreVertical,
  Plus,
  Edit,
  Trash2,
} from 'lucide-vue-next';
import type { DepartmentNode } from '@/types';
import { useDepartmentStore } from '@/stores/department';
import { highlightText } from '@/utils/searchUtils';
import { debounce } from '@/utils/searchUtils';
import { defineComponent, h, type PropType } from 'vue';

interface Props {
  showSearch?: boolean;
  showToolbar?: boolean;
  showCheckbox?: boolean;
  disabled?: boolean;
  selectedId?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  showSearch: true,
  showToolbar: true,
  showCheckbox: false,
  disabled: false,
  selectedId: null,
});

const emit = defineEmits<{
  select: [nodeId: string];
  'update:selectedId': [nodeId: string | null];
}>();

const departmentStore = useDepartmentStore();

const searchKeyword = ref('');
const contextMenuNodeId = ref<string | null>(null);
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });

const departments = computed(() => departmentStore.departments);
const treeState = computed(() => departmentStore.treeState);
const searchResultCount = computed(() => departmentStore.searchResultCount);

const debouncedSearch = debounce((keyword: string) => {
  departmentStore.setSearchKeyword(keyword);
}, 300);

function handleSearchInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  searchKeyword.value = target.value;
  debouncedSearch(target.value);
}

function clearSearch(): void {
  searchKeyword.value = '';
  departmentStore.clearSearch();
}

function handleToggleExpand(nodeId: string): void {
  departmentStore.toggleExpand(nodeId);
}

function handleSelect(nodeId: string): void {
  if (props.disabled) return;
  departmentStore.selectNode(nodeId);
  emit('select', nodeId);
  emit('update:selectedId', nodeId);
}

function handleToggleCheck(nodeId: string): void {
  if (props.disabled) return;
  departmentStore.toggleCheck(nodeId);
}

function expandAll(): void {
  departmentStore.expandAll();
}

function collapseAll(): void {
  departmentStore.collapseAll();
}

function handleContextMenu(event: MouseEvent, nodeId: string): void {
  if (props.disabled) return;
  event.preventDefault();
  event.stopPropagation();
  contextMenuNodeId.value = nodeId;
  contextMenuPosition.value = { x: event.clientX, y: event.clientY };
  showContextMenu.value = true;
}

function closeContextMenu(): void {
  showContextMenu.value = false;
  contextMenuNodeId.value = null;
}

function handleAddChild(): void {
  if (contextMenuNodeId.value) {
    departmentStore.openAddModal(contextMenuNodeId.value);
  }
  closeContextMenu();
}

function handleEdit(): void {
  if (contextMenuNodeId.value) {
    departmentStore.openEditModal(contextMenuNodeId.value);
  }
  closeContextMenu();
}

function handleDelete(): void {
  if (contextMenuNodeId.value) {
    departmentStore.deleteDepartment(contextMenuNodeId.value);
  }
  closeContextMenu();
}

function getHighlightedName(name: string): string {
  if (!treeState.value.searchKeyword.trim()) return name;
  return highlightText(name, treeState.value.searchKeyword);
}

function isNodeExpanded(node: DepartmentNode): boolean {
  return node.expanded;
}

function isNodeSelected(nodeId: string): boolean {
  return props.selectedId !== null
    ? props.selectedId === nodeId
    : treeState.value.selectedId === nodeId;
}

function isNodeMatched(nodeId: string): boolean {
  return treeState.value.matchedIds.has(nodeId);
}

function isNodeChecked(nodeId: string): boolean {
  return treeState.value.checkedIds.has(nodeId);
}

function isNodeIndeterminate(nodeId: string): boolean {
  return treeState.value.indeterminateIds.has(nodeId);
}

watch(
  () => props.selectedId,
  (newVal) => {
    if (newVal !== undefined && newVal !== treeState.value.selectedId) {
      departmentStore.selectNode(newVal);
    }
  }
);

document.addEventListener('click', closeContextMenu);

const DepartmentTreeNode = defineComponent({
  name: 'DepartmentTreeNode',
  props: {
    node: {
      type: Object as PropType<DepartmentNode>,
      required: true,
    },
    showCheckbox: Boolean,
    disabled: Boolean,
    getHighlightedName: {
      type: Function as PropType<(name: string) => string>,
      required: true,
    },
    isNodeExpanded: {
      type: Function as PropType<(node: DepartmentNode) => boolean>,
      required: true,
    },
    isNodeSelected: {
      type: Function as PropType<(nodeId: string) => boolean>,
      required: true,
    },
    isNodeMatched: {
      type: Function as PropType<(nodeId: string) => boolean>,
      required: true,
    },
    isNodeChecked: {
      type: Function as PropType<(nodeId: string) => boolean>,
      required: true,
    },
    isNodeIndeterminate: {
      type: Function as PropType<(nodeId: string) => boolean>,
      required: true,
    },
    onToggleExpand: {
      type: Function as PropType<(nodeId: string) => void>,
      required: true,
    },
    onSelect: {
      type: Function as PropType<(nodeId: string) => void>,
      required: true,
    },
    onToggleCheck: {
      type: Function as PropType<(nodeId: string) => void>,
      required: true,
    },
    onContextMenu: {
      type: Function as PropType<(event: MouseEvent, nodeId: string) => void>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const node = props.node;
      const levelIndent = `${(node.level - 1) * 24 + 8}px`;
      const hasChildren = node.children.length > 0;
      const selected = props.isNodeSelected(node.id);
      const matched = props.isNodeMatched(node.id);
      const expanded = props.isNodeExpanded(node);
      const checked = props.isNodeChecked(node.id);
      const indeterminate = props.isNodeIndeterminate(node.id);

      return h('div', { class: ['tree-node-container group', props.disabled ? 'opacity-60' : ''] }, [
        h(
          'div',
          {
            class: [
              'flex items-center gap-2 py-2 px-2 rounded-md transition-all duration-200',
              selected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50',
              matched ? 'bg-yellow-50' : '',
            ],
            style: { paddingLeft: levelIndent },
            onClick: () => props.onSelect(node.id),
            onContextmenu: (e: MouseEvent) => props.onContextMenu(e, node.id),
          },
          [
            h('div', { class: 'flex items-center gap-1 min-w-0 flex-1' }, [
              hasChildren
                ? h(
                    'span',
                    {
                      class: 'flex-shrink-0 p-0.5 rounded hover:bg-gray-200 cursor-pointer transition-colors',
                      onClick: (e: Event) => {
                        e.stopPropagation();
                        props.onToggleExpand(node.id);
                      },
                    },
                    [
                      h(expanded ? ChevronDown : ChevronRight, {
                        size: 16,
                        class: 'text-gray-500 transition-transform duration-200',
                      }),
                    ]
                  )
                : h('span', { class: 'w-5 flex-shrink-0' }),

              props.showCheckbox
                ? h(
                    'span',
                    {
                      class: 'flex-shrink-0',
                      onClick: (e: Event) => e.stopPropagation(),
                    },
                    [
                      h('input', {
                        type: 'checkbox',
                        checked,
                        indeterminate,
                        disabled: props.disabled,
                        class: 'w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500',
                        onChange: () => props.onToggleCheck(node.id),
                      }),
                    ]
                  )
                : null,

              h(
                'span',
                { class: 'flex-shrink-0' },
                [
                  h(Building2, {
                    size: 18,
                    class: selected ? 'text-blue-600' : 'text-blue-500',
                  }),
                ]
              ),

              h('div', { class: 'flex-1 min-w-0' }, [
                h('div', { class: 'flex items-center gap-2' }, [
                  h('span', {
                    class: [
                      'text-sm truncate',
                      selected ? 'font-medium text-gray-900' : 'text-gray-700',
                      matched ? 'font-medium' : '',
                    ],
                    innerHTML: props.getHighlightedName(node.name),
                  }),
                  h(
                    'span',
                    { class: 'flex items-center gap-1 text-xs text-gray-400 flex-shrink-0' },
                    [
                      h(Hash, { size: 12 }),
                      h('span', { class: 'truncate max-w-[80px]' }, node.code),
                    ]
                  ),
                ]),
                h('div', { class: 'flex items-center gap-3 mt-0.5 text-xs text-gray-400' }, [
                  node.memberCount !== undefined
                    ? h('span', { class: 'flex items-center gap-1' }, [
                        h(Users, { size: 12 }),
                        h('span', `${node.memberCount} 人`),
                      ])
                    : null,
                  node.leader
                    ? h('span', { class: 'flex items-center gap-1' }, [
                        h(User, { size: 12 }),
                        h('span', { class: 'truncate max-w-[100px]' }, node.leader),
                      ])
                    : null,
                ]),
              ]),

              !props.disabled
                ? h(
                    'button',
                    {
                      class: 'flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 text-gray-500 transition-all',
                      title: '更多操作',
                      onClick: (e: MouseEvent) => {
                        e.stopPropagation();
                        props.onContextMenu(e, node.id);
                      },
                    },
                    [h(MoreVertical, { size: 16 })]
                  )
                : null,
            ]),
          ]
        ),

        hasChildren && expanded
          ? h(
              'div',
              { class: 'overflow-hidden transition-all duration-300' },
              node.children.map((child) =>
                h(DepartmentTreeNode, {
                key: child.id,
                node: child,
                showCheckbox: props.showCheckbox,
                disabled: props.disabled,
                getHighlightedName: props.getHighlightedName,
                isNodeExpanded: props.isNodeExpanded,
                isNodeSelected: props.isNodeSelected,
                isNodeMatched: props.isNodeMatched,
                isNodeChecked: props.isNodeChecked,
                isNodeIndeterminate: props.isNodeIndeterminate,
                onToggleExpand: props.onToggleExpand,
                onSelect: props.onSelect,
                onToggleCheck: props.onToggleCheck,
                onContextMenu: props.onContextMenu,
              })
              )
            )
          : null,
      ]);
    };
  },
});
</script>

<template>
  <div class="department-tree flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
    <div v-if="showSearch" class="p-3 border-b border-gray-200">
      <div class="relative">
        <Search
          :size="18"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          :value="searchKeyword"
          placeholder="搜索部门名称或编码..."
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
      <div v-if="searchKeyword && searchResultCount > 0" class="mt-2 text-xs text-gray-500">
        找到 {{ searchResultCount }} 个匹配项
      </div>
    </div>

    <div v-if="showToolbar" class="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
      <span class="text-xs text-gray-500">
        共 {{ departments.length }} 个根部门
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
      <div v-if="departments.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
        <Building2 :size="48" class="mb-2 opacity-50" />
        <span class="text-sm">暂无部门数据</span>
      </div>
      <div v-else>
        <DepartmentTreeNode
          v-for="node in departments"
          :key="node.id"
          :node="node"
          :show-checkbox="showCheckbox"
          :disabled="disabled"
          :get-highlighted-name="getHighlightedName"
          :is-node-expanded="isNodeExpanded"
          :is-node-selected="isNodeSelected"
          :is-node-matched="isNodeMatched"
          :is-node-checked="isNodeChecked"
          :is-node-indeterminate="isNodeIndeterminate"
          :on-toggle-expand="handleToggleExpand"
          :on-select="handleSelect"
          :on-toggle-check="handleToggleCheck"
          :on-context-menu="handleContextMenu"
        />
      </div>
    </div>

    <teleport to="body">
      <div
        v-if="showContextMenu"
        class="fixed z-50 min-w-[140px] bg-white rounded-md shadow-lg border border-gray-200 py-1"
        :style="{ left: `${contextMenuPosition.x}px`, top: `${contextMenuPosition.y}px` }"
        @click.stop
      >
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          @click="handleAddChild"
        >
          <Plus :size="14" />
          <span>添加子部门</span>
        </button>
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          @click="handleEdit"
        >
          <Edit :size="14" />
          <span>编辑部门</span>
        </button>
        <div class="border-t border-gray-200 my-1"></div>
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          @click="handleDelete"
        >
          <Trash2 :size="14" />
          <span>删除部门</span>
        </button>
      </div>
    </teleport>
  </div>
</template>
