<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronRight, ChevronDown, Building2, Shield, Folder, File } from 'lucide-vue-next';
import TreeCheckbox from './TreeCheckbox.vue';
import type { DepartmentNode, PermissionNode, TreeNode } from '@/types';
import { highlightText } from '@/utils/searchUtils';

interface Props {
  node: TreeNode;
  level?: number;
  showCheckbox?: boolean;
  showIcon?: boolean;
  searchKeyword?: string;
  matchedIds?: Set<string>;
  expandedIds?: Set<string>;
  checkedIds?: Set<string>;
  indeterminateIds?: Set<string>;
  selectedId?: string | null;
  selectable?: boolean;
  nodeType?: 'department' | 'permission';
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  level: 1,
  showCheckbox: false,
  showIcon: true,
  searchKeyword: '',
  matchedIds: () => new Set(),
  expandedIds: () => new Set(),
  checkedIds: () => new Set(),
  indeterminateIds: () => new Set(),
  selectedId: null,
  selectable: true,
  nodeType: 'department',
  disabled: false,
});

const emit = defineEmits<{
  toggleExpand: [nodeId: string];
  toggleCheck: [nodeId: string];
  select: [nodeId: string];
}>();

const isExpanded = ref(false);

const nodeIcon = computed(() => {
  if (props.nodeType === 'permission') {
    const permNode = props.node as PermissionNode;
    const icons = {
      menu: Folder,
      button: File,
      api: Shield,
      data: Shield,
    };
    return icons[permNode.type] || Folder;
  }
  return Building2;
});

const isChecked = computed(() => props.checkedIds.has(props.node.id));
const isIndeterminate = computed(() => props.indeterminateIds.has(props.node.id));
const isMatched = computed(() => props.matchedIds.has(props.node.id));
const isSelected = computed(() => props.selectedId === props.node.id);
const hasChildren = computed(() => props.node.children.length > 0);

const highlightedName = computed(() => {
  if (!props.searchKeyword.trim()) return props.node.name;
  return highlightText(props.node.name, props.searchKeyword);
});

const levelIndent = computed(() => {
  return `${(props.level - 1) * 24}px`;
});

const expandIcon = computed(() => {
  return isExpanded.value || props.expandedIds.has(props.node.id) ? ChevronDown : ChevronRight;
});

function handleToggleExpand(): void {
  if (!hasChildren.value) return;
  isExpanded.value = !isExpanded.value;
  emit('toggleExpand', props.node.id);
}

function handleCheck(checked: boolean): void {
  if (props.disabled || (props.node as PermissionNode).disabled) return;
  emit('toggleCheck', props.node.id);
}

function handleSelect(): void {
  if (!props.selectable) return;
  emit('select', props.node.id);
}

function getNodeTypeLabel(): string {
  if (props.nodeType === 'permission') {
    const permNode = props.node as PermissionNode;
    const labels = {
      menu: '菜单',
      button: '按钮',
      api: '接口',
      data: '数据',
    };
    return labels[permNode.type] || '';
  }
  const deptNode = props.node as DepartmentNode;
  return deptNode.memberCount ? `${deptNode.memberCount}人` : '';
}

function isNodeExpanded(): boolean {
  if ('expanded' in props.node) {
    return (props.node as DepartmentNode).expanded;
  }
  return isExpanded.value || props.expandedIds.has(props.node.id);
}
</script>

<template>
  <div class="tree-node">
    <div
      :class="[
        'flex items-center gap-2 py-1.5 px-2 rounded-md transition-all duration-200 group',
        isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50',
        isMatched ? 'bg-yellow-50' : '',
        disabled ? 'opacity-60' : '',
      ]"
      :style="{ paddingLeft: levelIndent }"
      @click="handleSelect"
    >
      <div class="flex items-center gap-1 min-w-0 flex-1">
        <span
          v-if="hasChildren"
          class="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 cursor-pointer transition-colors"
          @click.stop="handleToggleExpand"
        >
          <component
            :is="expandIcon"
            :size="16"
            class="text-gray-500 transition-transform duration-200"
            :class="{ 'rotate-90': isNodeExpanded() }"
          />
        </span>
        <span v-else class="w-5 flex-shrink-0"></span>

        <span
          v-if="showCheckbox"
          class="flex-shrink-0"
          @click.stop
        >
          <TreeCheckbox
            :model-value="isChecked"
            :indeterminate="isIndeterminate"
            :disabled="disabled || (node as PermissionNode).disabled"
            size="sm"
            @change="handleCheck"
          />
        </span>

        <span v-if="showIcon" class="flex-shrink-0">
          <component
            :is="nodeIcon"
            :size="18"
            :class="[
              isSelected ? 'text-blue-600' : 'text-gray-500',
              nodeType === 'permission' ? 'text-purple-500' : 'text-blue-500',
            ]"
          />
        </span>

        <span
          class="text-sm truncate flex-1 min-w-0"
          :class="[
            isSelected ? 'font-medium text-gray-900' : 'text-gray-700',
            isMatched ? 'font-medium' : '',
          ]"
          v-html="highlightedName"
        ></span>

        <span
          v-if="getNodeTypeLabel()"
          class="flex-shrink-0 text-xs px-2 py-0.5 rounded-full"
          :class="[
            nodeType === 'permission'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-gray-100 text-gray-600',
          ]"
        >
          {{ getNodeTypeLabel() }}
        </span>

        <span
          v-if="nodeType === 'permission' && (node as PermissionNode).inherited"
          class="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"
        >
          继承
        </span>

        <span
          v-if="nodeType === 'permission' && (node as PermissionNode).conflictingPermissions.length > 0"
          class="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700"
        >
          !
        </span>
      </div>
    </div>

    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[1000px]"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 max-h-[1000px]"
      leave-to-class="opacity-0 max-h-0"
    >
      <div v-if="hasChildren && isNodeExpanded()" class="overflow-hidden">
        <TreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :level="level + 1"
          :show-checkbox="showCheckbox"
          :show-icon="showIcon"
          :search-keyword="searchKeyword"
          :matched-ids="matchedIds"
          :expanded-ids="expandedIds"
          :checked-ids="checkedIds"
          :indeterminate-ids="indeterminateIds"
          :selected-id="selectedId"
          :selectable="selectable"
          :node-type="nodeType"
          :disabled="disabled"
          @toggle-expand="(id) => emit('toggleExpand', id)"
          @toggle-check="(id) => emit('toggleCheck', id)"
          @select="(id) => emit('select', id)"
        />
      </div>
    </transition>
  </div>
</template>
