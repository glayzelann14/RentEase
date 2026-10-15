<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>Rental Application Form</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <ion-item>
        <ion-input label="Full Name" placeholder="Juan Dela Cruz" v-model="form.name"></ion-input>
      </ion-item>
      <ion-item>
        <ion-input label="Contact Number" placeholder="09123456789" v-model="form.contact"></ion-input>
      </ion-item>
      <ion-item>
        <ion-input label="Employment Status" placeholder="Employed" v-model="form.employment"></ion-input>
      </ion-item>
      <ion-item>
        <ion-input label="Move-in Date" type="date" v-model="form.moveInDate"></ion-input>
      </ion-item>
      <ion-item>
        <ion-input label="Duration (Months)" type="number" v-model="form.duration"></ion-input>
      </ion-item>
      <ion-button expand="block" class="ion-margin-top" @click="submitApplication">Submit Application</ion-button>
    </ion-card-content>
  </ion-card>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonInput, IonButton } from '@ionic/vue';
const form = ref({
  name: '',
  contact: '',
  employment: '',
  moveInDate: '',
  duration: 12
});
const submitApplication = () => {
  console.log('Application submitted:', form.value);
  alert('Application submitted successfully!');
};
</script>