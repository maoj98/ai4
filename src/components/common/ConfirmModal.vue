<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle, Loader2 } from 'lucide-vue-next';

interface Props {
  visible: boolean;
  title?: string;
  content?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'success' | 'warning' | 'danger';
  closable?: boolean;
  maskClosable?: boolean;
  loading?: boolean;
  showFooter?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '提示',
  content: '',
  confirmText: '确认',
  cancelText: '取消',
  type: 'info',
  closable: true,
  maskClosable: true,
  loading: false,
  showFooter: true,
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
  open: [];
  close: [];
}>();

const typeConfig = {
  info: {
    icon: Info,
    iconClass: 'text-blue-500 dark:text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    confirmClass: 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700',
  },
  success: {
    icon: CheckCircle,
    iconClass: 'text-green-500 dark:text-green-400',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    confirmClass: 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-yellow-500 dark:text-yellow-400',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    confirmClass: 'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700',
  },
  danger: {
    icon: AlertCircle,
    iconClass: 'text-red-500 dark:text-red-400',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    confirmClass: 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700',
  },
};

const config = typeConfig[props.type];

function handleConfirm(): void {
  if (props.loading) return;
  emit('confirm');
}

function handleCancel(): void {
  if (props.loading) return;
  emit('cancel');
  emit('close');
}

function handleClose(): void {
  if (props.loading) return;
  if (props.closable) {
    emit('cancel');
    emit('close');
  }
}

function handleMaskClick(): void {
  if (props.loading) return;
  if (props.maskClosable) {
    emit('cancel');
    emit('close');
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && props.visible && props.closable && !props.loading) {
    emit('cancel');
    emit('close');
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      emit('open');
      document.addEventListener('keydown', handleKeydown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    }
  }
);

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <transition name="modal-overlay" appear>
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="handleMaskClick"
        />
        <transition name="modal-content" appear>
          <div
            v-if="visible"
            class="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="title"
          >
            <button
              v-if="closable"
              class="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
              :disabled="loading"
              @click="handleClose"
            >
              <X :size="20" />
            </button>

            <div class="p-6">
              <div class="flex items-start gap-4">
                <div
                  :class="[
                    'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center',
                    config.bgClass,
                  ]"
                >
                  <component
                    :is="config.icon"
                    :size="24"
                    :class="config.iconClass"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <h3
                    class="text-lg font-semibold text-gray-900 dark:text-white pr-8"
                    id="modal-title"
                  >
                    {{ title }}
                  </h3>
                  <p
                    v-if="content"
                    class="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
                  >
                    {{ content }}
                  </p>
                  <slot name="content" />
                </div>
              </div>
            </div>

            <div
              v-if="showFooter"
              class="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700"
            >
              <slot name="footer" :confirm="handleConfirm" :cancel="handleCancel">
                <button
                  class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="loading"
                  @click="handleCancel"
                >
                  {{ cancelText }}
                </button>
                <button
                  :class="[
                    'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2',
                    config.confirmClass,
                  ]"
                  :disabled="loading"
                  @click="handleConfirm"
                >
                  <Loader2
                    v-if="loading"
                    :size="16"
                    class="animate-spin"
                  />
                  {{ confirmText }}
                </button>
              </slot>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay-enter-active,
.modal-overlay-leave-active {
  transition: opacity 0.2s ease;
}
.modal-overlay-enter-from,
.modal-overlay-leave-to {
  opacity: 0;
}

.modal-content-enter-active,
.modal-content-leave-active {
  transition: all 0.2s ease;
}
.modal-content-enter-from,
.modal-content-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}
</style>
