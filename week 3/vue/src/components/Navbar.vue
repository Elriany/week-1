<template>
  <header class="navbar" v-if="currentUser">
    <router-link to="/approvals" class="navbar-brand">
      ⚡ Approval Management System
    </router-link>
    <div class="navbar-user">
      <span>
        <strong>{{ currentUser.name }}</strong> ({{ currentUser.email }})
        <span class="role-badge">{{ currentUser.role }}</span>
      </span>
      <button class="btn-logout" @click="handleLogout">Logout</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { currentUser, logout } = useAuth();

function handleLogout() {
  logout();
  router.push('/login');
}
</script>
