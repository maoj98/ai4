<script setup lang="ts">
import type { Component } from 'vue';
import { CheckSquare, Square, X } from 'lucide-vue-next';

interface ActionButton {
  key: string;
  label: string;
  icon?: Component;
  type?: 'primary' | 'success' | 'danger' | 'default';
  disabled?: boolean;
  danger?: boolean;
}

interface Props {
  selectedCount: number;
  totalCount?: number;
  actions: ActionButton[];
  showSelectAll?: boolean;
  showClear?: boolean;
  allSelected?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  totalCount: 0,
  showSelectAll: true,
  showClear: true,
  allSelected: false,
});

const emit = defineEmits<{
  selectAll: [];
  clearSelection: [];
  action: [key: string];
}>();

const typeClasses: Record<string, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
  success: 'bg-green-600 hover:bg-green-700 text-white border-transparent',
  danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
  default: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300',
};

function handleAction(key: string, disabled?: boolean): void {
  if (disabled) return;
  emit('action', key);
}

function handleSelectAll(): void {
  emit('selectAll');
}

function handleClearSelection(): void {
  emit('clearSelection');
}
</script>

<template>
  <div
    class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg px-4 py-3"
  >
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-4">
        <span class="text-sm text-gray-600">
          已选择
          <span class="font-semibold text-blue-600 mx-1">{{ selectedCount }}</span>
          项
          <span v-if="totalCount > 0" class="text-gray-400">
            / 共 {{ totalCount }} 项
          </span>
        </span>

        <div class="flex items-center gap-2">
          <button
            v-if="showSelectAll"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            @click="handleSelectAll"
          >
            <CheckSquare v-if="allSelected" :size="16" class="text-blue-600" />
            <Square v-else :size="16" class="text-gray-400" />
            {{ allSelected ? '取消全选' : '全选' }}
          </button>

          <button
            v-if="showClear && selectedCount > 0"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 hover:text-red-600 transition-colors"
            @click="handleClearSelection"
          >
            <X :size="16" />
            清空选择
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-for="action in actions"
          :key="action.key"
          type="button"
          :disabled="action.disabled"
          :class="[
            'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border rounded-md transition-colors',
            typeClasses[action.type || 'default'],
            action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ]"
          @click="handleAction(action.key, action.disabled)"
        >
          <component
            v-if="action.icon"
            :is="action.icon"
            :size="16"
          />
          {{ action.label }}
        </button>
      </div>
    </div>
  </div>
</template>
