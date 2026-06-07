<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  Search,
  Check,
  X,
  Shield,
  Key,
  Filter,
  ChevronDown,
  ChevronUp,
  Crown,
} from 'lucide-vue-next';
import type { Role } from '@/types';

interface Props {
  modelValue: string[];
  roles: Role[];
  placeholder?: string;
  disabled?: boolean;
  excludeSystemRoles?: boolean;
  showStatusFilter?: boolean;
  maxHeight?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '选择角色',
  disabled: false,
  excludeSystemRoles: true,
  showStatusFilter: true,
  maxHeight: '400px',
});

const emit = defineEmits<{
  'update:modelValue': [ids: string[]];
  'change': [ids: string[]];
}>();

const isOpen = ref(false);
const searchKeyword = ref('');
const statusFilter = ref<'all' | 'active' | 'disabled'>('all');

const selectedIds = ref<Set<string>>(new Set(props.modelValue));

watch(
  () => props.modelValue,
  (newVal) => {
    selectedIds.value = new Set(newVal);
  }
);

const filteredRoles = computed(() => {
  let result = [...props.roles];

  if (props.excludeSystemRoles) {
    result = result.filter((r) => !r.isSystem);
  }

  if (statusFilter.value !== 'all') {
    result = result.filter((r) => r.status === statusFilter.value);
  }

  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(
      (r) =>
        r.name.toLowerCase().includes(keyword) ||
        r.code.toLowerCase().includes(keyword)
    );
  }

  return result;
});

const selectableRoleIds = computed(() => {
  let result = props.roles;
  if (props.excludeSystemRoles) {
    result = result.filter((r) => !r.isSystem);
  }
  if (statusFilter.value !== 'all') {
    result = result.filter((r) => r.status === statusFilter.value);
  }
  return result.map((r) => r.id);
});

const isAllSelected = computed(() => {
  if (selectableRoleIds.value.length === 0) return false;
  return selectableRoleIds.value.every((id) => selectedIds.value.has(id));
});

const isIndeterminate = computed(() => {
  if (selectableRoleIds.value.length === 0) return false;
  const selectedCount = selectableRoleIds.value.filter((id) =>
    selectedIds.value.has(id)
  ).length;
  return selectedCount > 0 && selectedCount < selectableRoleIds.value.length;
});

const selectedCount = computed(() => selectedIds.value.size);

const selectedRoleNames = computed(() => {
  return props.roles
    .filter((r) => selectedIds.value.has(r.id))
    .map((r) => r.name);
});

function toggleDropdown(): void {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
}

function closeDropdown(): void {
  isOpen.value = false;
}

function updateSelection(): void {
  const ids = Array.from(selectedIds.value);
  emit('update:modelValue', ids);
  emit('change', ids);
}

function toggleRole(roleId: string): void {
  if (props.disabled) return;
  if (selectedIds.value.has(roleId)) {
    selectedIds.value.delete(roleId);
  } else {
    selectedIds.value.add(roleId);
  }
  updateSelection();
}

function toggleSelectAll(): void {
  if (props.disabled) return;
  if (isAllSelected.value) {
    for (const id of selectableRoleIds.value) {
      selectedIds.value.delete(id);
    }
  } else {
    for (const id of selectableRoleIds.value) {
      selectedIds.value.add(id);
    }
  }
  updateSelection();
}

function clearSelection(): void {
  if (props.disabled) return;
  selectedIds.value.clear();
  updateSelection();
}

function getStatusConfig(role: Role) {
  if (role.status === 'active') {
    return {
      label: '启用',
      bgClass: 'bg-green-100',
      textClass: 'text-green-700',
    };
  }
  return {
    label: '禁用',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
  };
}

function handleBackdropClick(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  if (!target.closest('.role-selector-wrapper')) {
    closeDropdown();
  }
}

watch(isOpen, (val) => {
  if (val) {
    document.addEventListener('click', handleBackdropClick);
  } else {
    document.removeEventListener('click', handleBackdropClick);
    searchKeyword.value = '';
  }
});
</script>

<template>
  <div class="role-selector-wrapper relative w-full">
    <div
      :class="[
        'relative flex items-center justify-between w-full px-3 py-2.5 border rounded-lg cursor-pointer transition-all duration-200 bg-white',
        isOpen
          ? 'border-blue-500 ring-2 ring-blue-100'
          : 'border-gray-300 hover:border-blue-400',
        disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : '',
      ]"
      @click="toggleDropdown"
    >
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <Shield :size="16" class="text-gray-400 flex-shrink-0" />
        <span
          v-if="selectedCount > 0"
          class="text-sm text-gray-900 truncate"
        >
          已选择 {{ selectedCount }} 个角色
        </span>
        <span
          v-else
          class="text-sm text-gray-400"
        >
          {{ placeholder }}
        </span>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <span
          v-if="selectedCount > 0"
          class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-blue-500 text-white text-xs font-medium rounded-full"
        >
          {{ selectedCount }}
        </span>
        <component
          :is="isOpen ? ChevronUp : ChevronDown"
          :size="16"
          class="text-gray-400"
        />
      </div>
    </div>

    <div
      v-if="isOpen"
      class="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
      @click.stop
    >
      <div class="p-3 border-b border-gray-100 space-y-3">
        <div class="relative">
          <Search
            :size="16"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            v-model="searchKeyword"
            type="text"
            class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="搜索角色名称或编码..."
            :disabled="disabled"
          />
        </div>

        <div class="flex items-center justify-between">
          <div
            v-if="showStatusFilter"
            class="flex items-center gap-2"
          >
            <Filter :size="14" class="text-gray-400" />
            <div class="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
              <button
                v-for="option in [
                  { value: 'all', label: '全部' },
                  { value: 'active', label: '启用' },
                  { value: 'disabled', label: '禁用' },
                ]"
                :key="option.value"
                type="button"
                :class="[
                  'px-2 py-1 text-xs font-medium rounded transition-colors',
                  statusFilter === option.value
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900',
                ]"
                :disabled="disabled"
                @click="statusFilter = option.value as 'all' | 'active' | 'disabled'"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <label
              :class="[
                'inline-flex items-center gap-1.5 cursor-pointer text-sm',
                disabled ? 'opacity-50 cursor-not-allowed' : 'text-gray-600 hover:text-blue-600',
              ]"
            >
              <div
                :class="[
                  'relative w-4 h-4 border-2 rounded flex items-center justify-center transition-all',
                  isAllSelected
                    ? 'bg-blue-600 border-blue-600'
                    : isIndeterminate
                    ? 'bg-blue-100 border-blue-600'
                    : 'border-gray-300',
                ]"
                @click="toggleSelectAll"
              >
                <Check
                  v-if="isAllSelected"
                  :size="10"
                  class="text-white"
                />
                <div
                  v-else-if="isIndeterminate"
                  class="w-2 h-0.5 bg-blue-600 rounded"
                />
              </div>
              <span>全选</span>
            </label>
            <button
              v-if="selectedCount > 0"
              type="button"
              class="text-xs text-gray-500 hover:text-red-600 transition-colors"
              :disabled="disabled"
              @click="clearSelection"
            >
              清空
            </button>
          </div>
        </div>
      </div>

      <div
        class="overflow-y-auto"
        :style="{ maxHeight: maxHeight }"
      >
        <div
          v-if="filteredRoles.length === 0"
          class="flex flex-col items-center justify-center py-12 text-gray-400"
        >
          <Shield :size="32" class="mb-2 opacity-50" />
          <p class="text-sm">暂无匹配的角色</p>
        </div>

        <div
          v-for="role in filteredRoles"
          :key="role.id"
          :class="[
            'flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 cursor-pointer transition-colors',
            selectedIds.has(role.id)
              ? 'bg-blue-50'
              : 'hover:bg-gray-50',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ]"
          @click="toggleRole(role.id)"
        >
          <div
            :class="[
              'w-5 h-5 border-2 rounded flex items-center justify-center flex-shrink-0 transition-all',
              selectedIds.has(role.id)
                ? 'bg-blue-600 border-blue-600'
                : 'border-gray-300',
            ]"
          >
            <Check
              v-if="selectedIds.has(role.id)"
              :size="14"
              class="text-white"
            />
          </div>

          <div
            :class="[
              'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
              role.isSystem
                ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                : 'bg-gradient-to-br from-blue-400 to-blue-600',
            ]"
          >
            <Shield :size="18" class="text-white" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900 truncate">
                {{ role.name }}
              </span>
              <Crown
                v-if="role.isSystem"
                :size="12"
                class="text-amber-500 flex-shrink-0"
              />
              <span
                :class="[
                  'inline-flex items-center text-xs px-1.5 py-0.5 rounded-full flex-shrink-0',
                  getStatusConfig(role).bgClass,
                  getStatusConfig(role).textClass,
                ]"
              >
                {{ getStatusConfig(role).label }}
              </span>
            </div>
            <div class="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
              <span class="truncate">编码: {{ role.code }}</span>
              <span class="flex items-center gap-1 flex-shrink-0">
                <Key :size="12" class="text-purple-500" />
                {{ role.permissionIds.length }} 权限
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="selectedCount > 0"
        class="px-3 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between"
      >
        <span class="text-sm text-gray-600">
          已选择
          <span class="font-medium text-blue-600">{{ selectedCount }}</span>
          个角色
        </span>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
            :disabled="disabled"
            @click="clearSelection"
          >
            清空
          </button>
          <button
            type="button"
            class="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            :disabled="disabled"
            @click="closeDropdown"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
