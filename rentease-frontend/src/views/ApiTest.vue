
<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>RentEase API Test</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <h2>Backend Connection</h2>

      <p v-if="loading">Checking connection...</p>

      <p v-else-if="error">
        Connection failed: {{ error }}
      </p>

      <div v-else-if="result">
        <p>{{ result.message }}</p>
        <p>Database: {{ result.database }}</p>
        <p>Status: {{ result.status }}</p>
      </div>

      <ion-button @click="checkConnection">
        Test Again
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
} from '@ionic/vue';
import api from '../services/api';

const loading = ref(false);
const error = ref('');
const result = ref<{
  status: string;
  message: string;
  database: string;
} | null>(null);

async function checkConnection() {
  loading.value = true;
  error.value = '';
  result.value = null;

  try {
    const response = await api.get('/health');
    result.value = response.data;
  } catch (err) {
    error.value = err instanceof Error
      ? err.message
      : 'Unable to connect to the backend';
  } finally {
    loading.value = false;
  }
}

onMounted(checkConnection);
</script>
