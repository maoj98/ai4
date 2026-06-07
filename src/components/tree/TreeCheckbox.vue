<script setup lang="ts">
import { computed } from 'vue';
import { Check, Minus } from 'lucide-vue-next';

interface Props {
  modelValue?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  indeterminate: false,
  disabled: false,
  size: 'md',
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  change: [value: boolean];
}>();

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  return sizes[props.size];
});

const iconSize = computed(() => {
  const sizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };
  return sizes[props.size];
});

function handleClick(): void {
  if (props.disabled) return;
  const newValue = !props.modelValue;
  emit('update:modelValue', newValue);
  emit('change', newValue);
}
</script>

<template>
  <button
    type="button"
    role="checkbox"
    :aria-checked="indeterminate ? 'mixed' : modelValue"
    :aria-disabled="disabled"
    :class="[
      'inline-flex items-center justify-center rounded border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
      sizeClasses,
      modelValue && !indeterminate
        ? 'bg-blue-600 border-blue-600 text-white'
        : indeterminate
        ? 'bg-blue-600 border-blue-600 text-white'
        : 'bg-white border-gray-300 hover:border-blue-400',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    ]"
    @click="handleClick"
  >
    <Check
      v-if="modelValue && !indeterminate"
      :size="iconSize"
      stroke-width="3"
      class="animate-in zoom-in-50 duration-150"
    />
    <Minus
      v-else-if="indeterminate"
      :size="iconSize"
      stroke-width="3"
      class="animate-in zoom-in-50 duration-150"
    />
  </button>
</template>
