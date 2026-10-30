<template>
  <ion-page>
    <ion-content class="signup-page" fullscreen>
      <div class="signup-wrapper">
        <div class="signup-card">
          <!-- LEFT: FORM PANEL -->
          <section class="form-panel">
            <div class="form-panel-inner">
              <div class="brand-row">
                <div class="brand-badge">R</div>
                <div class="brand-copy">
                  <h2>RentEase</h2>
                  <p>OWNER • TENANT • ADMIN</p>
                </div>
              </div>

              <div class="form-copy">
                <span class="eyebrow">CREATE ACCOUNT</span>
                <h1>SIGN UP</h1>
                <p class="intro">
                  Start your rental journey with a modern platform built for
                  tenants and property owners.
                </p>
              </div>

              <form class="signup-form" @submit.prevent="handleSignup">
                <div class="field-group">
                  <label for="fullName">Full name</label>
                  <div class="input-shell">
                    <span class="input-icon">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c1.8-3.7 4.8-5.5 8-5.5s6.2 1.8 8 5.5" />
                      </svg>
                    </span>
                    <input
                      id="fullName"
                      v-model="fullName"
                      type="text"
                      placeholder="e.g. Glay Soriano"
                      maxlength="100"
                      autocomplete="name"
                      :disabled="isLoading"
                      required
                    />
                  </div>
                </div>

                <div class="field-group">
                  <label for="email">E-mail</label>
                  <div class="input-shell">
                    <span class="input-icon">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="14" rx="3" />
                        <path d="M4 7l8 6 8-6" />
                      </svg>
                    </span>
                    <input
                      id="email"
                      v-model="email"
                      type="email"
                      placeholder="you@example.com"
                      autocomplete="email"
                      :disabled="isLoading"
                      required
                    />
                  </div>
                </div>

                <div class="field-row">
                  <div class="field-group">
                    <div class="label-row">
                      <label for="password">Password</label>
                      <span class="mini-hint">Minimum 8 characters</span>
                    </div>

                    <div class="input-shell">
                      <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <rect x="4" y="10" width="16" height="10" rx="2.8" />
                          <path d="M8 10V7.5A4 4 0 0 1 12 3.5a4 4 0 0 1 4 4V10" />
                        </svg>
                      </span>
                      <input
                        id="password"
                        v-model="password"
                        :type="showPassword ? 'text' : 'password'"
                        placeholder="Create password"
                        autocomplete="new-password"
                        minlength="8"
                        :disabled="isLoading"
                        @input="errorMessage = ''"
                        required
                      />
                      <button
                        type="button"
                        class="input-action"
                        @click="showPassword = !showPassword"
                        :disabled="isLoading"
                      >
                        {{ showPassword ? 'Hide' : 'Show' }}
                      </button>
                    </div>

                    <div
                      v-if="password.length > 0"
                      class="password-strength"
                    >
                      <div class="strength-bars">
                        <span
                          v-for="bar in 4"
                          :key="bar"
                          :class="{ filled: passwordScore >= bar }"
                        ></span>
                      </div>
                      <p :class="passwordStrengthClass">
                        {{ passwordStrength }}
                      </p>
                    </div>
                  </div>
                </div>

                <div class="field-group">
                  <label for="confirmPassword">Confirm password</label>
                  <div class="input-shell">
                    <span class="input-icon">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="4" y="10" width="16" height="10" rx="2.8" />
                        <path d="M8 10V7.5A4 4 0 0 1 12 3.5a4 4 0 0 1 4 4V10" />
                        <path d="M10 15h4" />
                      </svg>
                    </span>
                    <input
                      id="confirmPassword"
                      v-model="confirmPassword"
                      :type="showConfirmPassword ? 'text' : 'password'"
                      placeholder="Re-enter password"
                      autocomplete="new-password"
                      :disabled="isLoading"
                      required
                    />
                    <button
                      type="button"
                      class="input-action"
                      @click="showConfirmPassword = !showConfirmPassword"
                      :disabled="isLoading"
                    >
                      {{ showConfirmPassword ? 'Hide' : 'Show' }}
                    </button>
                  </div>
                </div>

                <div class="field-group">
                  <label>Choose account type</label>
                  <div class="role-grid">
                    <button
                      type="button"
                      class="role-card"
                      :class="{ selected: selectedRole === 'tenant' }"
                      @click="selectedRole = 'tenant'"
                      :disabled="isLoading"
                    >
                      <span class="role-icon tenant">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M3 11.5 12 4l9 7.5" />
                          <path d="M5 10.5V20h14v-9.5" />
                          <path d="M9 20v-5h6v5" />
                        </svg>
                      </span>
                      <span class="role-text">
                        <strong>Tenant</strong>
                        <small>Browse and apply for a unit</small>
                      </span>
                      <span class="role-check"></span>
                    </button>

                    <button
                      type="button"
                      class="role-card"
                      :class="{ selected: selectedRole === 'owner' }"
                      @click="selectedRole = 'owner'"
                      :disabled="isLoading"
                    >
                      <span class="role-icon owner">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <rect x="5" y="3" width="14" height="18" rx="2" />
                          <path
                            d="M9 7h2M9 11h2M9 15h2M15 7h.01M15 11h.01M15 15h.01M10 21v-3h4v3"
                          />
                        </svg>
                      </span>
                      <span class="role-text">
                        <strong>Property Owner</strong>
                        <small>Manage properties and tenants</small>
                      </span>
                      <span class="role-check"></span>
                    </button>
                  </div>
                </div>

                <label class="terms-box">
                  <input
                    v-model="agreeTerms"
                    type="checkbox"
                    :disabled="isLoading"
                  />
                  <span class="terms-mark"></span>
                  <span class="terms-copy">
                    I agree to the
                    <a href="#" @click.prevent>terms of service</a>
                    and understand that my account needs
                    <strong>admin approval</strong> before login.
                  </span>
                </label>

                <div
                  v-if="errorMessage"
                  class="message-box error"
                  role="alert"
                >
                  <span class="message-icon">!</span>
                  <div>
                    <strong>Registration failed</strong>
                    <p>{{ errorMessage }}</p>
                  </div>
                </div>

                <button
                  type="submit"
                  class="submit-button"
                  :disabled="isLoading"
                >
                  <span v-if="isLoading" class="spinner"></span>
                  <span class="submit-copy">
                    {{
                      isLoading
                        ? 'Creating your account...'
                        : 'Create Account'
                    }}
                  </span>
                  <span v-if="!isLoading" class="submit-arrow">→</span>
                </button>

                <p class="login-note">
                  Already have an account?
                  <router-link to="/login">Sign in</router-link>
                </p>
              </form>
            </div>
          </section>

          <!-- RIGHT: HERO PANEL -->
          <section class="visual-panel">
            <div class="visual-overlay"></div>

            <div class="floating-card top-card">
              <div class="mini-icon home">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 11.5 12 4l9 7.5" />
                  <path d="M5 10.5V20h14v-9.5" />
                  <path d="M9 20v-5h6v5" />
                </svg>
              </div>
              <div>
                <strong>Verified Listings</strong>
                <small>Trusted rental options</small>
              </div>
            </div>

            <div class="visual-content">
              <span class="visual-badge">RENT WITH EASE</span>
              <h2>Find your next home or manage your properties better.</h2>
              <p>
                RentEase helps tenants discover spaces and allows property
                owners to manage applications, leases, billing, and maintenance
                in one connected platform.
              </p>

              <div class="visual-stats">
                <div class="stat-card">
                  <strong>Smart Applications</strong>
                  <span>Track rental applications smoothly</span>
                </div>
                <div class="stat-card">
                  <strong>Owner Tools</strong>
                  <span>Manage units, billing, and tenants</span>
                </div>
                <div class="stat-card">
                  <strong>One Portal</strong>
                  <span>All your rental activities in one place</span>
                </div>
              </div>
            </div>

            <div class="property-showcase">
              <div class="property-card featured">
                <div class="property-image large">
                  <div class="window-grid">
                    <span v-for="n in 9" :key="'a' + n"></span>
                  </div>
                </div>
                <div class="property-info">
                  <div class="property-tag">Featured rental</div>
                  <h3>Modern City Apartment</h3>
                  <p>Comfortable living spaces for modern renters.</p>
                  <div class="property-meta">
                    <span>✔ Flexible living</span>
                    <span>✔ Verified management</span>
                  </div>
                </div>
              </div>

              <div class="bottom-mini-cards">
                <div class="mini-property">
                  <div class="mini-thumb one"></div>
                  <div>
                    <strong>Easy leasing</strong>
                    <small>Fast and secure workflow</small>
                  </div>
                </div>

                <div class="mini-property">
                  <div class="mini-thumb two"></div>
                  <div>
                    <strong>Property dashboard</strong>
                    <small>Built for owners and tenants</small>
                  </div>
                </div>
              </div>
            </div>

            <div class="visual-footer">
              <span>MOVE IN WITH CONFIDENCE</span>
              <span>© {{ currentYear }} RentEase</span>
            </div>
          </section>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';

const router = useRouter();

const fullName = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const selectedRole = ref<'tenant' | 'owner'>('tenant');
const isLoading = ref(false);
const errorMessage = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const agreeTerms = ref(false);

const currentYear = new Date().getFullYear();

const passwordScore = computed(() => {
  const value = password.value;
  if (!value) return 0;

  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  return score;
});

const passwordStrength = computed(() => {
  if (password.value.length < 8) return 'Too short';
  if (passwordScore.value <= 1) return 'Weak password';
  if (passwordScore.value === 2) return 'Fair password';
  if (passwordScore.value === 3) return 'Good password';
  return 'Strong password';
});

const passwordStrengthClass = computed(() => {
  if (password.value.length < 8 || passwordScore.value <= 1) {
    return 'strength-weak';
  }
  if (passwordScore.value === 2) return 'strength-fair';
  if (passwordScore.value === 3) return 'strength-good';
  return 'strength-strong';
});

const handleSignup = async () => {
  errorMessage.value = '';

  const trimmedName = fullName.value.trim();
  const normalizedEmail = email.value.trim().toLowerCase();

  if (
    !trimmedName ||
    !normalizedEmail ||
    !password.value ||
    !confirmPassword.value ||
    !selectedRole.value
  ) {
    errorMessage.value = 'Please fill in all required fields.';
    return;
  }

  if (password.value.length < 8) {
    errorMessage.value = 'Your password must contain at least 8 characters.';
    return;
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Password and confirm password do not match.';
    return;
  }

  if (!agreeTerms.value) {
    errorMessage.value =
      'Please agree to the terms of service before creating your account.';
    return;
  }

  if (!['tenant', 'owner'].includes(selectedRole.value)) {
    errorMessage.value = 'Please select a valid account type.';
    return;
  }

  isLoading.value = true;

  try {
    const response = await fetch('http://localhost:5000/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: trimmedName,
        email: normalizedEmail,
        password: password.value,
        role: selectedRole.value
      })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      await router.replace({
        path: '/login',
        query: { registered: '1' }
      });
      return;
    }

    errorMessage.value =
      data.message || 'Registration failed. Please try again.';
  } catch (error) {
    console.error('Signup error:', error);
    errorMessage.value =
      'Unable to connect to the server. Please make sure the backend is running.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.signup-page {
  --background:
    radial-gradient(circle at top left, rgba(27, 122, 255, 0.12), transparent 28%),
    radial-gradient(circle at bottom right, rgba(0, 193, 174, 0.16), transparent 30%),
    linear-gradient(180deg, #eaf3ff 0%, #f4f8ff 38%, #eef4fb 100%);
  color: #163252;
  font-family: Inter, "Segoe UI", Arial, sans-serif;
}

.signup-wrapper {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 34px;
}

.signup-card {
  position: relative;
  width: 100%;
  max-width: 1340px;
  min-height: 760px;
  display: grid;
  grid-template-columns: minmax(380px, 0.92fr) minmax(480px, 1.08fr);
  border-radius: 34px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.74);
  box-shadow:
    0 24px 60px rgba(13, 35, 67, 0.16),
    0 10px 25px rgba(15, 54, 94, 0.08);
  backdrop-filter: blur(12px);
}

/* LEFT FORM PANEL */
.form-panel {
  position: relative;
  z-index: 2;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,251,255,0.97));
  display: flex;
  align-items: stretch;
  overflow: hidden;
}

.form-panel::after {
  content: "";
  position: absolute;
  top: 0;
  right: -54px;
  width: 120px;
  height: 100%;
  background: inherit;
  clip-path: polygon(0 0, 85% 0, 62% 8%, 96% 18%, 65% 29%, 100% 39%, 70% 50%, 100% 61%, 67% 72%, 95% 82%, 62% 92%, 84% 100%, 0 100%);
  box-shadow: 14px 0 25px rgba(0, 0, 0, 0.04);
}

.form-panel-inner {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 520px;
  padding: 42px 40px 38px 42px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 30px;
}

.brand-badge {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 28px;
  font-weight: 900;
  background: linear-gradient(135deg, #1e58c7, #18b2b9);
  box-shadow: 0 12px 24px rgba(21, 84, 181, 0.24);
}

.brand-copy h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 900;
  color: #17365b;
  letter-spacing: -0.6px;
}

.brand-copy p {
  margin: 3px 0 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.8px;
  color: #6f85a0;
}

.form-copy {
  margin-bottom: 26px;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 7px 13px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(24, 178, 185, 0.12), rgba(30, 88, 199, 0.1));
  color: #117e85;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1.4px;
  margin-bottom: 18px;
}

.form-copy h1 {
  margin: 0 0 12px;
  font-size: clamp(42px, 4vw, 52px);
  line-height: 1;
  color: #16345a;
  font-weight: 900;
  letter-spacing: -1.8px;
}

.intro {
  margin: 0;
  max-width: 420px;
  color: #667f99;
  font-size: 14px;
  line-height: 1.8;
}

.signup-form {
  display: block;
}

.field-group {
  margin-bottom: 16px;
}

.field-row {
  display: block;
}

.field-group label {
  display: block;
  margin-bottom: 8px;
  color: #254362;
  font-size: 13px;
  font-weight: 800;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mini-hint {
  color: #8ca0b8;
  font-size: 11px;
  font-weight: 700;
}

.input-shell {
  display: flex;
  align-items: center;
  min-height: 56px;
  border-radius: 18px;
  border: 1px solid #d9e5f2;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
  transition: 0.22s ease;
}

.input-shell:focus-within {
  border-color: #1c8ea4;
  box-shadow:
    0 0 0 4px rgba(28, 142, 164, 0.12),
    0 8px 18px rgba(18, 87, 171, 0.08);
}

.input-icon {
  width: 48px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: #8ba3b9;
}

.input-icon svg,
.role-icon svg,
.mini-icon svg {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.input-shell input {
  width: 100%;
  min-width: 0;
  min-height: 54px;
  border: none;
  outline: none;
  background: transparent;
  color: #18395f;
  font-family: inherit;
  font-size: 14px;
  padding: 12px 10px 12px 0;
}

.input-shell input::placeholder {
  color: #9badbf;
}

.input-shell input:disabled {
  opacity: 0.68;
}

.input-action {
  border: none;
  background: transparent;
  color: #0b8a90;
  font-size: 12px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  padding: 10px 14px;
  margin-right: 4px;
}

.password-strength {
  margin-top: 10px;
}

.strength-bars {
  display: flex;
  gap: 6px;
}

.strength-bars span {
  height: 6px;
  flex: 1;
  border-radius: 999px;
  background: #e4ebf4;
  transition: 0.2s ease;
}

.strength-bars span.filled:nth-child(1) {
  background: #f39b76;
}

.strength-bars span.filled:nth-child(2) {
  background: #ffbe5c;
}

.strength-bars span.filled:nth-child(3) {
  background: #2cb4c1;
}

.strength-bars span.filled:nth-child(4) {
  background: #25a765;
}

.password-strength p {
  margin: 7px 0 0;
  font-size: 11px;
  font-weight: 800;
}

.strength-weak {
  color: #c65050;
}

.strength-fair {
  color: #bd7f14;
}

.strength-good {
  color: #138699;
}

.strength-strong {
  color: #1f9b55;
}

.role-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.role-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 92px;
  width: 100%;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid #d9e5f2;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  text-align: left;
  cursor: pointer;
  transition: 0.22s ease;
  box-shadow: 0 8px 18px rgba(14, 62, 118, 0.04);
}

.role-card:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #97cddd;
  box-shadow: 0 10px 24px rgba(14, 62, 118, 0.08);
}

.role-card.selected {
  border-color: #158ea0;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.98), rgba(231, 248, 249, 0.95));
  box-shadow:
    0 0 0 4px rgba(21, 142, 160, 0.1),
    0 14px 28px rgba(20, 92, 173, 0.09);
}

.role-card:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.role-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: #4f6884;
  background: #eef4fb;
}

.role-icon.tenant {
  background: rgba(46, 173, 192, 0.12);
  color: #178ba3;
}

.role-icon.owner {
  background: rgba(30, 88, 199, 0.12);
  color: #2456b6;
}

.role-text {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.role-text strong {
  color: #1a385d;
  font-size: 13px;
  font-weight: 900;
}

.role-text small {
  color: #7389a1;
  font-size: 11px;
  line-height: 1.45;
}

.role-check {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-left: auto;
  border-radius: 50%;
  border: 2px solid #cbdae8;
  background: #fff;
  transition: 0.22s ease;
}

.role-card.selected .role-check {
  border: 5px solid #16a0a4;
}

.terms-box {
  margin: 2px 0 16px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.terms-box input {
  display: none;
}

.terms-mark {
  position: relative;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 2px;
  border-radius: 6px;
  border: 1.5px solid #bcd0e3;
  background: #fff;
  transition: 0.2s ease;
}

.terms-box input:checked + .terms-mark {
  background: linear-gradient(135deg, #20b4b4, #1f63d0);
  border-color: transparent;
  box-shadow: 0 8px 18px rgba(20, 92, 173, 0.18);
}

.terms-box input:checked + .terms-mark::after {
  content: "";
  position: absolute;
  left: 6px;
  top: 3px;
  width: 5px;
  height: 9px;
  border-right: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(45deg);
}

.terms-copy {
  color: #657e97;
  font-size: 12px;
  line-height: 1.65;
}

.terms-copy a {
  color: #0f8fa2;
  font-weight: 800;
  text-decoration: none;
}

.terms-copy a:hover {
  text-decoration: underline;
}

.message-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 15px;
  border-radius: 16px;
  margin-bottom: 16px;
}

.message-box.error {
  border: 1px solid #ffd1d1;
  background: linear-gradient(180deg, #fff5f5, #fff1f1);
  color: #a43737;
}

.message-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: #b34040;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
}

.message-box strong {
  display: block;
  margin-bottom: 3px;
  font-size: 12px;
}

.message-box p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
}

.submit-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 56px;
  padding: 12px 18px;
  border: none;
  border-radius: 18px;
  background: linear-gradient(135deg, #1d63cf, #18b4bb);
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 16px 28px rgba(24, 98, 201, 0.24);
  transition: 0.22s ease;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 18px 32px rgba(24, 98, 201, 0.28);
}

.submit-button:disabled {
  opacity: 0.76;
  cursor: wait;
}

.submit-copy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.submit-arrow {
  margin-left: auto;
  font-size: 20px;
  line-height: 1;
}

.spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  animation: spin 0.7s linear infinite;
}

.login-note {
  margin: 18px 0 0;
  text-align: center;
  color: #71869d;
  font-size: 13px;
}

.login-note a {
  color: #0e8fa0;
  font-weight: 900;
  text-decoration: none;
}

.login-note a:hover {
  text-decoration: underline;
}

/* RIGHT HERO PANEL */
.visual-panel {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 38px 34px 30px 60px;
  background:
    linear-gradient(140deg, rgba(2, 70, 120, 0.28), rgba(0, 33, 78, 0.1)),
    radial-gradient(circle at 18% 24%, rgba(84, 255, 238, 0.35), transparent 20%),
    radial-gradient(circle at 82% 18%, rgba(52, 130, 255, 0.34), transparent 22%),
    radial-gradient(circle at 72% 75%, rgba(0, 189, 159, 0.22), transparent 26%),
    linear-gradient(135deg, #0d446e 0%, #0f7fa7 48%, #13a8ae 100%);
}

.visual-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(8, 27, 62, 0.14), rgba(8, 27, 62, 0.02)),
    radial-gradient(circle at bottom left, rgba(255,255,255,0.06), transparent 30%);
  pointer-events: none;
}

.visual-panel::before,
.visual-panel::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.12);
  pointer-events: none;
}

.visual-panel::before {
  width: 420px;
  height: 420px;
  right: -180px;
  top: 42px;
}

.visual-panel::after {
  width: 280px;
  height: 280px;
  right: 110px;
  bottom: -130px;
}

.floating-card {
  position: relative;
  z-index: 2;
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255,255,255,0.14);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.16);
  box-shadow: 0 20px 35px rgba(6, 26, 55, 0.18);
  color: #fff;
}

.top-card strong {
  display: block;
  font-size: 14px;
  font-weight: 900;
}

.top-card small {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: rgba(255,255,255,0.8);
}

.mini-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,0.16);
  color: #ffffff;
}

.visual-content {
  position: relative;
  z-index: 2;
  max-width: 560px;
  padding-top: 14px;
}

.visual-badge {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.14);
  color: #dff9ff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1.4px;
  border: 1px solid rgba(255,255,255,0.14);
}

.visual-content h2 {
  margin: 18px 0 14px;
  color: #fff;
  font-size: clamp(34px, 3.7vw, 54px);
  line-height: 1.08;
  font-weight: 900;
  letter-spacing: -1.8px;
  text-shadow: 0 10px 28px rgba(5, 20, 46, 0.18);
}

.visual-content p {
  margin: 0;
  max-width: 520px;
  color: rgba(241, 251, 255, 0.9);
  font-size: 15px;
  line-height: 1.85;
}

.visual-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 26px;
}

.stat-card {
  padding: 16px 15px;
  border-radius: 18px;
  background: rgba(255,255,255,0.14);
  border: 1px solid rgba(255,255,255,0.14);
  backdrop-filter: blur(10px);
  box-shadow: 0 14px 30px rgba(5, 20, 46, 0.14);
}

.stat-card strong {
  display: block;
  color: #fff;
  font-size: 13px;
  font-weight: 900;
  margin-bottom: 8px;
}

.stat-card span {
  color: rgba(240, 248, 255, 0.84);
  font-size: 12px;
  line-height: 1.6;
}

.property-showcase {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 18px;
  margin-top: 28px;
}

.property-card.featured {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 18px;
  align-items: stretch;
  padding: 18px;
  border-radius: 26px;
  background: rgba(255,255,255,0.16);
  border: 1px solid rgba(255,255,255,0.16);
  backdrop-filter: blur(12px);
  box-shadow: 0 22px 38px rgba(7, 29, 58, 0.18);
}

.property-image.large {
  min-height: 175px;
  border-radius: 22px;
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)),
    linear-gradient(135deg, #dcf4ff, #9fddff);
  display: grid;
  place-items: center;
}

.property-image.large::before {
  content: "";
  width: 88px;
  height: 118px;
  border-radius: 14px 14px 8px 8px;
  background: linear-gradient(180deg, #2b6ed1, #18489b);
  box-shadow: 0 18px 24px rgba(20, 73, 155, 0.24);
}

.property-image.large::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 22px;
  right: 22px;
  height: 22px;
  border-radius: 14px 14px 0 0;
  background: rgba(20, 73, 155, 0.14);
}

.window-grid {
  position: absolute;
  width: 58px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  z-index: 2;
}

.window-grid span {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: rgba(255,255,255,0.88);
}

.property-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.property-tag {
  display: inline-flex;
  width: fit-content;
  min-height: 30px;
  align-items: center;
  padding: 6px 12px;
  margin-bottom: 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.2);
  color: #e6fcff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1.1px;
}

.property-info h3 {
  margin: 0 0 8px;
  color: #fff;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.6px;
}

.property-info p {
  margin: 0 0 14px;
  color: rgba(245, 251, 255, 0.88);
  font-size: 13px;
  line-height: 1.7;
}

.property-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.property-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.14);
  color: #eefcff;
  font-size: 11px;
  font-weight: 800;
}

.bottom-mini-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.mini-property {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 20px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.14);
  backdrop-filter: blur(10px);
}

.mini-thumb {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  flex-shrink: 0;
}

.mini-thumb.one {
  background:
    linear-gradient(135deg, #74e8e4, #1e67d6);
}

.mini-thumb.two {
  background:
    linear-gradient(135deg, #7db5ff, #1ab0b8);
}

.mini-property strong {
  display: block;
  margin-bottom: 3px;
  color: #fff;
  font-size: 13px;
  font-weight: 900;
}

.mini-property small {
  color: rgba(245, 251, 255, 0.84);
  font-size: 11px;
}

.visual-footer {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
  color: rgba(228, 244, 255, 0.82);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.2px;
}

/* FOCUS */
input:focus-visible,
button:focus-visible,
a:focus-visible {
  outline: 3px solid rgba(23, 172, 172, 0.34);
  outline-offset: 3px;
}

/* ANIM */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* RESPONSIVE */
@media (max-width: 1180px) {
  .signup-card {
    grid-template-columns: minmax(360px, 0.94fr) minmax(420px, 1.06fr);
  }

  .form-panel-inner {
    padding: 38px 34px 34px 36px;
  }

  .visual-panel {
    padding: 34px 28px 28px 48px;
  }

  .visual-stats {
    grid-template-columns: 1fr;
  }

  .property-card.featured {
    grid-template-columns: 170px 1fr;
  }
}

@media (max-width: 980px) {
  .signup-wrapper {
    padding: 22px;
  }

  .signup-card {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .form-panel::after {
    display: none;
  }

  .visual-panel {
    min-height: 560px;
    padding: 28px 24px 24px;
    order: -1;
  }

  .form-panel-inner {
    max-width: none;
    padding: 30px 24px 30px;
  }

  .visual-content h2 {
    font-size: 38px;
  }

  .property-card.featured {
    grid-template-columns: 1fr;
  }

  .property-image.large {
    min-height: 150px;
  }
}

@media (max-width: 680px) {
  .signup-wrapper {
    padding: 14px;
  }

  .signup-card {
    border-radius: 24px;
  }

  .visual-panel {
    min-height: auto;
    padding: 24px 18px 22px;
  }

  .floating-card {
    align-self: stretch;
  }

  .visual-content h2 {
    font-size: 30px;
    line-height: 1.15;
  }

  .visual-content p {
    font-size: 14px;
  }

  .bottom-mini-cards,
  .role-grid {
    grid-template-columns: 1fr;
  }

  .form-panel-inner {
    padding: 24px 18px 24px;
  }

  .brand-row {
    margin-bottom: 22px;
  }

  .brand-badge {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }

  .brand-copy h2 {
    font-size: 22px;
  }

  .form-copy h1 {
    font-size: 36px;
  }

  .intro {
    font-size: 13px;
  }

  .submit-button {
    min-height: 54px;
  }
}

@media (max-width: 420px) {
  .signup-wrapper {
    padding: 10px;
  }

  .signup-card {
    border-radius: 20px;
  }

  .form-panel-inner,
  .visual-panel {
    padding-left: 14px;
    padding-right: 14px;
  }

  .input-shell {
    min-height: 52px;
    border-radius: 16px;
  }

  .input-shell input {
    font-size: 13px;
  }

  .role-card {
    min-height: 84px;
    border-radius: 16px;
  }

  .property-info h3 {
    font-size: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
</style>