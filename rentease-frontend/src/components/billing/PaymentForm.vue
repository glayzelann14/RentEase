<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>Submit Payment Record</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <ion-item>
        <ion-input label="Amount Paid" type="number" v-model="payment.amount"></ion-input>
      </ion-item>
      <ion-item>
        <ion-select label="Payment Method" v-model="payment.method">
          <ion-select-option value="GCash">GCash</ion-select-option>
          <ion-select-option value="Bank Transfer">Bank Transfer</ion-select-option>
          <ion-select-option value="Cash">Cash</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-input label="Reference No." placeholder="GC123456" v-model="payment.referenceNo"></ion-input>
      </ion-item>
      <ion-button expand="block" class="ion-margin-top" @click="submitPayment">Submit Payment</ion-button>
    </ion-card-content>
  </ion-card>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonInput, IonSelect, IonSelectOption, IonButton } from '@ionic/vue';
const payment = ref({ amount: 9700, method: 'GCash', referenceNo: '' });
const submitPayment = () => { alert('Payment submitted for verification.'); };
</script>