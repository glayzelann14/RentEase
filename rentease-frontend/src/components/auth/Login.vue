<template>
  <IonPage>
    <IonContent class="portal">
      <div class="auth-layout">
        <div class="auth-container">
          <div class="brand-header">
            <span class="pill teal">RentEase Portal</span>
            <h1>Welcome Back</h1>
            <p class="subtitle">
              Sign in to access your RentEase dashboard.
            </p>
          </div>

          <div class="panel">
            <div
              v-if="showRegistrationMessage"
              class="notice"
              role="status"
            >
              <span>
                Account created successfully. Sign in to continue.
              </span>

              <button
                type="button"
                aria-label="Dismiss registration message"
                @click="registrationMessageDismissed = true"
              >
                ×
              </button>
            </div>

            <div
              v-if="route.query.serverUnavailable === '1'"
              class="form-error"
              role="alert"
            >
              Your session could not be verified. Make sure the
              backend is running, then try signing in.
            </div>

            <form
              @submit.prevent="handleLogin"
              :aria-busy="isLoading"
            >
              <label for="login-email">
                Email Address
                <input
                  id="login-email"
                  v-model="email"
                  name="email"
                  type="email"
                  autocomplete="username"
                  placeholder="Enter your email address"
                  maxlength="254"
                  :disabled="isLoading"
                  required
                />
              </label>

              <label for="login-password">
                Password
                <input
                  id="login-password"
                  v-model="password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  placeholder="Enter your password"
                  :disabled="isLoading"
                  required
                />
              </label>

              <div
                v-if="errorMessage"
                class="form-error"
                role="alert"
              >
                {{ errorMessage }}
              </div>

              <div class="dialog-actions">
                <button
                  type="submit"
                  class="button primary full-width"
                  :disabled="isLoading"
                >
                  {{ isLoading ? 'Signing in...' : 'Sign In' }}
                </button>
              </div>
            </form>

            <div class="auth-footer">
              <p>
                Don't have an account?
                <RouterLink to="/signup" class="text-button">
                  Create an account
                </RouterLink>
              </p>
            </div>
          </div>

          <div class="page-footer">
            <span>RentEase · Account Access</span>
          </div>
        </div>
      </div>
    </IonContent>
  </IonPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';

import { login, dashboardPath } from '@/services/auth';

const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const registrationMessageDismissed = ref(false);

const showRegistrationMessage = computed(() =>
  route.query.registered === '1' &&
  !registrationMessageDismissed.value,
);

async function handleLogin() {
  if (isLoading.value) return;

  errorMessage.value = '';

  const normalizedEmail = email.value.trim().toLowerCase();

  if (!normalizedEmail || !password.value) {
    errorMessage.value = 'Enter your email address and password.';
    return;
  }

  isLoading.value = true;

  try {
    // auth.ts sends credentials: 'include' so the browser
    // receives and sends the backend session cookie.
    const user = await login(
      normalizedEmail,
      password.value,
    );

    password.value = '';

    // The destination follows the account's saved backend role.
    const navigationFailure = await router.replace(
      dashboardPath(user.role),
    );

    if (navigationFailure || router.currentRoute.value.path === '/login') {
      errorMessage.value =
        'Your account was verified, but the dashboard could not open. Please try again.';
    }
  } catch (error) {
    errorMessage.value = error instanceof Error
      ? error.message
      : 'Sign in failed. Please try again.';
  } finally {
    isLoading.value = false;
  }
}
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
  --background: #f4f7fb;
  color: #142b49;
}

.auth-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 24px;
  box-sizing: border-box;
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

input {
  display: block;
  width: 100%;
  margin-top: 8px;
  border: 1px solid #d7e0eb;
  border-radius: 9px;
  padding: 11px 12px;
  background: #ffffff;
  color: #142b49;
  -webkit-text-fill-color: #142b49;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  box-sizing: border-box;
}

input::placeholder {
  color: #64748b;
  -webkit-text-fill-color: #64748b;
  opacity: 1;
}

input:disabled {
  background: #f8fafc;
  cursor: wait;
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
  min-height: 44px;
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

.button.primary:hover:not(:disabled) {
  background: #203f65;
}

.button:disabled {
  opacity: .65;
  cursor: wait;
}

.full-width {
  width: 100%;
}

.text-button {
  color: #0b7068;
  font: inherit;
  font-weight: 750;
  text-decoration: none;
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
  line-height: 1.6;
  margin-bottom: 16px;
  overflow-wrap: anywhere;
}

.notice {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: #e5f2ee;
  color: #155e52;
  border: 1px solid #cfe6dd;
  padding: 11px 14px;
  border-radius: 9px;
  font-size: 12px;
  line-height: 1.6;
  margin-bottom: 20px;
}

.notice button {
  flex-shrink: 0;
  background: transparent;
  border: 0;
  font-size: 22px;
  color: inherit;
  cursor: pointer;
}

.auth-footer {
  text-align: center;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid #edf1f6;
  font-size: 12px;
  color: var(--muted);
}

.auth-footer p {
  margin: 0;
  line-height: 1.7;
}

.page-footer {
  text-align: center;
  margin-top: 24px;
  color: var(--muted);
  font-size: 10px;
}

input:focus-visible,
button:focus-visible,
a:focus-visible {
  outline: 3px solid #0b7068;
  outline-offset: 2px;
}

@media (max-width: 480px) {
  .auth-layout {
    padding: 20px 14px;
  }

  .panel {
    padding: 22px;
  }

  .brand-header h1 {
    font-size: 26px;
  }
}
</style>