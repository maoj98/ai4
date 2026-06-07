import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TreeCheckbox from '../TreeCheckbox.vue';
import { Check, Minus } from 'lucide-vue-next';

describe('TreeCheckbox', () => {
  describe('渲染测试', () => {
    it('未选中状态渲染', () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: false, indeterminate: false }
      });
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.attributes('aria-checked')).toBe('false');
      expect(wrapper.findComponent(Check).exists()).toBe(false);
      expect(wrapper.findComponent(Minus).exists()).toBe(false);
      expect(wrapper.classes()).toContain('bg-white');
      expect(wrapper.classes()).toContain('border-gray-300');
    });

    it('选中状态渲染', () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: true, indeterminate: false }
      });
      expect(wrapper.attributes('aria-checked')).toBe('true');
      expect(wrapper.findComponent(Check).exists()).toBe(true);
      expect(wrapper.findComponent(Minus).exists()).toBe(false);
      expect(wrapper.classes()).toContain('bg-blue-600');
      expect(wrapper.classes()).toContain('border-blue-600');
      expect(wrapper.classes()).toContain('text-white');
    });

    it('半选状态渲染', () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: false, indeterminate: true }
      });
      expect(wrapper.attributes('aria-checked')).toBe('mixed');
      expect(wrapper.findComponent(Check).exists()).toBe(false);
      expect(wrapper.findComponent(Minus).exists()).toBe(true);
      expect(wrapper.classes()).toContain('bg-blue-600');
      expect(wrapper.classes()).toContain('border-blue-600');
      expect(wrapper.classes()).toContain('text-white');
    });

    it('禁用状态渲染', () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: false, indeterminate: false, disabled: true }
      });
      expect(wrapper.attributes('aria-disabled')).toBe('true');
      expect(wrapper.classes()).toContain('opacity-50');
      expect(wrapper.classes()).toContain('cursor-not-allowed');
    });
  });

  describe('交互测试', () => {
    it('点击复选框触发 change 事件', async () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: false, indeterminate: false }
      });
      await wrapper.trigger('click');
      expect(wrapper.emitted('change')).toHaveLength(1);
      expect(wrapper.emitted('change')?.[0]).toEqual([true]);
    });

    it('点击复选框触发 update:modelValue 事件', async () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: false, indeterminate: false }
      });
      await wrapper.trigger('click');
      expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
    });

    it('禁用状态下点击不触发事件', async () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: false, indeterminate: false, disabled: true }
      });
      await wrapper.trigger('click');
      expect(wrapper.emitted('change')).toBeUndefined();
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });

    it('支持 v-model 绑定', async () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: false, 'onUpdate:modelValue': (v: boolean) => wrapper.setProps({ modelValue: v }) }
      });
      expect(wrapper.props('modelValue')).toBe(false);
      await wrapper.trigger('click');
      expect(wrapper.props('modelValue')).toBe(true);
      await wrapper.trigger('click');
      expect(wrapper.props('modelValue')).toBe(false);
    });
  });

  describe('样式测试', () => {
    it('未选中状态 CSS 类名正确', () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: false, indeterminate: false }
      });
      expect(wrapper.classes()).toContain('bg-white');
      expect(wrapper.classes()).toContain('border-gray-300');
      expect(wrapper.classes()).toContain('cursor-pointer');
      expect(wrapper.classes()).not.toContain('opacity-50');
    });

    it('选中状态 CSS 类名正确', () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: true, indeterminate: false }
      });
      expect(wrapper.classes()).toContain('bg-blue-600');
      expect(wrapper.classes()).toContain('border-blue-600');
      expect(wrapper.classes()).toContain('text-white');
    });

    it('半选状态 CSS 类名正确', () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: false, indeterminate: true }
      });
      expect(wrapper.classes()).toContain('bg-blue-600');
      expect(wrapper.classes()).toContain('border-blue-600');
      expect(wrapper.classes()).toContain('text-white');
    });

    it('禁用状态 CSS 类名正确', () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: false, indeterminate: false, disabled: true }
      });
      expect(wrapper.classes()).toContain('opacity-50');
      expect(wrapper.classes()).toContain('cursor-not-allowed');
    });

    it('选中状态显示 Check 图标', () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: true, indeterminate: false }
      });
      expect(wrapper.findComponent(Check).exists()).toBe(true);
      expect(wrapper.findComponent(Minus).exists()).toBe(false);
    });

    it('半选状态显示 Minus 图标', () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: false, indeterminate: true }
      });
      expect(wrapper.findComponent(Check).exists()).toBe(false);
      expect(wrapper.findComponent(Minus).exists()).toBe(true);
    });

    it('未选中状态不显示图标', () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: false, indeterminate: false }
      });
      expect(wrapper.findComponent(Check).exists()).toBe(false);
      expect(wrapper.findComponent(Minus).exists()).toBe(false);
    });

    it('不同 size 下尺寸类名正确', () => {
      const sizes = {
        sm: ['w-4', 'h-4'],
        md: ['w-5', 'h-5'],
        lg: ['w-6', 'h-6']
      } as const;

      Object.entries(sizes).forEach(([size, expectedClasses]) => {
        const wrapper = mount(TreeCheckbox, {
          props: { modelValue: false, indeterminate: false, size: size as 'sm' | 'md' | 'lg' }
        });
        expectedClasses.forEach(cls => {
          expect(wrapper.classes()).toContain(cls);
        });
      });
    });

    it('不同 size 下图标正常显示', () => {
      const sizes: ('sm' | 'md' | 'lg')[] = ['sm', 'md', 'lg'];

      sizes.forEach((size) => {
        const wrapper = mount(TreeCheckbox, {
          props: { modelValue: true, indeterminate: false, size }
        });
        expect(wrapper.findComponent(Check).exists()).toBe(true);
      });
    });
  });

  describe('Props 测试', () => {
    it('modelValue prop 生效', () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: true, indeterminate: false }
      });
      expect(wrapper.attributes('aria-checked')).toBe('true');
      expect(wrapper.findComponent(Check).exists()).toBe(true);
    });

    it('indeterminate prop 生效', () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: false, indeterminate: true }
      });
      expect(wrapper.attributes('aria-checked')).toBe('mixed');
      expect(wrapper.findComponent(Minus).exists()).toBe(true);
    });

    it('disabled prop 生效', () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: false, indeterminate: false, disabled: true }
      });
      expect(wrapper.attributes('aria-disabled')).toBe('true');
      expect(wrapper.classes()).toContain('opacity-50');
    });

    it('size prop 生效', () => {
      const wrapper = mount(TreeCheckbox, {
        props: { modelValue: false, indeterminate: false, size: 'sm' }
      });
      expect(wrapper.classes()).toContain('w-4');
      expect(wrapper.classes()).toContain('h-4');
    });
  });
});
