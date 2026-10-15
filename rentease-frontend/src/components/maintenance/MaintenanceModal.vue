<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>Report Maintenance Issue</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <ion-item>
        <ion-input label="Category" placeholder="Plumbing / Electrical" v-model="issue.category"></ion-input>
      </ion-item>
      <ion-item>
        <ion-input label="Problem Description" placeholder="Describe issue" v-model="issue.description"></ion-input>
      </ion-item>
      <ion-button expand="block" class="ion-margin-top" @click="submitIssue">Send Request</ion-button>
    </ion-card-content>
  </ion-card>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonInput, IonButton } from '@ionic/vue';
const issue = ref({ category: '', description: '' });
const submitIssue = () => { alert('Maintenance request sent.'); };
</script>