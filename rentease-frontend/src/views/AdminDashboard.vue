<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { restoreSession } from '@/services/auth';
import { getAdminOverview } from '@/services/adminOverview';
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
  menuOutline,
  chevronForwardOutline,
  sparklesOutline,
  timeOutline,
  checkmarkCircleOutline,
  addOutline,
  refreshOutline,
  searchOutline,
  arrowForwardOutline,
  flashOutline,
  homeOutline,
  trendingUpOutline,
  walletOutline,
  listOutline,
} from 'ionicons/icons';

const router = useRouter();
const API_BASE = 'http://localhost:5000/api';

const usersLoading = ref(false);
const overviewLoading = ref(false);
const overviewError = ref('');
const auditLoading = ref(false);
const auditError = ref('');
const auditType = ref('all');
const auditOutcome = ref('all');
const auditPage = ref(1);
const auditTotal = ref(0);
const auditPageSize = 25;
type AuditRow = { id: number; text: string; time: string; eventType: string; outcome: string; actorRole: string; actorUserId: number | null; targetUserId: number | null };

const userActionLoading = ref<number | null>(null);

function normalizeUserStatus(status: unknown): string {
  const value = String(status ?? 'PENDING').toUpperCase();

  if (value === 'ACTIVE') return 'ACTIVE';
  if (value === 'PENDING') return 'PENDING';
  if (value === 'REJECTED') return 'REJECTED';
  if (value === 'SUSPENDED') return 'SUSPENDED';
  if (value === 'INACTIVE') return 'INACTIVE';

  return value;
}

function normalizeUserRole(role: unknown): string {
  const value = String(role ?? '').toLowerCase();

  if (value === 'owner' || value === 'property owner') {
    return 'Property Owner';
  }

  if (value === 'tenant') return 'Tenant';

  if (
    value === 'admin' ||
    value === 'system administrator'
  ) {
    return 'System Administrator';
  }

  return String(role ?? 'Unknown');
}

async function getApiError(response: Response): Promise<string> {
  const result = await response.json().catch(() => ({}));

  return result.message || result.error ||
    `Request failed with status ${response.status}.`;
}

async function fetchUsers() {
  usersLoading.value = true;

  try {
    const response = await fetch(`${API_BASE}/admin/users`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(await getApiError(response));
    }

    const result = await response.json();
    const records = Array.isArray(result) ? result : result.users;

    if (!Array.isArray(records)) {
      throw new Error('The server returned an invalid users list.');
    }

    state.users = records.map((record: any) => ({
      id: Number(record.user_id ?? record.id),
      name: String(record.full_name ?? record.name ?? ''),
      email: String(record.email ?? ''),
      role: normalizeUserRole(record.role),
      status: normalizeUserStatus(
        record.account_status ?? record.status
      ),
    }));

    state.metrics.totalUsers = state.users.length;
    state.metrics.activeOwners = state.users.filter(
      user => user.role === 'Property Owner' && user.status === 'ACTIVE'
    ).length;
    state.metrics.activeTenants = state.users.filter(
      user => user.role === 'Tenant' && user.status === 'ACTIVE'
    ).length;
  } catch (error) {
    console.error('Failed to fetch users:', error);

    await showCustomAlert(
      'Unable to Load Users',
      error instanceof Error
        ? error.message
        : 'Could not retrieve user accounts. Check whether the backend is running.'
    );
  } finally {
    usersLoading.value = false;
  }
}

async function updateUserAccount(
  user: any,
  action: 'approve' | 'reject'
) {
  if (userActionLoading.value !== null) return;

  const expectedStatus = action === 'approve' ? 'PENDING' : 'PENDING';

  if (user.status !== expectedStatus) {
    await showCustomAlert(
      'Account Already Processed',
      'Only pending accounts can be approved or rejected.'
    );
    return;
  }

  const confirmed = await showConfirmDialog(
    action === 'approve' ? 'Approve Account' : 'Reject Account',
    action === 'approve'
      ? `Approve the account for ${user.name} (${user.email})?`
      : `Are you sure you want to reject ${user.name}'s account?`
  );

  if (!confirmed) return;

  userActionLoading.value = user.id;

  try {
    const response = await fetch(
      `${API_BASE}/admin/users/${user.id}/${action}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(await getApiError(response));
    }

    const result = await response.json().catch(() => ({}));

    // Refresh the list from the database instead of trusting
    // a frontend-only status change.
    await fetchUsers();

    // Persistent audit events require a dedicated backend; do not invent them.

    await showCustomAlert(
      action === 'approve' ? 'Account Approved' : 'Account Rejected',
      result.message ||
        (action === 'approve'
          ? `${user.name}'s account has been approved.`
          : `${user.name}'s account has been rejected.`)
    );
  } catch (error) {
    console.error(`Failed to ${action} user:`, error);

    await showCustomAlert(
      'Update Failed',
      error instanceof Error
        ? error.message
        : 'The account status could not be updated.'
    );
  } finally {
    userActionLoading.value = null;
  }
}

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

async function showConfirmDialog(
  headerText: string,
  messageText: string
): Promise<boolean> {
  const alert = await alertController.create({
    header: headerText,
    message: messageText,
    cssClass: 'rentease-messagebox',
    backdropDismiss: false,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Confirm', role: 'confirm' },
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
    totalUsers: 0,
    activeOwners: 0,
    activeTenants: 0,
    activeProperties: 0,
  },

  users: [] as Array<{id:number;name:string;email:string;role:string;status:string}>,

  properties: [] as Array<{id:number;name:string;owner:string;units:number;location:string}>,
  bills: [] as Array<{id:number;tenant:string;unit:string;period:string;amount:number;status:string}>,
  maintenance: [] as Array<{id:number;unit:string;category:string;description:string;status:string}>,
  leases: [] as Array<{id:number;tenant:string;unit:string;start:string;end:string;status:string}>,
  // Audit trail requires a dedicated persistent backend. Never show fake events.
  logs: [] as AuditRow[],
});

async function fetchAuditEvents(page = 1) {
  if (auditLoading.value) return;
  auditLoading.value = true;
  auditError.value = '';
  try {
    const params = new URLSearchParams({
      page: String(page), type: auditType.value, outcome: auditOutcome.value,
    });
    const response = await fetch(`${API_BASE}/admin/audit-events?${params}`, {
      credentials: 'include', headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(await getApiError(response));
    const data = await response.json();
    if (!Array.isArray(data.events)) throw new Error('Unable to read security history.');
    state.logs = data.events.map((event: any) => ({
      id: Number(event.event_id),
      text: String(event.description),
      time: new Date(event.occurred_at).toLocaleString('en-PH'),
      eventType: String(event.event_type),
      outcome: String(event.outcome),
      actorRole: event.actor_role ? String(event.actor_role) : 'Guest',
      actorUserId: event.actor_user_id == null ? null : Number(event.actor_user_id),
      targetUserId: event.target_user_id == null ? null : Number(event.target_user_id),
    }));
    auditTotal.value = Number(data.total || 0);
    auditPage.value = Number(data.page || page);
  } catch (e) {
    auditError.value = e instanceof Error ? e.message : 'Unable to load security activity.';
    state.logs = [];
  } finally { auditLoading.value = false; }
}
async function fetchPlatformOverview() {
  if (overviewLoading.value) return;
  overviewLoading.value = true;
  overviewError.value = '';
  try {
    const data = await getAdminOverview();
    state.properties = data.properties;
    state.bills = data.bills;
    state.maintenance = data.maintenance;
    state.leases = data.leases;
    state.metrics.activeProperties = data.properties.length;
  } catch (error: any) {
    overviewError.value = error?.response?.data?.message || error?.message || 'Unable to load PostgreSQL overview.';
    state.properties = [];
    state.bills = [];
    state.maintenance = [];
    state.leases = [];
  } finally {
    overviewLoading.value = false;
  }
}

onMounted(async () => {
  try {
    const user = await restoreSession();
    if (!user) { await router.replace('/login'); return; }
    if (user.role !== 'admin') {
      await router.replace(user.role === 'owner' ? '/owner' : user.role === 'tenant' ? '/tenant' : '/login');
      return;
    }
    state.profile.name = user.name || '';
    state.profile.email = user.email || '';
    await Promise.all([fetchUsers(), fetchPlatformOverview(), fetchAuditEvents()]);
  } catch (error) {
    overviewError.value = error instanceof Error ? error.message : 'Could not verify administrator session.';
  }
});

const section = ref('overview');
const mobileMenuOpen = ref(false);
const globalSearch = ref('');
const todayLabel = new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());

const userSearch = ref('');
const propertySearch = ref('');
const propertyLocationFilter = ref('ALL');

const propertyFormOpen = ref(false);
const propertyForm = reactive({
  name: '',
  owner: '',
  units: 1,
  location: '',
});

const userRoleFilter = ref('ALL');
const userStatusFilter = ref('ALL');

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
  avatar: '',
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
  users: 'Review registered users and approve or reject new accounts.',
  properties: 'Monitor all registered properties and available units.',
  billing: 'Review live platform-wide billing records.',
  maintenance: 'Monitor live repair requests across rental properties.',
  leases: 'Review registered lease agreements and their status.',
  security: 'Audit logging awaits a dedicated persistent backend.',
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

const filteredUsers = computed(() => {
  const query = userSearch.value.trim().toLowerCase();

  return state.users.filter(user => {
    const matchesSearch =
      !query ||
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      String(user.id).includes(query);

    const normalizedRole = user.role.toLowerCase();

    const matchesRole =
      userRoleFilter.value === 'ALL' ||
      (userRoleFilter.value === 'TENANT' &&
        normalizedRole.includes('tenant')) ||
      (userRoleFilter.value === 'OWNER' &&
        normalizedRole.includes('owner')) ||
      (userRoleFilter.value === 'ADMIN' &&
        normalizedRole.includes('admin'));

    const matchesStatus =
      userStatusFilter.value === 'ALL' ||
      user.status === userStatusFilter.value;

    return matchesSearch && matchesRole && matchesStatus;
  });
});

const filteredProperties = computed(() => {
  const query = propertySearch.value.trim().toLowerCase();

  return state.properties.filter(property => {
    const matchesSearch =
      !query ||
      property.name.toLowerCase().includes(query) ||
      property.owner.toLowerCase().includes(query) ||
      property.location.toLowerCase().includes(query) ||
      String(property.id).includes(query);

    const matchesLocation =
      propertyLocationFilter.value === 'ALL' ||
      property.location === propertyLocationFilter.value;

    return matchesSearch && matchesLocation;
  });
});

const propertyUnitTotal = computed(() =>
  state.properties.reduce(
    (total, property) => total + Number(property.units || 0),
    0
  )
);

const propertyLocations = computed(() =>
  [...new Set(state.properties.map(property => property.location).filter(Boolean))]
);

const totalBilled = computed(() => state.bills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0));
const liveStats = computed(() => [
  { label: 'Registered users', value: state.users.length.toLocaleString(), detail: `${state.users.filter(u => u.status === 'PENDING').length} pending approvals`, icon: peopleOutline, tint: 'indigo', section: 'users' },
  { label: 'Properties', value: state.properties.length.toLocaleString(), detail: `${propertyUnitTotal.value} rental units across the platform`, icon: businessOutline, tint: 'sky', section: 'properties' },
  { label: 'Active leases', value: state.leases.filter(l => l.status === 'ACTIVE').length.toLocaleString(), detail: `${state.leases.length} total lease agreements`, icon: documentTextOutline, tint: 'mint', section: 'leases' },
  { label: 'Total billing', value: `₱${totalBilled.value.toLocaleString('en-PH', {maximumFractionDigits: 2})}`, detail: `${state.bills.length} billing records`, icon: walletOutline, tint: 'violet', section: 'billing' },
  { label: 'Unpaid bills', value: state.bills.filter(b => b.status === 'UNPAID').length.toLocaleString(), detail: 'Requires follow-up', icon: cardOutline, tint: 'amber', section: 'billing' },
  { label: 'Maintenance tickets', value: state.maintenance.length.toLocaleString(), detail: `${state.maintenance.filter(m => m.status !== 'COMPLETED' && m.status !== 'CANCELLED').length} open requests`, icon: constructOutline, tint: 'coral', section: 'maintenance' }
]);
const userRoleMix = computed(() => {
  const total = Math.max(1, state.users.length);
  const owners = state.users.filter(u => u.role === 'Property Owner').length;
  const tenants = state.users.filter(u => u.role === 'Tenant').length;
  return { owners, tenants, ownerPercent: Math.round(owners / total * 100), tenantPercent: Math.round(tenants / total * 100) };
});
const maintenanceStatusMix = computed(() => {
  const statuses = ['PENDING', 'ASSIGNED', 'IN PROGRESS', 'COMPLETED', 'CANCELLED'];
  return statuses.map(status => ({ status, count: state.maintenance.filter(m => m.status === status).length }));
});
function searchEverywhere() {
  const q = globalSearch.value.trim();
  if (!q) return;
  userSearch.value = q;
  propertySearch.value = q;
  navigate('users');
}

const userCounts = computed(() => ({
  total: state.users.length,
  active: state.users.filter(user => user.status === 'ACTIVE').length,
  pending: state.users.filter(user => user.status === 'PENDING').length,
  suspended: state.users.filter(user =>
    ['SUSPENDED', 'INACTIVE'].includes(user.status)
  ).length,
}));

function navigate(target: string) {
  section.value = target;
  mobileMenuOpen.value = false;
  if (target === 'users') void fetchUsers();
  if (target === 'security') void fetchAuditEvents();
  if (['overview','properties','billing','maintenance','leases'].includes(target)) void fetchPlatformOverview();
}

async function openAddProperty() {
  await showCustomAlert('Read-only overview', 'Properties must be registered through the owner portal.');
}

async function addProperty() {
  propertyFormOpen.value = false;
  await showCustomAlert('Read-only overview', 'Properties are created by owners. Admin property creation is not connected to PostgreSQL.');
}



async function approveUser(user: any) {
  await updateUserAccount(user, 'approve');
}

async function rejectUser(user: any) {
  await updateUserAccount(user, 'reject');
}

async function toggleUserStatus(_user: any) {
  await showCustomAlert('Not available yet', 'Suspension and reactivation require a secured backend endpoint.');
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

const detailModalMeta = computed(() => {
  const item = selectedItem.value || {};
  if ('owner' in item && 'location' in item) return { kicker: 'PROPERTY RECORD', title: String(item.name || 'Property Details'), subtitle: 'Property, ownership and location information.', badge: 'Property', icon: businessOutline };
  if ('email' in item && 'role' in item) return { kicker: 'USER ACCOUNT', title: String(item.name || 'User Details'), subtitle: 'Account details and access information.', badge: 'User', icon: peopleOutline };
  if ('period' in item && 'amount' in item) return { kicker: 'BILLING RECORD', title: String(item.tenant || 'Billing Details'), subtitle: 'Charges, payment status and billing period.', badge: 'Billing', icon: cardOutline };
  if ('category' in item && 'description' in item) return { kicker: 'MAINTENANCE REQUEST', title: String(item.category || 'Maintenance Details'), subtitle: 'Repair issue and current request status.', badge: 'Maintenance', icon: constructOutline };
  if ('start' in item && 'end' in item) return { kicker: 'LEASE AGREEMENT', title: String(item.tenant || 'Lease Details'), subtitle: 'Lease period, rental unit and agreement status.', badge: 'Lease', icon: documentTextOutline };
  return { kicker: 'PLATFORM RECORD', title: 'Record Details', subtitle: 'Selected information from the platform.', badge: 'Record', icon: documentTextOutline };
});
function detailLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, char => char.toUpperCase());
}
function detailValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString('en-PH') : String(value);
  return String(value);
}
const detailEntries = computed(() => Object.entries(selectedItem.value || {}).map(([key, value]) => ({key, label: detailLabel(key), value: detailValue(value)})));

async function openEditModal(type: string, item: any) {
  await showCustomAlert('Read-only overview', 'Admin editing is not available until a secure backend route is implemented.');
}

async function saveEditRecord() {
  editModalOpen.value = false;
  await showCustomAlert('Read-only overview', 'Administrative edits are disabled until authorized database endpoints are implemented.');
}

async function deleteRecord(_type: string, _id: number) {
  await showCustomAlert('Read-only overview', 'Deletion is disabled to protect live rental, billing and payment records.');
}

function badgeClass(status: string): string {
  if (['ACTIVE', 'VERIFIED', 'PAID', 'LOGGED', 'SECURE'].includes(status)) {
    return 'good';
  }

  if (['PENDING', 'UNPAID', 'IN PROGRESS'].includes(status)) {
    return 'warning';
  }

  if (['SUSPENDED', 'INACTIVE', 'REJECTED'].includes(status)) {
    return 'danger';
  }

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

  await showCustomAlert(
    'RentEase Admin',
    'Admin profile preview changed in this browser only. Database profile updates are not configured.'
  );
}

async function triggerSystemMaintenance() {
  await showCustomAlert(
    'System Maintenance',
    'This is a demonstration action. No server backup has been performed.'
  );
}

async function logout() {
  const confirmed = await showConfirmDialog(
    'Confirm Logout',
    'Are you sure you want to log out of your admin account?'
  );

  if (!confirmed) return;

  try {
    const response = await fetch('http://localhost:5000/api/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Unable to end the server session.');
    }

    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');

    await router.replace('/login');
  } catch (error) {
    console.error('Admin logout failed:', error);

    await showCustomAlert(
      'Logout Failed',
      'Unable to log out. Please try again.'
    );
  }
}
</script>

<template>
  <IonPage>
    <IonHeader>
      <IonToolbar class="topbar">
        <div class="toolbar-brand" slot="start">
          <button type="button" class="mobile-menu-button" aria-label="Toggle navigation menu" aria-controls="rentease-admin-navigation" :aria-expanded="mobileMenuOpen" @click="mobileMenuOpen = !mobileMenuOpen">
            <IonIcon :icon="menuOutline" />
          </button>
          <span class="brand-mark"><IonIcon :icon="homeOutline" /></span>
          <div class="brand-wordmark"><strong>RentEase<span class="brand-dot">.</span></strong><small>ADMIN CONSOLE</small></div>
        </div>
        <div class="global-search" slot="start">
          <IonIcon :icon="searchOutline" />
          <input v-model="globalSearch" type="search" placeholder="Find users or properties..." aria-label="Search registered users and properties" @keydown.enter="searchEverywhere" />
          <button type="button" title="Search" @click="searchEverywhere">Search</button>
        </div>
        <IonButtons slot="end" class="topbar-actions">
          <span class="topbar-date">{{ todayLabel }}</span>
          <IonButton class="header-icon" aria-label="View audit activity" @click="navigate('security')">
            <IonIcon :icon="shieldCheckmarkOutline" />
          </IonButton>
          <button type="button" class="topbar-profile" aria-label="Open administrator profile" @click="navigate('profile')">{{ initials }}</button>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent class="portal">
      <div class="layout">
        <button
          v-if="mobileMenuOpen"
          type="button"
          class="mobile-nav-backdrop"
          aria-label="Close navigation"
          @click="mobileMenuOpen = false"
        ></button>
        <aside id="rentease-admin-navigation" class="sidebar" :class="{ 'mobile-open': mobileMenuOpen }">
          <div class="sidebar-profile" role="button" tabindex="0" @click="navigate('profile')" @keydown.enter="navigate('profile')">
            <div class="avatar">
              <img
                v-if="state.profile.avatar"
                :src="state.profile.avatar"
                alt="Avatar"
              />
              <span v-else>{{ initials }}</span>
            </div>

            <div>
              <strong>{{ state.profile.name || 'System Admin' }}</strong>
              <small>Platform Administrator</small>
            </div>
          </div>

          <p class="nav-label">MANAGEMENT WORKSPACE</p>

          <nav aria-label="Admin navigation">
            <button
              v-for="item in menu"
              :key="item.id"
              type="button"
              :class="{ active: section === item.id }"
              :aria-current="section === item.id ? 'page' : undefined"
              @click="navigate(item.id)"
            >
              <IonIcon :icon="item.icon" />
              <span>{{ item.label }}</span>
              <span v-if="item.id === 'users' && userCounts.pending" class="nav-count">{{ userCounts.pending }}</span>
              <IonIcon v-else-if="section === item.id" :icon="chevronForwardOutline" class="nav-chevron" />
            </button>
          </nav>

          <button type="button" class="sidebar-logout" @click="logout">
            <IonIcon :icon="logOutOutline" />
            <span>Logout</span>
          </button>

          <div class="sidebar-note">
            <span class="note-icon"><IonIcon :icon="shieldCheckmarkOutline" /></span>
            <strong>Administrator access</strong>
            <p>Monitor your rentals, users and activity from one beautiful workspace.</p>
          </div>
        </aside>

        <main class="workspace">
          <div class="page-heading">
            <div>
              <div class="heading-trail"><span>Workspace</span><IonIcon :icon="chevronForwardOutline" /><strong>{{ menu.find(item => item.id === section)?.label }}</strong></div>
              <p class="eyebrow">RENTEASE · SYSTEM ADMINISTRATION</p>
              <h1>{{ titles[section] || 'Admin Portal' }}</h1>
              <p class="subtitle">
                {{ subtitles[section] || 'Manage platform settings.' }}
              </p>
            </div>

            <div class="heading-actions">
              <button
                v-if="section === 'overview' || section === 'settings'"
                type="button"
                class="button primary"
                @click="triggerSystemMaintenance"
              >
                Preview Backup Action
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

          <div v-if="overviewError" class="notice" role="alert" style="margin-bottom:16px;color:#a52d2d">
            PostgreSQL overview: {{ overviewError }}
            <button type="button" class="button secondary" @click="fetchPlatformOverview">Retry</button>
          </div>
          <div v-if="overviewLoading" role="status" style="margin-bottom:12px">Loading platform data from PostgreSQL...</div>
          <!-- DASHBOARD OVERVIEW -->
          <section v-if="section === 'overview'" class="section-content">
            <div class="welcome-banner">
              <div class="welcome-copy">
                <span class="welcome-kicker"><IonIcon :icon="sparklesOutline" /> RENTAL OPERATIONS · LIVE OVERVIEW</span>
                <h2>Welcome back, {{ state.profile.name?.split(' ')[0] || 'Admin' }} <span class="wave">✦</span></h2>
                <p>A clearer view of everything happening across RentEase. Review accounts, monitor rental operations, and stay on top of requests.</p>
                <div class="hero-actions">
                  <button type="button" class="welcome-cta" @click="navigate('users')"><IonIcon :icon="peopleOutline" /> Review accounts <IonIcon :icon="arrowForwardOutline" /></button>
                  <button type="button" class="welcome-cta outline" :disabled="overviewLoading || usersLoading" @click="fetchUsers(); fetchPlatformOverview()"><IonIcon :icon="refreshOutline" /> Refresh data</button>
                </div>
              </div>
              <div class="welcome-visual" aria-hidden="true"><div class="visual-orbit orbit-one"></div><div class="visual-orbit orbit-two"></div><IonIcon :icon="businessOutline" /></div>
              <div class="hero-date"><IonIcon :icon="timeOutline" /><span>{{ todayLabel }}<small>System administrator</small></span></div>
            </div>
            <div class="section-mini-heading"><div><span class="mini-kicker">AT A GLANCE</span><h2>Platform performance</h2></div><span class="mini-date"><IonIcon :icon="timeOutline" /> Live PostgreSQL data</span></div>
            <div class="stats-grid overview-stats">
              <button v-for="stat in liveStats" :key="stat.label" type="button" class="stat-card metric-action" :class="'metric-' + stat.tint" @click="navigate(stat.section)" :aria-label="'Open ' + stat.label">
                <span class="stat-icon" :class="stat.tint"><IonIcon :icon="stat.icon" /></span>
                <span class="stat-copy"><span class="stat-label">{{ stat.label }}</span><strong class="stat-value">{{ stat.value }}</strong><span class="stat-detail">{{ stat.detail }}</span></span>
                <IonIcon class="stat-arrow" :icon="arrowForwardOutline" />
              </button>
            </div>
            <div class="insight-grid">
              <article class="panel insight-panel">
                <div class="panel-heading"><div><h2><IonIcon :icon="peopleOutline" /> User distribution</h2><p>Registered tenant and owner accounts</p></div><button type="button" class="button secondary" @click="navigate('users')">View users <IonIcon :icon="arrowForwardOutline" /></button></div>
                <div class="distribution-layout">
                  <div class="distribution-ring" :style="{ '--tenant-share': userRoleMix.tenantPercent + '%' }"><div class="ring-center"><strong>{{ state.users.length }}</strong><small>Accounts</small></div></div>
                  <div class="distribution-legend"><div><i class="legend-dot tenant-dot"></i><span>Tenants</span><strong>{{ userRoleMix.tenants }}</strong></div><div><i class="legend-dot owner-dot"></i><span>Property owners</span><strong>{{ userRoleMix.owners }}</strong></div><p>Based on the registered users returned by the existing admin API.</p></div>
                </div>
              </article>
              <article class="panel insight-panel">
                <div class="panel-heading"><div><h2><IonIcon :icon="constructOutline" /> Maintenance pipeline</h2><p>Current repair request status</p></div><button type="button" class="button secondary" @click="navigate('maintenance')">View tickets <IonIcon :icon="arrowForwardOutline" /></button></div>
                <div class="pipeline-list"><div v-for="item in maintenanceStatusMix" :key="item.status" class="pipeline-item"><span>{{ item.status.replace(/_/g, ' ') }}</span><div class="pipeline-track"><div :style="{width: state.maintenance.length ? (item.count / state.maintenance.length * 100) + '%' : '0%'}"></div></div><strong>{{ item.count }}</strong></div></div>
                <p class="insight-footnote">Live totals from maintenance requests. No estimated or fabricated trends.</p>
              </article>
            </div>
            <div class="content-grid">
              <article class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>Recent Activity</h2>
                    <p>Recent account and access activity</p>
                  </div>
                  <button class="button secondary" @click="navigate('security')">
                    View Audit Logs
                  </button>
                </div>

                <div v-if="state.logs.length" class="activity-list">
                  <div v-for="log in state.logs.slice(0, 5)" :key="log.id" class="activity-item">
                    <span class="activity-dot"></span>
                    <div class="activity-copy">
                      <strong>{{ log.text }}</strong>
                      <small>{{ log.time }}</small>
                    </div>
                  </div>
                </div>
                <div v-else class="empty-state">
                  <IonIcon :icon="documentTextOutline" />
                  <p>No recent activities recorded.</p>
                </div>
              </article>

              <article class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>Quick Actions</h2>
                    <p>Go directly to a management section</p>
                  </div>
                </div>

                <div class="quick-actions">
                  <button @click="navigate('users')">
                    <IonIcon :icon="peopleOutline" />
                    <span><strong>Manage Users</strong><small>Accounts and access</small></span>
                  </button>
                  <button @click="navigate('properties')">
                    <IonIcon :icon="businessOutline" />
                    <span><strong>Manage Properties</strong><small>Properties and units</small></span>
                  </button>
                  <button @click="navigate('billing')">
                    <IonIcon :icon="cardOutline" />
                    <span><strong>Review Payments</strong><small>Billing records</small></span>
                  </button>
                  <button @click="navigate('maintenance')">
                    <IonIcon :icon="constructOutline" />
                    <span><strong>Maintenance</strong><small>Repair requests</small></span>
                  </button>
                </div>
              </article>
            </div>
          </section>

          <!-- USER MANAGEMENT -->
          <section v-else-if="section === 'users'" class="section-content">
            <div class="stats-grid four">
              <article class="stat-card"><div><p>Total Users</p><h2>{{ userCounts.total }}</h2></div></article>
              <article class="stat-card"><div><p>Active</p><h2>{{ userCounts.active }}</h2></div></article>
              <article class="stat-card"><div><p>Pending</p><h2>{{ userCounts.pending }}</h2></div></article>
              <article class="stat-card"><div><p>Suspended</p><h2>{{ userCounts.suspended }}</h2></div></article>
            </div>

            <article class="panel">
              <div class="panel-heading">
  <div>
    <h2>Registered Users</h2>
    <p>
      Search and manage platform accounts
      <span v-if="usersLoading"> — Loading users...</span>
    </p>
  </div>

  <button
    type="button"
    class="button secondary"
    :disabled="usersLoading"
    @click="fetchUsers"
  >
    <IonIcon :icon="refreshOutline" :class="{ 'spin-icon': usersLoading }" /> {{ usersLoading ? 'Refreshing...' : 'Refresh Users' }}
  </button>
</div>

              <div class="filter-bar">
                <input v-model="userSearch" type="search" placeholder="Search name, email, or ID..." />
                <select v-model="userRoleFilter">
                  <option value="ALL">All roles</option>
                  <option value="TENANT">Tenant</option>
                  <option value="OWNER">Property Owner</option>
                  <option value="ADMIN">Administrator</option>
                </select>
                <select v-model="userStatusFilter">
                  <option value="ALL">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <button class="button secondary" @click="userSearch = ''; userRoleFilter = 'ALL'; userStatusFilter = 'ALL'">
                  Clear
                </button>
              </div>

              <div class="table-wrap">
                <table>
                  <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>ID</th><th>Actions</th></tr></thead>
                  <tbody>
                    <tr v-for="user in filteredUsers" :key="user.id">
                      <td><strong>{{ user.name }}</strong></td>
                      <td>{{ user.email }}</td>
                      <td>{{ user.role }}</td>
                      <td><span class="status-badge" :class="badgeClass(user.status)">{{ user.status }}</span></td>
                      <td>#{{ user.id }}</td>
                      <td>
                        <div class="table-actions">
                          <button
  v-if="user.status === 'PENDING'"
  class="text-button approve-text"
  :disabled="userActionLoading !== null"
  @click="approveUser(user)"
>
  {{ userActionLoading === user.id ? 'Processing...' : 'Approve' }}
</button>

<button
  v-if="user.status === 'PENDING'"
  class="text-button danger-text"
  :disabled="userActionLoading !== null"
  @click="rejectUser(user)"
>
  {{ userActionLoading === user.id ? 'Processing...' : 'Reject' }}
</button>
                          <button class="text-button" @click="viewDetails(user)">View</button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="filteredUsers.length === 0"><td colspan="6" class="empty-cell">No matching users found.</td></tr>
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <!-- PLATFORM PROPERTIES -->
          <section v-else-if="section === 'properties'" class="section-content">
            <div class="stats-grid">
              <article class="stat-card"><div><p>Registered Properties</p><h2>{{ state.properties.length }}</h2></div></article>
              <article class="stat-card"><div><p>Total Rental Units</p><h2>{{ propertyUnitTotal }}</h2></div></article>
              <article class="stat-card"><div><p>Locations</p><h2>{{ propertyLocations.length }}</h2></div></article>
            </div>

            <article class="panel">
              <div class="panel-heading">
                <div><h2>All Properties</h2><p>Live properties and unit counts from PostgreSQL</p></div>
                <button type="button" class="button secondary" :disabled="overviewLoading" @click="fetchPlatformOverview"><IonIcon :icon="refreshOutline" /> Refresh Properties</button>
              </div>

              <div class="filter-bar">
                <input v-model="propertySearch" type="search" placeholder="Search property, owner, location, ID..." />
                <select v-model="propertyLocationFilter">
                  <option value="ALL">All locations</option>
                  <option v-for="location in propertyLocations" :key="location" :value="location">{{ location }}</option>
                </select>
                <button class="button secondary" @click="propertySearch = ''; propertyLocationFilter = 'ALL'">Clear</button>
              </div>

              <div v-if="filteredProperties.length" class="property-grid property-showcase-grid">
                <article v-for="(property, index) in filteredProperties" :key="property.id" class="property-card property-showcase">
                  <div class="property-cover" :class="'property-cover-' + (index % 3)">
                    <div class="cover-grid" aria-hidden="true"></div>
                    <div class="cover-topline">
                      <span class="cover-eyebrow"><IonIcon :icon="businessOutline" /> RENTAL PROPERTY</span>
                      <span class="cover-number">#{{ String(property.id).padStart(3, '0') }}</span>
                    </div>
                    <div class="cover-illustration" aria-hidden="true">
                      <span class="building building-back"></span>
                      <span class="building building-main"></span>
                      <span class="building building-front"></span>
                    </div>
                    <div class="cover-bottomline">
                      <span class="cover-location"><IonIcon :icon="businessOutline" /> {{ property.location || 'Location not provided' }}</span>
                      <span class="cover-live"><span class="live-dot"></span> Registered</span>
                    </div>
                  </div>
                  <div class="property-showcase-body">
                    <div class="property-showcase-title">
                      <div>
                        <p class="property-eyebrow">Property overview</p>
                        <h3>{{ property.name }}</h3>
                      </div>
                      <span class="property-state"><IonIcon :icon="checkmarkCircleOutline" /> Active listing</span>
                    </div>
                    <div class="property-showcase-facts">
                      <div class="property-fact">
                        <span class="fact-icon owner-icon"><IonIcon :icon="personOutline" /></span>
                        <span><small>Property owner</small><strong>{{ property.owner || 'Not assigned' }}</strong></span>
                      </div>
                      <div class="property-fact">
                        <span class="fact-icon unit-icon"><IonIcon :icon="businessOutline" /></span>
                        <span><small>Rental units</small><strong>{{ property.units }}</strong></span>
                      </div>
                    </div>
                    <div class="property-card-footer">
                      <span class="property-id-label">Property ID <strong>#{{ property.id }}</strong></span>
                      <button type="button" class="property-view-button" @click="viewDetails(property)">
                        View Property <IonIcon :icon="arrowForwardOutline" />
                      </button>
                    </div>
                  </div>
                </article>
              </div>
              <div v-else class="empty-state"><IonIcon :icon="businessOutline" /><p>No registered properties found.</p></div>
            </article>
          </section>

          <!-- BILLING AND PAYMENTS -->
          <section v-else-if="section === 'billing'" class="section-content">
            <div class="stats-grid">
              <article class="stat-card"><div><p>Total Billing Records</p><h2>{{ state.bills.length }}</h2></div></article>
              <article class="stat-card"><div><p>Paid</p><h2>{{ state.bills.filter(b => b.status === 'PAID').length }}</h2></div></article>
              <article class="stat-card"><div><p>Unpaid</p><h2>{{ state.bills.filter(b => b.status === 'UNPAID').length }}</h2></div></article>
              <article class="stat-card"><div><p>Total Recorded Amount</p><h2>₱{{ state.bills.reduce((sum, b) => sum + Number(b.amount), 0).toLocaleString() }}</h2></div></article>
            </div>

            <article class="panel">
              <div class="panel-heading">
                <div><h2>Billing Records</h2><p>Review tenant charges and payment status</p></div>
                <button type="button" class="button secondary" :disabled="overviewLoading" @click="fetchPlatformOverview"><IonIcon :icon="refreshOutline" /> Refresh Bills</button>
              </div>

              <div class="table-wrap">
                <table>
                  <thead><tr><th>Bill ID</th><th>Tenant</th><th>Unit</th><th>Billing Period</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    <tr v-for="bill in state.bills" :key="bill.id">
                      <td>#{{ bill.id }}</td><td>{{ bill.tenant }}</td><td>{{ bill.unit }}</td><td>{{ bill.period }}</td>
                      <td>₱{{ Number(bill.amount).toLocaleString() }}</td>
                      <td><span class="status-badge" :class="badgeClass(bill.status)">{{ bill.status }}</span></td>
                      <td><div class="table-actions">
                        <button class="text-button" @click="viewDetails(bill)">View</button>
                      </div></td>
                    </tr>
                    <tr v-if="state.bills.length === 0"><td colspan="7" class="empty-cell">No billing records available.</td></tr>
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <!-- SYSTEM MAINTENANCE -->
          <section v-else-if="section === 'maintenance'" class="section-content">
            <div class="stats-grid">
              <article class="stat-card"><div><p>Total Requests</p><h2>{{ state.maintenance.length }}</h2></div></article>
              <article class="stat-card"><div><p>Pending</p><h2>{{ state.maintenance.filter(m => m.status === 'PENDING').length }}</h2></div></article>
              <article class="stat-card"><div><p>In Progress</p><h2>{{ state.maintenance.filter(m => m.status === 'IN PROGRESS').length }}</h2></div></article>
              <article class="stat-card"><div><p>Completed</p><h2>{{ state.maintenance.filter(m => m.status === 'COMPLETED').length }}</h2></div></article>
            </div>

            <article class="panel">
              <div class="panel-heading">
                <div><h2>Maintenance Requests</h2><p>Monitor reported property issues</p></div>
                <button type="button" class="button secondary" :disabled="overviewLoading" @click="fetchPlatformOverview"><IonIcon :icon="refreshOutline" /> Refresh Maintenance</button>
              </div>

              <div class="table-wrap">
                <table>
                  <thead><tr><th>Request ID</th><th>Unit</th><th>Category</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    <tr v-for="item in state.maintenance" :key="item.id">
                      <td>#{{ item.id }}</td><td>{{ item.unit }}</td><td>{{ item.category }}</td><td>{{ item.description }}</td>
                      <td><span class="status-badge" :class="badgeClass(item.status)">{{ item.status }}</span></td>
                      <td><div class="table-actions">
                        <button class="text-button" @click="viewDetails(item)">View</button>
                      </div></td>
                    </tr>
                    <tr v-if="state.maintenance.length === 0"><td colspan="6" class="empty-cell">No maintenance requests recorded.</td></tr>
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <!-- LEASE AGREEMENTS -->
          <section v-else-if="section === 'leases'" class="section-content">
            <div class="stats-grid">
              <article class="stat-card"><div><p>Total Agreements</p><h2>{{ state.leases.length }}</h2></div></article>
              <article class="stat-card"><div><p>Active Leases</p><h2>{{ state.leases.filter(l => l.status === 'ACTIVE').length }}</h2></div></article>
              <article class="stat-card"><div><p>Other Statuses</p><h2>{{ state.leases.filter(l => l.status !== 'ACTIVE').length }}</h2></div></article>
            </div>

            <article class="panel">
              <div class="panel-heading">
                <div><h2>Lease Register</h2><p>Review lease details and contract periods</p></div>
                <button type="button" class="button secondary" :disabled="overviewLoading" @click="fetchPlatformOverview"><IonIcon :icon="refreshOutline" /> Refresh Leases</button>
              </div>

              <div class="table-wrap">
                <table>
                  <thead><tr><th>Lease ID</th><th>Tenant</th><th>Rental Unit</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    <tr v-for="lease in state.leases" :key="lease.id">
                      <td>#{{ lease.id }}</td><td>{{ lease.tenant }}</td><td>{{ lease.unit }}</td><td>{{ lease.start }}</td><td>{{ lease.end }}</td>
                      <td><span class="status-badge" :class="badgeClass(lease.status)">{{ lease.status }}</span></td>
                      <td><div class="table-actions">
                        <button class="text-button" @click="viewDetails(lease)">View</button>
                      </div></td>
                    </tr>
                    <tr v-if="state.leases.length === 0"><td colspan="7" class="empty-cell">No lease agreements available.</td></tr>
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <!-- SECURITY AND AUDITS -->
          <section v-else-if="section === 'security'" class="section-content">
            <div class="stats-grid">
              <article class="stat-card"><div><p>Matching Audit Events</p><h2>{{ auditTotal }}</h2></div></article>
              <article class="stat-card"><div><p>Events on This Page</p><h2>{{ state.logs.length }}</h2></div></article>
              <article class="stat-card"><div><p>Security Activity</p><h2 class="security-status">Monitored</h2></div></article>
            </div>
            <article class="panel audit-panel">
              <div class="panel-heading">
                <div><h2><IonIcon :icon="shieldCheckmarkOutline" /> Security Logs &amp; Audits</h2><p>Account access, agreements, billing, payment reviews, and maintenance activity.</p></div>
                <button type="button" class="button secondary" :disabled="auditLoading" @click="fetchAuditEvents(auditPage)"><IonIcon :icon="refreshOutline" /> {{ auditLoading ? 'Loading...' : 'Refresh Logs' }}</button>
              </div>
              <div class="audit-filters">
                <label>Event Type<select v-model="auditType" @change="fetchAuditEvents(1)"><option value="all">All events</option><option value="LOGIN">Login attempts</option><option value="LOGOUT">Sign-outs</option><option value="ACCOUNT_REGISTRATION">Registrations</option><option value="ACCOUNT_APPROVED">Account approvals</option><option value="ACCOUNT_REJECTED">Account rejections</option><option value="LEASE_PREPARED">Leases prepared</option><option value="LEASE_CONFIRMED">Leases confirmed</option><option value="LEASE_COMPLETED">Leases completed</option><option value="BILL_CREATED">Bills created</option><option value="PAYMENT_SUBMITTED">Payments submitted</option><option value="PAYMENT_REVIEWED">Payment decisions</option><option value="MAINTENANCE_CREATED">Maintenance submitted</option><option value="MAINTENANCE_UPDATED">Maintenance updates</option></select></label>
                <label>Result<select v-model="auditOutcome" @change="fetchAuditEvents(1)"><option value="all">All results</option><option value="success">Successful</option><option value="failure">Unsuccessful</option></select></label>
              </div>
              <p v-if="auditError" class="audit-error" role="alert">{{ auditError }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Event</th><th>Activity</th><th>Actor</th><th>Result</th><th>Date &amp; Time</th></tr></thead>
                  <tbody>
                    <tr v-for="log in state.logs" :key="log.id">
                      <td><strong>#{{ log.id }}</strong><small class="audit-event-type">{{ log.eventType.replaceAll('_', ' ') }}</small></td>
                      <td>{{ log.text }}</td>
                      <td>{{ log.actorRole }} <span v-if="log.actorUserId">#{{ log.actorUserId }}</span></td>
                      <td><span class="status-badge" :class="log.outcome === 'success' ? 'good' : 'bad'">{{ log.outcome === 'success' ? 'Successful' : 'Unsuccessful' }}</span></td>
                      <td>{{ log.time }}</td>
                    </tr>
                    <tr v-if="!auditLoading && !auditError && state.logs.length === 0"><td colspan="5" class="empty-cell">No matching activity yet. Audit recording starts after the backend integration is installed.</td></tr>
                    <tr v-if="auditLoading"><td colspan="5" class="empty-cell">Loading security events...</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="audit-pagination">
                <span>Page {{ auditPage }} · {{ auditTotal }} matching events</span>
                <div><button class="button secondary" type="button" :disabled="auditLoading || auditPage <= 1" @click="fetchAuditEvents(auditPage - 1)">Previous</button><button class="button primary" type="button" :disabled="auditLoading || auditPage * auditPageSize >= auditTotal" @click="fetchAuditEvents(auditPage + 1)">Next</button></div>
              </div>
              <p class="audit-footnote">Read-only event history. No passwords, payment reference numbers, or session tokens are stored. Earlier actions are not backfilled.</p>
            </article>
          </section>

          <!-- SYSTEM SETTINGS -->
          <section v-else-if="section === 'settings'" class="section-content">
            <article class="panel settings-panel">
              <div class="panel-heading">
                <div><h2>Platform Configuration</h2><p>System information and administrative actions</p></div>
              </div>

              <div class="settings-list">
                <div class="settings-row">
                  <div><strong>Application</strong><p>RentEase Property Management Portal</p></div>
                  <span class="status-badge good">RUNNING</span>
                </div>
                <div class="settings-row">
                  <div><strong>Administrator</strong><p>{{ state.profile.email || 'No admin email available' }}</p></div>
                  <span class="status-badge neutral">ADMIN</span>
                </div>
                <div class="settings-row">
                  <div><strong>Session</strong><p>Server-managed login session</p></div>
                  <span class="status-badge neutral">SESSION</span>
                </div>
                <div class="settings-row">
                  <div><strong>Database</strong><p>PostgreSQL connection configured through backend</p></div>
                  <span class="status-badge neutral">BACKEND</span>
                </div>
              </div>

              <div class="maintenance-callout">
                <div>
                  <h3>System Maintenance</h3>
                  <p>Run the dashboard's sample maintenance action.</p>
                </div>
                <button class="button primary" @click="triggerSystemMaintenance">Preview Backup Action</button>
              </div>
            </article>
          </section>

          <!-- ADMIN PROFILE -->
          <section v-else-if="section === 'profile'" class="section-content">
            <div class="profile-layout">
              <article class="panel profile-card">
                <div class="profile-avatar-large">
                  <img v-if="state.profile.avatar" :src="state.profile.avatar" alt="Admin profile" />
                  <span v-else>{{ initials }}</span>
                </div>
                <h2>{{ state.profile.name || 'System Administrator' }}</h2>
                <p>{{ state.profile.email || 'No email provided' }}</p>
                <span class="status-badge good">SYSTEM ADMIN</span>
                <button class="button primary full-button" @click="openDialog">Edit Profile</button>
              </article>

              <article class="panel profile-information">
                <div class="panel-heading"><div><h2>Administrator Information</h2><p>Your current profile details</p></div></div>
                <div class="settings-list">
                  <div class="settings-row"><div><strong>Full Name</strong><p>{{ state.profile.name || 'Not set' }}</p></div></div>
                  <div class="settings-row"><div><strong>Email Address</strong><p>{{ state.profile.email || 'Not set' }}</p></div></div>
                  <div class="settings-row"><div><strong>Mobile Number</strong><p>{{ state.profile.mobile || 'Not set' }}</p></div></div>
                  <div class="settings-row"><div><strong>Account Role</strong><p>{{ state.profile.role }}</p></div></div>
                </div>
              </article>
            </div>
          </section>

          <footer class="workspace-footer">
            <span>RentEase Admin Portal</span>
            <span>System Administration</span>
          </footer>
        </main>
      </div>

      <!-- ADD PROPERTY MODAL -->
      <IonModal css-class="rentease-modal" :is-open="propertyFormOpen" @didDismiss="propertyFormOpen = false">
        <div class="modal-content">
          <div class="modal-heading">
            <div><h2>Add Property</h2><p>Enter the property information below.</p></div>
            <button class="icon-button" @click="propertyFormOpen = false"><IonIcon :icon="closeOutline" /></button>
          </div>

          <form @submit.prevent="addProperty">
            <label>Property Name</label>
            <input v-model="propertyForm.name" required placeholder="e.g. Soriano Apartment" />

            <label>Property Owner</label>
            <input v-model="propertyForm.owner" required placeholder="Owner's full name" />

            <label>Number of Units</label>
            <input v-model.number="propertyForm.units" required type="number" min="1" />

            <label>Location</label>
            <input v-model="propertyForm.location" required placeholder="City or municipality" />

            <div class="modal-actions">
              <button type="button" class="button secondary" @click="propertyFormOpen = false">Cancel</button>
              <button type="submit" class="button primary">Save Property</button>
            </div>
          </form>
        </div>
      </IonModal>

      <!-- PROFILE MODAL -->
      <IonModal css-class="rentease-modal" :is-open="dialogOpen" @didDismiss="closeDialog">
        <div class="modal-content">
          <div class="modal-heading">
            <div><h2>Edit Admin Profile</h2><p>Update your administrator details.</p></div>
            <button class="icon-button" @click="closeDialog"><IonIcon :icon="closeOutline" /></button>
          </div>

          <form @submit.prevent="saveProfile">
            <label>Profile Picture</label>
            <input type="file" accept="image/*" @change="handleAvatarUpload" />

            <label>Full Name</label>
            <input v-model="profileForm.name" required placeholder="Full name" />

            <label>Email Address</label>
            <input v-model="profileForm.email" required type="email" placeholder="Email address" />

            <label>Mobile Number</label>
            <input v-model="profileForm.mobile" placeholder="Mobile number" />

            <div class="modal-actions">
              <button type="button" class="button secondary" @click="closeDialog">Cancel</button>
              <button type="submit" class="button primary">Save Profile</button>
            </div>
          </form>
        </div>
      </IonModal>

      <!-- PREMIUM RECORD DETAILS MODAL -->
      <IonModal css-class="rentease-modal details-modal" :is-open="detailsModalOpen" @didDismiss="detailsModalOpen = false">
        <div class="modal-content details-modal-shell">
          <div class="details-hero">
            <div class="details-hero-icon"><IonIcon :icon="detailModalMeta.icon" /></div>
            <div class="details-hero-copy">
              <span class="details-kicker"><IonIcon :icon="sparklesOutline" /> {{ detailModalMeta.kicker }}</span>
              <h2>{{ detailModalMeta.title }}</h2>
              <p>{{ detailModalMeta.subtitle }}</p>
            </div>
            <button type="button" class="icon-button details-close-icon" aria-label="Close record details" @click="detailsModalOpen = false"><IonIcon :icon="closeOutline" /></button>
          </div>
          <div class="details-modal-body">
            <div class="details-summary">
              <div><span class="details-summary-label">RECORD TYPE</span><strong>{{ detailModalMeta.badge }}</strong></div>
              <div><span class="details-summary-label">DETAILS</span><strong>{{ detailEntries.length }} fields</strong></div>
              <div><span class="details-summary-label">ACCESS</span><strong>Read only</strong></div>
            </div>
            <div v-if="selectedItem" class="details-info-list">
              <div v-for="entry in detailEntries" :key="entry.key" class="details-info-row">
                <div class="details-info-key"><span class="details-key-dot"></span><strong>{{ entry.label }}</strong></div>
                <span v-if="entry.key.toLowerCase().includes('status')" class="status-badge" :class="badgeClass(entry.value.toUpperCase())">{{ entry.value }}</span>
                <span v-else class="details-info-value">{{ entry.value }}</span>
              </div>
            </div>
            <div class="modal-actions details-footer-actions">
              <button type="button" class="button primary details-done-button" @click="detailsModalOpen = false"><IonIcon :icon="checkmarkCircleOutline" /> Done Viewing</button>
            </div>
          </div>
        </div>
      </IonModal>

      <!-- EDIT / ADD RECORD MODAL -->
      <IonModal css-class="rentease-modal" :is-open="editModalOpen" @didDismiss="editModalOpen = false">
        <div class="modal-content">
          <div class="modal-heading">
            <div>
              <h2>{{ selectedItem && (editTargetType === 'bill' ? !state.bills.some(record => record.id === editForm.id) : editTargetType === 'maintenance' ? !state.maintenance.some(record => record.id === editForm.id) : editTargetType === 'lease' ? !state.leases.some(record => record.id === editForm.id) : false) ? 'Add ' : 'Edit ' }}{{ editTargetType === 'user' ? 'User' : editTargetType === 'property' ? 'Property' : editTargetType === 'bill' ? 'Bill' : editTargetType === 'maintenance' ? 'Maintenance Request' : editTargetType === 'lease' ? 'Lease' : 'Record' }}</h2>
              <p>Update the information below, then save your changes.</p>
            </div>
            <button type="button" class="icon-button" @click="editModalOpen = false"><IonIcon :icon="closeOutline" /></button>
          </div>

          <form @submit.prevent="saveEditRecord">
            <template v-for="key in Object.keys(editForm)" :key="String(key)">
              <template v-if="key !== 'id'">
                <label>{{ String(key).replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()) }}</label>

                <select v-if="key === 'role'" v-model="editForm[key]" required>
                  <option value="Tenant">Tenant</option>
                  <option value="Property Owner">Property Owner</option>
                  <option value="System Administrator">System Administrator</option>
                </select>

                <select v-else-if="key === 'status' && editTargetType === 'user'" v-model="editForm[key]" required>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PENDING">PENDING</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>

                <select v-else-if="key === 'status' && editTargetType === 'bill'" v-model="editForm[key]" required>
                  <option value="PAID">PAID</option>
                  <option value="UNPAID">UNPAID</option>
                </select>

                <select v-else-if="key === 'status' && editTargetType === 'maintenance'" v-model="editForm[key]" required>
                  <option value="PENDING">PENDING</option>
                  <option value="IN PROGRESS">IN PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>

                <select v-else-if="key === 'status' && editTargetType === 'lease'" v-model="editForm[key]" required>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="TERMINATED">TERMINATED</option>
                </select>

                <input
                  v-else-if="typeof editForm[key] === 'number'"
                  v-model.number="editForm[key]"
                  type="number"
                  :min="key === 'units' ? 1 : 0"
                  required
                />

                <input
                  v-else
                  v-model="editForm[key]"
                  :type="key === 'email' ? 'email' : 'text'"
                  required
                />
              </template>
            </template>

            <div class="modal-actions">
              <button type="button" class="button secondary" @click="editModalOpen = false">Cancel</button>
              <button type="submit" class="button primary">Save Changes</button>
            </div>
          </form>
        </div>
      </IonModal>
    </IonContent>
  </IonPage>
</template>

<style scoped>
:global(body) {
  margin: 0;
  font-family: Inter, "Segoe UI", Arial, sans-serif;
  color: #183153;
  background: #f4f7fb;
}

* { box-sizing: border-box; }

.portal { --background: #f4f7fb; }
.topbar { --background: #fff; --color: #183153; --border-color: #e4eaf2; }
.brand-subtitle { margin-left: 9px; font-size: 12px; color: #74839a; }
.layout { display: flex; min-height: 100%; }
.sidebar {
  width: 240px; flex-shrink: 0; background: #fff; border-right: 1px solid #e1e8f0;
  padding: 18px 12px; display: flex; flex-direction: column;
}
.owner { display: flex; gap: 11px; align-items: center; padding: 2px 4px 20px; border-bottom: 1px solid #e5ebf2; }
.avatar {
  width: 42px; height: 42px; border-radius: 13px; background: #dff4ee; color: #087f76;
  display: grid; place-items: center; font-weight: 800; overflow: hidden;
}
.avatar img, .profile-avatar-large img { width: 100%; height: 100%; object-fit: cover; }
.owner strong, .owner small { display: block; }
.owner strong { font-size: 12px; }
.owner small { font-size: 11px; color: #78869a; margin-top: 4px; }
.nav-label, .eyebrow { font-size: 10px; letter-spacing: 1.7px; font-weight: 800; color: #087f76; }
.nav-label { margin: 24px 9px 12px; }
.sidebar nav { display: grid; gap: 5px; }
.sidebar nav button, .sidebar-logout {
  border: 1px solid transparent; background: transparent; width: 100%; display: flex; align-items: center;
  gap: 12px; padding: 12px 10px; text-align: left; color: #506681; border-radius: 10px; cursor: pointer;
  font-size: 12px; transition: .15s ease;
}
.sidebar nav button ion-icon, .sidebar-logout ion-icon { font-size: 18px; }
.sidebar nav button:hover { background: #f2f7fb; }
.sidebar nav button.active { background: #e4f5f1; color: #087f76; border-color: #b7e2d8; font-weight: 700; }
.sidebar-logout { margin-top: 18px; color: #c92f38; background: #fff4f4; border-color: #ffdddd; }
.sidebar-note { margin-top: 20px; background: #f2f6fb; border-radius: 12px; padding: 14px; font-size: 11px; }
.sidebar-note p { line-height: 1.6; color: #62748a; margin-bottom: 0; }
.workspace { flex: 1; min-width: 0; padding: 28px 32px; }
.page-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 26px; }
.page-heading h1 { margin: 6px 0; color: #183153; font-size: clamp(23px, 2.5vw, 34px); font-weight: 800; }
.eyebrow { margin: 0; }
.subtitle { color: #6b7b90; font-size: 13px; margin: 8px 0 0; }
.heading-actions { display: flex; gap: 8px; }
.section-content { display: grid; gap: 20px; }
.stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.stats-grid.four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.stat-card {
  display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #e6ecf3;
  border-radius: 15px; padding: 19px; box-shadow: 0 3px 12px rgba(27, 54, 83, .025);
}
.stat-card p { margin: 0 0 8px; font-size: 12px; color: #718198; }
.stat-card h2 { margin: 0; font-size: 25px; color: #183153; }
.stat-card small { display: block; color: #8a97a8; font-size: 11px; margin-top: 6px; }
.stat-icon { width: 42px; height: 42px; flex-shrink: 0; display: grid; place-items: center; border-radius: 12px; font-size: 20px; }
.blue { color: #3177c7; background: #e8f2ff; }
.teal { color: #07877d; background: #e0f6f0; }
.orange { color: #c87b22; background: #fff1df; }
.purple { color: #8060c7; background: #f0eaff; }
.content-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; }
.panel { min-width: 0; background: #fff; border: 1px solid #e5ebf2; border-radius: 15px; padding: 22px; box-shadow: 0 3px 12px rgba(27, 54, 83, .025); }
.panel-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
.panel-heading h2 { margin: 0; font-size: 17px; }
.panel-heading p { margin: 6px 0 0; color: #8190a3; font-size: 12px; }
.button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 10px 14px; border-radius: 9px; border: 1px solid transparent; cursor: pointer; font-size: 12px; font-weight: 700; transition: .15s ease; }
.button.primary { color: #fff; background: #087f76; }
.button.primary:hover { background: #066d65; }
.button.secondary { background: #fff; color: #506681; border-color: #dfe6ee; }
.button.secondary:hover { background: #f6f9fc; }
.button.danger { color: #c92f38; background: #fff4f4; border-color: #ffdddd; }
.full-button { width: 100%; margin-top: 22px; }
.activity-list { display: grid; }
.activity-item { display: flex; gap: 12px; padding: 15px 0; border-bottom: 1px solid #edf1f5; }
.activity-item:last-child { border-bottom: 0; }
.activity-dot { margin-top: 5px; width: 9px; height: 9px; flex-shrink: 0; background: #0b9989; border-radius: 50%; box-shadow: 0 0 0 4px #e5f7f3; }
.activity-copy strong, .activity-copy small { display: block; }
.activity-copy strong { font-size: 12px; line-height: 1.5; }
.activity-copy small { color: #8b98a9; margin-top: 5px; font-size: 11px; }
.quick-actions { display: grid; gap: 10px; }
.quick-actions button { display: flex; gap: 12px; align-items: center; padding: 13px; text-align: left; border: 1px solid #e8edf3; border-radius: 10px; background: #fff; cursor: pointer; color: #087f76; }
.quick-actions button:hover { background: #f6fbfa; border-color: #c9e8e1; }
.quick-actions button > ion-icon { font-size: 21px; }
.quick-actions strong, .quick-actions small { display: block; }
.quick-actions strong { color: #273e5b; font-size: 12px; }
.quick-actions small { margin-top: 4px; color: #8190a3; font-size: 11px; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
.filter-bar input, .filter-bar select, .modal-content input, .modal-content select {
  min-width: 0; padding: 11px 12px; background: #fff; color: #273e5b; border: 1px solid #dfe6ee;
  border-radius: 9px; outline: none; font: inherit; font-size: 12px;
}
.filter-bar input { flex: 1; min-width: 190px; }
.filter-bar input:focus, .filter-bar select:focus, .modal-content input:focus, .modal-content select:focus { border-color: #0b9989; box-shadow: 0 0 0 3px rgba(11,153,137,.08); }
.table-wrap { width: 100%; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th { background: #f7f9fc; color: #77869b; font-size: 10px; text-transform: uppercase; letter-spacing: .7px; white-space: nowrap; }
td { font-size: 12px; color: #506681; }
th, td { padding: 14px 12px; border-bottom: 1px solid #edf1f5; vertical-align: middle; }
td strong { color: #273e5b; }
tr:last-child td { border-bottom: 0; }
.status-badge { display: inline-block; padding: 5px 8px; border-radius: 20px; font-size: 10px; font-weight: 800; white-space: nowrap; }
.status-badge.good { color: #087d58; background: #e2f7ee; }
.status-badge.warning { color: #a96b08; background: #fff3d9; }
.status-badge.danger { color: #c3313a; background: #ffebed; }
.status-badge.neutral { color: #62748a; background: #edf1f6; }
.table-actions, .card-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
.text-button { background: transparent; border: 0; padding: 4px; cursor: pointer; color: #087f76; font-size: 11px; font-weight: 700; }
.danger-text { color: #c3313a; }
.empty-cell { text-align: center; padding: 32px; color: #8794a5; }
.property-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.property-card { overflow: hidden; border: 1px solid #e6ecf3; border-radius: 13px; }
.property-art { height: 100px; display: grid; place-items: center; background: linear-gradient(135deg, #e2f6f1, #eef4ff); color: #087f76; }
.property-art ion-icon { font-size: 40px; }
.property-card-body { padding: 16px; }
.property-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.property-title-row h3 { margin: 0; font-size: 15px; }
.property-location { margin: 6px 0 14px; font-size: 12px; color: #7c8ba0; }
.property-meta { display: grid; gap: 9px; margin-bottom: 16px; }
.property-meta span { display: flex; justify-content: space-between; gap: 10px; font-size: 12px; color: #61738b; }
.property-meta strong { color: #273e5b; }
.card-actions { padding-top: 14px; border-top: 1px solid #edf1f5; }
.empty-state { min-height: 160px; display: grid; place-content: center; justify-items: center; text-align: center; color: #8291a5; gap: 8px; }
.empty-state ion-icon { font-size: 30px; color: #a0b2c5; }
.empty-state p { font-size: 12px; }
.security-status { font-size: 21px !important; color: #087d58 !important; }
.settings-list { display: grid; }
.settings-row { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 17px 0; border-bottom: 1px solid #edf1f5; }
.settings-row:last-child { border-bottom: 0; }
.settings-row strong { font-size: 13px; }
.settings-row p { margin: 5px 0 0; font-size: 12px; color: #7b8ba0; }
.maintenance-callout { margin-top: 24px; display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 18px; background: #f4f8fc; border-radius: 12px; }
.maintenance-callout h3 { margin: 0; font-size: 14px; }
.maintenance-callout p { margin: 5px 0 0; font-size: 12px; color: #7b8ba0; }
.profile-layout { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 20px; }
.profile-card { text-align: center; }
.profile-avatar-large { width: 94px; height: 94px; margin: 5px auto 18px; display: grid; place-items: center; overflow: hidden; border-radius: 50%; background: #e0f6f0; color: #087f76; font-size: 28px; font-weight: 800; }
.profile-card h2 { font-size: 17px; margin: 0 0 6px; }
.profile-card > p { font-size: 12px; color: #8190a3; margin: 0 0 15px; }
.profile-information .settings-row { padding: 20px 0; }
.workspace-footer { display: flex; justify-content: space-between; gap: 10px; margin-top: 28px; padding-top: 18px; border-top: 1px solid #e2e9f1; color: #8a97a8; font-size: 11px; }
.modal-content { padding: 26px; color: #183153; }
.modal-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 15px; margin-bottom: 24px; }
.modal-heading h2 { margin: 0; font-size: 21px; }
.modal-heading p { margin: 6px 0 0; color: #8190a3; font-size: 12px; }
.icon-button { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid #e1e8f0; border-radius: 9px; background: #fff; color: #536780; cursor: pointer; }
.modal-content form { display: grid; gap: 10px; }
.modal-content label { margin-top: 6px; font-size: 12px; font-weight: 700; color: #506681; }
.modal-content input, .modal-content select { width: 100%; min-height: 40px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
.details-list { display: grid; gap: 0; }
.details-row { display: flex; justify-content: space-between; gap: 15px; padding: 13px 0; border-bottom: 1px solid #edf1f5; font-size: 12px; }
.details-row strong { color: #536780; text-transform: capitalize; }
.details-row span { text-align: right; overflow-wrap: anywhere; }
.rentease-messagebox { --border-radius: 16px; }

:global(ion-modal.rentease-modal) {
  --background: #ffffff;
  --color: #183153;
  --border-radius: 16px;
  --width: min(560px, calc(100% - 28px));
  --height: auto;
  --max-height: 90%;
}
:global(ion-modal.rentease-modal::part(content)) {
  background: #ffffff;
  border-radius: 16px;
  color: #183153;
  overflow: auto;
}
.modal-content {
  background: #ffffff;
  color: #183153;
  min-height: 100%;
  max-height: 90vh;
  overflow-y: auto;
}
.approve-text { color: #087d58; }

@media (max-width: 1050px) {
  .sidebar { width: 215px; }
  .workspace { padding: 24px 20px; }
  .stats-grid, .stats-grid.four { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .property-grid { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .layout { display: block; }
  .sidebar { width: 100%; padding: 12px; border-right: 0; border-bottom: 1px solid #e1e8f0; }
  .sidebar nav { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sidebar nav button { font-size: 11px; }
  .sidebar-note { display: none; }
  .workspace { padding: 20px 13px; }
  .page-heading { display: block; }
  .heading-actions { margin-top: 14px; }
  .stats-grid, .stats-grid.four, .content-grid, .profile-layout { grid-template-columns: 1fr; }
  .panel { padding: 16px; }
  .panel-heading { align-items: flex-start; flex-direction: column; }
  .filter-bar { display: grid; grid-template-columns: 1fr; }
  .filter-bar input { min-width: 0; }
  .maintenance-callout { align-items: flex-start; flex-direction: column; }
  .workspace-footer { flex-direction: column; }
}


/* ─── RentEase UI refresh: visual-only styling, no dependency changes ─── */
:global(body) { font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: #142b3d; background: #f5f8fb; }
.portal { --background: #f5f8fb; }
.topbar { --background: #fff; --color: #152e40; --border-color: #e8edf1; --min-height: 76px; box-shadow: 0 1px 0 rgba(15,38,51,.03); }
.toolbar-brand { display: flex; align-items: center; gap: 12px; margin-left: 26px; min-height: 75px; }
.brand-mark { width: 40px; height: 40px; display: grid; place-items: center; background: #087e76; color: white; font-size: 22px; font-weight: 850; border-radius: 13px; letter-spacing: -2px; box-shadow: 0 5px 14px rgba(0,112,100,.16); }
.brand-mark span { color: #97ece1; }
.brand-wordmark { display: flex; flex-direction: column; gap: 1px; }
.brand-wordmark strong { font-size: 19px; font-weight: 830; letter-spacing: -.7px; line-height: 1.25; }
.brand-dot { color: #0c9b86; }
.brand-wordmark small { color: #8a9aa8; font-size: 9px; font-weight: 850; letter-spacing: 1.7px; }
.topbar-actions { display: flex; align-items: center; gap: 14px; padding-right: 28px; }
.topbar-date { font-size: 12px; color: #718598; font-weight: 600; }
.header-icon { --color: #476476; --border-radius: 12px; --background: #f3f7f9; width: 42px; height: 42px; margin: 0; }
.header-icon ion-icon { font-size: 19px; }
.topbar-profile { width: 39px; height: 39px; border-radius: 12px; border: 2px solid #dcf1eb; background: #e8f7f2; color: #057469; font-size: 12px; font-weight: 850; cursor: pointer; }
.mobile-menu-button { display: none; }
.sidebar { width: 267px; border-color: #e9eff2; padding: 24px 14px 22px; box-shadow: 3px 0 20px rgba(23,53,68,.018); }
.sidebar-profile { cursor: pointer; display: flex; align-items: center; gap: 12px; border: 1px solid #e6eeef; border-radius: 15px; padding: 12px; background: linear-gradient(120deg,#fbfdfc,#f3faf8); transition: border-color .2s, transform .2s; }
.sidebar-profile:hover { transform: translateY(-1px); border-color: #bbded7; }
.sidebar-profile .avatar { flex-shrink: 0; width: 43px; height: 43px; background: linear-gradient(145deg,#087e76,#0aa78e); color: white; box-shadow: 0 3px 9px rgba(9,135,121,.18); }
.sidebar-profile strong { display: block; color: #173345; font-size: 12px; line-height: 1.4; max-width: 159px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sidebar-profile small { display: block; font-size: 10px; margin-top: 3px; color: #76909a; }
.nav-label { color: #a0aeb9; margin: 28px 14px 12px; font-size: 9px; letter-spacing: 1.5px; }
.sidebar nav { gap: 5px; }
.sidebar nav button { position: relative; min-height: 45px; padding: 12px 13px; color: #62778a; border-radius: 11px; font-size: 12px; font-weight: 600; transition: background .2s,color .2s,transform .2s; }
.sidebar nav button:hover { background: #f3f8f8; color: #0a8479; transform: translateX(2px); }
.sidebar nav button.active { background: #e8f7f2; color: #08786e; border: 1px solid #d8eee8; box-shadow: inset 3px 0 0 #079a89; font-weight: 800; }
.sidebar nav button ion-icon { flex-shrink: 0; font-size: 18px; }
.nav-chevron { font-size: 14px !important; margin-left: auto; opacity: .7; }
.nav-count { margin-left: auto; padding: 3px 7px; border-radius: 8px; background: #fff0d9; color: #a6650c; font-size: 10px; font-weight: 850; }
.sidebar-logout { margin-top: 19px; border-color: transparent; background: #fff5f5; border-radius: 11px; color: #d04c50; font-weight: 700; }
.sidebar-logout:hover { background: #ffebeb; }
.sidebar-note { margin-top: auto; padding: 16px; background: linear-gradient(150deg,#eff9f6,#f1f7fb); border: 1px solid #e1f0ea; border-radius: 15px; }
.sidebar-note .note-icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; background: white; color: #078678; margin-bottom: 12px; font-size: 18px; }
.sidebar-note strong { font-size: 12px; color: #254454; }
.sidebar-note p { margin-top: 6px; font-size: 11px; }
.workspace { padding: 33px clamp(20px,3vw,48px); max-width: 1750px; }
.page-heading { margin-bottom: 28px; align-items: center; }
.heading-trail { display: flex; align-items: center; gap: 7px; font-size: 11px; color: #9aabb7; margin-bottom: 12px; }
.heading-trail ion-icon { font-size: 12px; }
.heading-trail strong { color: #438578; font-weight: 700; }
.eyebrow { color: #0e9385; font-size: 9px; }
.page-heading h1 { font-size: clamp(25px,2.35vw,36px); letter-spacing: -1.15px; font-weight: 850; color: #152e40; line-height: 1.18; margin: 8px 0; }
.subtitle { line-height: 1.6; color: #7b8f9e; max-width: 650px; }
.section-content { gap: 22px; }
.welcome-banner { position: relative; isolation: isolate; overflow: hidden; display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 213px; border-radius: 21px; background: linear-gradient(112deg,#075f5d 0%,#087b73 54%,#119983 100%); padding: 30px 38px; box-shadow: 0 12px 35px rgba(4,99,91,.14); color: white; }
.welcome-banner::before { content: ''; position: absolute; inset: 0; z-index: -1; opacity: .28; background: radial-gradient(circle at 80% 22%,#a5ffe1 0,transparent 27%),linear-gradient(45deg,transparent 45%,rgba(255,255,255,.1)); }
.welcome-copy { max-width: 650px; position: relative; z-index: 2; }
.welcome-kicker { display: inline-flex; align-items: center; gap: 8px; letter-spacing: 1.45px; font-size: 10px; font-weight: 850; color: #b4f1e6; }
.welcome-banner h2 { font-size: clamp(25px,2.3vw,34px); margin: 13px 0 8px; letter-spacing: -.9px; font-weight: 850; color: #fff; }
.welcome-banner p { font-size: 12px; line-height: 1.75; color: #d5f5ee; margin: 0; max-width: 520px; }
.wave { color: #fce197; }
.welcome-cta { display: inline-flex; align-items: center; gap: 10px; margin-top: 20px; border: 1px solid rgba(255,255,255,.28); border-radius: 10px; background: white; padding: 11px 16px; font-size: 12px; color: #08796f; font-weight: 800; cursor: pointer; transition: transform .2s,box-shadow .2s; }
.welcome-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,.1); }
.welcome-visual { position: relative; display: grid; flex-shrink: 0; place-items: center; width: 185px; height: 170px; color: #ecfff8; }
.welcome-visual > ion-icon { font-size: 92px; z-index: 1; filter: drop-shadow(0 9px 18px rgba(0,54,54,.18)); }
.visual-orbit { position: absolute; border: 1px solid rgba(255,255,255,.32); border-radius: 50%; }
.orbit-one { width: 168px; height: 168px; }.orbit-two { width: 125px; height: 125px; background: rgba(255,255,255,.07); }
.section-mini-heading { display: flex; justify-content: space-between; align-items: end; gap: 12px; margin-top: 4px; }
.section-mini-heading h2 { font-size: 19px; font-weight: 800; margin: 5px 0 0; color: #1b3546; }
.mini-kicker { font-size: 10px; color: #0f9786; font-weight: 850; letter-spacing: 1.5px; }
.mini-date { display: flex; align-items: center; gap: 7px; color: #80929e; font-size: 11px; }
.stats-grid { gap: 17px; }
.stat-card { position: relative; min-height: 120px; align-items: flex-start; gap: 15px; padding: 22px; border-radius: 17px; border: 1px solid #e7eef1; box-shadow: 0 5px 23px rgba(29,62,75,.034); transition: transform .2s,border-color .2s,box-shadow .2s; }
.stat-card:hover { transform: translateY(-3px); border-color: #cee7df; box-shadow: 0 12px 24px rgba(18,64,73,.07); }
.stat-card p { color: #748998; font-weight: 650; font-size: 12px; line-height: 1.45; }
.stat-card h2 { font-size: clamp(24px,2vw,30px); line-height: 1.15; letter-spacing: -.8px; color: #173344; }
.stat-card small { margin-top: 7px; color: #96a5af; }
.stat-icon { border-radius: 13px; width: 47px; height: 47px; font-size: 22px; }
.panel { border-radius: 18px; padding: 24px; border-color: #e7eef1; box-shadow: 0 6px 25px rgba(29,62,75,.033); }
.panel-heading h2 { color: #193548; font-size: 17px; letter-spacing: -.3px; font-weight: 800; }
.panel-heading p { font-size: 12px; color: #8295a1; line-height: 1.6; }
.button { min-height: 39px; padding: 10px 15px; border-radius: 10px; font-size: 11.5px; font-weight: 800; letter-spacing: .02px; transition: transform .18s,box-shadow .18s,border-color .18s,background .18s; white-space: nowrap; }
.button ion-icon { font-size: 16px; }
.button:not(:disabled):hover { transform: translateY(-1px); }
.button.primary { background: #087f76; box-shadow: 0 4px 12px rgba(7,128,116,.14); }
.button.primary:hover { background: #076e67; box-shadow: 0 7px 16px rgba(7,128,116,.22); }
.button.secondary { background: #fff; border-color: #dce7ec; color: #506c79; }
.button.secondary:hover { background: #f3faf7; color: #087e76; border-color: #aad9cb; }
.button.danger { background: #fff4f3; color: #c44750; border-color: #f9d9d8; }
.button.danger:hover { background: #ffe8e6; }
button:disabled { opacity: .55; cursor: not-allowed !important; transform: none !important; box-shadow: none !important; }
button:focus-visible, .sidebar-profile:focus-visible { outline: 3px solid rgba(19,163,139,.4); outline-offset: 2px; }
.activity-item { padding: 16px 0; }
.activity-copy strong { color: #304b5b; }
.quick-actions { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
.quick-actions button { min-height: 83px; background: #fcfefd; border-color: #e5eeed; border-radius: 13px; padding: 15px; transition: transform .2s,background .2s,border-color .2s; }
.quick-actions button:hover { transform: translateY(-2px); background: #effaf6; border-color: #9edacf; }
.quick-actions button > ion-icon { width: 36px; height: 36px; flex-shrink: 0; padding: 9px; box-sizing: border-box; border-radius: 11px; background: #e8f7f1; color: #0c887a; }
.quick-actions strong { font-size: 12px; }
.quick-actions small { font-size: 10px; line-height: 1.5; }
.filter-bar { padding: 14px; background: #f8fbfc; border: 1px solid #edf2f4; border-radius: 13px; }
.filter-bar input, .filter-bar select, .modal-content input, .modal-content select { min-height: 42px; border: 1px solid #dce7eb; border-radius: 10px; font-size: 12px; transition: border-color .2s,box-shadow .2s; }
.filter-bar input::placeholder, .modal-content input::placeholder { color: #a4b0bb; }
.filter-bar input:focus, .filter-bar select:focus, .modal-content input:focus, .modal-content select:focus { border-color: #0b9b8a; box-shadow: 0 0 0 4px rgba(10,153,133,.1); }
.table-wrap { border: 1px solid #eaf0f2; border-radius: 12px; }
table { border-collapse: separate; border-spacing: 0; }
th { background: #f6fafb; color: #8394a1; font-weight: 850; font-size: 10px; }
th,td { padding: 16px 13px; }
tbody tr { transition: background .16s; }tbody tr:hover { background: #f9fcfb; }
td { color: #607584; line-height: 1.55; }td strong { color: #273f50; }
.status-badge { border-radius: 8px; padding: 6px 9px; font-size: 9.5px; letter-spacing: .2px; }
.table-actions { flex-wrap: nowrap; }
.text-button { border: 1px solid #dbe9e6; color: #087f76; background: #f5fbf8; border-radius: 8px; padding: 7px 10px; font-size: 11px; white-space: nowrap; transition: background .17s,border-color .17s; }
.text-button:hover { background: #e6f6f0; border-color: #aad7cb; }
.text-button.danger-text { color: #cb4a51; border-color: #f5dada; background: #fff8f7; }
.text-button.danger-text:hover { background: #ffeeed; }
.text-button.approve-text { color: #087952; border-color: #caebdc; background: #edfaf3; }
.property-grid { gap: 18px; }
.property-card { background: #fff; border-radius: 16px; transition: transform .2s,box-shadow .2s,border-color .2s; }
.property-card:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(20,61,69,.08); border-color: #c3e4d9; }
.property-art { height: 123px; background: linear-gradient(135deg,#e7f9f2 0%,#eef6f8 50%,#e3f2ed 100%); }
.property-art ion-icon { font-size: 52px; filter: drop-shadow(0 7px 8px rgba(0,121,102,.15)); }
.property-card-body { padding: 19px; }
.property-title-row h3 { font-size: 16px; color: #223d4e; }
.property-meta { padding: 12px 0; }
.card-actions .button { flex: 1; }
.settings-row { padding: 19px 0; }
.maintenance-callout { border: 1px solid #deeee8; background: linear-gradient(110deg,#effaf6,#f4f9fc); border-radius: 14px; }
.profile-card { padding-top: 34px; }
.profile-avatar-large { border: 5px solid white; box-shadow: 0 0 0 1px #d6eae2,0 9px 24px rgba(9,111,97,.13); background: linear-gradient(145deg,#087e76,#12ad96); color: white; }
.modal-content { padding: 30px; }
.modal-heading h2 { font-weight: 850; letter-spacing: -.5px; }
.icon-button { min-width: 36px; min-height: 36px; }
.icon-button:hover { background: #f0f7f6; border-color: #b5d9d1; }
.modal-content label { color: #405e6b; }
:global(ion-modal.rentease-modal) { --border-radius: 20px; --width: min(590px, calc(100% - 26px)); }
:global(ion-modal.rentease-modal::part(content)) { border-radius: 20px; box-shadow: 0 22px 75px rgba(14,42,57,.2); }
:global(.rentease-messagebox .alert-wrapper) { border-radius: 18px; }
.spin-icon { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media(max-width:1200px){.stats-grid,.stats-grid.four { grid-template-columns: repeat(2,minmax(0,1fr)); }.content-grid { grid-template-columns: 1fr; }}
@media(max-width:900px){.sidebar{width:220px}.workspace{padding:24px 20px}.sidebar nav button{font-size:11px}.welcome-visual{width:120px}.welcome-visual > ion-icon{font-size:72px}.quick-actions{grid-template-columns:repeat(2,minmax(0,1fr));}}
@media(max-width:700px){
  .topbar { --min-height: 64px; }.toolbar-brand { margin-left: 12px; min-height: 63px; gap: 9px; }.brand-mark { width: 35px; height: 35px; font-size: 19px; }.brand-wordmark strong { font-size: 17px; }.brand-wordmark small{font-size:8px;}.topbar-actions{gap:7px;padding-right:10px}.topbar-date{display:none}.header-icon{width:36px;height:36px}.topbar-profile{width:34px;height:34px}.mobile-menu-button{display:grid;place-items:center;background:transparent;color:#355364;border:0;border-radius:9px;font-size:22px;width:30px;height:36px;cursor:pointer}
  .layout{display:block}.sidebar{display:none;width:100%;border:0;border-bottom:1px solid #e1ebe9;padding:13px}.sidebar.mobile-open{display:flex}.sidebar nav{grid-template-columns:repeat(2,minmax(0,1fr))}.sidebar nav button{font-size:11px;min-height:44px}.sidebar-note{display:none}.sidebar-logout{margin-top:12px}.workspace{padding:21px 14px}.page-heading{display:flex;flex-direction:column;align-items:stretch;gap:13px}.page-heading h1{font-size:26px}.heading-actions{margin-top:0}.heading-actions .button{width:100%}.welcome-banner{padding:27px 23px;min-height:200px}.welcome-visual{display:none}.welcome-banner h2{font-size:26px}.section-mini-heading{align-items:flex-start}.mini-date{font-size:10px}.stats-grid,.stats-grid.four{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.stat-card{min-height:110px;padding:16px;gap:10px;flex-direction:column}.stat-icon{width:38px;height:38px;font-size:19px}.stat-card h2{font-size:25px}.stat-card p{font-size:11px}.content-grid,.profile-layout,.property-grid{grid-template-columns:1fr}.panel{padding:17px}.panel-heading{flex-direction:column;align-items:stretch}.quick-actions{grid-template-columns:1fr 1fr}.quick-actions button{padding:12px;gap:8px}.quick-actions button > ion-icon{width:31px;height:31px;padding:7px}.quick-actions strong{font-size:11px}.filter-bar{display:grid;grid-template-columns:1fr}.filter-bar input{min-width:0}.modal-content{padding:22px 19px}.modal-actions{flex-wrap:wrap}.modal-actions .button{flex:1}.workspace-footer{flex-direction:column}
}
@media(max-width:390px){.quick-actions{grid-template-columns:1fr}.stats-grid,.stats-grid.four{grid-template-columns:1fr 1fr}.stat-card{padding:13px}.welcome-banner{padding:24px 18px}.sidebar nav{grid-template-columns:1fr 1fr}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}


/* ===== RentEase Premium Blue Experience: consistent controls and layout ===== */
:global(body) { background: #edf3ff; color: #142744; }
.portal { --background: #edf3ff; }
.topbar { --background: #ffffff; --color: #152b51; --border-color: #e4eaf8; }
.layout { min-height: 100%; gap: 0; }
.sidebar { background: linear-gradient(155deg,#083e96 0%,#0b55bc 49%,#073a88 100%); border: 0; padding: 24px 16px; box-shadow: 8px 0 34px rgba(7,49,119,.12); }
.sidebar::before { content: ''; position: absolute; pointer-events:none; }
.sidebar-profile { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2); }
.sidebar-profile:hover { background: rgba(255,255,255,.19); border-color: rgba(255,255,255,.35); }
.sidebar-profile strong { color: #fff; }
.sidebar-profile small { color: #cbdfff; }
.sidebar-profile .avatar { background: rgba(255,255,255,.95); color: #1051b4; box-shadow:none; }
.nav-label { color: #a7c8ff; margin-top: 29px; }
.sidebar nav button { min-height: 46px; color: #e1edff; border-radius: 12px; padding: 12px 13px; font-size: 12px; font-weight: 550; gap: 12px; }
.sidebar nav button:hover { background: rgba(255,255,255,.12); color: #fff; }
.sidebar nav button.active { background: #fff; color:#0b50b5; border-color: #fff; box-shadow: 0 7px 20px rgba(0,20,68,.17); font-weight: 800; }
.nav-count { background: #ff755f; color: white; }
.sidebar-note { background: rgba(255,255,255,.11); color: #fff; border:1px solid rgba(255,255,255,.16); }
.sidebar-note p { color: #c8dcff; }
.sidebar-logout { background: rgba(255,255,255,.1); border-color:rgba(255,255,255,.2); color:white; }
.sidebar-logout:hover { background:rgba(255,255,255,.2); }
.workspace { padding: 28px clamp(18px,2.3vw,38px); }
.brand-mark { background:linear-gradient(145deg,#267cf1,#0751bd); border-radius:13px; box-shadow: 0 6px 20px rgba(14,83,190,.2); }
.brand-mark ion-icon { font-size:24px; }
.brand-dot { color:#3388f3; }
.topbar-profile { background:#0a4faf; color:white; border-color:#d7e6ff; border-radius:50%; }
.global-search { display:flex; align-items:center; gap:10px; min-width:190px; width:clamp(200px,28vw,445px); height:41px; padding:0 10px 0 13px; background:#f1f5fc; border:1px solid #e9eef9; border-radius:25px; color:#4c6a9b; }
.global-search input { background:transparent; flex:1; min-width:0; border:0; outline:0; color:#18335d; font:inherit; font-size:12px; }
.global-search input::placeholder { color:#96a8c5; }
.global-search button { border:0; background:#dfebff; color:#1757b0; border-radius:13px; padding:5px 10px; cursor:pointer; font-size:10px; font-weight:800; }
.page-heading h1 { color:#18315d; }
.eyebrow,.mini-kicker { color:#2769d2; }
.heading-trail { color:#8ba1be; }
.subtitle,.panel-heading p { color:#8190a8; }
.welcome-banner { min-height:210px; border-radius:23px; padding:31px 35px; background:linear-gradient(115deg,#082f78 0%,#0d5ac5 54%,#217ceb 100%); box-shadow:0 18px 36px rgba(13,79,177,.21); }
.welcome-banner::before { opacity:.25; background:radial-gradient(circle at 77% 8%,#a8d9ff 0%,transparent 32%),radial-gradient(circle at 95% 95%,#80baff 0%,transparent 24%); }
.welcome-banner h2 { font-size:clamp(27px,2.4vw,35px); }
.welcome-banner p { color:#e1edff; max-width:570px; }
.welcome-kicker { color:#e6f1ff; }
.welcome-visual { margin-right:125px; color:#f1f7ff; }
.hero-date { position:absolute; top:27px; right:25px; z-index:3; display:flex; align-items:center; gap:9px; background:#fff; color:#174475; border-radius:14px; padding:10px 13px; box-shadow:0 9px 24px rgba(6,39,105,.17); font-size:12px; font-weight:750; }
.hero-date ion-icon { color:#276dd1; font-size:20px; }
.hero-date small { display:block; font-size:10px; font-weight:500; color:#8192ab; margin-top:3px; }
.hero-actions { display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin-top:20px; }
.welcome-cta { display:inline-flex; align-items:center; gap:8px; color:#0b4bb2; background:white; margin:0; border:1px solid white; }
.welcome-cta.outline { background:rgba(255,255,255,.12); color:white; border-color:rgba(255,255,255,.38); }
.welcome-cta.outline:hover { background:rgba(255,255,255,.2); }
.section-mini-heading h2,.panel-heading h2 { color:#18315d; }
.overview-stats { grid-template-columns:repeat(3,minmax(0,1fr)); }
.metric-action { width:100%; text-align:left; cursor:pointer; color:inherit; position:relative; border:1px solid #e6edf9; background:white; }
.metric-action:hover { transform:translateY(-4px); border-color:#aacbff; box-shadow:0 17px 30px rgba(15,65,150,.11); }
.metric-action .stat-copy { display:flex; flex-direction:column; gap:4px; min-width:0; }
.metric-action .stat-label { color:#536b8e; font-size:12px; font-weight:650; }
.metric-action .stat-value { color:#112954; font-size:clamp(22px,2vw,29px); line-height:1.2; font-weight:850; overflow-wrap:anywhere; }
.metric-action .stat-detail { color:#899bb5; font-size:11px; line-height:1.45; }
.stat-arrow { margin-left:auto; align-self:flex-start; color:#a4b9d7; font-size:15px; }
.stat-icon.indigo,.stat-icon.sky,.stat-icon.mint,.stat-icon.violet,.stat-icon.amber,.stat-icon.coral { width:47px;height:47px;color:white; border-radius:13px; box-shadow:0 6px 15px rgba(20,77,161,.13); }
.stat-icon.indigo { background:linear-gradient(145deg,#448fff,#155ee6); }.stat-icon.sky { background:linear-gradient(145deg,#46c3f7,#1194dc); }.stat-icon.mint { background:linear-gradient(145deg,#24d3ad,#00a978); }.stat-icon.violet { background:linear-gradient(145deg,#a681ff,#7546e6); }.stat-icon.amber { background:linear-gradient(145deg,#ffcb65,#f39b17); }.stat-icon.coral { background:linear-gradient(145deg,#ffb169,#f9762f); }
.panel { border-radius:19px; border:1px solid #e8edf9; box-shadow:0 8px 25px rgba(24,67,139,.045); }
.insight-grid { display:grid;grid-template-columns:1fr 1fr;gap:20px; }
.insight-panel { min-height:280px; }
.insight-panel .panel-heading h2 { display:flex;align-items:center;gap:9px; }
.insight-panel .panel-heading h2 ion-icon { color:#246bdb;font-size:18px; }
.distribution-layout { display:flex;gap:27px;align-items:center;justify-content:center;padding:12px 0; }
.distribution-ring { --tenant-share:50%; width:172px;height:172px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#2c84fa 0 var(--tenant-share),#1949bc var(--tenant-share) 100%); }
.ring-center { width:117px;height:117px;border-radius:50%;background:#fff;display:flex; flex-direction:column;align-items:center;justify-content:center;box-shadow:inset 0 1px 6px rgba(20,60,140,.04); }
.ring-center strong { font-size:31px;color:#12305d; }.ring-center small { color:#8c9db8;font-size:11px; }
.distribution-legend { min-width:165px;flex:1; }.distribution-legend > div { display:flex;align-items:center;gap:9px;margin-bottom:14px;font-size:12px; }.distribution-legend > div strong {margin-left:auto;color:#1a345e;}.distribution-legend p {font-size:11px;color:#8da1bc;line-height:1.6;}.legend-dot {display:inline-block;width:10px;height:10px;border-radius:50%;}.tenant-dot{background:#2c84fa}.owner-dot{background:#1949bc}
.pipeline-list {display:grid;gap:16px;padding:8px 0;}.pipeline-item{display:grid;grid-template-columns:94px minmax(0,1fr) 28px;align-items:center;gap:12px;font-size:11px;color:#5e7598;font-weight:700;}.pipeline-track{height:9px;border-radius:100px;background:#eef3fb;overflow:hidden;}.pipeline-track>div{height:100%;min-width:0;background:linear-gradient(90deg,#2d92fb,#104cbb);border-radius:100px;transition:width .3s;}.pipeline-item strong{text-align:right;color:#244678}.insight-footnote{font-size:11px;color:#95a5b9;margin-top:19px}
.button { min-height:40px;min-width:90px;justify-content:center;gap:8px;line-height:1.2; }
.button.primary { background:linear-gradient(135deg,#2479ed,#0e56c8);box-shadow:0 5px 15px rgba(20,95,213,.2); }.button.primary:hover{background:#0b4bb1;}
.button.secondary {background:#f7faff;color:#1c5db6;border-color:#d9e7fa;}.button.secondary:hover{background:#edf4ff;border-color:#abc7ef;color:#0b4fb5;}
.button.danger {background:#fff4f4;}
.panel-heading {align-items:center;flex-wrap:wrap;}.panel-heading > .button{margin-left:auto;flex-shrink:0;}
.table-wrap { overflow-x:auto;border:1px solid #e9eff9;border-radius:13px; }
th {background:#f3f7ff;color:#768baa;} tbody tr:hover{background:#f8faff;} td{color:#526786;} td strong {color:#1d3962;}
.table-actions {display:flex;align-items:center;justify-content:flex-start;gap:8px;flex-wrap:wrap;min-width:max-content;}.table-actions .text-button {min-height:34px;min-width:64px;display:inline-flex;align-items:center;justify-content:center;}
.card-actions {display:flex;justify-content:flex-start;gap:9px;}.card-actions .button {flex:1 1 auto;min-width:100px;}
.quick-actions {align-items:stretch;}.quick-actions button {min-height:90px;align-items:center;border-color:#e6edf9;background:linear-gradient(135deg,#fafcff,#f3f8ff);}.quick-actions button:hover {background:#eaf3ff;border-color:#b7d3fb;}.quick-actions button>ion-icon {color:#226cda;background:#e1edff;}.quick-actions button:nth-child(2)>ion-icon{color:#1799cd;background:#e1f6ff}.quick-actions button:nth-child(3)>ion-icon{color:#0da67d;background:#dbf8eb}.quick-actions button:nth-child(4)>ion-icon{color:#e77a22;background:#fff0e1}
.status-badge.good{background:#def8eb;color:#078454}.status-badge.warning{background:#fff0d4;color:#a66b12}.status-badge.danger{background:#ffebee;color:#bc324a}.status-badge.neutral{background:#ecf1f9;color:#667d9e}
.text-button{background:#edf4ff;color:#145bbd;border-color:#d3e4fc;}.text-button:hover{background:#deebff;border-color:#a3c4f4}.text-button.approve-text{background:#e6f8ef;color:#047c58}.text-button.danger-text{background:#fff1f1;color:#c54250}
.filter-bar{background:#f7faff;border-color:#e6eefb;align-items:center}.filter-bar input,.filter-bar select,.modal-content input,.modal-content select{border-color:#dbe6f7}.filter-bar input:focus,.filter-bar select:focus,.modal-content input:focus,.modal-content select:focus{border-color:#2c7de9;box-shadow:0 0 0 4px rgba(33,111,224,.12)}
.property-art{background:linear-gradient(135deg,#dfeeff,#eff5ff);color:#2169cb}.property-card:hover{border-color:#b3cefa;box-shadow:0 14px 30px rgba(22,72,151,.1)}
.profile-avatar-large{background:linear-gradient(145deg,#2a87f4,#074bb7);box-shadow:0 10px 22px rgba(21,81,168,.2)}
:global(ion-modal.rentease-modal::part(content)){border-radius:21px;box-shadow:0 22px 65px rgba(17,52,107,.23)}
.modal-actions {display:flex;justify-content:flex-end;align-items:center;gap:10px;}.modal-actions .button{min-width:112px;}
button:focus-visible,input:focus-visible,select:focus-visible {outline:3px solid rgba(44,125,233,.4);outline-offset:2px;}
@media(max-width:1350px){.overview-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.welcome-visual{margin-right:60px}.hero-date{top:15px;right:15px}}
@media(max-width:1100px){.global-search{width:clamp(170px,22vw,300px)}.insight-grid{grid-template-columns:1fr}.distribution-layout{justify-content:flex-start}}
@media(max-width:900px){.sidebar{width:218px}.welcome-visual{margin-right:0}.hero-date{display:none}}
@media(max-width:700px){.sidebar{background:linear-gradient(150deg,#083e96,#0b55bc)}.global-search{width:min(44vw,245px);height:36px}.global-search button{display:none}.workspace{padding:20px 13px}.welcome-banner{padding:26px 22px}.hero-actions{gap:8px}.overview-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.metric-action{padding:15px;gap:9px}.metric-action .stat-value{font-size:23px}.stat-arrow{display:none}.panel-heading .button{margin-left:0}.insight-panel{min-height:0}.distribution-layout{gap:15px}.distribution-ring{width:136px;height:136px}.ring-center{width:94px;height:94px}.ring-center strong{font-size:24px}.pipeline-item{grid-template-columns:78px minmax(0,1fr) 22px;gap:7px}.table-actions{flex-wrap:nowrap}.modal-actions{flex-wrap:wrap}.modal-actions .button{flex:1 1 130px;}}
@media(max-width:420px){.overview-stats{grid-template-columns:1fr}.global-search{width:145px}.metric-action{flex-direction:row}.distribution-layout{flex-direction:column}.hero-actions .welcome-cta{width:100%;justify-content:center}}


/* Premium record details & gradient polish — presentation only */
:global(ion-modal.details-modal) { --width:min(720px,calc(100% - 28px));--height:auto;--max-height:90%;--border-radius:24px; }
:global(ion-modal.details-modal::part(content)) { border-radius:24px;overflow:auto;box-shadow:0 32px 88px rgba(13,39,96,.28);background:#fff; }
.details-modal-shell { padding:0!important;min-height:0!important;max-height:none!important;overflow:visible!important;background:#fff; }
.details-hero { position:relative;overflow:hidden;display:flex;align-items:flex-start;gap:18px;padding:32px 32px 31px;background:linear-gradient(122deg,#092e79 0%,#1156bc 46%,#2c82ef 78%,#40b6e7 100%);color:#fff; }
.details-hero::before {content:'';position:absolute;width:260px;height:260px;right:-80px;top:-140px;border-radius:50%;border:45px solid rgba(255,255,255,.09);pointer-events:none}
.details-hero::after {content:'';position:absolute;width:200px;height:200px;left:40%;bottom:-185px;border-radius:50%;background:rgba(255,255,255,.08);pointer-events:none}
.details-hero-icon{position:relative;z-index:1;width:56px;height:56px;display:grid;place-items:center;flex-shrink:0;border:1px solid rgba(255,255,255,.3);border-radius:17px;background:rgba(255,255,255,.18);box-shadow:0 12px 25px rgba(3,24,77,.15);font-size:29px}
.details-hero-copy{position:relative;z-index:1;flex:1;min-width:0;padding-top:2px}
.details-kicker{display:inline-flex;align-items:center;gap:7px;font-size:10px;font-weight:800;letter-spacing:1.8px;color:#cfe5ff}
.details-kicker ion-icon{font-size:13px}
.details-hero h2{font-size:clamp(21px,2.4vw,29px);line-height:1.19;letter-spacing:-.75px;font-weight:850;color:white;margin:10px 0 8px;overflow-wrap:anywhere}
.details-hero p{font-size:12px;line-height:1.7;color:#e3efff;margin:0;max-width:460px}
.details-close-icon{position:relative;z-index:2;flex-shrink:0;width:38px;height:38px;border-radius:11px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.31);color:#fff}
.details-close-icon:hover{background:rgba(255,255,255,.29);border-color:rgba(255,255,255,.48);color:white}
.details-modal-body{padding:24px 30px 28px;background:linear-gradient(180deg,#f6f9ff 0%,#ffffff 36%)}
.details-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:19px}
.details-summary>div{display:flex;flex-direction:column;justify-content:center;min-height:71px;padding:13px 16px;border-radius:13px;border:1px solid #e0e9f9;background:#fff;box-shadow:0 6px 17px rgba(23,67,144,.045)}
.details-summary-label{font-size:9px;font-weight:800;letter-spacing:1.25px;color:#8799b5;margin-bottom:7px}
.details-summary strong{font-size:13px;color:#1a3a69;overflow-wrap:anywhere}
.details-info-list{display:grid;gap:10px}
.details-info-row{min-width:0;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:15px 17px;border:1px solid #e5ecf8;border-radius:13px;background:#fff;box-shadow:0 4px 13px rgba(19,60,134,.03);transition:border-color .18s,box-shadow .18s,transform .18s}
.details-info-row:hover{border-color:#bdd5ff;box-shadow:0 8px 18px rgba(22,77,171,.08);transform:translateY(-1px)}
.details-info-key{min-width:135px;display:flex;align-items:center;gap:11px}
.details-info-key strong{font-size:11px;font-weight:800;color:#57708e;overflow-wrap:anywhere}
.details-key-dot{height:9px;width:9px;flex-shrink:0;border-radius:50%;background:linear-gradient(140deg,#2777f3,#4cbce4);box-shadow:0 0 0 4px #edf4ff}
.details-info-value{font-size:12px;font-weight:700;color:#1f3c65;text-align:right;overflow-wrap:anywhere;min-width:0;max-width:58%}
.details-footer-actions{margin-top:23px;align-items:center;justify-content:flex-end}
.details-done-button{min-width:162px;display:inline-flex;justify-content:center;align-items:center;gap:8px}
.button.primary{background:linear-gradient(125deg,#1c65dd,#1f8af2)!important;color:#fff;border-color:transparent;box-shadow:0 8px 19px rgba(21,92,203,.19)}
.button.primary:not(:disabled):hover{background:linear-gradient(125deg,#1553bd,#186fe1)!important;box-shadow:0 11px 25px rgba(21,92,203,.27)}
.panel-heading,.card-actions,.table-actions,.modal-actions{gap:12px}
.panel-heading>.button{flex-shrink:0}
.card-actions .button,.table-actions .text-button{display:inline-flex;align-items:center;justify-content:center;min-height:35px}
.button,.text-button,.icon-button{transition:background .18s,border-color .18s,box-shadow .18s,transform .18s}
.button:focus-visible,.text-button:focus-visible,.icon-button:focus-visible{outline:3px solid rgba(43,124,239,.32);outline-offset:2px}
.property-art{background:linear-gradient(135deg,#d9eaff,#f1f6ff 48%,#d6edff)!important}
.property-card{box-shadow:0 8px 22px rgba(24,79,175,.06)}
.stat-card{background:linear-gradient(158deg,#fff 62%,#f1f7ff);border-color:#e1eafb}
@media(max-width:700px){
 .details-hero{padding:24px 19px;gap:12px;align-items:flex-start}.details-hero-icon{width:43px;height:43px;font-size:21px;border-radius:12px}
 .details-hero h2{font-size:21px}.details-close-icon{width:32px;height:32px}.details-modal-body{padding:18px 16px 22px}
 .details-summary{gap:7px}.details-summary>div{min-height:65px;padding:10px 8px}.details-summary-label{font-size:8px}.details-summary strong{font-size:11px}
 .details-info-row{align-items:flex-start;flex-direction:column;gap:8px;padding:13px}.details-info-value{max-width:100%;text-align:left;padding-left:20px}
 .details-footer-actions .button{width:100%}.panel-heading>.button{width:100%}
}
@media(prefers-reduced-motion:reduce){.details-info-row,.button,.text-button{transition:none!important}.details-info-row:hover{transform:none}}


/* === Reliable mobile drawer and touch layout (overrides earlier responsive rules) === */
.mobile-nav-backdrop { display: none; }
@media (max-width: 700px) {
  .portal { --background: #edf3ff; }
  .layout { display: block !important; width: 100%; min-width: 0; }
  .workspace { width: 100%; min-width: 0; max-width: 100%; padding: 18px 13px calc(26px + env(safe-area-inset-bottom, 0px)); }
  .sidebar {
    display: none !important;
    position: fixed !important;
    z-index: 1002;
    top: 0;
    bottom: 0;
    left: 0;
    width: min(290px, 84vw) !important;
    height: 100dvh;
    overflow-y: auto;
    padding: calc(18px + env(safe-area-inset-top, 0px)) 14px calc(18px + env(safe-area-inset-bottom, 0px));
    border-radius: 0 22px 22px 0;
    box-shadow: 16px 0 45px rgba(5, 32, 86, .28);
  }
  .sidebar.mobile-open { display: flex !important; flex-direction: column; }
  .sidebar nav { display: grid; grid-template-columns: 1fr !important; gap: 5px; }
  .sidebar nav button { width: 100%; min-height: 46px; white-space: normal; }
  .sidebar-note { display: block; }
  .mobile-nav-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 1001;
    width: 100vw;
    height: 100dvh;
    border: 0;
    background: rgba(9, 24, 55, .57);
    backdrop-filter: blur(3px);
    cursor: pointer;
  }
  .topbar { --min-height: 62px; }
  .toolbar-brand { min-width: 0; margin-left: 9px; gap: 7px; }
  .brand-mark { flex-shrink: 0; width: 34px; height: 34px; }
  .brand-wordmark { flex-shrink: 0; }
  .brand-wordmark strong { font-size: 15px; }
  .brand-wordmark small { font-size: 7px; letter-spacing: .9px; }
  .mobile-menu-button { display: grid !important; flex-shrink: 0; width: 34px; height: 40px; align-items: center; justify-items: center; }
  .global-search { min-width: 0 !important; width: min(31vw, 130px) !important; padding: 0 8px; margin-left: 2px; }
  .global-search input { min-width: 0; font-size: 10px; }
  .topbar-actions { gap: 5px; padding-right: 6px; }
  .topbar-date { display: none; }
  .header-icon { width: 34px; height: 34px; }
  .topbar-profile { width: 32px; height: 32px; }
  .page-heading h1 { font-size: clamp(23px, 6vw, 28px); overflow-wrap: anywhere; }
  .stats-grid, .stats-grid.four, .overview-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .content-grid, .property-grid, .insight-grid, .profile-layout { grid-template-columns: minmax(0, 1fr); }
  .panel, .stat-card, .property-card { min-width: 0; }
  .panel-heading { align-items: stretch; }
  .panel-heading > .button { width: 100%; }
  .filter-bar { grid-template-columns: minmax(0, 1fr); }
  .filter-bar input, .filter-bar select { width: 100%; min-width: 0; }
  .table-wrap { max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .details-modal-body { padding-bottom: calc(22px + env(safe-area-inset-bottom, 0px)); }
  :global(ion-modal.details-modal) { --width: calc(100% - 20px); --max-height: 88%; }
  .button, .text-button, .sidebar nav button { touch-action: manipulation; }
  .button, .mobile-menu-button { min-height: 42px; }
}
@media (max-width: 390px) {
  .global-search { display: none !important; }
  .brand-wordmark strong { font-size: 16px; }
  .overview-stats { grid-template-columns: minmax(0, 1fr); }
  .stats-grid, .stats-grid.four { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .modal-actions { flex-wrap: wrap; }
  .modal-actions .button { flex: 1 1 120px; }
}


/* === Visual refinement overrides: compact sidebar, richer stat cards, upgraded tables === */
.layout {
  align-items: flex-start;
  gap: 18px;
}

.workspace {
  flex: 1;
  min-width: 0;
}

.sidebar {
  position: sticky;
  top: 14px;
  align-self: flex-start;
  height: auto;
  max-height: calc(100vh - 28px);
  overflow-y: auto;
  padding: 16px 12px 14px;
  border-radius: 24px;
  box-shadow: 0 14px 40px rgba(10, 58, 134, 0.16);
}

.sidebar-profile {
  margin-bottom: 14px;
}

.nav-label {
  margin-top: 14px;
  margin-bottom: 10px;
}

.sidebar nav {
  gap: 8px;
}

.sidebar nav button {
  min-height: 44px;
}

.sidebar-logout {
  margin-top: 14px !important;
}

.sidebar-note {
  margin-top: 14px !important;
  margin-bottom: 0;
}

.stats-grid,
.stats-grid.four {
  gap: 18px;
}

.stat-card {
  position: relative;
  overflow: hidden;
  min-height: 132px;
  padding: 20px 20px 18px;
  border-radius: 20px;
  border: 1px solid #dce7fb;
  background:
    radial-gradient(circle at 88% 18%, rgba(81, 135, 255, 0.16), transparent 22%),
    linear-gradient(145deg, #ffffff 0%, #f6f9ff 62%, #eef5ff 100%);
  box-shadow: 0 12px 28px rgba(19, 59, 125, 0.08);
  isolation: isolate;
}

.stat-card::before {
  content: '';
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 5px;
  background: linear-gradient(90deg, #2155d6 0%, #0c73de 55%, #10b3a7 100%);
  opacity: 0.95;
}

.stat-card::after {
  content: '';
  position: absolute;
  right: -14px;
  bottom: -18px;
  width: 92px;
  height: 92px;
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(35, 97, 220, 0.09), rgba(16, 179, 167, 0.06));
  transform: rotate(24deg);
  z-index: 0;
}

.stat-card > div {
  position: relative;
  z-index: 1;
}

.stat-card p {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #6a7f98;
  text-transform: uppercase;
}

.stat-card h2 {
  margin: 0;
  font-size: clamp(28px, 2.2vw, 34px);
  line-height: 1;
  letter-spacing: -1.1px;
  color: #18335a;
}

.stat-card small {
  margin-top: 9px;
  font-size: 11px;
  line-height: 1.55;
  color: #8394aa;
}

.stats-grid > .stat-card:nth-child(1)::before,
.stats-grid.four > .stat-card:nth-child(1)::before {
  background: linear-gradient(90deg, #2155d6 0%, #4b87ff 100%);
}

.stats-grid > .stat-card:nth-child(2)::before,
.stats-grid.four > .stat-card:nth-child(2)::before {
  background: linear-gradient(90deg, #0f8c7f 0%, #18bea1 100%);
}

.stats-grid > .stat-card:nth-child(3)::before,
.stats-grid.four > .stat-card:nth-child(3)::before {
  background: linear-gradient(90deg, #f39c12 0%, #f8c04d 100%);
}

.stats-grid > .stat-card:nth-child(4)::before,
.stats-grid.four > .stat-card:nth-child(4)::before {
  background: linear-gradient(90deg, #e45576 0%, #ff7e96 100%);
}

.panel {
  border-radius: 22px;
  border: 1px solid #e2ebfb;
  box-shadow: 0 10px 30px rgba(19, 59, 125, 0.06);
}

.panel-heading {
  margin-bottom: 16px;
}

.panel-heading h2 {
  font-size: 18px;
  letter-spacing: -0.4px;
}

.table-wrap {
  border: 1px solid #e2ebfb;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #fcfdff 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
  overflow: hidden;
}

table {
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 14px 14px;
  background: linear-gradient(180deg, #f3f7ff 0%, #edf4ff 100%);
  color: #5a7292;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-bottom: 1px solid #dfe8fa;
}

tbody td {
  padding: 16px 14px;
  vertical-align: middle;
  border-bottom: 1px solid #edf2fb;
}

tbody tr:nth-child(even) td {
  background: rgba(245, 249, 255, 0.6);
}

tbody tr:hover td {
  background: #eef5ff;
}

tbody tr:last-child td {
  border-bottom: 0;
}

.table-actions .text-button {
  min-width: 74px;
  min-height: 36px;
  border-radius: 12px;
  border: 1px solid #cfe0ff;
  background: linear-gradient(180deg, #ffffff 0%, #f2f7ff 100%);
  color: #2155d6;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(33, 85, 214, 0.08);
}

.table-actions .text-button:hover {
  background: linear-gradient(180deg, #2155d6 0%, #0c73de 100%);
  color: #ffffff;
  border-color: transparent;
}

.filter-bar {
  border-radius: 18px;
  padding: 12px;
  background: linear-gradient(180deg, #f9fbff 0%, #f3f7ff 100%);
  border: 1px solid #e4ecfb;
}

.filter-bar input,
.filter-bar select {
  min-height: 44px;
  border-radius: 14px;
  border: 1px solid #dbe5f7;
  background: #ffffff;
}

@media (max-width: 1200px) {
  .sidebar {
    width: 224px;
  }
}

@media (max-width: 700px) {
  .layout {
    gap: 0;
  }

  .sidebar {
    position: fixed !important;
    top: 0;
    border-radius: 0 22px 22px 0;
    max-height: 100dvh;
    padding-top: calc(18px + env(safe-area-inset-top, 0px));
    padding-bottom: calc(18px + env(safe-area-inset-bottom, 0px));
  }

  .stats-grid,
  .stats-grid.four,
  .overview-stats {
    gap: 12px;
  }

  .stat-card {
    min-height: 118px;
    padding: 16px 15px 15px;
    border-radius: 18px;
  }

  .stat-card p {
    font-size: 10px;
  }

  .stat-card h2 {
    font-size: 24px;
  }

  .panel {
    border-radius: 18px;
  }

  .table-wrap {
    border-radius: 16px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  table {
    min-width: 720px;
  }
}


/* Premium Property Showcase – visual-only enhancements */
.property-showcase-grid { gap: 22px; align-items: stretch; }
.property-showcase { display:flex;flex-direction:column;min-width:0;overflow:hidden;border-radius:22px!important;background:#fff;border:1px solid #dce8f9!important;box-shadow:0 14px 36px rgba(28,68,133,.09)!important;transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease; }
.property-showcase:hover { transform:translateY(-5px);box-shadow:0 22px 45px rgba(28,68,133,.16)!important;border-color:#9ac4ff!important; }
.property-cover { position:relative;isolation:isolate;overflow:hidden;min-height:194px;padding:18px 21px;display:flex;flex-direction:column;justify-content:space-between;background:linear-gradient(124deg,#133a9d 0%,#1e73de 62%,#58b9f7 100%);color:white; }
.property-cover-1 { background:linear-gradient(126deg,#173b83 0%,#3065cb 54%,#728ae8 100%); }
.property-cover-2 { background:linear-gradient(126deg,#123c93 0%,#1d8bcb 62%,#48bed2 100%); }
.property-cover::after { content:'';position:absolute;z-index:-1;right:-62px;top:-96px;width:290px;height:290px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.22),transparent 70%); }
.cover-grid { position:absolute;inset:0;z-index:-1;opacity:.16;background-image:linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px);background-size:36px 36px;mask-image:linear-gradient(90deg,transparent,#000); }
.cover-topline,.cover-bottomline { display:flex;align-items:center;justify-content:space-between;gap:10px;position:relative;z-index:2; }
.cover-eyebrow { display:inline-flex;align-items:center;gap:8px;font-size:10px;font-weight:850;letter-spacing:.13em; }
.cover-eyebrow ion-icon { font-size:16px; }
.cover-number { padding:6px 10px;border:1px solid rgba(255,255,255,.26);border-radius:8px;background:rgba(255,255,255,.16);font-size:11px;font-weight:750; }
.cover-location { font-weight:650;font-size:11px;max-width:68%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-flex;align-items:center;gap:6px; }
.cover-live { font-size:10px;font-weight:800;border-radius:100px;background:rgba(255,255,255,.2);padding:7px 10px;display:inline-flex;align-items:center;gap:6px;white-space:nowrap; }
.live-dot {width:7px;height:7px;background:#a4ffce;border-radius:50%;box-shadow:0 0 0 4px rgba(164,255,206,.15);}
.cover-illustration {position:absolute;right:22px;bottom:28px;width:185px;height:130px;opacity:.92;filter:drop-shadow(0 13px 14px rgba(0,28,91,.2));}
.building { position:absolute;bottom:0;display:block;border-radius:6px 6px 0 0;border:2px solid rgba(255,255,255,.65);background:repeating-linear-gradient(90deg,rgba(255,255,255,.23) 0 13px,transparent 13px 21px),repeating-linear-gradient(0deg,rgba(255,255,255,.15) 0 16px,transparent 16px 27px),rgba(10,54,150,.28); }
.building-back {left:5px;width:66px;height:72px;opacity:.55;}
.building-main {left:55px;width:78px;height:122px;}
.building-front {left:126px;width:56px;height:89px;opacity:.8;}
.property-showcase-body {padding:21px;display:flex;flex-direction:column;flex:1;gap:18px;}
.property-showcase-title {display:flex;justify-content:space-between;align-items:flex-start;gap:12px;min-width:0;}
.property-eyebrow {margin:0 0 7px;color:#8496b2;font-size:10px;font-weight:850;letter-spacing:.12em;text-transform:uppercase;}
.property-showcase-title h3 {margin:0;color:#15335e;font-weight:850;font-size:18px;letter-spacing:-.4px;line-height:1.3;overflow-wrap:anywhere;}
.property-state {display:inline-flex;align-items:center;gap:5px;white-space:nowrap;font-size:10px;font-weight:800;color:#0b966a;background:#e9faf1;border:1px solid #d1f2e1;border-radius:100px;padding:6px 9px;}
.property-showcase-facts {display:grid;grid-template-columns:minmax(0,1.4fr) minmax(110px,.6fr);gap:12px;}
.property-fact {display:flex;align-items:center;gap:10px;background:linear-gradient(130deg,#f6f9ff,#eef5ff);border:1px solid #e4edfc;border-radius:13px;padding:12px;min-width:0;}
.fact-icon {width:36px;height:36px;flex-shrink:0;display:grid;place-items:center;border-radius:11px;color:#1766d6;background:#dfeeff;font-size:18px;}
.fact-icon.unit-icon {color:#0d948b;background:#dff8f3;}
.property-fact span:last-child {display:flex;flex-direction:column;min-width:0;gap:4px;}
.property-fact small {font-size:10px;color:#8293ab;font-weight:650;}
.property-fact strong {font-size:12px;color:#1b3b68;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.property-card-footer {margin-top:auto;padding-top:15px;border-top:1px solid #e8eff9;display:flex;align-items:center;justify-content:space-between;gap:12px;}
.property-id-label {font-size:11px;color:#8393a9;white-space:nowrap;}.property-id-label strong{color:#355580;}
.property-view-button {min-height:43px;padding:11px 16px;border:0;border-radius:11px;background:linear-gradient(118deg,#1d5fe0,#118be0);color:#fff;box-shadow:0 7px 16px rgba(23,99,218,.19);font-size:12px;font-weight:850;display:inline-flex;align-items:center;justify-content:center;gap:13px;cursor:pointer;transition:transform .2s,box-shadow .2s;}
.property-view-button:hover {transform:translateY(-2px);box-shadow:0 11px 23px rgba(23,99,218,.28);}.property-view-button:focus-visible{outline:3px solid #93c5fd;outline-offset:3px;}
@media(max-width:1150px) { .property-showcase-facts {grid-template-columns:1fr;} }
@media(max-width:700px){.property-showcase-grid{grid-template-columns:1fr!important;gap:16px;}.property-cover{min-height:165px;padding:17px;}.cover-illustration{transform:scale(.8);transform-origin:bottom right;right:12px;}.property-showcase-body{padding:16px;gap:14px;}.property-showcase-facts{grid-template-columns:1fr 1fr;}.property-state{font-size:9px;}.property-card-footer{align-items:stretch;flex-wrap:wrap;}.property-view-button{flex:1 1 100%;min-height:46px;}}
@media(max-width:390px){.property-showcase-facts{grid-template-columns:1fr;}.property-showcase-title{flex-wrap:wrap;}}


.audit-filters{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:18px;padding:16px;border:1px solid #e0eafb;background:linear-gradient(120deg,#f7faff,#eef5ff);border-radius:15px}
.audit-filters label{font-size:11px;font-weight:800;color:#4d668b;display:grid;gap:7px;flex:1 1 180px}
.audit-filters select{background:#fff;color:#1e385f;padding:12px;border-radius:11px;border:1px solid #d7e4f7;min-height:44px;width:100%}
.audit-panel .panel-heading h2{display:flex;align-items:center;gap:9px}
.audit-event-type{display:block;margin-top:6px;font-size:10px;color:#6582a4;letter-spacing:.5px}
.audit-error{padding:12px 15px;background:#fff3f3;border:1px solid #ffd3d3;border-radius:12px;color:#ad313b}
.audit-pagination{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:17px;color:#7185a1;font-size:12px}
.audit-pagination>div{display:flex;gap:9px}
.audit-footnote{font-size:11px;color:#7286a2;line-height:1.7;margin-top:16px}
@media(max-width:700px){.audit-filters{flex-direction:column}.audit-pagination>div{width:100%}.audit-pagination button{flex:1}}
</style>
