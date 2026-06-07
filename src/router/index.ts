import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '@/pages/Dashboard.vue';
import DepartmentView from '@/pages/DepartmentView.vue';
import RoleView from '@/pages/RoleView.vue';
import PermissionView from '@/pages/PermissionView.vue';
import AuthView from '@/pages/AuthView.vue';

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: Dashboard,
    meta: { title: '仪表盘' },
  },
  {
    path: '/departments',
    name: 'departments',
    component: DepartmentView,
    meta: { title: '部门管理' },
  },
  {
    path: '/roles',
    name: 'roles',
    component: RoleView,
    meta: { title: '角色管理' },
  },
  {
    path: '/permissions',
    name: 'permissions',
    component: PermissionView,
    meta: { title: '权限管理' },
  },
  {
    path: '/auth',
    name: 'auth',
    component: AuthView,
    meta: { title: '授权管理' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '权限管理系统'} - 企业级权限管理`;
  next();
});

export default router;
