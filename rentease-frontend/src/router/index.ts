import {
  createRouter,
  createWebHistory,
} from '@ionic/vue-router';

import type { RouteRecordRaw } from 'vue-router';

import Signup from '@/components/auth/Signup.vue';
import Login from '@/components/auth/Login.vue';

import AdminDashboard from '@/views/AdminDashboard.vue';
import OwnerDashboard from '@/views/OwnerDashboard.vue';
import TenantDashboard from '@/views/TenantDashboard.vue';

import {
  restoreSession,
  dashboardPath,
} from '@/services/auth';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/signup',
    name: 'Signup',
    component: Signup,
    meta: { guestOnly: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { guestOnly: true },
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: {
      requiresAuth: true,
      allowedRole: 'admin',
    },
  },
  {
    path: '/owner',
    name: 'OwnerDashboard',
    component: OwnerDashboard,
    meta: {
      requiresAuth: true,
      allowedRole: 'owner',
    },
  },
  {
    path: '/tenant',
    name: 'TenantDashboard',
    component: TenantDashboard,
    meta: {
      requiresAuth: true,
      allowedRole: 'tenant',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async to => {
  try {
    const user = await restoreSession();

    if (to.meta.requiresAuth) {
      if (!user) {
        return {
          path: '/login',
          replace: true,
        };
      }

      if (to.meta.allowedRole !== user.role) {
        return {
          path: dashboardPath(user.role),
          replace: true,
        };
      }
    }

    if (to.meta.guestOnly && user) {
      return {
        path: dashboardPath(user.role),
        replace: true,
      };
    }

    return true;
  } catch {
    if (to.meta.requiresAuth) {
      return {
        path: '/login',
        query: { serverUnavailable: '1' },
        replace: true,
      };
    }

    return true;
  }
});

export default router;