<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>Maintenance Requests</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <ion-list>
        <ion-item>
          <ion-label>
            <h3>Unit 101 - Plumbing</h3>
            <p>Problem: Shower not working (Medium Priority)</p>
            <p>Status: In Progress</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-card-content>
  </ion-card>
</template>
<script setup lang="ts">
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel } from '@ionic/vue';
</script>