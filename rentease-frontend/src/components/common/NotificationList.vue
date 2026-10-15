<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>Notifications</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <ion-list>
        <ion-item>
          <ion-label>Your payment for October was verified.</ion-label>
        </ion-item>
      </ion-list>
    </ion-card-content>
  </ion-card>
</template>
<script setup lang="ts">
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel } from '@ionic/vue';
</script>