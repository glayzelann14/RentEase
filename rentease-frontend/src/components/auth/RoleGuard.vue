<template>
  <div>
    <slot v-if="isAuthorized" />
    <div v-else class="ion-padding ion-text-center">
      <h3>Access Denied</h3>
      <p>You do not have permission to view this section.</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{
  userRole: string;
  allowedRoles: string[];
}>();
const isAuthorized = computed(() => props.allowedRoles.includes(props.userRole));
</script>