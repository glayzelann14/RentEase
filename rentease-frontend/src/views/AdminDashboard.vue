<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
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
  peopleOutline,
  businessOutline,
  cardOutline,
  constructOutline,
  documentTextOutline,
  shieldCheckmarkOutline,
  settingsOutline,
  personOutline,
  closeOutline,
  logOutOutline,
  notificationsOutline,
} from 'ionicons/icons';

const router = useRouter();

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

async function showConfirmDialog(headerText: string, messageText: string): Promise<boolean> {
  const alert = await alertController.create({
    header: headerText,
    message: messageText,
    cssClass: 'rentease-messagebox',
    backdropDismiss: false,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Confirm', role: 'confirm' }
    ],
  });
  await alert.present();
  const result = await alert.onDidDismiss();
  return result.role === 'confirm';
}

const state = reactive({
  profile: {
    name: localStorage.getItem('userName') || '',
    email: localStorage.getItem('userEmail') || '',
    mobile: '',
    role: 'System Administrator',
    avatar: '',
  },
  metrics: {
    totalUsers: 45,
    activeOwners: 8,
    activeTenants: 34,
    activeProperties: 12,
  },
  users: [
    { id: 1, name: 'Yvette C. Nituma', email: 'owner@example.com', role: 'Property Owner', status: 'ACTIVE' },
    { id: 2, name: 'Juan Dela Cruz', email: 'tenant@example.com', role: 'Tenant', status: 'ACTIVE' },
    { id: 3, name: 'Maria Santos', email: 'maria@example.com', role: 'Tenant', status: 'PENDING' },
    { id: 4, name: 'Carlo Mendoza', email: 'carlo@example.com', role: 'Tenant', status: 'ACTIVE' },
  ],
  properties: [
    { id: 1, name: 'Soriano Apartment', owner: 'Yvette C. Nituma', units: 3, location: 'Calapan City' },
    { id: 2, name: 'Rivera Residences', owner: 'Yvette C. Nituma', units: 2, location: 'Naujan' },
  ],
  bills: [
    { id: 1, tenant: 'Juan Dela Cruz', unit: 'Soriano Apt - Unit 101', period: 'October 2026', amount: 9700, status: 'UNPAID' },
    { id: 2, tenant: 'Carlo Mendoza', unit: 'Soriano Apt - Unit 102', period: 'October 2026', amount: 8500, status: 'PAID' },
  ],
  maintenance: [
    { id: 1, unit: 'Soriano Apt - Unit 101', category: 'Plumbing', description: 'Shower fixture leaking', status: 'IN PROGRESS' },
    { id: 2, unit: 'Rivera Residences - Unit 201', category: 'Electrical', description: 'Kitchen lighting check', status: 'PENDING' }
  ],
  leases: [
    { id: 1, tenant: 'Juan Dela Cruz', unit: 'Soriano Apt - Unit 101', start: 'Oct. 1, 2026', end: 'Sept. 30, 2027', status: 'ACTIVE' }
  ],
  logs: [
    { id: 1, text: 'Payment Verified: #PAY-089 (₱9,700)', time: 'Today, 09:15 AM' },
    { id: 2, text: 'New Lease Created: Lease #001 (Soriano Apt)', time: 'Yesterday, 02:30 PM' },
    { id: 3, text: 'User Registered: Tenant Account (maria@example.com)', time: 'Oct. 9, 2026' },
  ]
});

onMounted(() => {
  const storedName = localStorage.getItem('userName');
  const storedEmail = localStorage.getItem('userEmail');
  if (storedName) state.profile.name = storedName;
  if (storedEmail) state.profile.email = storedEmail;
});

const section = ref('overview');
const dialogOpen = ref(false);
const detailsModalOpen = ref(false);
const editModalOpen = ref(false);
const selectedItem = ref<any>(null);
const editTargetType = ref('');
const editForm = reactive<any>({});
const profileForm = reactive({
  name: '',
  email: '',
  mobile: '',
  avatar: ''
});

const menu = [
  { id: 'overview', label: 'Dashboard Overview', icon: gridOutline },
  { id: 'users', label: 'User Management', icon: peopleOutline },
  { id: 'properties', label: 'Platform Properties', icon: businessOutline },
  { id: 'billing', label: 'Billing & Payments', icon: cardOutline },
  { id: 'maintenance', label: 'System Maintenance', icon: constructOutline },
  { id: 'leases', label: 'Lease Agreements', icon: documentTextOutline },
  { id: 'security', label: 'Security & Audits', icon: shieldCheckmarkOutline },
  { id: 'settings', label: 'System Settings', icon: settingsOutline },
  { id: 'profile', label: 'Admin Profile', icon: personOutline },
];

const titles: Record<string, string> = {
  overview: 'Admin Portal Overview',
  users: 'User Account Management',
  properties: 'Platform Properties & Units',
  billing: 'System Billing & Collections',
  maintenance: 'System Maintenance Oversight',
  leases: 'Platform Lease Agreements',
  security: 'Security Logs & Audits',
  settings: 'System Configuration',
  profile: 'Admin Profile',
};

const subtitles: Record<string, string> = {
  overview: 'System-wide monitoring, user records, and platform audits.',
  users: 'View, authorize, edit, or delete system accounts.',
  properties: 'Oversee, edit, and manage all registered properties.',
  billing: 'Monitor, edit, or remove tenant billings and statements.',
  maintenance: 'Track, update, or remove repair tickets.',
  leases: 'Review, modify, or terminate lease agreements.',
  security: 'Review system activity logs and security checkpoints.',
  settings: 'Configure platform preferences and maintenance flags.',
  profile: 'Manage your administrator credentials and profile picture.',
};

const initials = computed(() => {
  if (!state.profile.name) return 'AD';
  return state.profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
});

function navigate(target: string) {
  section.value = target;
}

function openDialog() {
  profileForm.name = state.profile.name;
  profileForm.email = state.profile.email;
  profileForm.mobile = state.profile.mobile;
  profileForm.avatar = state.profile.avatar;
  dialogOpen.value = true;
}

function closeDialog() {
  dialogOpen.value = false;
}

function viewDetails(item: any) {
  selectedItem.value = item;
  detailsModalOpen.value = true;
}

function openEditModal(type: string, item: any) {
  editTargetType.value = type;
  selectedItem.value = item;
  Object.keys(item).forEach(key => {
    editForm[key] = item[key];
  });
  editModalOpen.value = true;
}

async function saveEditRecord() {
  const confirmed = await showConfirmDialog('Confirm Update', 'Save changes to this record?');
  if (!confirmed) return;
  Object.keys(editForm).forEach(key => {
    if (selectedItem.value[key] !== undefined) {
      selectedItem.value[key] = editForm[key];
    }
  });
  editModalOpen.value = false;
  await showCustomAlert('Success', 'Record updated successfully!');
}

async function deleteRecord(type: string, id: number) {
  const confirmed = await showConfirmDialog('Confirm Deletion', 'Are you sure you want to delete this record?');
  if (!confirmed) return;
  if (type === 'user') {
    state.users = state.users.filter(u => u.id !== id);
    state.metrics.totalUsers = state.users.length;
  } else if (type === 'property') {
    state.properties = state.properties.filter(p => p.id !== id);
    state.metrics.activeProperties = state.properties.length;
  } else if (type === 'bill') {
    state.bills = state.bills.filter(b => b.id !== id);
  } else if (type === 'maintenance') {
    state.maintenance = state.maintenance.filter(m => m.id !== id);
  } else if (type === 'lease') {
    state.leases = state.leases.filter(l => l.id !== id);
  } else if (type === 'log') {
    state.logs = state.logs.filter(l => l.id !== id);
  }
  await showCustomAlert('Success', 'Record successfully deleted.');
}

function badgeClass(status: string): string {
  if (['ACTIVE', 'VERIFIED', 'PAID', 'LOGGED', 'SECURE'].includes(status)) return 'good';
  if (['PENDING', 'UNPAID', 'IN PROGRESS'].includes(status)) return 'warning';
  if (['SUSPENDED', 'INACTIVE'].includes(status)) return 'danger';
  return 'neutral';
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

async function saveProfile() {
  state.profile.name = profileForm.name;
  state.profile.email = profileForm.email;
  state.profile.mobile = profileForm.mobile;
  state.profile.avatar = profileForm.avatar;
  localStorage.setItem('userName', profileForm.name);
  localStorage.setItem('userEmail', profileForm.email);
  closeDialog();
  await showCustomAlert('RentEase Admin', 'Admin profile updated successfully!');
}

async function triggerSystemMaintenance() {
  await showCustomAlert('System Maintenance', 'System backup initiated successfully!');
}

function logout() {
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  router.push('/login');
}
</script>

<template>
  <IonPage>
    <IonHeader>
      <IonToolbar class="topbar">
        <IonTitle>
          RentEase
          <span class="brand-subtitle">Admin Portal</span>
        </IonTitle>
        <IonButtons slot="end">
          <IonButton @click="navigate('security')">
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
        <aside class="sidebar">
          <div class="owner" @click="navigate('profile')" style="cursor: pointer;">
            <div class="avatar">
              <img v-if="state.profile.avatar" :src="state.profile.avatar" alt="Avatar" />
              <span v-else>{{ initials }}</span>
            </div>
            <div>
              <strong>{{ state.profile.name }}</strong>
              <small>System Admin</small>
            </div>
          </div>
          <p class="nav-label">WORKSPACE</p>
          <nav aria-label="Admin navigation">
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
            <strong>Super Admin Privileges</strong>
            <p>Full control over users, billing, leases, and system audits.</p>
          </div>
        </aside>
        <main class="workspace">
          <div class="page-heading">
            <div>
              <p class="eyebrow">SYSTEM ADMINISTRATION</p>
              <h1>{{ titles[section] || 'Admin Portal' }}</h1>
              <p class="subtitle">{{ subtitles[section] || 'Manage platform settings.' }}</p>
            </div>
            <div class="heading-actions">
              <button
                v-if="section === 'overview' || section === 'settings'"
                type="button"
                class="button primary"
                @click="triggerSystemMaintenance"
              >
                Run System Backup
              </button>
              <button
                v-if="section === 'profile'"
                type="button"
                class="button primary"
                @click="openDialog"
              >
                Edit Profile
              </button>
            </div>
          </div>
          
          <!-- OVERVIEW SECTION -->
          <template v-if="section === 'overview'">
            <div class="metrics">
              <article class="metric">
                <span>Total Users</span>
                <strong>{{ state.metrics.totalUsers }}</strong>
                <small>Owners & Tenants combined</small>
              </article>
              <article class="metric">
                <span>Active Properties</span>
                <strong>{{ state.metrics.activeProperties }}</strong>
                <small>Registered apartments & homes</small>
              </article>
              <article class="metric">
                <span>Active Owners</span>
                <strong>{{ state.metrics.activeOwners }}</strong>
                <small>Property managers</small>
              </article>
              <article class="metric">
                <span>Active Tenants</span>
                <strong>{{ state.metrics.activeTenants }}</strong>
                <small>Verified occupants</small>
              </article>
            </div>
            <div class="dashboard-grid">
              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>Recent System Activity Logs</h2>
                    <p>Platform audit trail</p>
                  </div>
                  <button type="button" class="text-button" @click="navigate('security')">View all logs →</button>
                </div>
                <div v-for="log in state.logs" :key="log.id" class="record-row">
                  <div>
                    <strong>{{ log.text }}</strong>
                    <p>{{ log.time }}</p>
                  </div>
                  <span class="pill good">LOGGED</span>
                </div>
              </section>
              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>Quick Management</h2>
                    <p>Administrative shortcuts</p>
                  </div>
                </div>
                <div class="record-row">
                  <span>User Account Controls</span>
                  <button type="button" class="button secondary" @click="navigate('users')">Manage Users</button>
                </div>
                <div class="record-row">
                  <span>Maintenance Oversight</span>
                  <button type="button" class="button secondary" @click="navigate('maintenance')">View Tickets</button>
                </div>
              </section>
            </div>
          </template>

          <!-- USERS SECTION -->
          <template v-if="section === 'users'">
            <section class="panel">
              <div class="panel-heading">
                <div>
                  <h2>User Account Management</h2>
                  <p>View, edit, or delete registered user accounts</p>
                </div>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="user in state.users" :key="user.id">
                      <td><strong>{{ user.name }}</strong></td>
                      <td>{{ user.email }}</td>
                      <td>{{ user.role }}</td>
                      <td><span class="pill" :class="badgeClass(user.status)">{{ user.status }}</span></td>
                      <td>
                        <button type="button" class="text-button" @click="viewDetails(user)" style="margin-right: 8px;">View</button>
                        <button type="button" class="text-button" @click="openEditModal('user', user)" style="margin-right: 8px;">Edit</button>
                        <button type="button" class="text-button danger-text" @click="deleteRecord('user', user.id)">Delete</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </template>

          <!-- PROFILE SECTION -->
          <template v-if="section === 'profile'">
            <section class="panel profile-summary">
              <div class="avatar large">
                <img v-if="state.profile.avatar" :src="state.profile.avatar" alt="Avatar" />
                <span v-else>{{ initials }}</span>
              </div>
              <h2>{{ state.profile.name }}</h2>
              <span class="pill good">System Administrator</span>
              <dl class="details" style="text-align: left; margin-top: 20px;">
                <dt>Full Name</dt>
                <dd>{{ state.profile.name }}</dd>
                <dt>Email Address</dt>
                <dd>{{ state.profile.email }}</dd>
                <dt>Mobile Number</dt>
                <dd>{{ state.profile.mobile }}</dd>
                <dt>Account Role</dt>
                <dd>{{ state.profile.role }}</dd>
              </dl>
              <button type="button" class="button primary" style="margin-top: 20px;" @click="openDialog">Edit Admin Profile</button>
            </section>
          </template>

          <footer class="page-footer">
            <span>RentEase · Admin Portal</span>
          </footer>
        </main>
      </div>
    </IonContent>

    <!-- EDIT PROFILE MODAL -->
    <IonModal :is-open="dialogOpen" class="record-modal" @didDismiss="closeDialog">
      <IonHeader>
        <IonToolbar class="modal-toolbar">
          <IonTitle>Edit Admin Profile</IonTitle>
          <IonButtons slot="end">
            <IonButton @click="closeDialog">
              <IonIcon :icon="closeOutline" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent class="dialog-content">
        <div class="dialog-body">
          <form @submit.prevent="saveProfile">
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
            <div v-if="profileForm.avatar" class="preview-container" style="margin-top:10px;">
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
.owner { display: flex; align-items: center; gap: 11px; padding: 0 4px 24px; border-bottom: 1px solid var(--line); cursor: pointer; }
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
.workspace { min-width: 0; padding: clamp(20px, 2.2vw, 36px); color: #142b49; background: #f4f7fb; }
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
.button { display: inline-flex; justify-content: center; align-items: center; gap: 8px; min-height: 40px; padding: 10px 15px; border-radius: 9px; border: 1px solid transparent; font: inherit; font-size: 12px; font-weight: 650; cursor: pointer; }
.button.primary { background: #142b49; color: #ffffff; }
.button.primary:hover { background: #203f65; }
.button.secondary { background: #ffffff; border-color: #dce4ee; color: #334155; }
.button.secondary:hover { background: #f3f6fa; }
.text-button { border: 0; padding: 3px 0; background: transparent; color: #0b7068; font: inherit; font-size: 11px; font-weight: 750; cursor: pointer; }
.text-button:hover { text-decoration: underline; }
.danger-text { color: #991b1b; }
.table-wrap { width: 100%; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
th { background: #f6f8fc; color: #52637a; font-size: 10px; font-weight: 750; padding: 12px; border-bottom: 1px solid #e2e8f0; }
td { padding: 14px 12px; border-bottom: 1px solid #edf1f6; color: #475569; }
.profile-summary { text-align: center; padding: 34px 24px; max-width: 600px; margin: 0 auto; }
.details { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 0 16px; margin: 15px 0; font-size: 13px; }
.details dt, .details dd { padding: 10px 0; margin: 0; border-bottom: 1px solid #edf1f6; }
.details dt { color: #52637a; text-transform: capitalize; }
.details dd { color: #142b49; font-weight: 600; }
.page-footer { display: flex; justify-content: center; align-items: center; margin-top: 28px; padding: 12px 0; color: #52637a; font-size: 10px; }
.record-modal { --width: 520px; --height: auto; --border-radius: 18px; }
.modal-toolbar { --background: #ffffff; --color: #142b49; }
.dialog-content { --background: #ffffff; }
.dialog-body { padding: 24px; }
.dialog-body label { display: block; font-size: 12px; font-weight: 650; margin-bottom: 16px; color: #142b49; }
input, select, textarea { display: block; width: 100%; margin-top: 6px; border: 1px solid #d7e0eb; border-radius: 9px; padding: 10px 12px; font: inherit; font-size: 13px; box-sizing: border-box; background: #ffffff; color: #142b49; }
.avatar-preview { width: 70px; height: 70px; border-radius: 10px; object-fit: cover; border: 1px solid var(--line); }
.dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #edf1f6; }
@media (max-width: 768px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { padding: 16px; }
  .sidebar nav { flex-direction: row; overflow-x: auto; padding-bottom: 8px; }
  .metrics { grid-template-columns: repeat(2, 1fr); }
}
</style>