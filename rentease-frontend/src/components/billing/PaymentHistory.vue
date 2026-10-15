<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>Payment History</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <ion-list>
        <ion-item v-for="item in history" :key="item.month">
          <ion-label>
            <h3>{{ item.month }} - ₱{{ item.amount }}</h3>
            <p>Status: {{ item.status }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-card-content>
  </ion-card>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel } from '@ionic/vue';
const history = ref([
  { month: 'October 2026', amount: 9700, status: 'PAID' },
  { month: 'September 2026', amount: 9500, status: 'PAID' }
]);
</script>