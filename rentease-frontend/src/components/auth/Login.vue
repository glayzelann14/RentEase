<template>
  <IonPage>
    <IonContent class="login-page" :fullscreen="true">
      <div class="login-stage">
        <div class="login-shell">
          <main class="form-side">
            <div class="form-inner">
              <div class="brand-row">
                <div class="brand-symbol" aria-hidden="true">⌂</div>
                <div><strong>RentEase<span>.</span></strong><small>RENT SMARTER · LIVE BETTER</small></div>
              </div>
              <div class="intro"><span class="eyebrow">WELCOME HOME</span><h1>Sign in to <em>RentEase.</em></h1><p>Pick up right where you left off. Your rental journey, all in one place.</p></div>
              <div v-if="showRegistrationMessage" class="alert success" role="status"><span class="alert-icon" aria-hidden="true">✓</span><div><strong>Account created successfully</strong><p>Your registration is awaiting administrator approval. You can sign in once it's approved.</p></div><button type="button" class="dismiss" aria-label="Dismiss registration message" @click="registrationMessageDismissed = true">×</button></div>
              <div v-if="route.query.serverUnavailable === '1'" class="alert error" role="alert"><span class="alert-icon" aria-hidden="true">!</span><div><strong>Connection issue</strong><p>Your session could not be verified. Check your backend connection, then try again.</p></div></div>
              <form @submit.prevent="handleLogin" :aria-busy="isLoading">
                <div class="field"><label for="login-email">Email address</label><div class="input-wrap"><span class="field-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg></span><input id="login-email" v-model="email" name="email" type="email" autocomplete="username" placeholder="you@example.com" maxlength="254" :disabled="isLoading" required /></div></div>
                <div class="field"><label for="login-password">Password</label><div class="input-wrap"><span class="field-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span><input id="login-password" v-model="password" name="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="Enter your password" :disabled="isLoading" required /><button class="show-password" type="button" :disabled="isLoading" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button></div></div>
                <div v-if="errorMessage" class="alert error" role="alert"><span class="alert-icon" aria-hidden="true">!</span><div><strong>Unable to sign in</strong><p>{{ errorMessage }}</p></div></div>
                <button type="submit" class="sign-in" :disabled="isLoading"><span v-if="isLoading" class="spinner" aria-hidden="true"></span><span>{{ isLoading ? 'Signing in...' : 'Sign In' }}</span><span v-if="!isLoading" class="arrow" aria-hidden="true">→</span></button>
              </form>
              <div class="secure-note"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></svg><span>Protected account access</span></div>
              <div class="register-link">New to RentEase? <RouterLink to="/signup">Create an account <span aria-hidden="true">↗</span></RouterLink></div>
              <div class="form-footer">© {{ new Date().getFullYear() }} RentEase · Your space, simplified.</div>
            </div>
          </main>
          <aside class="visual-side" aria-label="RentEase rental platform introduction">
            <div class="visual-top"><span class="visual-logo">RENTEASE LIVING</span><span class="visual-pill">A HOME FOR EVERY JOURNEY</span></div>
            <div class="visual-illustration" aria-hidden="true"><div class="illustration-orb"></div><div class="house house-back"><div class="roof"></div><div class="wall"><div class="window"></div><div class="window"></div></div></div><div class="house house-front"><div class="roof"></div><div class="wall"><div class="window"></div><div class="door"></div><div class="window"></div></div></div><div class="landscape"></div></div>
            <div class="visual-copy"><span class="visual-kicker">WELCOME TO YOUR SPACE</span><h2>Every great chapter <span>starts at home.</span></h2><p>Discover rentals, manage your lease, stay on top of payments, and take care of your space—all with RentEase.</p><div class="feature-chips"><span>⌂ Explore homes</span><span>◇ Manage rentals</span><span>✓ Stay connected</span></div></div>
            <div class="visual-footer"><span>FIND YOUR PLACE. FEEL AT HOME.</span><span>RENT EASE © {{ new Date().getFullYear() }}</span></div>
          </aside>
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
const showPassword = ref(false);
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
    errorMessage.value =
      'Enter your email address and password.';
    return;
  }

  isLoading.value = true;

  try {
    const user = await login(
      normalizedEmail,
      password.value,
    );

    password.value = '';

    const navigationFailure = await router.replace(
      dashboardPath(user.role),
    );

    if (
      navigationFailure ||
      router.currentRoute.value.path === '/login'
    ) {
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
.login-page{--background:#eaf3ff;--ion-text-color:#1b365c;color:#1b365c;color-scheme:light;font-family:Inter,"Segoe UI",Arial,sans-serif}
*{box-sizing:border-box}.login-stage{min-height:100%;display:flex;align-items:center;justify-content:center;padding:clamp(12px,2.5vw,36px);background:radial-gradient(circle at 5% 5%,#d3e9ff,transparent 34%),radial-gradient(circle at 95% 90%,#c9f2f0,transparent 34%),linear-gradient(140deg,#eef5ff,#f8fbff)}
.login-shell{display:grid;grid-template-columns:minmax(350px,.89fr) minmax(400px,1.11fr);width:100%;max-width:1270px;min-height:720px;overflow:hidden;border-radius:30px;background:#fff;box-shadow:0 30px 80px rgba(16,53,108,.18),0 5px 25px rgba(16,53,108,.06)}
.form-side{position:relative;z-index:2;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#fff,#f9fbff)}.form-inner{width:100%;max-width:490px;padding:44px clamp(24px,4vw,58px)}
.brand-row{display:flex;align-items:center;gap:12px;margin-bottom:58px}.brand-symbol{display:grid;place-items:center;width:46px;height:46px;border-radius:15px;color:white;font-size:30px;font-weight:900;background:linear-gradient(140deg,#1f59c8,#16b7b2);box-shadow:0 9px 18px rgba(32,100,209,.25)}.brand-row strong,.brand-row small{display:block}.brand-row strong{font-size:24px;letter-spacing:-.8px;color:#15345d}.brand-row strong span{color:#1a9bc5}.brand-row small{margin-top:2px;font-size:8px;letter-spacing:1.5px;font-weight:850;color:#8094ae}
.eyebrow{display:inline-block;padding:7px 12px;border-radius:999px;background:#e8f7fd;color:#0c819c;font-weight:850;letter-spacing:1.2px;font-size:10px}.intro h1{margin:16px 0 10px;font-size:clamp(32px,3.6vw,45px);letter-spacing:-1.6px;line-height:1.13;color:#15335c;font-weight:900}.intro h1 em{font-style:normal;background:linear-gradient(115deg,#215bd0,#159baf);background-clip:text;-webkit-background-clip:text;color:transparent}.intro p{font-size:13px;color:#7589a1;line-height:1.8;margin:0 0 28px;max-width:385px}
.field{margin:0 0 19px}.field label{display:block;font-size:12px;font-weight:800;margin:0 0 9px;color:#344e71}.input-wrap{display:flex;align-items:center;min-height:54px;background:linear-gradient(180deg,#fff,#f8fbff);border:1px solid #dbe7f6;border-radius:15px;transition:.18s}.input-wrap:focus-within{border-color:#338edb;box-shadow:0 0 0 4px rgba(41,117,223,.12)}.field-icon{display:grid;place-items:center;width:48px;flex:none;color:#8299b6}.field-icon svg,.secure-note svg{width:19px;height:19px;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.input-wrap input{width:100%;min-width:0;height:52px;padding:12px 6px 12px 0;outline:none;border:0;background:transparent;color:#17355f;font-size:13px;font-family:inherit}.input-wrap input::placeholder{color:#a1afc3}.show-password{background:none;border:0;color:#1766bd;font-size:12px;font-weight:800;padding:12px;margin-right:4px;cursor:pointer}.sign-in{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:54px;margin-top:9px;padding:13px 18px;border:none;border-radius:15px;background:linear-gradient(110deg,#205cd2,#1688df 55%,#17b5b0);box-shadow:0 12px 23px rgba(26,95,200,.22);color:white;font-size:14px;font-weight:850;cursor:pointer;transition:transform .18s,box-shadow .18s}.sign-in:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 16px 28px rgba(26,95,200,.3)}.sign-in:disabled{opacity:.68;cursor:wait}.arrow{margin-left:auto;font-size:20px}.spinner{width:17px;height:17px;border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.alert{display:flex;gap:10px;align-items:flex-start;border-radius:13px;padding:13px 12px;margin:0 0 20px;font-size:12px}.alert.success{background:#ebf9f4;border:1px solid #c9e9da;color:#216747}.alert.error{background:#fff2f2;border:1px solid #f7d3d3;color:#a33c46}.alert-icon{display:grid;place-items:center;flex:none;width:23px;height:23px;border-radius:8px;background:#cdeedc;font-weight:900}.alert.error .alert-icon{background:#f6d1d2}.alert div{flex:1;min-width:0}.alert strong{display:block;margin-bottom:4px}.alert p{margin:0;line-height:1.55;overflow-wrap:anywhere}.dismiss{background:none;border:0;color:inherit;font-size:23px;cursor:pointer;line-height:1}
.secure-note{display:flex;gap:7px;justify-content:center;align-items:center;margin:15px 0 26px;font-size:10px;color:#7e8fa6}.secure-note svg{width:15px;height:15px;color:#1b99a3}.register-link{text-align:center;padding:20px 0 0;border-top:1px solid #e5ecf6;font-size:12px;color:#70839c}.register-link a{color:#126bbf;font-weight:850;text-decoration:none;margin-left:5px}.register-link a:hover{text-decoration:underline}.form-footer{text-align:center;font-size:10px;color:#98a7ba;margin-top:30px}
.visual-side{position:relative;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;min-width:0;padding:36px clamp(27px,3vw,48px) 27px;color:white;background:radial-gradient(circle at 80% 15%,rgba(111,221,255,.35),transparent 26%),radial-gradient(circle at 22% 61%,rgba(22,204,183,.35),transparent 35%),linear-gradient(130deg,#0b337b,#136fb6 54%,#0c9fa4)}.visual-side::after{position:absolute;inset:0;content:'';pointer-events:none;background:linear-gradient(180deg,transparent 54%,rgba(0,26,81,.33))}.visual-top,.visual-copy,.visual-footer{position:relative;z-index:2}.visual-top{display:flex;align-items:center;justify-content:space-between;gap:15px}.visual-logo{font-size:12px;letter-spacing:2px;font-weight:900}.visual-pill{font-size:9px;letter-spacing:1.1px;padding:8px 11px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.12);border-radius:30px;font-weight:800}.visual-illustration{position:relative;align-self:center;width:min(100%,530px);height:275px;margin:5px 0 -14px}.illustration-orb{position:absolute;width:250px;height:250px;left:50%;top:0;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle at 35% 30%,#b6f5ff,#3ea6e4 54%,#135ca8);box-shadow:0 12px 65px rgba(2,26,77,.22)}.house{position:absolute;filter:drop-shadow(0 16px 12px rgba(5,35,75,.25))}.house .roof{width:0;height:0;border-left:106px solid transparent;border-right:106px solid transparent;border-bottom:74px solid #eff8ff}.house .wall{display:flex;align-items:center;justify-content:space-evenly;width:212px;height:135px;padding:20px 9px;background:linear-gradient(115deg,#d6f4ff,#fbfdff);border-radius:0 0 10px 10px}.house .window{width:36px;height:44px;border:6px solid #58a5d7;background:#9ae6fd;border-radius:5px}.house .door{width:50px;height:75px;background:linear-gradient(120deg,#236cc2,#124b9c);border:5px solid #fff;border-radius:8px 8px 0 0;align-self:flex-end}.house-back{transform:scale(.62);transform-origin:bottom left;left:2%;bottom:5px;opacity:.72}.house-front{left:50%;bottom:1px;transform:translateX(-50%)}.landscape{position:absolute;left:6%;right:6%;bottom:0;height:33px;border-radius:50%;background:linear-gradient(180deg,#69d6c8,#128d99);filter:blur(2px)}
.visual-copy{max-width:530px}.visual-kicker{font-size:10px;font-weight:850;letter-spacing:1.7px;color:#b4faff}.visual-copy h2{font-size:clamp(31px,3.3vw,47px);line-height:1.09;letter-spacing:-1.6px;margin:13px 0 13px;color:white;font-weight:900}.visual-copy h2 span{color:#8af1e3}.visual-copy p{font-size:13px;line-height:1.8;color:#e0f3ff;margin:0;max-width:440px}.feature-chips{display:flex;gap:9px;flex-wrap:wrap;margin-top:22px}.feature-chips span{padding:9px 11px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.14);border-radius:11px;font-size:11px;font-weight:750;backdrop-filter:blur(8px)}.visual-footer{display:flex;justify-content:space-between;gap:12px;font-size:9px;letter-spacing:1.2px;color:#d0eaff;font-weight:750;margin-top:30px}
button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #74d8ff;outline-offset:3px}
@media(max-width:960px){.login-shell{grid-template-columns:minmax(315px,.9fr) minmax(320px,1.1fr)}.visual-side{padding:29px 23px}.visual-copy h2{font-size:34px}.visual-illustration{height:240px;transform:scale(.85)}.form-inner{padding:34px 27px}.brand-row{margin-bottom:38px}}
@media(max-width:700px){.login-stage{padding:0;display:block}.login-shell{display:flex;flex-direction:column-reverse;min-height:100dvh;border-radius:0;box-shadow:none}.visual-side{min-height:190px;padding:24px 22px 21px}.visual-top{margin-bottom:20px}.visual-illustration{display:none}.visual-copy h2{font-size:26px;max-width:390px;line-height:1.17;margin:9px 0}.visual-copy p,.feature-chips,.visual-footer{display:none}.visual-pill{display:none}.visual-kicker{font-size:9px}.form-inner{max-width:500px;padding:26px 22px calc(32px + env(safe-area-inset-bottom,0px))}.form-side{flex:1}.brand-row{margin-bottom:22px}.intro h1{font-size:31px}.intro p{margin-bottom:23px}.field{margin-bottom:15px}.form-footer{margin-top:24px}}
@media(max-width:380px){.form-inner{padding-left:17px;padding-right:17px}.visual-side{padding:19px 17px}.brand-row strong{font-size:20px}.login-shell{min-height:100%}.form-inner{padding-bottom:28px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition-duration:.01ms!important;animation-duration:.01ms!important}}
</style>
