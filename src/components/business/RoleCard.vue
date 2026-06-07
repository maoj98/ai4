<script setup lang="ts">
import { computed } from 'vue';
import {
  Shield,
  Users,
  Building2,
  Key,
  Edit3,
  Trash2,
  Settings,
  Check,
  X,
  Crown,
  GitBranch,
} from 'lucide-vue-next';
import type { Role } from '@/types';
import { useRoleStore } from '@/stores/role';

interface Props {
  role: Role;
  selectable?: boolean;
  selected?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  selectable: false,
  selected: false,
  disabled: false,
});

const emit = defineEmits<{
  click: [roleId: string];
  'update:selected': [value: boolean];
  edit: [roleId: string];
  delete: [roleId: string];
  configure: [roleId: string];
}>();

const statusConfig = computed(() => {
  if (props.role.status === 'active') {
    return {
      label: '启用',
      bgClass: 'bg-green-100',
      textClass: 'text-green-700',
      icon: Check,
    };
  }
  return {
    label: '禁用',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
    icon: X,
  };
});

const inheritFromRoleName = computed(() => {
  if (!props.role.inheritFromRole) return null;
  const roleStore = useRoleStore();
  const parentRole = roleStore.roles.find((r) => r.id === props.role.inheritFromRole);
  return parentRole?.name || null;
});

function handleCardClick(): void {
  if (props.disabled) return;
  emit('click', props.role.id);
}

function handleCheckboxChange(value: boolean): void {
  if (props.disabled) return;
  emit('update:selected', value);
}

function handleEdit(e: Event): void {
  e.stopPropagation();
  if (props.disabled) return;
  emit('edit', props.role.id);
}

function handleDelete(e: Event): void {
  e.stopPropagation();
  if (props.disabled || props.role.isSystem) return;
  emit('delete', props.role.id);
}

function handleConfigure(e: Event): void {
  e.stopPropagation();
  if (props.disabled) return;
  emit('configure', props.role.id);
}
</script>

<template>
  <div
    :class="[
      'group relative bg-white border rounded-xl p-4 transition-all duration-300 cursor-pointer overflow-hidden',
      selected
        ? 'border-blue-500 shadow-lg shadow-blue-100 ring-2 ring-blue-200'
        : 'border-gray-200 hover:border-blue-300 hover:shadow-md',
      disabled ? 'opacity-60 cursor-not-allowed' : '',
    ]"
    @click="handleCardClick"
  >
    <div
      v-if="role.isSystem"
      class="absolute top-0 right-0 bg-gradient-to-bl from-amber-500 to-amber-600 text-white text-xs px-2 py-0.5 rounded-bl-lg flex items-center gap-1"
    >
      <Crown :size="12" />
      系统角色
    </div>

    <div class="flex items-start gap-3">
      <div
        v-if="selectable"
        class="flex-shrink-0 mt-0.5"
        @click.stop
      >
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            :checked="selected"
            :disabled="disabled"
            class="sr-only peer"
            @change="handleCheckboxChange(($event.target as HTMLInputElement).checked)"
          />
          <div
            :class="[
              'w-5 h-5 border-2 rounded-md transition-all duration-200 flex items-center justify-center',
              selected
                ? 'bg-blue-600 border-blue-600'
                : 'border-gray-300 hover:border-blue-400',
              disabled ? 'opacity-50 cursor-not-allowed' : '',
            ]"
          >
            <Check
              v-if="selected"
              :size="14"
              class="text-white"
            />
          </div>
        </label>
      </div>

      <div
        :class="[
          'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center',
          role.isSystem
            ? 'bg-gradient-to-br from-amber-400 to-amber-600'
            : 'bg-gradient-to-br from-blue-400 to-blue-600',
        ]"
      >
        <Shield :size="24" class="text-white" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <h3
            class="text-base font-semibold text-gray-900 truncate"
            :class="{ 'text-blue-700': selected }"
          >
            {{ role.name }}
          </h3>
          <span
            :class="[
              'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
              statusConfig.bgClass,
              statusConfig.textClass,
            ]"
          >
            <component :is="statusConfig.icon" :size="12" />
            {{ statusConfig.label }}
          </span>
        </div>

        <p class="text-xs text-gray-500 mb-2">
          编码: {{ role.code }}
        </p>

        <p
          v-if="role.description"
          class="text-sm text-gray-600 line-clamp-2 mb-3"
        >
          {{ role.description }}
        </p>

        <div
          v-if="inheritFromRoleName"
          class="flex items-center gap-1.5 text-xs text-emerald-600 mb-3 bg-emerald-50 px-2 py-1 rounded-md"
        >
          <GitBranch :size="12" />
          <span>继承自: {{ inheritFromRoleName }}</span>
        </div>

        <div class="flex items-center gap-4 text-xs text-gray-500">
          <div class="flex items-center gap-1">
            <Key :size="14" class="text-purple-500" />
            <span>{{ role.permissionIds.length }} 权限</span>
          </div>
          <div class="flex items-center gap-1">
            <Building2 :size="14" class="text-blue-500" />
            <span>{{ role.departmentIds.length }} 部门</span>
          </div>
          <div class="flex items-center gap-1">
            <Users :size="14" class="text-green-500" />
            <span>{{ role.userIds.length }} 用户</span>
          </div>
        </div>
      </div>
    </div>

    <div
      class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      :class="{ 'opacity-100': selected }"
    >
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
        :disabled="disabled"
        @click="handleEdit"
      >
        <Edit3 :size="14" />
        编辑
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
        :disabled="disabled"
        @click="handleConfigure"
      >
        <Settings :size="14" />
        权限
      </button>
      <button
        type="button"
        :class="[
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
          role.isSystem || disabled
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:text-red-600 hover:bg-red-50',
        ]"
        :disabled="role.isSystem || disabled"
        @click="handleDelete"
      >
        <Trash2 :size="14" />
        删除
      </button>
    </div>

    <div
      v-if="selected"
      class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"
    />
  </div>
</template>
