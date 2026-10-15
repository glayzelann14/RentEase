<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { restoreSession, logout as logoutUser } from '@/services/auth';



import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonModal,
  IonIcon,
  alertController,
} from '@ionic/vue';
import {
  gridOutline,
  documentTextOutline,
  cardOutline,
  constructOutline,
  personOutline,
  closeOutline,
  logOutOutline,
  notificationsOutline,
} from 'ionicons/icons';

const router = useRouter();

// Custom ionic alert message box helper (pareho sa Owner Dashboard)
async function showCustomAlert(headerText: string, messageText: string) {
  const alert = await alertController.create({
    header: headerText,
    message: messageText,
    cssClass: 'rentease-messagebox',
    backdropDismiss: false,
    buttons: [{ text: 'OK', role: 'confirm' }],
  });
  await alert.present();
}

// Tenant state management
const state = reactive({
  profile: {
    name: 'Juan Dela Cruz',
    email: 'tenant@example.com',
    mobile: '09181234567',
    unit: 'Soriano Apartment - Unit 101',
    avatar: '',
  },
  lease: {
    id: '#001',
    property: 'Soriano Apartment',
    unitNumber: '101',
    rent: 8000,
    start: 'Oct. 1, 2026',
    end: 'Sept. 30, 2027',
    status: 'ACTIVE',
  },
  bill: {
    period: 'October 2026',
    rent: 8000,
    utilities: 1700,
    total: 9700,
    dueDate: 'Oct. 15, 2026',
    status: 'UNPAID',
  },
  payments: [
    { id: 1, period: 'September 2026', amount: 9500, method: 'GCash', reference: 'GC123456789', date: 'Sept. 5, 2026', status: 'VERIFIED' },
    { id: 2, period: 'August 2026', amount: 9500, method: 'Bank Transfer', reference: 'BK987654321', date: 'Aug. 5, 2026', status: 'VERIFIED' }
  ],
  maintenance: [
    { id: 1, category: 'Plumbing', description: 'Shower fixture not working properly (Medium Priority)', date: 'Oct. 8, 2026', status: 'IN PROGRESS' }
  ]
});

const section = ref('overview');
const message = ref('');
const dialogOpen = ref(false);
const dialogType = ref('');

// Form models for modals
const paymentForm = reactive({
  amount: 9700,
  method: 'GCash',
  reference: '',
  proof: ''
});

const maintenanceForm = reactive({
  category: 'Plumbing',
  description: ''
});

const profileForm = reactive({
  name: '',
  email: '',
  mobile: '',
  avatar: ''
});

const menu = [
  { id: 'overview', label: 'Dashboard Overview', icon: gridOutline },
  { id: 'lease', label: 'Active Lease', icon: documentTextOutline },
  { id: 'billing', label: 'Monthly Billing', icon: cardOutline },
  { id: 'maintenance', label: 'Maintenance Requests', icon: constructOutline },
  { id: 'profile', label: 'Tenant Profile', icon: personOutline },
];

const titles: Record<string, string> = {
  overview: 'Tenant Portal Overview',
  lease: 'Lease Agreement',
  billing: 'Billing & Payments',
  maintenance: 'Maintenance Requests',
  profile: 'Tenant Profile',
};

const subtitles: Record<string, string> = {
  overview: 'Manage your active lease, monthly statements, and service requests.',
  lease: 'Review your rental terms, deposits, and agreement schedules.',
  billing: 'Check due dates, submit payment references, and view history.',
  maintenance: 'Report facility issues and track repair progress.',
  profile: 'View and update your personal tenant contact records.',
};

const initials = computed(() =>
  state.profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()
);

function navigate(target: string) {
  section.value = target;
}

function openDialog(type: string) {
  dialogType.value = type;
  if (type === 'profile') {
    profileForm.name = state.profile.name;
    profileForm.email = state.profile.email;
    profileForm.mobile = state.profile.mobile;
    profileForm.avatar = state.profile.avatar;
  }
  dialogOpen.value = true;
}

function closeDialog() {
  dialogOpen.value = false;
}

function peso(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(amount);
}

function badgeClass(status: string): string {
  if (['ACTIVE', 'VERIFIED', 'PAID', 'COMPLETED'].includes(status)) return 'good';
  if (['PENDING', 'IN PROGRESS', 'UNPAID'].includes(status)) return 'warning';
  if (['REJECTED', 'OVERDUE'].includes(status)) return 'danger';
  return 'neutral';
}

function handleProofUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    paymentForm.proof = String(reader.result);
  };
  reader.readAsDataURL(file);
}

function handleAvatarUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    profileForm.avatar = String(reader.result);
  };
  reader.readAsDataURL(file);
}

async function submitPaymentAction() {
  if (paymentForm.reference.length < 9) {
    await showCustomAlert('RentEase', 'Please enter a valid reference code (at least 9 characters/numbers).');
    return;
  }
  if (!paymentForm.proof) {
    await showCustomAlert('RentEase', 'Please upload a proof of payment image.');
    return;
  }

  state.payments.unshift({
    id: state.payments.length + 1,
    period: state.bill.period,
    amount: paymentForm.amount,
    method: paymentForm.method,
    reference: paymentForm.reference,
    date: 'Today',
    status: 'VERIFIED'
  });
  state.bill.status = 'PAID';
  closeDialog();
  await showCustomAlert('RentEase', 'Payment verification submitted successfully!');
}

async function submitMaintenanceAction() {
  if (!maintenanceForm.description.trim()) {
    await showCustomAlert('RentEase', 'Please provide a description of the issue.');
    return;
  }
  state.maintenance.unshift({
    id: state.maintenance.length + 1,
    category: maintenanceForm.category,
    description: maintenanceForm.description,
    date: 'Today',
    status: 'PENDING'
  });
  maintenanceForm.description = '';
  closeDialog();
  await showCustomAlert('RentEase', 'Maintenance request submitted successfully!');
}


onMounted(async () => {
  const user = await restoreSession();

  if (!user) {
    router.replace('/login');
    return;
  }

  // Siguraduhing tenant account ang gumagamit ng dashboard.
  if (user.role !== 'tenant') {
    if (user.role === 'admin') {
      router.replace('/admin');
    } else if (user.role === 'owner') {
      router.replace('/owner');
    } else {
      router.replace('/login');
    }
    return;
  }

  // Gamitin ang kasalukuyang naka-login na account.
  state.profile.name = user.name;
  state.profile.email = user.email;
});


async function saveProfile() {
  state.profile.name = profileForm.name;
  state.profile.email = profileForm.email;
  state.profile.mobile = profileForm.mobile;
  state.profile.avatar = profileForm.avatar;
  
  localStorage.setItem('userName', profileForm.name);
  localStorage.setItem('userEmail', profileForm.email);

  closeDialog();
  await showCustomAlert('RentEase', 'Profile updated successfully!');
}


async function logout() {
  await logoutUser();
  router.replace('/login');
}

</script>

<template>
  <IonPage>
    <IonHeader>
      <IonToolbar class="topbar">
        <IonTitle>
          RentEase
          <span class="brand-subtitle">Tenant Portal</span>
        </IonTitle>
        <IonButtons slot="end">
          <IonButton @click="navigate('billing')">
            <IonIcon :icon="notificationsOutline" />
          </IonButton>
          <IonButton @click="logout">
            <IonIcon slot="start" :icon="logOutOutline" />
            Logout
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent class="portal">
      <div class="layout">
        <!-- Sidebar Navigation -->
        <aside class="sidebar">
          <div class="owner">
            <div class="avatar">
              <img v-if="state.profile.avatar" :src="state.profile.avatar" alt="Avatar" />
              <span v-else>{{ initials }}</span>
            </div>
            <div>
              <strong>{{ state.profile.name }}</strong>
              <small>{{ state.profile.unit }}</small>
            </div>
          </div>
          <p class="nav-label">WORKSPACE</p>
          <nav aria-label="Tenant navigation">
            <button
              v-for="item in menu"
              :key="item.id"
              type="button"
              :class="{ active: section === item.id }"
              @click="navigate(item.id)"
            >
              <IonIcon :icon="item.icon" />
              <span>{{ item.label }}</span>
            </button>
          </nav>
          <div class="sidebar-note">
            <strong>Tenant Account</strong>
            <p>Direct communication with property management.</p>
          </div>
        </aside>

        <!-- Main Content Area -->
        <main class="workspace">
          <div class="page-heading">
            <div>
              <p class="eyebrow">TENANT PORTAL</p>
              <h1>{{ titles[section] }}</h1>
              <p class="subtitle">{{ subtitles[section] }}</p>
            </div>
            <div class="heading-actions">
              <button
                v-if="section === 'overview' || section === 'billing'"
                type="button"
                class="button primary"
                @click="openDialog('payment')"
              >
                + Submit Payment
              </button>
              <button
                v-if="section === 'overview' || section === 'maintenance'"
                type="button"
                class="button secondary"
                @click="openDialog('maintenance')"
              >
                + Request Maintenance
              </button>
              <button
                v-if="section === 'profile'"
                type="button"
                class="button primary"
                @click="openDialog('profile')"
              >
                Edit Profile
              </button>
            </div>
          </div>

          <div v-if="message" class="notice" role="status">
            <span>{{ message }}</span>
            <button type="button" @click="message = ''">×</button>
          </div>

          <!-- OVERVIEW SECTION -->
          <template v-if="section === 'overview'">
            <div class="metrics">
              <article class="metric">
                <span>Monthly Rent</span>
                <strong>{{ peso(state.lease.rent) }}</strong>
                <small>Due every 1st of the month</small>
              </article>
              <article class="metric">
                <span>Current Balance</span>
                <strong>{{ peso(state.bill.total) }}</strong>
                <small>{{ state.bill.period }} statement</small>
              </article>
              <article class="metric">
                <span>Lease Status</span>
                <strong>Active</strong>
                <small>Valid until Sept. 2027</small>
              </article>
              <article class="metric">
                <span>Open Maintenance</span>
                <strong>{{ state.maintenance.length }}</strong>
                <small>Active service ticket</small>
              </article>
            </div>

            <div class="dashboard-grid">
              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>Active Lease (#001)</h2>
                    <p>{{ state.lease.property }} - Unit {{ state.lease.unitNumber }}</p>
                  </div>
                  <span class="pill good">{{ state.lease.status }}</span>
                </div>
                <dl class="details">
                  <dt>Monthly Rent</dt>
                  <dd>{{ peso(state.lease.rent) }}</dd>
                  <dt>Lease Term</dt>
                  <dd>{{ state.lease.start }} – {{ state.lease.end }}</dd>
                </dl>
                <button type="button" class="text-button" @click="navigate('lease')">View full lease agreement →</button>
              </section>

              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>{{ state.bill.period }} Billing</h2>
                    <p>Due Date: {{ state.bill.dueDate }}</p>
                  </div>
                  <span class="pill" :class="badgeClass(state.bill.status)">{{ state.bill.status }}</span>
                </div>
                <div class="record-row">
                  <span>Rent Amount</span>
                  <strong>{{ peso(state.bill.rent) }}</strong>
                </div>
                <div class="record-row">
                  <span>Water & Electricity</span>
                  <strong>{{ peso(state.bill.utilities) }}</strong>
                </div>
                <div class="record-row total-row">
                  <span>Total Due</span>
                  <strong>{{ peso(state.bill.total) }}</strong>
                </div>
                <button type="button" class="button primary full-width" style="margin-top: 15px;" @click="openDialog('payment')">
                  Submit Payment Verification
                </button>
              </section>
            </div>
          </template>

          <!-- LEASE SECTION -->
          <template v-if="section === 'lease'">
            <section class="panel">
              <div class="panel-heading">
                <div>
                  <h2>Lease Agreement Details</h2>
                  <p>Official contract documents and terms</p>
                </div>
                <span class="pill good">ACTIVE</span>
              </div>
              <dl class="details">
                <dt>Property Name</dt>
                <dd>{{ state.lease.property }}</dd>
                <dt>Assigned Unit</dt>
                <dd>Unit {{ state.lease.unitNumber }}</dd>
                <dt>Monthly Rental Rate</dt>
                <dd>{{ peso(state.lease.rent) }}</dd>
                <dt>Commencement Date</dt>
                <dd>{{ state.lease.start }}</dd>
                <dt>Expiration Date</dt>
                <dd>{{ state.lease.end }}</dd>
              </dl>
            </section>
          </template>

          <!-- BILLING SECTION -->
          <template v-if="section === 'billing'">
            <section class="panel">
              <div class="panel-heading">
                <div>
                  <h2>Current Statement</h2>
                  <p>{{ state.bill.period }} breakdown</p>
                </div>
                <button type="button" class="button primary" @click="openDialog('payment')">Submit Payment</button>
              </div>
              <div class="record-row">
                <span>Rent</span>
                <span>{{ peso(state.bill.rent) }}</span>
              </div>
              <div class="record-row">
                <span>Utilities (Water & Electricity)</span>
                <span>{{ peso(state.bill.utilities) }}</span>
              </div>
              <div class="record-row total-row">
                <span>Total Amount Due</span>
                <strong>{{ peso(state.bill.total) }}</strong>
              </div>
            </section>

            <section class="panel" style="margin-top: 20px;">
              <div class="panel-heading">
                <div>
                  <h2>Payment History</h2>
                  <p>Verified previous transactions</p>
                </div>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Reference No.</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in state.payments" :key="item.id">
                      <td><strong>{{ item.period }}</strong></td>
                      <td>{{ peso(item.amount) }}</td>
                      <td>{{ item.method }}</td>
                      <td>{{ item.reference }}</td>
                      <td>{{ item.date }}</td>
                      <td><span class="pill good">{{ item.status }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </template>

          <!-- MAINTENANCE SECTION -->
          <template v-if="section === 'maintenance'">
            <div class="panel-heading" style="margin-bottom: 15px;">
              <div>
                <h2>Service & Maintenance Tickets</h2>
                <p>Track repairs and request assistance</p>
              </div>
            </div>
            <div class="request-grid">
              <article v-for="req in state.maintenance" :key="req.id" class="panel request-card">
                <div class="request-top">
                  <span class="pill" :class="badgeClass(req.status)">{{ req.status }}</span>
                  <small>{{ req.date }}</small>
                </div>
                <h2>{{ req.category }}</h2>
                <p class="request-description">{{ req.description }}</p>
              </article>
            </div>
          </template>

          <!-- PROFILE SECTION -->
          <template v-if="section === 'profile'">
            <section class="panel profile-summary">
              <div class="avatar large">
                <img v-if="state.profile.avatar" :src="state.profile.avatar" alt="Avatar" />
                <span v-else>{{ initials }}</span>
              </div>
              <h2>{{ state.profile.name }}</h2>
              <span class="pill good">Tenant Account</span>
              <dl class="details" style="text-align: left; margin-top: 20px;">
                <dt>Email Address</dt>
                <dd>{{ state.profile.email }}</dd>
                <dt>Mobile Number</dt>
                <dd>{{ state.profile.mobile }}</dd>
                <dt>Assigned Unit</dt>
                <dd>{{ state.profile.unit }}</dd>
              </dl>
              <button type="button" class="button primary" style="margin-top: 20px;" @click="openDialog('profile')">Edit Profile</button>
            </section>
          </template>

          <footer class="page-footer">
            <span>RentEase · Tenant Portal</span>
          </footer>
        </main>
      </div>
    </IonContent>

    <!-- MODAL DIALOG FOR ACTIONS -->
    <IonModal :is-open="dialogOpen" class="record-modal" @didDismiss="closeDialog">
      <IonHeader>
        <IonToolbar class="modal-toolbar">
          <IonTitle>
            {{ dialogType === 'payment' ? 'Submit Payment Record' : dialogType === 'maintenance' ? 'Report Maintenance Issue' : 'Edit Tenant Profile' }}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton @click="closeDialog">
              <IonIcon :icon="closeOutline" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent class="dialog-content">
        <div class="dialog-body">
          <!-- PAYMENT FORM -->
          <form v-if="dialogType === 'payment'" @submit.prevent="submitPaymentAction">
            <label>
              Amount Paid (PHP)
              <input type="number" v-model="paymentForm.amount" required />
            </label>
            <label>
              Payment Method
              <select v-model="paymentForm.method" required>
                <option value="GCash">GCash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
              </select>
            </label>
            <label>
              Reference Number / Transaction ID (Min. 9 characters)
              <input type="text" v-model="paymentForm.reference" placeholder="e.g. GC123456789" minlength="9" required />
            </label>
            <label>
              Upload Proof of Payment (Screenshot / Receipt)
              <input type="file" accept="image/*" @change="handleProofUpload" required />
            </label>
            <div v-if="paymentForm.proof" class="preview-container">
              <img :src="paymentForm.proof" alt="Proof preview" class="proof-preview" />
            </div>
            <div class="dialog-actions">
              <button type="button" class="button secondary" @click="closeDialog">Cancel</button>
              <button type="submit" class="button primary">Submit for Verification</button>
            </div>
          </form>

          <!-- MAINTENANCE FORM -->
          <form v-if="dialogType === 'maintenance'" @submit.prevent="submitMaintenanceAction">
            <label>
              Issue Category
              <select v-model="maintenanceForm.category" required>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Appliance">Appliance / Fixture</option>
                <option value="General">General Facility</option>
              </select>
            </label>
            <label>
              Description of Problem
              <textarea rows="4" v-model="maintenanceForm.description" placeholder="Describe the issue clearly..." required></textarea>
            </label>
            <div class="dialog-actions">
              <button type="button" class="button secondary" @click="closeDialog">Cancel</button>
              <button type="submit" class="button primary">Send Request</button>
            </div>
          </form>

          <!-- PROFILE EDIT FORM -->
          <form v-if="dialogType === 'profile'" @submit.prevent="saveProfile">
            <label>
              Full Name
              <input type="text" v-model="profileForm.name" required />
            </label>
            <label>
              Email Address
              <input type="email" v-model="profileForm.email" required />
            </label>
            <label>
              Mobile Number
              <input type="tel" v-model="profileForm.mobile" required />
            </label>
            <label>
              Profile Picture
              <input type="file" accept="image/*" @change="handleAvatarUpload" />
            </label>
            <div v-if="profileForm.avatar" class="preview-container">
              <img :src="profileForm.avatar" alt="Avatar preview" class="avatar-preview" />
            </div>
            <div class="dialog-actions">
              <button type="button" class="button secondary" @click="closeDialog">Cancel</button>
              <button type="submit" class="button primary">Save Profile</button>
            </div>
          </form>
        </div>
      </IonContent>
    </IonModal>
  </IonPage>
</template>

<style scoped>
.portal, .dialog-content {
  color-scheme: light;
  --navy: #142b49;
  --muted: #52637a;
  --teal: #0b7068;
  --line: #e2e8f0;
  --ion-text-color: #142b49;
  --ion-background-color: #ffffff;
  color: #142b49;
}
.portal { --background: #f4f7fb; }
.topbar { --background: #142b49; --color: #ffffff; --min-height: 64px; padding-inline: 12px; }
.topbar ion-title { color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -.6px; }
.brand-subtitle { margin-left: 12px; color: #d0deed; font-size: 12px; font-weight: 400; }
.topbar ion-button { --color: #ffffff; color: #ffffff; text-transform: none; font-size: 12px; }
.layout { display: grid; grid-template-columns: 248px minmax(0, 1fr); min-height: 100%; }
.sidebar { padding: 25px 16px; border-right: 1px solid var(--line); background: #ffffff; color: #142b49; }
.owner { display: flex; align-items: center; gap: 11px; padding: 0 4px 24px; border-bottom: 1px solid var(--line); }
.owner strong { color: #142b49; font-size: 13px; line-height: 1.6; }
.owner small { display: block; margin-top: 3px; color: var(--muted); font-size: 11px; }
.avatar { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 13px; color: #0b7068; background: #e6f5f1; font-weight: 800; overflow: hidden; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar.large { width: 84px; height: 84px; border-radius: 24px; font-size: 26px; margin: 0 auto 20px; }
.nav-label { font-size: 10px; letter-spacing: 1.7px; font-weight: 750; margin: 25px 12px 12px; color: #52637a; }
.sidebar nav { display: flex; flex-direction: column; gap: 5px; }
.sidebar nav button { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 44px; padding: 11px 12px; border: 1px solid transparent; border-radius: 10px; background: transparent; text-align: left; color: #52637a; font: inherit; font-size: 12px; cursor: pointer; transition: background .18s; }
.sidebar nav button ion-icon { font-size: 18px; }
.sidebar nav button span { flex: 1; }
.sidebar nav button:hover { background: #f4f7fb; }
.sidebar nav button.active { background: #e8f5f2; border-color: #d4eee7; color: #0b7068; font-weight: 750; }
.sidebar-note { padding: 16px; margin-top: 30px; border-radius: 12px; background: #f5f8fc; }
.sidebar-note strong { color: #142b49; font-size: 11px; }
.sidebar-note p { font-size: 11px; color: var(--muted); line-height: 1.6; margin: 6px 0 0; }
.workspace { min-width: 0; padding: clamp(20px, 2.2vw, 36px); color: #142b49; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 24px; }
.heading-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.eyebrow { color: var(--teal); font-size: 10px; font-weight: 800; letter-spacing: 1.8px; margin: 0 0 9px; }
h1 { color: #142b49; margin: 0; font-size: clamp(25px, 2.2vw, 34px); font-weight: 800; letter-spacing: -.8px; }
.subtitle { color: var(--muted); font-size: 13px; line-height: 1.7; margin: 8px 0 0; }
h2 { margin: 0; color: #142b49; font-size: 16px; font-weight: 750; }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 15px; margin-bottom: 22px; }
.metric { background: #ffffff; border: 1px solid var(--line); border-top: 3px solid var(--teal); border-radius: 15px; padding: 22px; }
.metric > span { display: block; color: var(--muted); font-size: 12px; }
.metric > strong { display: block; color: #142b49; margin: 12px 0 7px; font-size: clamp(20px, 1.8vw, 26px); }
.metric small { font-size: 10px; color: #52637a; }
.dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; align-items: start; }
.panel { background: #ffffff; color: #142b49; border: 1px solid var(--line); border-radius: 16px; padding: 23px; box-shadow: 0 3px 15px rgb(20 43 73 / 3%); }
.panel-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 22px; }
.panel-heading p { color: #52637a; font-size: 11px; margin: 5px 0 0; }
.pill { display: inline-block; padding: 5px 8px; border-radius: 6px; font-size: 9px; font-weight: 800; letter-spacing: .3px; }
.good { color: #166534; background: #e5f5eb; }
.warning { color: #92400e; background: #fff1d8; }
.danger { color: #991b1b; background: #feecec; }
.neutral { color: #465f7d; background: #edf2f8; }
.record-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #edf1f6; font-size: 13px; }
.record-row:last-child { border-bottom: 0; }
.total-row { border-top: 1px solid var(--line); margin-top: 5px; font-weight: 750; font-size: 14px; }
.button { display: inline-flex; justify-content: center; align-items: center; gap: 8px; min-height: 40px; padding: 10px 15px; border-radius: 9px; border: 1px solid transparent; font: inherit; font-size: 12px; font-weight: 650; cursor: pointer; }
.button.primary { background: #142b49; color: #ffffff; }
.button.primary:hover { background: #203f65; }
.button.secondary { background: #ffffff; border-color: #dce4ee; color: #334155; }
.button.secondary:hover { background: #f3f6fa; }
.full-width { width: 100%; }
.text-button { border: 0; padding: 3px 0; background: transparent; color: #0b7068; font: inherit; font-size: 11px; font-weight: 750; cursor: pointer; }
.text-button:hover { text-decoration: underline; }
.details { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 0 16px; margin: 15px 0; font-size: 13px; }
.details dt, .details dd { padding: 10px 0; margin: 0; border-bottom: 1px solid #edf1f6; }
.details dt { color: #52637a; }
.details dd { color: #142b49; font-weight: 600; }
.table-wrap { width: 100%; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
th { background: #f6f8fc; color: #52637a; font-size: 10px; font-weight: 750; padding: 12px; border-bottom: 1px solid #e2e8f0; }
td { padding: 14px 12px; border-bottom: 1px solid #edf1f6; color: #475569; }
.request-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.request-card { background: #ffffff; border: 1px solid var(--line); border-radius: 14px; padding: 20px; }
.request-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.request-top small { color: var(--muted); font-size: 10px; }
.request-description { color: #334155; font-size: 13px; margin: 8px 0 0; }
.profile-summary { text-align: center; padding: 34px 24px; max-width: 600px; margin: 0 auto; }
.page-footer { display: flex; justify-content: center; align-items: center; margin-top: 28px; padding: 12px 0; color: #52637a; font-size: 10px; }
.record-modal { --width: 520px; --height: auto; --border-radius: 18px; }
.modal-toolbar { --background: #ffffff; --color: #142b49; }
.dialog-content { --background: #ffffff; }
.dialog-body { padding: 24px; }
.dialog-body label { display: block; font-size: 12px; font-weight: 650; margin-bottom: 16px; }
input, select, textarea { display: block; width: 100%; margin-top: 6px; border: 1px solid #d7e0eb; border-radius: 9px; padding: 10px 12px; font: inherit; font-size: 13px; box-sizing: border-box; }
.preview-container { margin-bottom: 16px; }
.proof-preview { max-height: 140px; border-radius: 8px; border: 1px solid var(--line); }
.avatar-preview { width: 70px; height: 70px; border-radius: 10px; object-fit: cover; border: 1px solid var(--line); }
.dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #edf1f6; }
.notice { display: flex; justify-content: space-between; background: #e5f2ee; color: #155e52; border: 1px solid #cfe6dd; padding: 12px; border-radius: 9px; font-size: 13px; margin-bottom: 20px; }
.notice button { background: transparent; border: 0; font-size: 20px; cursor: pointer; color: inherit; }
@media (max-width: 768px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { padding: 16px; }
  .sidebar nav { flex-direction: row; overflow-x: auto; padding-bottom: 8px; }
  .metrics { grid-template-columns: repeat(2, 1fr); }
}
</style>