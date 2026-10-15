<template>
  <ion-item>
    <ion-input label="Filter by Location" placeholder="e.g. Soriano Apartment" v-model="locationFilter"></ion-input>
  </ion-item>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { IonItem, IonInput } from '@ionic/vue';
const locationFilter = ref('');
</script>