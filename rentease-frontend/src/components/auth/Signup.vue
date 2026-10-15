<template>
  <ion-page>
    <ion-content class="portal">
      <div class="auth-layout">
        <div class="auth-container">
          <div class="brand-header">
            <span class="pill teal">RentEase Platform</span>
            <h1>Create Account</h1>
            <p class="subtitle">Set up your portal access to get started.</p>
          </div>
          
          <div class="panel">
            <form @submit.prevent="handleSignup">
              <label>
                Full Name
                <input 
                  type="text" 
                  placeholder="e.g. Yvette C. Nituma" 
                  v-model="fullName" 
                  required
                  maxlength="100"
                />
              </label>

              <label>
                Email Address
                <input 
                  type="email" 
                  placeholder="e.g. owner@example.com" 
                  v-model="email" 
                  required
                />
              </label>

              <label>
                Password
                <input 
                  type="password" 
                  placeholder="Create a secure password" 
                  v-model="password" 
                  required
                />
              </label>

              <label>
                Select Role
                <select v-model="selectedRole" required>
                  <option value="tenant">Tenant</option>
                  <option value="owner">Property Owner</option>
                </select>
              </label>

              <div v-if="errorMessage" class="form-error" role="alert">
                {{ errorMessage }}
              </div>

              <div class="dialog-actions">
                <button 
                  type="submit" 
                  class="button primary full-width"
                  :disabled="isLoading"
                >
                  <span v-if="isLoading">Creating account...</span>
                  <span v-else>Create Account</span>
                </button>
              </div>
            </form>

            <div class="auth-footer">
              <p>Already have an account? <router-link to="/login" class="text-button">Sign In</router-link></p>
            </div>
          </div>

          <div class="page-footer">
            <span>RentEase · Registration Module</span>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';

const router = useRouter();
const fullName = ref('');
const email = ref('');
const password = ref('');
const selectedRole = ref('tenant');
const isLoading = ref(false);
const errorMessage = ref('');

const handleSignup = async () => {
  errorMessage.value = '';
  if (!fullName.value || !email.value || !password.value || !selectedRole.value) {
    errorMessage.value = 'Please fill in all required fields.';
    return;
  }

  isLoading.value = true;

  try {
    const response = await fetch('http://localhost:5000/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: fullName.value.trim(),
        email: email.value.trim().toLowerCase(),
        password: password.value,
        role: selectedRole.value
      })
    });

    const data = await response.json();
    isLoading.value = false;

    if (response.ok && data.success) {
  alert(data.message || 'Account created successfully! Please sign in.');
  router.push('/login');

    } else {
      errorMessage.value = data.message || 'Registration failed.';
    }
  } catch (error) {
    isLoading.value = false;
    console.error('Signup error:', error);
    errorMessage.value = 'Hindi makakonekta sa server. Siguraduhing tumatakbo ang backend.';
  }
};
</script>

<style scoped>
.portal {
  color-scheme: light;
  --navy: #142b49;
  --muted: #52637a;
  --teal: #0b7068;
  --line: #e2e8f0;
  --ion-text-color: #142b49;
  --ion-background-color: #f4f7fb;
  color: #142b49;
  --background: #f4f7fb;
}
.auth-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 24px;
}
.auth-container {
  width: 100%;
  max-width: 440px;
}
.brand-header {
  text-align: center;
  margin-bottom: 24px;
}
.brand-header h1 {
  color: #142b49;
  margin: 10px 0 6px;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -.6px;
}
.subtitle {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}
.panel {
  background: #ffffff;
  color: #142b49;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 4px 20px rgb(20 43 73 / 4%);
}
label {
  display: block;
  font-size: 12px;
  font-weight: 650;
  margin-bottom: 18px;
  color: #142b49;
}
input, select {
  display: block;
  width: 100%;
  margin-top: 8px;
  border: 1px solid #d7e0eb;
  border-radius: 9px;
  padding: 11px 12px;
  background: #ffffff;
  color: #142b49;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  box-sizing: border-box;
}
input::placeholder {
  color: #64748b;
  opacity: 1;
}
.pill {
  display: inline-block;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .4px;
}
.pill.teal {
  color: #0b7068;
  background: #e6f5f1;
}
.button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 10px 18px;
  border-radius: 9px;
  border: 1px solid transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  line-height: 1.5;
}
.button.primary {
  background: #142b49;
  color: #ffffff;
}
.button.primary:hover {
  background: #203f65;
}
.full-width {
  width: 100%;
}
.text-button {
  border: 0;
  padding: 0;
  background: transparent;
  color: #0b7068;
  font: inherit;
  font-size: inherit;
  font-weight: 750;
  cursor: pointer;
}
.text-button:hover {
  text-decoration: underline;
}
.dialog-actions {
  padding-top: 8px;
  margin-top: 10px;
}
.form-error {
  background: #fff1f2;
  color: #991b1b;
  border: 1px solid #fecdd3;
  padding: 12px;
  border-radius: 9px;
  font-size: 12px;
  margin-bottom: 16px;
}
.auth-footer {
  text-align: center;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid #edf1f6;
  font-size: 12px;
  color: var(--muted);
}
.page-footer {
  text-align: center;
  margin-top: 24px;
  color: var(--muted);
  font-size: 10px;
}
input:focus-visible, select:focus-visible, button:focus-visible {
  outline: 3px solid #0b7068;
  outline-offset: 2px;
}
</style>