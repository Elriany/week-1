import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ApprovalStatusBadge from './ApprovalStatusBadge.vue';

describe('ApprovalStatusBadge.vue', () => {
  it('renders status text correctly', () => {
    const wrapper = mount(ApprovalStatusBadge, {
      props: { status: 'APPROVED' }
    });
    expect(wrapper.text()).toBe('APPROVED');
    expect(wrapper.classes()).toContain('APPROVED');
  });

  it('emits filter-status event when clicked if clickable prop is true', async () => {
    const wrapper = mount(ApprovalStatusBadge, {
      props: { status: 'PENDING', clickable: true }
    });
    await wrapper.trigger('click');
    expect(wrapper.emitted('filter-status')).toBeTruthy();
    expect(wrapper.emitted('filter-status')![0]).toEqual(['PENDING']);
  });
});
