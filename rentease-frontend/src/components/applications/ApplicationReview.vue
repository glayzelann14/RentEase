<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>Review Application</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <p><strong>Tenant:</strong> Juan Dela Cruz</p>
      <p><strong>Unit:</strong> Soriano Apartment - Unit 101</p>
      <p><strong>Employment:</strong> Employed</p>
      <ion-button color="success" size="small" @click="approve">Approve (Create Lease)</ion-button>
      <ion-button color="danger" size="small" @click="reject">Reject</ion-button>
    </ion-card-content>
  </ion-card>
</template>
<script setup lang="ts">
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton } from '@ionic/vue';
const approve = () => { alert('Application Approved & Lease Created!'); };
const reject = () => { alert('Application Rejected.'); };
</script>