<script setup lang="ts">
import { getMyProfile, saveMyProfile } from '@/services/profile';
import { computed, reactive, ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { logout as logoutUser } from '@/services/auth';
import { restoreSession } from '@/services/auth';
import { listProperties, listPropertyUnits, createProperty, createUnit, updateProperty, updateUnit } from '@/services/properties';
import { confirmUnitTurnover } from '@/services/turnover';
import { listOwnerDeposits, decideDepositPayment, type SecurityDepositPayment } from '@/services/deposits';
import { listOwnerSettlements, createDepositSettlement, addDepositDeduction, deleteDepositDeduction, finalizeDepositSettlement, recordDepositRefund, decideDepositRefund, type DepositSettlement } from '@/services/depositSettlements';
import { printDepositSettlement } from '@/services/printDepositSettlement';
import { listOwnerApplications, reviewRentalApplication, type RentalApplication } from '@/services/applications';
import { listOwnerLeases, prepareLease, finishLease, type RentalLease } from '@/services/leases';
import { listOwnerBills, listOwnerPayments, createBill, decidePayment, type RentalBill, type RentalPayment } from '@/services/billing';
import { listOwnerMaintenance, updateMaintenanceStatus, type RentalMaintenanceRequest } from '@/services/maintenance';
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
  businessOutline,
  documentTextOutline,
  timeOutline,
  informationCircleOutline,
  cardOutline,
  constructOutline,
  personOutline,
  closeOutline,
  notificationsOutline,
  checkmarkCircleOutline,
  logOutOutline,
  menuOutline,
  chevronForwardOutline,
  addOutline,
  refreshOutline,
} from 'ionicons/icons';
type Property = {
  id: number;
  name: string;
  address: string;
};
type Unit = {
  id: number;
  propertyId: number;
  number: string;
  rent: number;
  bedrooms: number;
  capacity: number;
  status?: string;
};
type Application = {
  id: number;
  unitId: number;
  name: string;
  email: string;
  phone: string;
  moveIn: string;
  duration: number;
  submitted: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decided?: string;
};
type Lease = {
  id: number;
  unitId: number;
  tenant: string;
  start: string;
  end: string;
  rent: number;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
  deposit?: number;
  applicationId?: number | null;
};
type Bill = {
  id: number;
  leaseId: number;
  period: string;
  due: string;
  amount: number;
  verified: number;
  status: string;
};

type Payment = {
  id: number;
  billId: number;
  amount: number;
  method: string;
  reference: string;
  date: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  proof: string;
  note: string;
};
type Maintenance = {
  id: number;
  unitId: number;
  category: string;
  description: string;
  date: string;
  status: string;
  priority?: string;
  tenant?: string;
};
type Activity = {
  id: number;
  text: string;
  at: string;
};
type DemoState = {
  profile: {
    name: string;
    email: string;
    mobile: string;
    avatar: string;
  };
  properties: Property[];
  units: Unit[];
  applications: Application[];
  leases: Lease[];
  bills: Bill[];
  payments: Payment[];
  maintenance: Maintenance[];
  activity: Activity[];
};
const router = useRouter();
const STORAGE_KEY = 'rentease-owner-demo-v3';
const propertiesLoading = ref(false);
const savingRental = ref(false);
const rentalLoaded = ref(false);
const unitSaveStatus = ref('');
const applicationsLoading = ref(false);
const applicationsError = ref('');
const reviewingApplication = ref(false);
const leasesLoading = ref(false);
const leasesError = ref('');
const savingLease = ref(false);
const releasingUnitId = ref<number | null>(null);
const depositRecords = ref<SecurityDepositPayment[]>([]);
const depositsLoading = ref(false);
const depositsSaving = ref<number | null>(null);
const depositsError = ref('');
const financeLoading=ref(false);
const financeSaving=ref(false);
const financeError=ref('');
const maintenanceLoading=ref(false);
const maintenanceSaving=ref(false);
const maintenanceError=ref('');
function dateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
function monthOffset(offset: number): string {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function seed(): DemoState {
  return {
    profile: {
      name: 'Yvette C. Nituma',
      email: 'owner@example.com',
      mobile: '09171234567',
      avatar: '',
    },
    properties: [
      {
        id: 1,
        name: 'Soriano Apartment',
        address: 'Calapan City, Oriental Mindoro',
      },
      {
        id: 2,
        name: 'Rivera Residences',
        address: 'Naujan, Oriental Mindoro',
      },
    ],
    units: [
      {
        id: 1, propertyId: 1, number: '101',
        rent: 8000, bedrooms: 1, capacity: 2,
      },
      {
        id: 2, propertyId: 1, number: '102',
        rent: 8500, bedrooms: 2, capacity: 4,
      },
      {
        id: 3, propertyId: 1, number: '103',
        rent: 8000, bedrooms: 1, capacity: 2,
      },
      {
        id: 4, propertyId: 2, number: '201',
        rent: 9000, bedrooms: 2, capacity: 4,
      },
    ],
    applications: [
      {
        id: 1,
        unitId: 3,
        name: 'Maria Santos',
        email: 'maria@example.com',
        phone: '09180000001',
        moveIn: dateOffset(7),
        duration: 12,
        submitted: dateOffset(-2),
        status: 'PENDING',
      },
      {
        id: 2,
        unitId: 3,
        name: 'Paolo Reyes',
        email: 'paolo@example.com',
        phone: '09180000002',
        moveIn: dateOffset(14),
        duration: 6,
        submitted: dateOffset(-1),
        status: 'PENDING',
      },
      {
        id: 3,
        unitId: 2,
        name: 'Carlo Mendoza',
        email: 'carlo@example.com',
        phone: '09180000003',
        moveIn: dateOffset(-60),
        duration: 12,
        submitted: dateOffset(-65),
        status: 'APPROVED',
        decided: dateOffset(-62),
      },
    ],
    leases: [
      {
        id: 1,
        unitId: 1,
        tenant: 'Juan Dela Cruz',
        start: dateOffset(-300),
        end: dateOffset(20),
        rent: 8000,
        status: 'ACTIVE',
      },
      {
        id: 2,
        unitId: 2,
        tenant: 'Carlo Mendoza',
        start: dateOffset(-60),
        end: dateOffset(45),
        rent: 8500,
        status: 'ACTIVE',
      },
      {
        id: 3,
        unitId: 4,
        tenant: 'Ana Rivera',
        start: dateOffset(-150),
        end: dateOffset(120),
        rent: 9000,
        status: 'ACTIVE',
      },
    ],
    bills: [
      {
        id: 1, leaseId: 1, period: monthOffset(0),
        due: dateOffset(-5), amount: 9700, verified: 0, status: 'UNPAID',
      },
      {
        id: 2, leaseId: 2, period: monthOffset(0),
        due: dateOffset(3), amount: 8500, verified: 0, status: 'UNPAID',
      },
      {
        id: 3, leaseId: 3, period: monthOffset(0),
        due: dateOffset(-2), amount: 9000, verified: 0, status: 'UNPAID',
      },
      {
        id: 4, leaseId: 1, period: monthOffset(-1),
        due: `${monthOffset(-1)}-05`, amount: 8000, verified: 0, status: 'UNPAID',
      },
      {
        id: 5, leaseId: 2, period: monthOffset(-2),
        due: `${monthOffset(-2)}-05`, amount: 8500, verified: 0, status: 'UNPAID',
      },
      {
        id: 6, leaseId: 3, period: monthOffset(-3),
        due: `${monthOffset(-3)}-05`, amount: 9000, verified: 0, status: 'UNPAID',
      },
    ],
    payments: [
      {
        id: 1, billId: 1, amount: 9700, method: 'GCash',
        reference: 'DEMO-GC-001', date: dateOffset(-1),
        status: 'PENDING', proof: '', note: '',
      },
      {
        id: 2, billId: 3, amount: 4000, method: 'Cash',
        reference: 'DEMO-CASH-002', date: dateOffset(-3),
        status: 'VERIFIED', proof: '', note: '',
      },
      {
        id: 3, billId: 4, amount: 8000, method: 'Bank Transfer',
        reference: 'DEMO-BANK-003', date: `${monthOffset(-1)}-05`,
        status: 'VERIFIED', proof: '', note: '',
      },
      {
        id: 4, billId: 5, amount: 8500, method: 'GCash',
        reference: 'DEMO-GC-004', date: `${monthOffset(-2)}-05`,
        status: 'VERIFIED', proof: '', note: '',
      },
      {
        id: 5, billId: 6, amount: 9000, method: 'Cash',
        reference: 'DEMO-CASH-005', date: `${monthOffset(-3)}-05`,
        status: 'VERIFIED', proof: '', note: '',
      },
      {
        id: 6, billId: 2, amount: 8500, method: 'Bank Transfer',
        reference: 'DEMO-BANK-006', date: dateOffset(-2),
        status: 'REJECTED', proof: '',
        note: 'Reference could not be matched.',
      },
    ],
    maintenance: [
      {
        id: 1, unitId: 1, category: 'Plumbing',
        description: 'Shower fixture is leaking.',
        date: dateOffset(-3), status: 'IN PROGRESS',
      },
      {
        id: 2, unitId: 2, category: 'Electrical',
        description: 'Kitchen light needs inspection.',
        date: dateOffset(-1), status: 'PENDING',
      },
      {
        id: 3, unitId: 4, category: 'General',
        description: 'Door handle replacement.',
        date: dateOffset(-10), status: 'COMPLETED',
      },
    ],
    activity: [
      {
        id: 1,
        text: 'Maria Santos submitted a rental application.',
        at: new Date().toISOString(),
      },
      {
        id: 2,
        text: 'Juan Dela Cruz submitted a payment for review.',
        at: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
  };
}
let initialState = seed();
let storageWarning = '';
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    const required = [
      'properties', 'units', 'applications', 'leases',
      'bills', 'payments', 'maintenance', 'activity',
    ];
    if (
      parsed?.profile &&
      required.every(key => Array.isArray(parsed[key]))
    ) {
      initialState = parsed;
    } else {
      storageWarning = 'Saved data was invalid. Sample data has been loaded.';
    }
  }
} catch {
  storageWarning = 'Browser storage is unavailable. Changes may not survive a refresh.';
}
const state = reactive<DemoState>(initialState);
// The rental catalog uses PostgreSQL. Older localStorage IDs are never trusted.
state.properties = [];
state.units = [];
// Other modules are not integrated yet; do not display sample financial/tenant data as real.
state.applications = [];
state.leases = [];
state.bills = [];
state.payments = [];
state.maintenance = [];
state.activity = [];
const message = ref(storageWarning);
watch(state, () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, properties: [], units: [], applications: [], leases: [], bills: [], payments: [], maintenance: [], activity: [] }));
  } catch {
    message.value = 'Changes are in memory, but browser storage could not save them.';
  }
}, { deep: true });
async function refreshRentalCatalog() {
  propertiesLoading.value = true;
  try {
    const properties = await listProperties();
    const unitsByProperty = await Promise.all(
      properties.map(property => listPropertyUnits(property.property_id))
    );
    state.properties = properties.map(property => ({
      id: Number(property.property_id),
      name: property.property_name,
      address: property.address,
    }));
    state.units = unitsByProperty.flat().map(unit => ({
      id: Number(unit.unit_id),
      propertyId: Number(unit.property_id),
      number: unit.unit_number,
      rent: Number(unit.monthly_rent),
      bedrooms: Number(unit.bedrooms ?? 0),
      capacity: Number(unit.capacity ?? 1),
      status: String(unit.status ?? 'available').toUpperCase(),
    }));
    rentalLoaded.value = true;
  } catch (error) {
    console.error('Failed to load rental catalog:', error);
    message.value = 'Could not load properties and units from the server. Please refresh.';
  } finally {
    propertiesLoading.value = false;
  }
}

// PostgreSQL application records are the only source for owner applications.
// PostgreSQL may serialize DATE columns as ISO timestamps; normalize for the UI.
function sqlDate(value: string | null | undefined): string {
  return typeof value === 'string' ? value.slice(0, 10) : '';
}
function mapOwnerApplication(row: RentalApplication): Application {
  return {
    id: Number(row.application_id),
    unitId: Number(row.unit_id),
    name: row.tenant_name || 'Tenant',
    email: row.tenant_email || '',
    phone: row.contact_details || '',
    moveIn: sqlDate(row.move_in_date),
    duration: Number(row.lease_duration_months),
    submitted: sqlDate((row as RentalApplication & { submitted_at?: string; created_at?: string }).submitted_at || (row as RentalApplication & { created_at?: string }).created_at) || '',
    status: String(row.status).toUpperCase() as Application['status'],
    decided: sqlDate(row.reviewed_at),
  };
}
async function refreshOwnerApplications(): Promise<boolean> {
  if (applicationsLoading.value) return false;
  applicationsLoading.value = true;
  applicationsError.value = '';
  try {
    const records = await listOwnerApplications();
    state.applications = records.map(mapOwnerApplication);
    return true;
  } catch (error) {
    console.error('[RentEase] Owner application loading failed:', error);
    applicationsError.value = error instanceof Error ? error.message : 'Could not load applications.';
    return false;
  } finally {
    applicationsLoading.value = false;
  }
}

function convertLease(row: RentalLease): Lease {
  return { id: Number(row.lease_id), unitId: Number(row.unit_id), tenant: row.tenant_name || 'Tenant',
    start: String(row.start_date).slice(0,10), end: String(row.end_date).slice(0,10),
    rent: Number(row.monthly_rent), status: String(row.status).toUpperCase() as Lease['status'],
    deposit: Number(row.security_deposit || 0), applicationId: row.application_id == null ? null : Number(row.application_id) };
}
async function refreshOwnerLeases() {
  if (leasesLoading.value) return;
  leasesLoading.value = true; leasesError.value = '';
  try { state.leases = (await listOwnerLeases()).map(convertLease); }
  catch (error: any) { leasesError.value = error?.response?.data?.message || error?.message || 'Unable to load leases.'; }
  finally { leasesLoading.value = false; }
}
const leaseDialogOpen = ref(false);
const leaseDialogApplication = ref<Application | null>(null);
const leaseDeposit = ref('0');
const leaseDialogError = ref('');
function openLeasePreparation(app: Application) {
  if (savingLease.value || app.status !== 'APPROVED') return;
  if (state.leases.some(l => l.applicationId === app.id && l.status !== 'COMPLETED')) {
    notify('A lease agreement already exists for this application.'); return;
  }
  leaseDialogApplication.value = app;
  leaseDeposit.value = '0';
  leaseDialogError.value = '';
  leaseDialogOpen.value = true;
}
function closeLeasePreparation() {
  if (savingLease.value) return;
  leaseDialogOpen.value = false;
  leaseDialogApplication.value = null;
  leaseDialogError.value = '';
}
async function submitLeasePreparation() {
  const app = leaseDialogApplication.value;
  if (!app || savingLease.value) return;
  // A Vue number input can update a v-model with a number even when its
  // initial value was a string. Normalize before using string methods.
  const depositText = String(leaseDeposit.value ?? '').trim();
  const amount = Number(depositText);
  if (!depositText || !/^\d+(?:\.\d{1,2})?$/.test(depositText) ||
      !Number.isFinite(amount) || amount < 0 || amount > 100000000) {
    leaseDialogError.value = 'Enter an amount from ₱0 to ₱100,000,000, with no more than 2 decimal places.';
    return;
  }
  savingLease.value = true;
  leaseDialogError.value = '';
  try {
    await prepareLease(app.id, amount);
    await refreshOwnerLeases();
    leaseDialogOpen.value = false;
    leaseDialogApplication.value = null;
    closeDialog();
    navigate('leases');
    notify('Lease agreement prepared. The tenant can now review and confirm the rental terms.');
  } catch (error: any) {
    leaseDialogError.value = error?.response?.data?.message || error?.message || 'Unable to prepare the lease. Please try again.';
  } finally { savingLease.value = false; }
}
async function createLeaseFromApplication(app: Application) { openLeasePreparation(app); }
function ownerBill(row:RentalBill):Bill {return {id:Number(row.bill_id),leaseId:Number(row.lease_id),period:String(row.billing_period).slice(0,7),due:String(row.due_date).slice(0,10),amount:Number(row.total_amount),verified:Number(row.verified_amount),status:String(row.status).toUpperCase()};}
function ownerPayment(row:RentalPayment):Payment{return {id:Number(row.payment_id),billId:Number(row.bill_id),amount:Number(row.amount),method:row.payment_method,reference:row.reference_number||'',date:String(row.payment_date).slice(0,10),status:(row.status==='pending_verification'?'PENDING':String(row.status).toUpperCase()) as Payment['status'],proof:'',note:''};}
async function refreshFinances(){if(financeLoading.value)return;financeLoading.value=true;financeError.value='';try{const [b,p]=await Promise.all([listOwnerBills(),listOwnerPayments()]);state.bills=b.map(ownerBill);state.payments=p.map(ownerPayment);}catch(e:any){financeError.value=e?.response?.data?.message||e?.message||'Failed to load billing records.';notify(financeError.value);}finally{financeLoading.value=false;}}
const billingModalOpen = ref(false);
const billingStep = ref<1 | 2>(1);
const billingError = ref('');
const billingForm = reactive({ leaseId: 0, month: '', due: '', water: '0', electricity: '0', other: '0' });
const eligibleBillingLeases = computed(() => state.leases.filter(lease => lease.status === 'ACTIVE'));
const chosenBillingLease = computed(() => eligibleBillingLeases.value.find(lease => lease.id === billingForm.leaseId));
const extraBillCharges = computed(() => ['water','electricity','other'].reduce((sum, key) => sum + (Number(billingForm[key as 'water'|'electricity'|'other']) || 0), 0));
const estimatedBillTotal = computed(() => Number(chosenBillingLease.value?.rent || 0) + extraBillCharges.value);
function closeBillingModal() { if (!financeSaving.value) { billingModalOpen.value = false; billingError.value = ''; } }
function issueBill() {
  if (financeSaving.value) return;
  const active = eligibleBillingLeases.value;
  if (!active.length) { notify('No active lease is available for billing.'); return; }
  const today = new Date();
  const month = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`;
  // Default to a future payment deadline; the billing period may be earlier than today.
  const dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
  const suggestedDue = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
  Object.assign(billingForm, { leaseId: active[0].id, month, due: suggestedDue, water: '0', electricity: '0', other: '0' });
  billingError.value = '';
  billingStep.value = 1;
  billingModalOpen.value = true;
}
function advanceBilling() {
  if (!chosenBillingLease.value) { billingError.value = 'Select an active lease first.'; return; }
  billingError.value = '';
  billingStep.value = 2;
}
async function submitMonthlyBill() {
  if (financeSaving.value) return;
  const lease = chosenBillingLease.value;
  if (!lease) { billingStep.value = 1; billingError.value = 'Choose an active lease.'; return; }
  if (state.bills.some(b => b.leaseId === lease.id && b.period === billingForm.month.slice(0, 7))) {
    billingError.value = 'A monthly bill already exists for this rental and billing period. Choose another month or review the existing statement.';
    return;
  }
  if (!/^\d{4}-\d{2}-01$/.test(billingForm.month)) { billingError.value = 'Billing month must be a valid date on day 01.'; return; }
  const billDate = new Date(`${billingForm.month}T12:00:00`);
  const dueDate = new Date(`${billingForm.due}T12:00:00`);
  if (Number.isNaN(billDate.getTime()) || billDate.toISOString().slice(0,10) !== billingForm.month ||
      Number.isNaN(dueDate.getTime()) || dueDate.toISOString().slice(0,10) !== billingForm.due) {
    billingError.value = 'Enter valid billing and due dates.'; return;
  }
  // Vue automatically converts values from <input type="number"> to numbers.
  // Normalize each charge before validation; calling .trim() on a number crashes.
  const validatedCharges: Record<'water' | 'electricity' | 'other', number> = {
    water: 0,
    electricity: 0,
    other: 0,
  };
  for (const label of ['water', 'electricity', 'other'] as const) {
    const raw = String(billingForm[label] ?? '').trim();
    const value = Number(raw);
    if (!raw || !/^\d+(?:\.\d{1,2})?$/.test(raw) || !Number.isFinite(value) || value < 0) {
      billingError.value = `Enter a valid ${label} charge of ₱0 or more (up to two decimal places).`;
      return;
    }
    validatedCharges[label] = value;
  }
  if (billingForm.due < billingForm.month) {
    billingError.value = 'Payment due date must not be earlier than the billing period.';
    return;
  }
  billingError.value = '';
  financeSaving.value = true;
  try {
    await createBill({ lease_id: lease.id, billing_period: billingForm.month, due_date: billingForm.due,
      water_charge: validatedCharges.water, electricity_charge: validatedCharges.electricity, other_charges: validatedCharges.other });
    billingModalOpen.value = false;
    await refreshFinances();
    notify('Monthly bill created. The tenant can now view the statement.');
  } catch (error: any) {
    billingError.value = error?.response?.data?.message || error?.message || 'Could not create the bill.';
  } finally { financeSaving.value = false; }
}
function mapOwnerMaintenance(row:RentalMaintenanceRequest):Maintenance{return {id:Number(row.request_id),unitId:Number(row.unit_id),category:row.category||'General',description:row.problem_description,date:String(row.created_at).slice(0,10),status:String(row.status).toUpperCase().replaceAll('_',' '),priority:String(row.priority||'medium').toUpperCase(),tenant:row.tenant_name};}
async function refreshOwnerMaintenance(){if(maintenanceLoading.value)return;maintenanceLoading.value=true;maintenanceError.value='';try{state.maintenance=(await listOwnerMaintenance()).map(mapOwnerMaintenance);}catch(e:any){maintenanceError.value=e?.response?.data?.message||e?.message||'Could not load maintenance requests.';}finally{maintenanceLoading.value=false;}}
onMounted(async () => {
  try {
    const user = await restoreSession();
    if (!user) {
      await router.replace('/login');
      return;
    }
    if (user.role !== 'owner') {
      await router.replace(user.role === 'admin' ? '/admin' : user.role === 'tenant' ? '/tenant' : '/login');
      return;
    }
    state.profile.name = user.name;
    state.profile.email = user.email;
    try { const saved = await getMyProfile(); state.profile.name = saved.name; state.profile.mobile = saved.mobile; state.profile.avatar = saved.avatar_url; } catch(error) { console.warn('Profile loading failed:',error); }
    await refreshRentalCatalog();
    await refreshOwnerApplications();
    await refreshOwnerLeases();
    await refreshFinances();
    await refreshOwnerMaintenance();
    await refreshSettlements();
    await refreshOwnerDeposits();
  } catch (error) {
    console.error('Failed to restore owner session:', error);
    message.value = 'Unable to verify your session.';
  }
});

const section = ref('overview');
const mobileMenuOpen = ref(false);
const search = ref('');
const statusFilter = ref('ALL');
const propertyFilter = ref('ALL');
const returnToOwnerProfile = ref(false);
async function refreshOwnerDeposits() {
  if (depositsLoading.value) return;
  depositsLoading.value = true;
  depositsError.value = '';
  try { depositRecords.value = await listOwnerDeposits(); }
  catch (error: any) { depositsError.value = error?.response?.data?.message || error?.message || 'Could not load security deposit records.'; }
  finally { depositsLoading.value = false; }
}

function ownerDepositVerified(leaseId: number): number {
  return depositRecords.value.filter(x => Number(x.lease_id) === leaseId && x.status === 'verified').reduce((sum,x) => sum + Number(x.amount), 0);
}
function ownerDepositPending(leaseId: number): number {
  return depositRecords.value.filter(x => Number(x.lease_id) === leaseId && x.status === 'pending_verification').reduce((sum,x) => sum + Number(x.amount), 0);
}
const ownerDepositPendingCount = computed(() => depositRecords.value.filter(x => x.status === 'pending_verification').length);

const settlements = ref<DepositSettlement[]>([]);
const settlementsLoading = ref(false);
const settlementBusy = ref(false);
const settlementError = ref('');
const eligibleSettlements = computed(() => state.leases.filter(l => l.status === 'COMPLETED' && ownerDepositVerified(l.id) > 0 && !settlements.value.some(s => Number(s.lease_id) === l.id)));
async function refreshSettlements() {
  if (settlementsLoading.value) return;
  settlementsLoading.value = true; settlementError.value = '';
  try { settlements.value = await listOwnerSettlements(); }
  catch (e: any) { settlementError.value = e?.response?.data?.message || e?.message || 'Unable to load settlements.'; }
  finally { settlementsLoading.value = false; }
}
async function settlementAction(task: () => Promise<unknown>, success: string) {
  if (settlementBusy.value) return;
  settlementBusy.value = true;
  try { await task(); await Promise.all([refreshSettlements(), refreshOwnerDeposits()]); notify(success); }
  catch (e: any) { notify(e?.response?.data?.message || e?.message || 'Settlement action failed.'); }
  finally { settlementBusy.value = false; }
}
async function createSettlementForLease(l: Lease) {
  if (!await systemConfirm(`Create a security deposit settlement for Lease #${l.id}? This is only allowed after the lease has been completed.`, 'Create deposit settlement', 'Create Draft')) return;
  await settlementAction(() => createDepositSettlement(l.id), 'Settlement draft created.');
}
async function addSettlementDeduction(s: DepositSettlement) {
  const description = await systemPrompt('Describe the justified deduction (at least 5 characters):');
  if (description === null) return;
  if (description.trim().length < 5) { notify('Provide a clear deduction reason.'); return; }
  const raw = await systemPrompt('Deduction amount in PHP (e.g., 250.00):');
  if (raw === null) return;
  const amount = Number(raw);
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw.trim()) || !Number.isFinite(amount) || amount <= 0 || amount > Number(s.summary.verified_deposit) - Number(s.summary.total_deductions)) { notify('Invalid deduction amount.'); return; }
  const evidence = await systemPrompt('Optional evidence or inspection note (Cancel to leave blank):');
  await settlementAction(() => addDepositDeduction(Number(s.settlement_id), { description: description.trim(), amount, evidence_note: (evidence || '').trim() }), 'Deduction added.');
}
async function removeSettlementDeduction(s: DepositSettlement, deductionId: number) {
  if (!await systemConfirm('Remove this draft deduction?', 'Remove deduction', 'Remove')) return;
  await settlementAction(() => deleteDepositDeduction(Number(s.settlement_id), deductionId), 'Deduction removed.');
}
async function finalizeSettlementUI(s: DepositSettlement) {
  if (!await systemConfirm(`Finalize this settlement? Deductions: ${peso(Number(s.summary.total_deductions))}. Refundable: ${peso(Number(s.summary.refundable_amount))}. You will no longer be able to change deductions.`, 'Finalize settlement', 'Finalize')) return;
  await settlementAction(() => finalizeDepositSettlement(Number(s.settlement_id)), 'Settlement finalized.');
}
async function recordRefundUI(s: DepositSettlement) {
  const remaining = Number(s.summary.remaining_refund) - Number(s.summary.pending_refunds);
  if (remaining <= 0) { notify('No refundable amount is available to record.'); return; }
  const raw = await systemPrompt(`Refund amount in PHP (available: ${peso(remaining)}):`);
  if (raw === null) return;
  const amount = Number(raw);
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw.trim()) || !Number.isFinite(amount) || amount <= 0 || amount > remaining) { notify('Invalid refund amount.'); return; }
  const methodInput = await systemPrompt('Refund method: cash, gcash, bank_transfer, or other');
  if (methodInput === null) return;
  const method = methodInput.trim().toLowerCase();
  if (!['cash', 'gcash', 'bank_transfer', 'other'].includes(method)) { notify('Invalid refund method.'); return; }
  const refNo = await systemPrompt('Transaction reference (required except for cash):');
  if (refNo === null || (method !== 'cash' && !refNo.trim())) { notify('A reference is required for non-cash refunds.'); return; }
  if (!await systemConfirm(`Record ${peso(amount)} as a pending ${method} refund? Only confirm after the tenant has actually received the payment.`, 'Record pending refund', 'Record')) return;
  await settlementAction(() => recordDepositRefund(Number(s.settlement_id), { amount, payment_method: method as 'cash' | 'gcash' | 'bank_transfer' | 'other', reference_number: refNo.trim() }), 'Pending refund recorded.');
}
async function reviewRefundUI(s: DepositSettlement, refundId: number, decision: 'confirmed' | 'cancelled') {
  if (!await systemConfirm(decision === 'confirmed' ? 'Confirm only if the refund was actually paid to the tenant.' : 'Cancel this pending refund record?', decision === 'confirmed' ? 'Confirm payout' : 'Cancel pending refund', decision === 'confirmed' ? 'Confirm Paid' : 'Cancel')) return;
  await settlementAction(() => decideDepositRefund(Number(s.settlement_id), refundId, decision), decision === 'confirmed' ? 'Refund payout confirmed.' : 'Refund cancelled.');
}

async function reviewDeposit(record: SecurityDepositPayment, decision: 'verified' | 'rejected') {
  if (depositsSaving.value !== null || record.status !== 'pending_verification') return;
  let reason = '';
  if (decision === 'rejected') {
    const entered = await systemPrompt(`Enter the reason for rejecting ${peso(Number(record.amount))} from ${record.tenant_name}.`);
    if (entered === null) return;
    reason = entered.trim();
    if (!reason) { notify('A rejection reason is required.'); return; }
  } else {
    const confirmed = await systemConfirm(`Verify the actual receipt of ${peso(Number(record.amount))} for ${record.tenant_name} (Lease #${record.lease_id})? A submitted reference is not proof by itself.`, 'Verify security deposit', 'Verify Deposit');
    if (!confirmed) return;
  }
  depositsSaving.value = Number(record.deposit_payment_id);
  try {
    await decideDepositPayment(Number(record.deposit_payment_id), decision, reason);
    await refreshOwnerDeposits();
    notify(decision === 'verified' ? 'Security deposit verified and recorded.' : 'Security deposit submission rejected.');
  } catch (error: any) {
    notify('Deposit review failed: ' + (error?.response?.data?.message || error?.message || 'Unknown error'));
  } finally { depositsSaving.value = null; }
}

const menu = [
  { id: 'overview', label: 'Dashboard Overview', icon: gridOutline },
  { id: 'properties', label: 'Properties & Units', icon: businessOutline },
  { id: 'pending', label: 'Pending Applications', icon: documentTextOutline },
  { id: 'history', label: 'History', icon: timeOutline },
  { id: 'payments', label: 'Payments', icon: cardOutline },
  { id: 'bills', label: 'Bills & Balances', icon: documentTextOutline },
  { id: 'deposits', label: 'Security Deposits', icon: cardOutline },
  { id: 'leases', label: 'Lease Management', icon: documentTextOutline },
  { id: 'maintenance', label: 'Maintenance Requests', icon: constructOutline },
  { id: 'profile', label: 'Owner Profile', icon: personOutline },
];
const titles: Record<string, string> = {
  overview: 'Dashboard Overview',
  properties: 'Properties & Units',
  pending: 'Pending Applications',
  history: 'History',
  payments: 'Payment Review',
  bills: 'Bills & Balances',
  deposits: 'Security Deposit Management',
  leases: 'Lease Management',
  maintenance: 'Maintenance Requests',
  profile: 'Owner Profile',
};
const subtitles: Record<string, string> = {
  overview: 'Your rental operations, collections, and updates in one place.',
  properties: 'Manage your properties and individual rental units.',
  pending: 'Review applicant information before making a decision.',
  history: 'Explore previously approved and rejected applications.',
  payments: 'Review submitted payments and verification outcomes.',
  bills: 'Monitor outstanding balances and upcoming due dates.',
  deposits: 'Verify security deposit collections separately from monthly rent.',
  leases: 'Review rental agreements and lease expirations.',
  maintenance: 'Track reported issues from submission to resolution.',
  profile: 'Keep your contact information up to date.',
};
function clearFilters() {
  search.value = '';
  statusFilter.value = 'ALL';
  propertyFilter.value = 'ALL';
}
function navigate(target: string) {
  clearFilters();
  returnToOwnerProfile.value = false;
  section.value = target;
  mobileMenuOpen.value = false;
  if (target === 'pending' || target === 'history' || target === 'overview') void refreshOwnerApplications();
  if (target === 'leases' || target === 'overview') void refreshOwnerLeases();
  if (target === 'bills' || target === 'payments' || target === 'overview') void refreshFinances();
  if (target === 'deposits' || target === 'overview') void refreshOwnerDeposits();
  if (target === 'deposits') { void refreshOwnerLeases(); void refreshSettlements(); }
  if (target === 'maintenance' || target === 'overview') void refreshOwnerMaintenance();
}
function viewProfileUnits(propertyId: number) {
  navigate('properties');
  propertyFilter.value = String(propertyId);
  returnToOwnerProfile.value = true;
}
function openFilteredSection(target: string, status: string) {
  navigate(target);
  statusFilter.value = status;
}
function nextId(records: { id: number }[]): number {
  return Math.max(0, ...records.map(record => record.id)) + 1;
}
function activity(text: string) {
  state.activity.unshift({
    id: nextId(state.activity),
    text,
    at: new Date().toISOString(),
  });
}
function escapeMessage(text: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, character => entities[character]);
}
type OwnerNotice = { title: string; detail: string; tone: 'success' | 'error' | 'info' };
const currentNotice = ref<OwnerNotice | null>(null);
const noticeQueue: OwnerNotice[] = [];
function noticeTitle(text: string): string {
  if (/fail|error|unable|could not|invalid|cannot|requires|enter a valid|not available/i.test(text)) return 'Action needs attention';
  if (/lease/i.test(text)) return 'Lease update';
  if (/payment|bill|balance/i.test(text)) return 'Billing update';
  if (/application/i.test(text)) return 'Application update';
  if (/maintenance|repair/i.test(text)) return 'Maintenance update';
  if (/property|unit/i.test(text)) return 'Property update';
  return 'RentEase update';
}
function notify(text: string) {
  const detail = text.trim();
  const tone = /fail|error|unable|could not|invalid|cannot|not available/i.test(detail) ? 'error' :
    /saved|prepared|approved|rejected|updated|completed|verified|created|cleared|success/i.test(detail) ? 'success' : 'info';
  noticeQueue.push({ title: noticeTitle(detail), detail, tone });
  if (!currentNotice.value) currentNotice.value = noticeQueue.shift() || null;
}
function closeOwnerNotice() {
  currentNotice.value = null;
  // Let Ionic finish dismissing before presenting the next queued notice.
}
function showNextOwnerNotice() { if (!currentNotice.value) currentNotice.value = noticeQueue.shift() || null; }
let actionDialogOpen = false;
async function systemConfirm(
  text: string,
  title = 'Confirm action',
  confirmLabel = 'Confirm',
): Promise<boolean> {
  if (actionDialogOpen) return false;
  actionDialogOpen = true;
  try {
    const alert = await alertController.create({
      header: title,
      message: escapeMessage(text),
      cssClass: 'rentease-messagebox',
      backdropDismiss: false,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: confirmLabel, role: 'confirm' },
      ],
    });
    await alert.present();
    return (await alert.onDidDismiss()).role === 'confirm';
  } finally {
    actionDialogOpen = false;
  }
}
async function systemPrompt(text: string): Promise<string | null> {
  if (actionDialogOpen) return null;
  actionDialogOpen = true;
  let reason = '';
  try {
    const alert = await alertController.create({
      header: 'Reject payment',
      message: escapeMessage(text),
      cssClass: 'rentease-messagebox',
      backdropDismiss: false,
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Enter a rejection reason',
          attributes: {
            maxlength: 500,
            'aria-label': 'Rejection reason',
          },
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject payment',
          role: 'confirm',
          handler: (values: { reason?: string }) => {
            reason = values.reason?.trim() ?? '';
            if (!reason) {
              alert.message = 'Please enter a rejection reason.';
              return false;
            }
            return true;
          },
        },
      ],
    });
    await alert.present();
    return (await alert.onDidDismiss()).role === 'confirm'
      ? reason
      : null;
  } finally {
    actionDialogOpen = false;
  }
}
function peso(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(amount);
}
function readableDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}
function periodLabel(value: string): string {
  return new Date(`${value}-01T12:00:00`).toLocaleDateString('en-PH', {
    month: 'short',
    year: 'numeric',
  });
}
function daysUntil(value: string): number {
  return Math.round(
    (
      Date.parse(`${value}T00:00:00Z`) -
      Date.parse(`${dateOffset(0)}T00:00:00Z`)
    ) / 86400000,
  );
}
function propertyName(id: number): string {
  return state.properties.find(property => property.id === id)?.name
    ?? 'Unknown property';
}
function unitLabel(id: number): string {
  const unit = state.units.find(item => item.id === id);
  return unit ? `Unit ${unit.number}` : 'Unknown unit';
}
function unitProperty(id: number): string {
  const unit = state.units.find(item => item.id === id);
  return unit ? propertyName(unit.propertyId) : 'Unknown property';
}
function unitLease(id: number): Lease | undefined {
  return state.leases.find(
    lease => lease.unitId === id && lease.status === 'ACTIVE',
  );
}
function unitStatus(id: number): string {
  return state.units.find(unit => unit.id === id)?.status ?? 'UNKNOWN';
}

function billLease(bill: Bill): Lease | undefined {
  return state.leases.find(lease => lease.id === bill.leaseId);
}
function billTenant(bill: Bill): string {
  return billLease(bill)?.tenant ?? 'Unknown tenant';
}
function verifiedTotal(billId: number): number {
  return state.bills.find(b=>b.id===billId)?.verified ?? 0;
}
function balance(bill: Bill): number {
  return Math.max(0, bill.amount - verifiedTotal(bill.id));
}
function billStatus(bill: Bill): string {
  if (balance(bill) <= 0.001) return 'PAID';
  if (daysUntil(bill.due) < 0) return 'OVERDUE';
  if (verifiedTotal(bill.id) > 0) return 'PARTIAL';
  return 'UNPAID';
}
function paymentBill(payment: Payment): Bill | undefined {
  return state.bills.find(bill => bill.id === payment.billId);
}
function paymentTenant(payment: Payment): string {
  const bill = paymentBill(payment);
  return bill ? billTenant(bill) : 'Unknown tenant';
}
function paymentUnit(payment: Payment): string {
  const bill = paymentBill(payment);
  const lease = bill ? billLease(bill) : undefined;
  return lease ? unitLabel(lease.unitId) : 'Unknown unit';
}
function paymentProperty(payment: Payment): string {
  const bill = paymentBill(payment);
  const lease = bill ? billLease(bill) : undefined;
  return lease ? unitProperty(lease.unitId) : 'Unknown property';
}
function matches(...values: unknown[]): boolean {
  const text = values
    .filter(value => value !== undefined && value !== null)
    .join(' ')
    .toLowerCase();
  return search.value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .every(word => text.includes(word));
}
function unitSearch(unitId: number): string {
  const unit = state.units.find(item => item.id === unitId);
  const property = state.properties.find(
    item => item.id === unit?.propertyId,
  );
  return [
    unit?.number,
    unitLabel(unitId),
    property?.name,
    property?.address,
  ].filter(Boolean).join(' ');
}
function billSearch(bill: Bill): string {
  const lease = billLease(bill);
  return [
    billTenant(bill),
    bill.period,
    bill.id,
    lease ? unitSearch(lease.unitId) : '',
  ].join(' ');
}
function badgeClass(status: string): string {
  if (
    ['APPROVED', 'VERIFIED', 'PAID', 'AVAILABLE', 'COMPLETED']
      .includes(status)
  ) {
    return 'good';
  }
  if (['REJECTED', 'OVERDUE'].includes(status)) return 'danger';
  if (
    ['PENDING', 'PARTIAL', 'MAINTENANCE', 'IN PROGRESS', 'ASSIGNED']
      .includes(status)
  ) {
    return 'warning';
  }
  return 'neutral';
}
const initials = computed(() =>
  state.profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase(),
);

const pendingApps = computed(() =>
  state.applications.filter(app => app.status === 'PENDING'),
);
const pendingPayments = computed(() =>
  state.payments.filter(payment => payment.status === 'PENDING'),
);
const activeLeases = computed(() =>
  state.leases.filter(lease => lease.status === 'ACTIVE'),
);
const availableUnits = computed(() =>
  state.units.filter(unit => unitStatus(unit.id) === 'AVAILABLE'),
);
const maintenanceUnits = computed(() =>
  new Set(
    state.maintenance
      .filter(request => request.status !== 'COMPLETED')
      .map(request => request.unitId),
  ).size,
);
const collections = computed(() =>
  state.payments
    .filter(payment => payment.status === 'VERIFIED')
    .reduce((total, payment) => total + payment.amount, 0),
);
const occupancy = computed(() =>
  state.units.length
    ? Math.round(
        state.units.filter(unit => unit.status === 'OCCUPIED').length
        / state.units.length * 100,
      )
    : 0,
);
const outstandingBills = computed(() =>
  state.bills
    .filter(bill => balance(bill) > 0)
    .sort((a, b) => a.due.localeCompare(b.due)),
);
const overdueBills = computed(() =>
  outstandingBills.value.filter(bill => billStatus(bill) === 'OVERDUE'),
);
const outstandingTotal = computed(() =>
  outstandingBills.value.reduce(
    (total, bill) => total + balance(bill),
    0,
  ),
);
const upcomingLeases = computed(() =>
  activeLeases.value
    .filter(lease => daysUntil(lease.end) <= 90)
    .sort((a, b) => a.end.localeCompare(b.end)),
);
const monthlyCollections = computed(() =>
  [-3, -2, -1, 0].map(offset => {
    const month = monthOffset(offset);
    return {
      month,
      label: periodLabel(month),
      value: state.payments
        .filter(payment =>
          payment.status === 'VERIFIED' &&
          payment.date.startsWith(month),
        )
        .reduce((total, payment) => total + payment.amount, 0),
    };
  }),
);
const chartMaximum = computed(() =>
  Math.max(1, ...monthlyCollections.value.map(month => month.value)),
);
const filteredProperties = computed(() =>
  state.properties.filter(property =>
    (
      propertyFilter.value === 'ALL' ||
      property.id === Number(propertyFilter.value)
    ) &&
    matches(
      property.name,
      property.address,
      ...state.units
        .filter(unit => unit.propertyId === property.id)
        .map(unit => unit.number),
    ),
  ),
);
const filteredUnits = computed(() =>
  state.units.filter(unit =>
    matches(unitSearch(unit.id)) &&
    (
      propertyFilter.value === 'ALL' ||
      unit.propertyId === Number(propertyFilter.value)
    ) &&
    (
      statusFilter.value === 'ALL' ||
      unitStatus(unit.id) === statusFilter.value
    ),
  ),
);
const filteredApps = computed(() =>
  state.applications.filter(app =>
    (
      section.value === 'pending'
        ? app.status === 'PENDING'
        : app.status !== 'PENDING'
    ) &&
    matches(
      app.name,
      app.email,
      app.phone,
      unitSearch(app.unitId),
    ) &&
    (
      statusFilter.value === 'ALL' ||
      app.status === statusFilter.value
    ),
  ),
);
const filteredPayments = computed(() =>
  state.payments.filter(payment => {
    const bill = paymentBill(payment);
    return matches(
      paymentTenant(payment),
      payment.reference,
      payment.method,
      bill ? billSearch(bill) : '',
    ) &&
    (
      statusFilter.value === 'ALL' ||
      payment.status === statusFilter.value
    );
  }),
);
const filteredBills = computed(() =>
  state.bills.filter(bill =>
    matches(billSearch(bill)) &&
    (
      statusFilter.value === 'ALL' ||
      billStatus(bill) === statusFilter.value
    ),
  ),
);
const filteredLeases = computed(() =>
  state.leases.filter(lease =>
    matches(lease.tenant, unitSearch(lease.unitId)) &&
    (
      statusFilter.value === 'ALL' ||
      lease.status === statusFilter.value
    ),
  ),
);
const filteredMaintenance = computed(() =>
  state.maintenance.filter(request =>
    matches(
      request.category,
      request.description,
      unitSearch(request.unitId),
    ) &&
    (
      statusFilter.value === 'ALL' ||
      request.status === statusFilter.value
    ),
  ),
);
const filterOptions = computed(() => {
  const options: Record<string, string[]> = {
    properties: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'],
    history: ['APPROVED', 'REJECTED'],
    payments: ['PENDING', 'VERIFIED', 'REJECTED'],
    bills: ['UNPAID', 'PARTIAL', 'OVERDUE', 'PAID'],
    leases: ['PENDING', 'ACTIVE', 'COMPLETED'],
    maintenance: ['PENDING', 'ASSIGNED', 'IN PROGRESS', 'COMPLETED'],
  };
  return options[section.value] ?? [];
});
const dialogOpen = ref(false);
const dialog = ref('');
const selectedId = ref(0);
const formError = ref('');
const form = reactive({
  name: '',
  email: '',
  mobile: '',
  address: '',
  avatar: '',
  number: '',
  propertyId: '',
  rent: '',
  bedrooms: '',
  capacity: '',
  status: '',
});
function resetForm() {
  Object.assign(form, {
    name: '',
    email: '',
    mobile: '',
    address: '',
    avatar: '',
    number: '',
    propertyId: '',
    rent: '',
    bedrooms: '',
    capacity: '',
    status: '',
  });
  formError.value = '';
  unitSaveStatus.value = '';
}
function openDialog(type: string, id = 0) {
  resetForm();
  dialog.value = type;
  selectedId.value = id;
  if (type === 'property') {
    const property = state.properties.find(item => item.id === id);
    if (property) {
      form.name = property.name;
      form.address = property.address;
    }
  }
  if (type === 'unit') {
    const unit = state.units.find(item => item.id === id);
    if (unit) {
      Object.assign(form, {
        number: unit.number,
        propertyId: String(unit.propertyId),
        rent: String(unit.rent),
        bedrooms: String(unit.bedrooms),
        capacity: String(unit.capacity),
      });
    } else {
      form.propertyId = propertyFilter.value !== 'ALL'
        ? propertyFilter.value
        : String(state.properties[0]?.id ?? '');
      form.bedrooms = '1';
      form.capacity = '2';
    }
  }
  if (type === 'profile') {
    Object.assign(form, state.profile);
  }
  if (type === 'maintenance') {
    const request = state.maintenance.find(item => item.id === id);
    form.status = request?.status ?? 'PENDING';
  }
  dialogOpen.value = true;
}
function closeDialog() {
  dialogOpen.value = false;
}
const selectedApp = computed(() =>
  state.applications.find(item => item.id === selectedId.value),
);
const selectedPayment = computed(() =>
  state.payments.find(item => item.id === selectedId.value),
);
const selectedBill = computed(() =>
  state.bills.find(item => item.id === selectedId.value),
);
const selectedLease = computed(() =>
  state.leases.find(item => item.id === selectedId.value),
);
const selectedMaintenance = computed(() =>
  state.maintenance.find(item => item.id === selectedId.value),
);
const selectedBillPayments = computed(() =>
  state.payments.filter(
    payment => payment.billId === selectedBill.value?.id,
  ),
);
const selectedLeaseBalance = computed(() => {
  const lease = selectedLease.value;
  return lease
    ? state.bills
        .filter(bill => bill.leaseId === lease.id)
        .reduce((total, bill) => total + balance(bill), 0)
    : 0;
});
const dialogTitle = computed(() => {
  const names: Record<string, string> = {
    property: selectedId.value ? 'Edit Property' : 'Add Property',
    unit: selectedId.value ? 'Edit Unit' : 'Add Unit',
    profile: 'Edit Profile',
    application: 'Application Details',
    payment: 'Payment Details',
    bill: 'Bill Details',
    lease: 'Lease Details',
    maintenance: 'Maintenance Details',
  };
  return names[dialog.value] ?? 'Details';
});
async function saveProperty() {
  if (savingRental.value) return;
  const name = form.name.trim();
  const address = form.address.trim();
  if (!name || !address) {
    formError.value = 'Enter the property name and address.';
    return;
  }
  savingRental.value = true;
  formError.value = '';
  try {
    if (selectedId.value) {
      await updateProperty(selectedId.value, { property_name: name, address });
    } else {
      await createProperty({ property_name: name, address });
    }
    await refreshRentalCatalog();
    closeDialog();
    notify('Property details saved successfully.');
  } catch (error: any) {
    formError.value = error?.response?.data?.message || error?.message || 'Unable to save property.';
  } finally {
    savingRental.value = false;
  }
}

async function saveUnit() {
  console.info('[RentEase] Save Unit button activated');
  if (savingRental.value) return;

  formError.value = '';
  unitSaveStatus.value = '';

  // Read the reactive form values at click time, rather than relying on
  // native form validation to trigger a submit event inside IonModal.
  const propertyId = Number(form.propertyId);
  const unitNumber = form.number.trim();
  const rentText = String(form.rent ?? '').trim();
  const bedroomsText = String(form.bedrooms ?? '').trim();
  const capacityText = String(form.capacity ?? '').trim();
  const rent = Number(rentText);
  const bedrooms = Number(bedroomsText);
  const capacity = Number(capacityText);

  if (!Number.isSafeInteger(propertyId) || !state.properties.some(p => p.id === propertyId)) {
    formError.value = 'Please select a property that belongs to your account.';
  } else if (!unitNumber) {
    formError.value = 'Unit number is required.';
  } else if (!rentText || !Number.isFinite(rent) || rent <= 0) {
    formError.value = 'Monthly rent must be greater than zero.';
  } else if (!bedroomsText || !Number.isInteger(bedrooms) || bedrooms < 0) {
    formError.value = 'Bedrooms must be a whole number of zero or higher.';
  } else if (!capacityText || !Number.isInteger(capacity) || capacity < 1) {
    formError.value = 'Capacity must be a whole number of at least one.';
  } else if (state.units.some(u =>
    u.id !== selectedId.value && u.propertyId === propertyId &&
    u.number.toLowerCase() === unitNumber.toLowerCase()
  )) {
    formError.value = 'This unit number already exists in the selected property.';
  }

  if (formError.value) {
    console.warn('[RentEase] Unit form validation:', formError.value);
    return;
  }

  const existingUnit = selectedId.value
    ? state.units.find(u => u.id === selectedId.value)
    : undefined;
  if (selectedId.value && !existingUnit) {
    formError.value = 'The selected unit no longer exists. Refresh the rental list.';
    return;
  }
  if (existingUnit && existingUnit.propertyId !== propertyId) {
    formError.value = 'You cannot move an existing unit to another property.';
    return;
  }

  savingRental.value = true;
  unitSaveStatus.value = 'Saving rental unit...';
  const unitId = selectedId.value;
  try {
    const payload = {
      unit_number: unitNumber,
      monthly_rent: rent.toFixed(2),
      bedrooms,
      capacity,
    };
    console.info('[RentEase] Sending unit API request:', {
      method: unitId ? 'PATCH' : 'POST', propertyId, unitId, payload,
    });
    const saved = unitId
      ? await updateUnit(propertyId, unitId, payload)
      : await createUnit(propertyId, payload);

    // Do not claim success until the API has returned a valid database record.
    if (!saved || !Number(saved.unit_id)) {
      throw new Error('The server did not confirm that the unit was saved.');
    }
    console.info('[RentEase] PostgreSQL saved unit:', saved);
    unitSaveStatus.value = `Unit ${saved.unit_number} saved successfully.`;
    await refreshRentalCatalog();
    closeDialog();
    notify(`Unit ${saved.unit_number} saved successfully.`);
  } catch (error: any) {
    console.error('[RentEase] Save Unit failed:', error);
    formError.value = error?.response?.data?.message || error?.message ||
      'Unable to save unit. Check your backend connection.';
    unitSaveStatus.value = '';
  } finally {
    savingRental.value = false;
  }
}

function uploadAvatar(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 2 * 1024 * 1024
  ) {
    formError.value = 'Choose a JPG, PNG, or WebP image smaller than 2 MB.';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    form.avatar = String(reader.result);
    formError.value = '';
  };
  reader.onerror = () => {
    formError.value = 'The image could not be read. Try another file.';
  };
  reader.readAsDataURL(file);
}
async function saveProfile() {
  if (!form.name.trim() || !/^(09\d{9}|\+639\d{9})$/.test(form.mobile.trim())) {
    formError.value = 'Enter your name and a valid Philippine mobile number.';
    return;
  }
  try {
    const saved = await saveMyProfile(form.name.trim(), form.mobile.trim(), form.avatar);
    Object.assign(state.profile, { name: saved.name, email: saved.email, mobile: saved.mobile, avatar: saved.avatar_url || form.avatar });
    closeDialog();
    notify('Your profile has been updated successfully.');
  } catch(error: any) {
    formError.value = error?.response?.data?.message || error?.message || 'Unable to save profile.';
  }
}
async function reviewApplication(app: Application, approved: boolean) {
  if (reviewingApplication.value || app.status !== 'PENDING') return;
  if (approved && unitStatus(app.unitId) !== 'AVAILABLE') {
    notify('The unit is not available. Refresh the rental catalog before approving.');
    return;
  }
  const confirmed = await systemConfirm(
    `${approved ? 'Approve' : 'Reject'} ${app.name}'s application? ${approved ? 'This reserves the unit; lease creation will be a separate step.' : ''}`,
    approved ? 'Approve application' : 'Reject application',
    approved ? 'Approve' : 'Reject',
  );
  if (!confirmed) return;
  reviewingApplication.value = true;
  try {
    const saved = await reviewRentalApplication(app.id, approved ? 'approved' : 'rejected');
    if (!saved?.application_id) throw new Error('Server did not confirm the decision.');
    const refreshed = await refreshOwnerApplications();
    await refreshRentalCatalog();
    closeDialog();
    notify(refreshed
      ? (approved ? 'Application approved and unit reserved. Prepare a lease agreement when ready.' : 'Application rejected. The applicant can view the decision.')
      : 'Your decision was saved, but the list could not refresh. Please reload the page.');
  } catch (error: any) {
    console.error('[RentEase] Application review failed:', error);
    formError.value = error?.response?.data?.message || error?.message || 'Unable to review application.';
    notify(`Review failed: ${formError.value}`);
  } finally {
    reviewingApplication.value = false;
  }
}

async function verifyPayment(payment:Payment){if(financeSaving.value||payment.status!=='PENDING')return;if(!await systemConfirm(`Verify payment ${peso(payment.amount)} from ${paymentTenant(payment)}?`,'Verify Payment','Verify'))return;financeSaving.value=true;try{await decidePayment(payment.id,'verified');await refreshFinances();closeDialog();notify('Payment verified. The tenant’s outstanding balance has been updated.');}catch(e:any){notify('Verification failed: '+(e?.response?.data?.message||e?.message||'Unknown error'));}finally{financeSaving.value=false;}}
async function rejectPayment(payment:Payment){if(financeSaving.value||payment.status!=='PENDING')return;if(!await systemConfirm('Reject this payment?','Reject Payment','Reject'))return;financeSaving.value=true;try{await decidePayment(payment.id,'rejected');await refreshFinances();closeDialog();notify('Payment rejected. The tenant can review the payment status.');}catch(e:any){notify('Rejection failed: '+(e?.response?.data?.message||e?.message||'Unknown error'));}finally{financeSaving.value=false;}}
const maintenanceTransitions:Record<string,string[]>={
 PENDING:['ASSIGNED','CANCELLED'],ASSIGNED:['IN PROGRESS','CANCELLED'],
 'IN PROGRESS':['COMPLETED','CANCELLED'],COMPLETED:[],CANCELLED:[]
};
async function updateMaintenance(){
 const request=selectedMaintenance.value;
 if(!request||maintenanceSaving.value)return;
 const next=form.status;
 if(!maintenanceTransitions[request.status]?.includes(next)){
  formError.value='Choose a valid next status.';return;
 }
 maintenanceSaving.value=true;formError.value='';
 try{await updateMaintenanceStatus(request.id,next.toLowerCase().replaceAll(' ','_') as 'assigned'|'in_progress'|'completed'|'cancelled');
  await refreshOwnerMaintenance();closeDialog();notify('Maintenance request status updated successfully.');
 }catch(e:any){formError.value=e?.response?.data?.message||e?.message||'Unable to update maintenance.';notify(formError.value);}
 finally{maintenanceSaving.value=false;}
}

async function completeLease(lease: Lease) {
  if (lease.status !== 'ACTIVE' || savingLease.value) return;
  if (lease.end >= dateOffset(0)) {
    notify(`This lease ends on ${readableDate(lease.end)}. It cannot be completed before its end date. Early termination requires a separate authorized process.`);
    return;
  }
  const ok = await systemConfirm(
    `Complete ${lease.tenant}'s lease for ${unitLabel(lease.unitId)}? The lease will be marked completed and the unit moved to MAINTENANCE for turnover inspection. It will NOT be available to new tenants until you confirm turnover. Existing bills and payments are retained.`,
    'Complete ended lease',
    'Complete Lease',
  );
  if (!ok) return;
  savingLease.value = true;
  try { await finishLease(lease.id);await Promise.all([refreshOwnerLeases(),refreshRentalCatalog()]);closeDialog();notify('Lease completed. The unit is now in maintenance pending turnover confirmation.'); }
  catch(error:any){notify('Could not complete lease: '+(error?.response?.data?.message || error?.message || 'Unknown error'));}
  finally{savingLease.value=false;}
}

// A completed lease leaves its unit unavailable until the owner explicitly confirms turnover.
function canConfirmTurnover(unit: Unit): boolean {
  return unit.status === 'MAINTENANCE' &&
    state.leases.some(lease => lease.unitId === unit.id && lease.status === 'COMPLETED') &&
    !state.leases.some(lease => lease.unitId === unit.id && ['ACTIVE', 'PENDING'].includes(lease.status));
}

async function confirmTurnover(unit: Unit) {
  if (releasingUnitId.value !== null || !canConfirmTurnover(unit)) return;
  const ok = await systemConfirm(
    `Confirm that ${unitLabel(unit.id)} at ${propertyName(unit.propertyId)} has been vacated and inspected, and is ready for new tenants? This will change the unit to AVAILABLE. This does not settle bills or refund security deposits.`,
    'Confirm unit turnover',
    'Make Unit Available',
  );
  if (!ok) return;
  releasingUnitId.value = unit.id;
  try {
    await confirmUnitTurnover(unit.propertyId, unit.id);
    await Promise.all([refreshRentalCatalog(), refreshOwnerLeases()]);
    notify(`${unitLabel(unit.id)} is now available for new rental applications.`);
  } catch (error: any) {
    notify('Turnover could not be confirmed: ' + (error?.response?.data?.message || error?.message || 'Unknown error'));
  } finally {
    releasingUnitId.value = null;
  }
}

async function resetDemo() {
  if (!await systemConfirm(
    'Clear temporary display information? This will not delete properties, leases, bills, or other rental records.',
    'Clear temporary viewnstration',
    'Clear temporary data',
  )) return;
  // Do not restore demo properties or units over the PostgreSQL catalog.
  state.applications = [];
  state.leases = [];
  state.bills = [];
  state.payments = [];
  state.maintenance = [];
  state.activity = [];
  await refreshFinances();
  await refreshRentalCatalog();
  await refreshOwnerApplications();
  closeDialog();
  clearFilters();
  returnToOwnerProfile.value = false;
  notify('Temporary display data cleared. Your rental records remain unchanged.');
}
async function logout() {
  try {
    await logoutUser();
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    closeDialog();
    router.replace('/login');
  }
}
</script>

<template>
  <IonPage>
    <IonHeader>
      <IonToolbar class="topbar">
        <IonButtons slot="start" class="owner-brand-controls">
          <button
            type="button"
            class="owner-menu-toggle"
            aria-label="Toggle owner navigation"
            aria-controls="owner-navigation"
            :aria-expanded="mobileMenuOpen"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <IonIcon :icon="menuOutline" />
          </button>
          <div class="owner-brand-mark"><IonIcon :icon="businessOutline" /></div>
          <div class="owner-brand-text">
            <strong>RentEase<span>.</span></strong>
            <small>OWNER PORTAL</small>
          </div>
        </IonButtons>
        <IonButtons slot="end">
          <IonButton
            aria-label="Open pending payments"
            @click="openFilteredSection('payments', 'PENDING')"
          >
            <IonIcon :icon="notificationsOutline" />
          </IonButton>

        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent class="portal">
      <div class="layout">
        <button
          v-if="mobileMenuOpen"
          type="button"
          class="owner-nav-backdrop"
          aria-label="Close owner navigation"
          @click="mobileMenuOpen = false"
        ></button>
        <aside id="owner-navigation" class="sidebar" :class="{ 'mobile-open': mobileMenuOpen }">
          <div class="owner">
            <div class="avatar">
              <img
                v-if="state.profile.avatar"
                :src="state.profile.avatar"
                alt="Owner profile"
              />
              <span v-else>{{ initials }}</span>
            </div>
            <div>
              <strong>{{ state.profile.name }}</strong>
              <small>Property Owner</small>
            </div>
          </div>
          <p class="nav-label">WORKSPACE</p>
          <nav aria-label="Owner navigation">
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
              <b v-if="item.id === 'pending' && pendingApps.length">
                {{ pendingApps.length }}
              </b>
            </button>
          </nav>
          <button type="button" class="owner-sidebar-logout" @click="logout">
            <IonIcon :icon="logOutOutline" />
            <span>Logout</span>
            <IonIcon :icon="chevronForwardOutline" class="logout-chevron" />
          </button>
          <div class="sidebar-note">
            <strong>Integration status</strong>
            <p>Manage properties, rental agreements, payments, and maintenance in one place.</p>
          </div>
        </aside>
        <main class="workspace">
          <div class="page-heading">
            <div>
              <p class="eyebrow">PROPERTY MANAGEMENT</p>
              <h1>{{ titles[section] }}</h1>
              <p class="subtitle">{{ subtitles[section] }}</p>
            </div>
            <div class="heading-actions">
              <button
                v-if="section === 'properties' && returnToOwnerProfile"
                type="button"
                class="button secondary"
                @click="navigate('profile')"
              >
                ← Return to Owner Profile
              </button>
              <button
                v-if="section === 'properties'"
                type="button"
                class="button primary"
                @click="openDialog('property')"
              >
                + Add Property
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
            <button
              type="button"
              aria-label="Dismiss message"
              @click="message = ''"
            >
              ×
            </button>
          </div>
          <template v-if="section === 'overview'">
            <section class="welcome-hero">
              <div class="hero-copy">
                <span class="hero-kicker"><span class="live-dot"></span> OWNER WORKSPACE</span>
                <h2>Good to see you, {{ state.profile.name.split(' ')[0] || 'Owner' }}!</h2>
                <p>Here’s your rental portfolio at a glance. Keep track of your properties, tenants, and collections—all in one place.</p>
                <div class="hero-actions">
                  <button type="button" class="hero-button" @click="navigate('properties')">
                    <IonIcon :icon="businessOutline" /> Manage properties <span>→</span>
                  </button>
                  <button type="button" class="hero-link" @click="navigate('pending')">
                    Review applications <span>↗</span>
                  </button>
                </div>
              </div>
              <div class="hero-art" aria-hidden="true">
                <div class="hero-orbit orbit-one"></div>
                <div class="hero-orbit orbit-two"></div>
                <div class="hero-building">
                  <div class="building-roof"></div>
                  <div class="building-windows">
                    <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
                  </div>
                  <div class="building-door"></div>
                </div>
                <div class="floating-stat"><span>🏡</span><div><strong>{{ state.properties.length }} properties</strong><small>Your portfolio</small></div></div>
              </div>
            </section>
            <div class="metrics">
              <article class="metric">
                <span>Verified Collections</span>
                <strong>{{ peso(collections) }}</strong>
                <small>All recorded periods</small>
              </article>
              <article class="metric">
                <span>Occupancy Rate</span>
                <strong>{{ occupancy }}%</strong>
                <small>Includes reserved active leases</small>
              </article>
              <article class="metric">
                <span>Available Units</span>
                <strong>
                  {{ availableUnits.length }} / {{ state.units.length }}
                </strong>
                <small>Ready for rental applications</small>
              </article>
              <article class="metric">
                <span>Units with Open Maintenance</span>
                <strong>{{ maintenanceUnits }}</strong>
                <small>May include occupied units</small>
              </article>
            </div>
            <div class="dashboard-grid">
              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>Monthly Collections</h2>
                    <p>Verified payments by payment date</p>
                  </div>
                  <span class="pill neutral">Last 4 months</span>
                </div>
                <div
                  class="chart"
                  aria-label="Monthly verified collections"
                >
                  <div
                    v-for="month in monthlyCollections"
                    :key="month.month"
                    class="chart-column"
                  >
                    <strong>{{ peso(month.value) }}</strong>
                    <div class="bar-track">
                      <div
                        class="bar"
                        :style="{
                          height: `${month.value / chartMaximum * 100}%`,
                        }"
                      ></div>
                    </div>
                    <small>{{ month.label }}</small>
                  </div>
                </div>
              </section>
              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>Needs Attention</h2>
                    <p>Your next operational priorities</p>
                  </div>
                </div>
                <button
                  type="button"
                  class="attention"
                  @click="navigate('pending')"
                >
                  <span class="attention-icon">A</span>
                  <span>
                    <strong>Pending applications</strong>
                    <small>Review prospective tenants</small>
                  </span>
                  <b>{{ pendingApps.length }}</b>
                  <span>›</span>
                </button>
                <button
                  type="button"
                  class="attention"
                  @click="openFilteredSection('payments', 'PENDING')"
                >
                  <span class="attention-icon teal">₱</span>
                  <span>
                    <strong>Payments awaiting review</strong>
                    <small>Confirm received funds</small>
                  </span>
                  <b>{{ pendingPayments.length }}</b>
                  <span>›</span>
                </button>
                <button
                  type="button"
                  class="attention"
                  @click="openFilteredSection('bills', 'OVERDUE')"
                >
                  <span class="attention-icon amber">!</span>
                  <span>
                    <strong>Overdue bills</strong>
                    <small>Review outstanding balances</small>
                  </span>
                  <b>{{ overdueBills.length }}</b>
                  <span>›</span>
                </button>
              </section>
              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>Property &amp; Unit Status</h2>
                    <p>{{ state.properties.length }} managed properties</p>
                  </div>
                  <button
                    type="button"
                    class="text-button"
                    @click="navigate('properties')"
                  >
                    Manage units →
                  </button>
                </div>
                <div class="unit-grid">
                  <article
                    v-for="unit in state.units"
                    :key="unit.id"
                    class="unit-tile"
                  >
                    <span
                      class="pill"
                      :class="badgeClass(unitStatus(unit.id))"
                    >
                      {{ unitStatus(unit.id) }}
                    </span>
                    <h3>{{ unitLabel(unit.id) }}</h3>
                    <p>{{ propertyName(unit.propertyId) }}</p>
                    <strong>
                      {{ peso(unit.rent) }}
                      <small>/ month</small>
                    </strong>
                    <button
                      type="button"
                      class="text-button"
                      @click="openDialog('unit', unit.id)"
                    >
                      Edit unit →
                    </button>
                  </article>
                </div>
                <p v-if="!state.units.length" class="empty">
                  Add your first rental unit to get started.
                </p>
              </section>
              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>Outstanding Bills</h2>
                    <p>{{ peso(outstandingTotal) }} total balance</p>
                  </div>
                  <button
                    type="button"
                    class="text-button"
                    @click="navigate('bills')"
                  >
                    View all →
                  </button>
                </div>
                <div
                  v-for="bill in outstandingBills.slice(0, 4)"
                  :key="bill.id"
                  class="record-row"
                >
                  <div>
                    <strong>{{ billTenant(bill) }}</strong>
                    <p>Due {{ readableDate(bill.due) }}</p>
                    <span
                      class="pill"
                      :class="badgeClass(billStatus(bill))"
                    >
                      {{ billStatus(bill) }}
                    </span>
                  </div>
                  <div class="align-right">
                    <strong>{{ peso(balance(bill)) }}</strong>
                    <button
                      type="button"
                      class="text-button"
                      @click="openDialog('bill', bill.id)"
                    >
                      View bill
                    </button>
                  </div>
                </div>
                <p v-if="!outstandingBills.length" class="empty">
                  All recorded bills are paid.
                </p>
              </section>
              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>Upcoming Lease Expirations</h2>
                    <p>Active agreements ending within 90 days</p>
                  </div>
                  <button
                    type="button"
                    class="text-button"
                    @click="navigate('leases')"
                  >
                    View all →
                  </button>
                </div>
                <div
                  v-for="lease in upcomingLeases.slice(0, 4)"
                  :key="lease.id"
                  class="record-row"
                >
                  <div>
                    <strong>{{ lease.tenant }}</strong>
                    <p>
                      {{ unitLabel(lease.unitId) }} ·
                      {{ readableDate(lease.end) }}
                    </p>
                  </div>
                  <div class="align-right">
                    <span class="pill warning">
                      {{
                        daysUntil(lease.end) < 0
                          ? 'Past end date'
                          : `${daysUntil(lease.end)} days left`
                      }}
                    </span>
                    <button
                      type="button"
                      class="text-button"
                      @click="openDialog('lease', lease.id)"
                    >
                      View lease
                    </button>
                  </div>
                </div>
                <p v-if="!upcomingLeases.length" class="empty">
                  No leases are ending within 90 days.
                </p>
              </section>
              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <h2>Recent Activity</h2>
                    <p>Activity log integration pending</p>
                  </div>
                </div>
                <ol class="activity-list">
                  <li
                    v-for="item in state.activity.slice(0, 5)"
                    :key="item.id"
                  >
                    <span class="activity-dot"></span>
                    <div>
                      <p>{{ item.text }}</p>
                      <small>
                        {{ new Date(item.at).toLocaleString('en-PH') }}
                      </small>
                    </div>
                  </li>
                </ol>
              </section>
            </div>
          </template>
          <div
            v-if="!['overview', 'profile'].includes(section)"
            class="filters"
          >
            <label class="search-box">
              <span>Search records</span>
              <input
                v-model="search"
                type="search"
                placeholder="Search by unit number, property, name, or reference…"
              />
            </label>
            <label v-if="section === 'properties'">
              <span>Property</span>
              <select v-model="propertyFilter">
                <option value="ALL">All properties</option>
                <option
                  v-for="property in state.properties"
                  :key="property.id"
                  :value="String(property.id)"
                >
                  {{ property.name }}
                </option>
              </select>
            </label>
            <label v-if="filterOptions.length">
              <span>Status</span>
              <select v-model="statusFilter">
                <option value="ALL">All statuses</option>
                <option
                  v-for="option in filterOptions"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>
            </label>
            <button
              type="button"
              class="button secondary"
              @click="clearFilters"
            >
              Clear filters
            </button>
          </div>
          <template v-if="section === 'properties'">
            <div v-if="propertiesLoading" class="notice">Loading your properties and rental units…</div>
            <div v-else-if="rentalLoaded && !state.properties.length" class="notice">No properties in your account yet. Click Add Property to create one.</div>
            <button type="button" class="button secondary" :disabled="propertiesLoading" @click="refreshRentalCatalog">Refresh properties</button>
            <div class="property-list premium-property-list">
              <article v-for="property in filteredProperties" :key="property.id" class="property-card owner-property-card">
                <div class="property-cover">
                  <div class="property-cover-top">
                    <span class="property-cover-kicker"><IonIcon :icon="businessOutline" /> RENTAL PROPERTY</span>
                    <span class="property-code">#{{ property.id }}</span>
                  </div>
                  <IonIcon :icon="businessOutline" class="property-cover-icon" />
                  <div class="property-cover-bottom">
                    <span class="property-location">⌖ {{ property.address }}</span>
                    <span class="property-active-badge">REGISTERED</span>
                  </div>
                </div>
                <div class="property-info">
                  <p class="property-caption">PROPERTY OVERVIEW</p>
                  <h2>{{ property.name }}</h2>
                  <div class="property-info-grid">
                    <div class="property-info-tile">
                      <span>Rental Units</span>
                      <strong>{{ state.units.filter(unit => unit.propertyId === property.id).length }}</strong>
                    </div>
                    <div class="property-info-tile">
                      <span>Property ID</span>
                      <strong>#{{ property.id }}</strong>
                    </div>
                  </div>
                  <button type="button" class="button primary property-view-button" @click="openDialog('property', property.id)">
                    <span>Edit Property</span><IonIcon :icon="chevronForwardOutline" />
                  </button>
                </div>
              </article>
            </div>
            <section class="panel">
              <div class="panel-heading">
                <div>
                  <h2>Rental Units</h2>
                  <p>{{ filteredUnits.length }} matching units</p>
                </div>
                <button
                  type="button"
                  class="button primary"
                  @click="openDialog('unit')"
                >
                  + Add Unit
                </button>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Property</th>
                      <th>Monthly Rent</th>
                      <th>Bedrooms</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="unit in filteredUnits" :key="unit.id">
                      <td><strong>{{ unitLabel(unit.id) }}</strong></td>
                      <td>{{ propertyName(unit.propertyId) }}</td>
                      <td>{{ peso(unit.rent) }}</td>
                      <td>{{ unit.bedrooms }}</td>
                      <td>
                        <span
                          class="pill"
                          :class="badgeClass(unitStatus(unit.id))"
                        >
                          {{ unitStatus(unit.id) }}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          class="text-button"
                          @click="openDialog('unit', unit.id)"
                        >
                          Edit unit
                        </button>
                        <button
                          v-if="canConfirmTurnover(unit)"
                          type="button"
                          class="text-button"
                          :disabled="releasingUnitId !== null"
                          @click="confirmTurnover(unit)"
                        >
                          {{ releasingUnitId === unit.id ? 'Releasing...' : 'Confirm Turnover' }}
                        </button>
                      </td>
                    </tr>
                    <tr v-if="!filteredUnits.length">
                      <td colspan="6" class="empty">
                        No matching units.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </template>
          <section
            v-if="['pending', 'history'].includes(section)"
            class="panel"
          >
            <div class="panel-heading">
              <div>
                <h2>
                  {{ section === 'pending' ? 'Application Queue' : 'History' }}
                </h2>
                <p>{{ filteredApps.length }} applications</p>
              </div>
              <button type="button" class="button secondary" :disabled="applicationsLoading" @click="refreshOwnerApplications">{{ applicationsLoading ? 'Loading...' : 'Refresh Applications' }}</button>
            </div>
            <p v-if="applicationsError" role="alert" class="notice">{{ applicationsError }}</p>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Property / Unit</th>
                    <th>Move-in</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="app in filteredApps" :key="app.id">
                    <td>
                      <strong>{{ app.name }}</strong>
                      <small>{{ app.email }}</small>
                    </td>
                    <td>
                      {{ unitProperty(app.unitId) }}
                      <small>{{ unitLabel(app.unitId) }}</small>
                    </td>
                    <td>{{ readableDate(app.moveIn) }}</td>
                    <td>{{ app.duration }} months</td>
                    <td>
                      <span
                        class="pill"
                        :class="badgeClass(app.status)"
                      >
                        {{ app.status }}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        class="text-button"
                        @click="openDialog('application', app.id)"
                      >
                        View application
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!filteredApps.length">
                    <td colspan="6" class="empty">
                      No matching applications.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <div v-if="section === 'payments'" class="notice" role="status">Payment submission stores transaction details and reference numbers only; receipt image uploads are not enabled in this database schema.</div>
          <button v-if="section === 'payments'" type="button" class="button secondary" :disabled="financeLoading" @click="refreshFinances">Refresh Payments</button>
          <section v-if="section === 'payments'" class="panel">
            <div class="panel-heading">
              <div>
                <h2>Payment Records</h2>
                <p>Only verified payments count toward collections.</p>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tenant / Unit</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="payment in filteredPayments"
                    :key="payment.id"
                  >
                    <td>
                      <strong>{{ paymentTenant(payment) }}</strong>
                      <small>
                        {{ paymentProperty(payment) }} ·
                        {{ paymentUnit(payment) }}
                      </small>
                    </td>
                    <td>{{ peso(payment.amount) }}</td>
                    <td>{{ payment.method }}</td>
                    <td>{{ payment.reference }}</td>
                    <td>{{ readableDate(payment.date) }}</td>
                    <td>
                      <span
                        class="pill"
                        :class="badgeClass(payment.status)"
                      >
                        {{ payment.status }}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        class="text-button"
                        @click="openDialog('payment', payment.id)"
                      >
                        Review details
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!filteredPayments.length">
                    <td colspan="7" class="empty">
                      No matching payments.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <div v-if="section === 'bills'" class="heading-actions" style="margin-bottom:15px"><button type="button" class="button primary" :disabled="financeSaving" @click="issueBill">+ Create Monthly Bill</button><button type="button" class="button secondary" :disabled="financeLoading" @click="refreshFinances">Refresh Bills</button></div>
          <section v-if="section === 'bills'" class="panel">
            <div class="panel-heading">
              <div>
                <h2>Tenant Bills</h2>
                <p>
                  {{ peso(outstandingTotal) }} outstanding across all records
                </p>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tenant / Unit</th>
                    <th>Period</th>
                    <th>Due Date</th>
                    <th>Bill Amount</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="bill in filteredBills" :key="bill.id">
                    <td>
                      <strong>{{ billTenant(bill) }}</strong>
                      <small v-if="billLease(bill)">
                        {{ unitLabel(billLease(bill)?.unitId ?? 0) }}
                        ·
                        {{ unitProperty(billLease(bill)?.unitId ?? 0) }}
                      </small>
                    </td>
                    <td>{{ periodLabel(bill.period) }}</td>
                    <td>{{ readableDate(bill.due) }}</td>
                    <td>{{ peso(bill.amount) }}</td>
                    <td>{{ peso(balance(bill)) }}</td>
                    <td>
                      <span
                        class="pill"
                        :class="badgeClass(billStatus(bill))"
                      >
                        {{ billStatus(bill) }}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        class="text-button"
                        @click="openDialog('bill', bill.id)"
                      >
                        View bill
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!filteredBills.length">
                    <td colspan="7" class="empty">
                      No matching bills.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <section v-if="section === 'deposits'" class="panel" aria-label="Security Deposit Management">
            <div class="panel-heading"><div><h2>Security Deposit Management</h2><p>Deposit collections are separate from rental bills. Payments require owner verification.</p></div><button type="button" class="button secondary" :disabled="depositsLoading" @click="refreshOwnerDeposits">{{ depositsLoading ? 'Loading...' : 'Refresh Deposits' }}</button></div>
            <p v-if="depositsError" class="notice" role="alert">{{ depositsError }}</p>
            <div class="deposit-highlights">
              <article><span>Pending verification</span><strong>{{ ownerDepositPendingCount }}</strong></article>
              <article><span>Verified deposit collections</span><strong>{{ peso(depositRecords.filter(d => d.status === 'verified').reduce((s,d) => s + Number(d.amount), 0)) }}</strong></article>
              <article><span>Submissions on record</span><strong>{{ depositRecords.length }}</strong></article>
            </div>
            <div class="table-wrap"><table><thead><tr><th>Tenant / Lease</th><th>Rental unit</th><th>Required</th><th>Verified / Pending</th><th>Submission</th><th>Reference</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              <tr v-for="deposit in depositRecords" :key="deposit.deposit_payment_id">
                <td><strong>{{ deposit.tenant_name }}</strong><br />Lease #{{ deposit.lease_id }}</td>
                <td>{{ deposit.property_name }} — Unit {{ deposit.unit_number }}</td>
                <td>{{ peso(Number(deposit.security_deposit)) }}</td>
                <td>{{ peso(ownerDepositVerified(Number(deposit.lease_id))) }} verified<br />{{ peso(ownerDepositPending(Number(deposit.lease_id))) }} pending</td>
                <td>{{ peso(Number(deposit.amount)) }}<br />{{ String(deposit.submitted_at).slice(0, 10) }}</td>
                <td>{{ deposit.payment_method }}<br />{{ deposit.reference_number || 'Cash payment' }}</td>
                <td><span class="pill" :class="badgeClass(deposit.status === 'verified' ? 'VERIFIED' : deposit.status === 'rejected' ? 'REJECTED' : 'PENDING')">{{ deposit.status.replaceAll('_', ' ').toUpperCase() }}</span><small v-if="deposit.rejection_reason" class="deposit-reason">{{ deposit.rejection_reason }}</small></td>
                <td><div v-if="deposit.status === 'pending_verification'" class="deposit-actions"><button type="button" class="button primary" :disabled="depositsSaving !== null" @click="reviewDeposit(deposit, 'verified')">Verify</button><button type="button" class="button secondary" :disabled="depositsSaving !== null" @click="reviewDeposit(deposit, 'rejected')">Reject</button></div><span v-else>Reviewed</span></td>
              </tr>
              <tr v-if="!depositRecords.length"><td colspan="8" class="empty">No security deposit submissions yet. An agreed deposit amount is not proof that it was paid.</td></tr>
            </tbody></table></div>
            <p class="helper">Collection requires owner verification; final settlement and refunds are tracked separately below.</p>
            <div class="panel-heading" style="margin-top:26px"><div><h2>Deposit Settlements & Refunds</h2><p>Only completed leases with verified deposit collections can be settled.</p></div><button class="button secondary" type="button" :disabled="settlementsLoading" @click="refreshSettlements">{{ settlementsLoading ? 'Loading...' : 'Refresh Settlements' }}</button></div>
            <p v-if="settlementError" class="notice" role="alert">{{ settlementError }}</p>
            <div v-if="eligibleSettlements.length" class="table-wrap"><table><thead><tr><th>Eligible lease</th><th>Tenant</th><th>Verified deposit</th><th>Action</th></tr></thead><tbody><tr v-for="l in eligibleSettlements" :key="l.id"><td>Lease #{{ l.id }}</td><td>{{ l.tenant }}</td><td>{{ peso(ownerDepositVerified(l.id)) }}</td><td><button type="button" class="button primary" :disabled="settlementBusy" @click="createSettlementForLease(l)">Create Settlement Draft</button></td></tr></tbody></table></div>
            <p v-else class="helper">No newly eligible leases. Active leases cannot be finalized for deposit settlement.</p>
            <article v-for="s in settlements" :key="s.settlement_id" style="padding:18px 0; border-top:1px solid #d9e5f4">
              <div class="panel-heading"><div><h3>Settlement #{{ s.settlement_id }} — {{ s.tenant_name }}</h3><p>{{ s.property_name }} · Unit {{ s.unit_number }} · Lease #{{ s.lease_id }}</p></div><span class="pill" :class="badgeClass(s.status === 'settled' ? 'COMPLETED' : s.status === 'finalized' ? 'APPROVED' : 'PENDING')">{{ s.status.toUpperCase() }}</span></div>
              <div v-if="s.status === 'finalized' || s.status === 'settled'" class="deposit-actions" style="margin:10px 0"><button type="button" class="button secondary" @click="printDepositSettlement(s)">Print Settlement Statement</button></div>
              <div class="deposit-highlights"><article><span>Verified deposit</span><strong>{{ peso(Number(s.summary.verified_deposit)) }}</strong></article><article><span>Deductions</span><strong>{{ peso(Number(s.summary.total_deductions)) }}</strong></article><article><span>Refundable</span><strong>{{ peso(Number(s.summary.refundable_amount)) }}</strong></article><article><span>Remaining refund</span><strong>{{ peso(Number(s.summary.remaining_refund)) }}</strong></article></div>
              <h4>Itemized Deductions</h4>
              <div class="table-wrap"><table><thead><tr><th>Reason</th><th>Amount</th><th>Evidence note</th><th>Action</th></tr></thead><tbody><tr v-for="d in s.deductions" :key="d.deduction_id"><td>{{ d.description }}</td><td>{{ peso(Number(d.amount)) }}</td><td>{{ d.evidence_note || '—' }}</td><td><button v-if="s.status === 'draft'" class="button secondary" type="button" :disabled="settlementBusy" @click="removeSettlementDeduction(s, d.deduction_id)">Remove</button></td></tr><tr v-if="!s.deductions.length"><td colspan="4">No deductions recorded.</td></tr></tbody></table></div>
              <div v-if="s.status === 'draft'" class="deposit-actions" style="margin:14px 0"><button type="button" class="button secondary" :disabled="settlementBusy" @click="addSettlementDeduction(s)">Add Deduction</button><button type="button" class="button primary" :disabled="settlementBusy" @click="finalizeSettlementUI(s)">Finalize Settlement</button></div>
              <h4>Refund Transactions</h4>
              <p class="helper">Confirmed: {{ peso(Number(s.summary.confirmed_refunds)) }} · Pending: {{ peso(Number(s.summary.pending_refunds)) }}</p>
              <div class="table-wrap"><table><thead><tr><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th><th>Action</th></tr></thead><tbody><tr v-for="r in s.refunds" :key="r.refund_id"><td>{{ peso(Number(r.amount)) }}</td><td>{{ r.payment_method }}</td><td>{{ r.reference_number || 'Cash' }}</td><td>{{ r.status }}</td><td><div v-if="r.status === 'pending'" class="deposit-actions"><button type="button" class="button primary" :disabled="settlementBusy" @click="reviewRefundUI(s, r.refund_id, 'confirmed')">Confirm Paid</button><button type="button" class="button secondary" :disabled="settlementBusy" @click="reviewRefundUI(s, r.refund_id, 'cancelled')">Cancel</button></div></td></tr><tr v-if="!s.refunds.length"><td colspan="5">No refund transactions recorded.</td></tr></tbody></table></div>
              <button v-if="s.status === 'finalized' && Number(s.summary.remaining_refund) > Number(s.summary.pending_refunds)" type="button" class="button primary" style="margin-top:12px" :disabled="settlementBusy" @click="recordRefundUI(s)">Record Refund</button>
            </article>
            <p v-if="!settlements.length" class="helper">No deposit settlements yet.</p>
          </section>
          <section v-if="section === 'leases'" class="panel">
            <div class="panel-heading">
              <div>
                <h2>Rental Agreements</h2>
                <p>Completing a lease preserves its historical records.</p>
              </div>
            </div>
            <div v-if="leasesError" class="notice" role="alert">{{ leasesError }}</div>
            <button type="button" class="button secondary" :disabled="leasesLoading" @click="refreshOwnerLeases">{{ leasesLoading ? 'Loading...' : 'Refresh Leases' }}</button>
            <p class="helper">Approved applications can be turned into pending leases from Application History. A tenant must confirm before activation.</p>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Property / Unit</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Monthly Rent</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="lease in filteredLeases" :key="lease.id">
                    <td><strong>{{ lease.tenant }}</strong></td>
                    <td>
                      {{ unitProperty(lease.unitId) }}
                      <small>{{ unitLabel(lease.unitId) }}</small>
                    </td>
                    <td>{{ readableDate(lease.start) }}</td>
                    <td>{{ readableDate(lease.end) }}</td>
                    <td>{{ peso(lease.rent) }}</td>
                    <td>
                      <span
                        class="pill"
                        :class="badgeClass(lease.status)"
                      >
                        {{ lease.status }}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        class="text-button"
                        @click="openDialog('lease', lease.id)"
                      >
                        View lease
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!filteredLeases.length">
                    <td colspan="7" class="empty">
                      No matching leases.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <div v-if="section === 'maintenance'" class="heading-actions" style="margin-bottom:16px"><button type="button" class="button secondary" :disabled="maintenanceLoading" @click="refreshOwnerMaintenance">Refresh Maintenance</button></div>
          <div v-if="section === 'maintenance' && maintenanceError" class="notice" role="alert">{{ maintenanceError }}</div>
          <div
            v-if="section === 'maintenance'"
            class="request-grid"
          >
            <article
              v-for="request in filteredMaintenance"
              :key="request.id"
              class="panel request-card"
            >
              <div class="request-top">
                <span
                  class="pill"
                  :class="badgeClass(request.status)"
                >
                  {{ request.status }}
                </span>
              </div>
              <h2>{{ request.category }}</h2><p class="muted">Reported by {{ request.tenant || 'Tenant' }} · Priority: {{ request.priority || 'MEDIUM' }}</p>
              <p class="muted">
                {{ unitProperty(request.unitId) }} ·
                {{ unitLabel(request.unitId) }}
              </p>
              <p class="request-description">
                {{ request.description }}
              </p>
              <div class="request-footer">
                <small>{{ readableDate(request.date) }}</small>
                <button
                  type="button"
                  class="text-button"
                  @click="openDialog('maintenance', request.id)"
                >
                  View / Update →
                </button>
              </div>
            </article>
            <p
              v-if="!filteredMaintenance.length"
              class="empty panel"
            >
              No matching maintenance requests.
            </p>
          </div>
          <div v-if="section === 'profile'" class="profile-grid">
            <section class="panel profile-summary">
              <div class="avatar large">
                <img
                  v-if="state.profile.avatar"
                  :src="state.profile.avatar"
                  alt="Owner profile"
                />
                <span v-else>{{ initials }}</span>
              </div>
              <h2>{{ state.profile.name }}</h2>
              <span class="pill good">Property Owner</span>
              <p>
                {{ state.properties.length }} properties ·
                {{ state.units.length }} units
              </p>
              <button
                type="button"
                class="button primary"
                @click="openDialog('profile')"
              >
                Edit Profile
              </button>
            </section>
            <section class="panel">
              <div class="panel-heading">
                <div>
                  <h2>Contact Information</h2>
                  <p>Account contact details</p>
                </div>
              </div>
              <dl class="details">
                <dt>Full name</dt>
                <dd>{{ state.profile.name }}</dd>
                <dt>Email</dt>
                <dd>{{ state.profile.email }}</dd>
                <dt>Mobile</dt>
                <dd>{{ state.profile.mobile }}</dd>
                <dt>Role</dt>
                <dd>Property Owner</dd>
              </dl>
              <h3 class="subheading">Managed Properties</h3>
              <div
                v-for="property in state.properties"
                :key="property.id"
                class="record-row"
              >
                <div>
                  <strong>{{ property.name }}</strong>
                  <p>{{ property.address }}</p>
                </div>
                <button
                  type="button"
                  class="text-button"
                  @click="viewProfileUnits(property.id)"
                >
                  View Units
                </button>
              </div>
            </section>
          </div>
          <footer class="page-footer">
            <span>RentEase · Owner workspace</span>
            <button
              type="button"
              class="text-button"
              @click="resetDemo"
            >
              Clear temporary view
            </button>
          </footer>
        </main>
      </div>
    </IonContent>

    <!-- Full-size, accessible monthly billing workflow; replaces native dark alert radios. -->
    <!-- Rental agreement preparation: branded form, not an Ionic alert -->
    <IonModal class="owner-lease-modal" :is-open="leaseDialogOpen" :backdrop-dismiss="!savingLease" @didDismiss="closeLeasePreparation">
      <div class="lease-modal-shell">
        <header class="lease-modal-hero">
          <div><span class="lease-modal-kicker">RENTEASE · RENTAL AGREEMENTS</span><h2>Prepare Lease Agreement</h2><p>Set the security deposit before sending the agreement to the tenant.</p></div>
          <button type="button" class="lease-close" aria-label="Close lease preparation" :disabled="savingLease" @click="closeLeasePreparation"><IonIcon :icon="closeOutline" /></button>
        </header>
        <form class="lease-modal-body" @submit.prevent="submitLeasePreparation">
          <div class="lease-summary" v-if="leaseDialogApplication">
            <div><span>APPLICANT</span><strong>{{ leaseDialogApplication.name }}</strong></div>
            <div><span>RENTAL UNIT</span><strong>{{ unitProperty(leaseDialogApplication.unitId) }} · {{ unitLabel(leaseDialogApplication.unitId) }}</strong></div>
            <div><span>LEASE DURATION</span><strong>{{ leaseDialogApplication.duration }} months</strong></div>
          </div>
          <div class="lease-deposit-explainer" id="lease-deposit-explainer">
            <div class="deposit-explainer-heading"><IonIcon :icon="informationCircleOutline" /><strong>What is a security deposit?</strong></div>
            <p>A security deposit is an amount held as protection against unpaid obligations or damage beyond normal wear and tear, subject to the rental agreement. Any remaining refundable balance is settled at the end of the tenancy.</p>
            <p><strong>This is not monthly rent.</strong> Entering an amount here records the agreed deposit in the lease; it does not collect or confirm payment. Enter <strong>₱0</strong> only when no security deposit is required.</p>
          </div>
          <label class="lease-field" for="owner-lease-deposit">Security Deposit (PHP)
            <span class="lease-money-input"><span>₱</span><input id="owner-lease-deposit" v-model="leaseDeposit" type="number" min="0" max="100000000" step="0.01" inputmode="decimal" aria-describedby="lease-deposit-explainer lease-deposit-hint" required :disabled="savingLease" /></span>
            <small id="lease-deposit-hint" class="deposit-amount-hint">Enter the agreed amount (for example, ₱1,500.00). This is recorded once, not added to every monthly bill.</small>
          </label>
          <p class="lease-helper"><IonIcon :icon="timeOutline" /> The agreement will remain pending until the tenant reviews and confirms the rental terms.</p>
          <p v-if="leaseDialogError" class="lease-error" role="alert">{{ leaseDialogError }}</p>
          <div class="lease-modal-actions"><button type="button" class="button secondary" :disabled="savingLease" @click="closeLeasePreparation">Cancel</button><button type="submit" class="button primary" :disabled="savingLease">{{ savingLease ? 'Preparing agreement...' : 'Prepare Lease' }}</button></div>
        </form>
      </div>
    </IonModal>
    <!-- Branded RentEase notices instead of black system alert dialogs -->
    <IonModal class="owner-notice-modal" :is-open="currentNotice !== null" :backdrop-dismiss="false" @didDismiss="showNextOwnerNotice">
      <div v-if="currentNotice" class="owner-notice-shell">
        <div class="owner-notice-hero" :class="'notice-' + currentNotice.tone">
          <span class="owner-notice-kicker">RENTEASE · OWNER PORTAL</span>
          <div class="notice-symbol"><IonIcon :icon="currentNotice.tone === 'error' ? closeOutline : currentNotice.tone === 'success' ? checkmarkCircleOutline : notificationsOutline" /></div>
        </div>
        <div class="owner-notice-body"><h2>{{ currentNotice.title }}</h2><p>{{ currentNotice.detail }}</p><button type="button" class="button primary owner-notice-ok" @click="closeOwnerNotice">Got it</button></div>
      </div>
    </IonModal>
    <IonModal :is-open="billingModalOpen" class="billing-workflow-modal" :backdrop-dismiss="!financeSaving" @didDismiss="closeBillingModal">
      <IonHeader>
        <IonToolbar class="billing-modal-toolbar">
          <div slot="start" class="billing-modal-heading">
            <span class="billing-eyebrow">BILLING WORKSPACE · STEP {{ billingStep }} OF 2</span>
            <strong>Create Monthly Bill</strong>
          </div>
          <IonButtons slot="end"><IonButton aria-label="Close billing window" :disabled="financeSaving" @click="closeBillingModal"><IonIcon :icon="closeOutline" /></IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent class="billing-modal-content">
        <div class="billing-dialog-body">
          <div class="billing-progress"><span :class="{ active: billingStep === 1, done: billingStep === 2 }">1 · Select Tenant</span><span :class="{ active: billingStep === 2 }">2 · Bill Charges</span></div>
          <template v-if="billingStep === 1">
            <div class="billing-lead"><h2>Select an active lease</h2><p>Choose the tenant and rental unit for this month's statement.</p></div>
            <div class="billing-lease-options" role="radiogroup" aria-label="Active leases for billing">
              <label v-for="lease in eligibleBillingLeases" :key="lease.id" class="billing-lease-option" :class="{ selected: billingForm.leaseId === lease.id }">
                <input v-model.number="billingForm.leaseId" type="radio" name="billing-lease" :value="lease.id" />
                <span class="billing-lease-avatar">{{ lease.tenant.slice(0,1).toUpperCase() }}</span>
                <span class="billing-lease-copy"><strong>{{ lease.tenant }}</strong><small>{{ unitProperty(lease.unitId) }} · {{ unitLabel(lease.unitId) }}</small></span>
                <span class="billing-lease-rent">{{ peso(lease.rent) }}<small>/ month</small></span>
              </label>
            </div>
          </template>
          <form v-else id="billing-new-form" class="billing-charge-form" @submit.prevent="submitMonthlyBill">
            <div class="billing-selected-summary"><span>Billing for</span><strong>{{ chosenBillingLease?.tenant }} · {{ chosenBillingLease ? unitLabel(chosenBillingLease.unitId) : '' }}</strong><small>Base rent: {{ peso(chosenBillingLease?.rent || 0) }}</small></div>
            <div class="billing-date-grid"><label>Billing Period<input v-model="billingForm.month" type="date" required /><small>Choose the first day of the billing month.</small></label><label>Payment Due Date<input v-model="billingForm.due" type="date" required /></label></div>
            <p class="billing-subheading">Additional charges</p>
            <div class="billing-charges-grid"><label>Water (₱)<input v-model="billingForm.water" type="number" min="0" step="0.01" required /></label><label>Electricity (₱)<input v-model="billingForm.electricity" type="number" min="0" step="0.01" required /></label><label>Other (₱)<input v-model="billingForm.other" type="number" min="0" step="0.01" required /></label></div>
            <div class="billing-total-box"><span>Estimated bill total<small>Base rent + additional charges</small></span><strong>{{ peso(estimatedBillTotal) }}</strong></div>
          </form>
          <p v-if="billingError" class="billing-error" role="alert">{{ billingError }}</p>
        </div>
      </IonContent>
      <div class="billing-dialog-footer"><button type="button" class="button secondary" :disabled="financeSaving" @click="billingStep === 1 ? closeBillingModal() : (billingStep = 1, billingError = '')">{{ billingStep === 1 ? 'Cancel' : 'Back' }}</button><button v-if="billingStep === 1" type="button" class="button primary" @click="advanceBilling">Continue to Charges →</button><button v-else type="button" class="button primary" :disabled="financeSaving" @click="submitMonthlyBill">{{ financeSaving ? 'Creating Bill...' : 'Create Monthly Bill' }}</button></div>
    </IonModal>
    <IonModal
      :is-open="dialogOpen"
      class="record-modal"
      @didDismiss="dialogOpen = false"
    >
      <IonHeader>
        <IonToolbar class="modal-toolbar">
          <IonTitle>
            <div class="owner-dialog-kicker">RENTEASE · OWNER WORKSPACE</div>
            <div class="owner-dialog-title">{{ dialogTitle }}</div>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton
              aria-label="Close dialog"
              @click="closeDialog"
            >
              <IonIcon :icon="closeOutline" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent class="dialog-content">
        <div class="dialog-body">
          <p
            v-if="formError"
            class="form-error"
            role="alert"
          >
            {{ formError }}
          </p>
          <form
            v-if="dialog === 'property'"
            @submit.prevent="saveProperty"
          >
            <label>
              Property Name
              <input
                v-model="form.name"
                required
                maxlength="100"
              />
            </label>
            <label>
              Address
              <textarea
                v-model="form.address"
                required
                rows="3"
                maxlength="250"
              ></textarea>
            </label>
            <div class="dialog-actions">
              <button
                type="button"
                class="button secondary"
                @click="closeDialog"
              >
                Cancel
              </button>
              <button class="button primary" type="submit">
                {{ savingRental ? 'Saving…' : 'Save Property' }}
              </button>
            </div>
          </form>
          <form
            v-if="dialog === 'unit'"
            novalidate
            @submit.prevent="saveUnit"
          >
            <label>
              Property
              <select v-model="form.propertyId" required>
                <option value="" disabled>Select a property</option>
                <option
                  v-for="property in state.properties"
                  :key="property.id"
                  :value="String(property.id)"
                >
                  {{ property.name }}
                </option>
              </select>
            </label>
            <div class="form-grid">
              <label>
                Unit Number
                <input
                  v-model="form.number"
                  required
                  maxlength="30"
                />
              </label>
              <label>
                Monthly Rent (PHP)
                <input
                  v-model="form.rent"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </label>
              <label>
                Bedrooms
                <input
                  v-model="form.bedrooms"
                  type="number"
                  min="0"
                  step="1"
                  required
                />
              </label>
              <label>
                Capacity
                <input
                  v-model="form.capacity"
                  type="number"
                  min="1"
                  step="1"
                  required
                />
              </label>
            </div>
            <p class="helper">
              Rental unit details and availability are kept up to date.
            </p>
            <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
            <p v-if="unitSaveStatus" class="helper" role="status">{{ unitSaveStatus }}</p>
            <div class="dialog-actions">
              <button
                type="button"
                class="button secondary"
                :disabled="savingRental"
                @click="closeDialog"
              >
                Cancel
              </button>
              <button
                type="button"
                class="button primary"
                :disabled="savingRental"
                @click.stop="saveUnit"
              >
                {{ savingRental ? 'Saving to database…' : selectedId ? 'Update Unit' : 'Save Unit' }}
              </button>
            </div>
          </form>
          <form
            v-if="dialog === 'profile'"
            @submit.prevent="saveProfile"
          >
            <label>
              Full Name
              <input
                v-model="form.name"
                required
                maxlength="100"
              />
            </label>
            <label>
              Email
              <input
                v-model="form.email"
                type="email"
                readonly
                required
              />
            </label>
            <label>
              Mobile Number
              <input
                v-model="form.mobile"
                type="tel"
                placeholder="09171234567"
                required
              />
            </label>
            <label>
              Profile Picture
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                @change="uploadAvatar"
              />
            </label>
            <p class="helper">
              JPG, PNG, or WebP. Maximum 2 MB.
            </p>
            <img
              v-if="form.avatar"
              class="avatar-preview"
              :src="form.avatar"
              alt="Selected profile picture"
            />
            <div class="dialog-actions">
              <button
                type="button"
                class="button secondary"
                @click="closeDialog"
              >
                Cancel
              </button>
              <button class="button primary" type="submit">
                Save Profile
              </button>
            </div>
          </form>
          <template
            v-if="dialog === 'application' && selectedApp"
          >
            <span
              class="pill"
              :class="badgeClass(selectedApp.status)"
            >
              {{ selectedApp.status }}
            </span>
            <h2>{{ selectedApp.name }}</h2>
            <dl class="details">
              <dt>Property</dt>
              <dd>{{ unitProperty(selectedApp.unitId) }}</dd>
              <dt>Unit</dt>
              <dd>{{ unitLabel(selectedApp.unitId) }}</dd>
              <dt>Email</dt>
              <dd>{{ selectedApp.email }}</dd>
              <dt>Phone</dt>
              <dd>{{ selectedApp.phone }}</dd>
              <dt>Move-in</dt>
              <dd>{{ readableDate(selectedApp.moveIn) }}</dd>
              <dt>Duration</dt>
              <dd>{{ selectedApp.duration }} months</dd>
              <dt v-if="selectedApp.submitted">Submitted</dt>
              <dd v-if="selectedApp.submitted">{{ readableDate(selectedApp.submitted) }}</dd>
              <template v-if="selectedApp.decided">
                <dt>Decision date</dt>
                <dd>{{ readableDate(selectedApp.decided) }}</dd>
              </template>
            </dl>
            <div
              v-if="selectedApp.status === 'PENDING'"
              class="dialog-actions"
            >
              <button
                type="button"
                class="button danger-button"
                :disabled="reviewingApplication"
                @click="reviewApplication(selectedApp, false)"
              >
                Reject
              </button>
              <button
                type="button"
                class="button primary"
                :disabled="reviewingApplication"
                @click="reviewApplication(selectedApp, true)"
              >
                {{ reviewingApplication ? 'Saving...' : 'Approve & Reserve Unit' }}
              </button>
            </div>
            <div v-if="selectedApp.status === 'APPROVED'" class="dialog-actions">
              <button type="button" class="button primary" :disabled="savingLease" @click="createLeaseFromApplication(selectedApp)">
                {{ savingLease ? 'Preparing...' : 'Prepare Lease Agreement' }}
              </button>
            </div>
          </template>
          <template
            v-if="dialog === 'payment' && selectedPayment"
          >
            <span
              class="pill"
              :class="badgeClass(selectedPayment.status)"
            >
              {{ selectedPayment.status }}
            </span>
            <h2>{{ peso(selectedPayment.amount) }}</h2>
            <dl class="details">
              <dt>Tenant</dt>
              <dd>{{ paymentTenant(selectedPayment) }}</dd>
              <dt>Property</dt>
              <dd>{{ paymentProperty(selectedPayment) }}</dd>
              <dt>Unit</dt>
              <dd>{{ paymentUnit(selectedPayment) }}</dd>
              <dt>Method</dt>
              <dd>{{ selectedPayment.method }}</dd>
              <dt>Reference</dt>
              <dd>{{ selectedPayment.reference }}</dd>
              <dt>Date</dt>
              <dd>{{ readableDate(selectedPayment.date) }}</dd>
              <dt>Bill</dt>
              <dd>#{{ selectedPayment.billId }}</dd>
              <template v-if="selectedPayment.note">
                <dt>Review note</dt>
                <dd>{{ selectedPayment.note }}</dd>
              </template>
            </dl>
            <h3>Payment Evidence</h3>
            <img
              v-if="selectedPayment.proof"
              :src="selectedPayment.proof"
              class="payment-proof"
              alt="Submitted payment evidence"
            />
            <p v-else class="helper">
              No receipt image is stored. Verify payment details and reference against your own transaction records before confirming.
            </p>
            <div
              v-if="selectedPayment.status === 'PENDING'"
              class="dialog-actions"
            >
              <button
                type="button"
                class="button danger-button"
                @click="rejectPayment(selectedPayment)"
              >
                Reject Payment
              </button>
              <button
                type="button"
                class="button primary"
                @click="verifyPayment(selectedPayment)"
              >
                Verify Payment
              </button>
            </div>
          </template>
          <template v-if="dialog === 'bill' && selectedBill">
            <span
              class="pill"
              :class="badgeClass(billStatus(selectedBill))"
            >
              {{ billStatus(selectedBill) }}
            </span>
            <h2>Bill #{{ selectedBill.id }}</h2>
            <dl class="details">
              <dt>Tenant</dt>
              <dd>{{ billTenant(selectedBill) }}</dd>
              <dt>Property</dt>
              <dd>
                {{
                  unitProperty(
                    billLease(selectedBill)?.unitId ?? 0,
                  )
                }}
              </dd>
              <dt>Unit</dt>
              <dd>
                {{
                  unitLabel(
                    billLease(selectedBill)?.unitId ?? 0,
                  )
                }}
              </dd>
              <dt>Period</dt>
              <dd>{{ periodLabel(selectedBill.period) }}</dd>
              <dt>Due date</dt>
              <dd>{{ readableDate(selectedBill.due) }}</dd>
              <dt>Total</dt>
              <dd>{{ peso(selectedBill.amount) }}</dd>
              <dt>Verified payments</dt>
              <dd>{{ peso(verifiedTotal(selectedBill.id)) }}</dd>
              <dt>Outstanding</dt>
              <dd>
                <strong>{{ peso(balance(selectedBill)) }}</strong>
              </dd>
            </dl>
            <h3>Related Payments</h3>
            <div
              v-for="payment in selectedBillPayments"
              :key="payment.id"
              class="record-row"
            >
              <div>
                <strong>{{ peso(payment.amount) }}</strong>
                <p>{{ payment.reference }}</p>
              </div>
              <span
                class="pill"
                :class="badgeClass(payment.status)"
              >
                {{ payment.status }}
              </span>
              <button
                type="button"
                class="text-button"
                @click="openDialog('payment', payment.id)"
              >
                View payment
              </button>
            </div>
            <p v-if="!selectedBillPayments.length" class="helper">
              No payments recorded for this bill.
            </p>
          </template>
          <template v-if="dialog === 'lease' && selectedLease">
            <span
              class="pill"
              :class="badgeClass(selectedLease.status)"
            >
              {{ selectedLease.status }}
            </span>
            <h2>{{ selectedLease.tenant }}</h2>
            <dl class="details">
              <dt>Property</dt>
              <dd>{{ unitProperty(selectedLease.unitId) }}</dd>
              <dt>Unit</dt>
              <dd>{{ unitLabel(selectedLease.unitId) }}</dd>
              <dt>Start</dt>
              <dd>{{ readableDate(selectedLease.start) }}</dd>
              <dt>End</dt>
              <dd>{{ readableDate(selectedLease.end) }}</dd>
              <dt>Monthly rent</dt>
              <dd>{{ peso(selectedLease.rent) }}</dd>
              <dt>Security deposit</dt>
              <dd>{{ peso(selectedLease.deposit || 0) }}</dd>
              <dt>Outstanding balance</dt>
              <dd>{{ peso(selectedLeaseBalance) }}</dd>
            </dl>
            <p class="lease-completion-note">
              Completing a lease ends its active status.
              Only leases past their end date can be completed.
              Outstanding bills remain in Bills &amp; Balances, and payment history is retained.
              After completion, the unit enters maintenance for turnover inspection.
              You can release it from Properties &amp; Units after inspection.
            </p>
            <div
              v-if="selectedLease.status === 'ACTIVE'"
              class="dialog-actions"
            >
              <p v-if="selectedLease.end >= dateOffset(0)" class="lease-completion-note" role="status">
                This lease ends on {{ readableDate(selectedLease.end) }}. Completion becomes available after the end date.
              </p>
              <button
                type="button"
                class="button primary"
                :disabled="savingLease || selectedLease.end >= dateOffset(0)"
                @click="completeLease(selectedLease)"
              >
                {{ savingLease ? 'Completing...' : 'Complete Lease' }}
              </button>
            </div>
          </template>
          <form
            v-if="dialog === 'maintenance' && selectedMaintenance"
            @submit.prevent="updateMaintenance"
          >
            <h2>{{ selectedMaintenance.category }}</h2>
            <p class="muted">
              {{ unitProperty(selectedMaintenance.unitId) }} ·
              {{ unitLabel(selectedMaintenance.unitId) }}
            </p>
            <p>{{ selectedMaintenance.description }}</p><p class="muted">Tenant: {{ selectedMaintenance.tenant }} · Priority: {{ selectedMaintenance.priority }}</p>
            <dl class="details">
              <dt>Reported</dt>
              <dd>{{ readableDate(selectedMaintenance.date) }}</dd>
              <dt>Current status</dt>
              <dd>{{ selectedMaintenance.status }}</dd>
            </dl>
            <label>
              Update Status
              <select v-model="form.status">
                <option
                  v-for="option in maintenanceTransitions[selectedMaintenance.status] ?? []"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>
            </label>
            <p class="helper">Workflow: Pending → Assigned → In Progress → Completed. Cancel is also available before completion.</p><p v-if="formError" class="helper" role="alert">{{ formError }}</p>
            <div class="dialog-actions">
              <button
                type="button"
                class="button secondary"
                @click="closeDialog"
              >
                Cancel
              </button>
              <button class="button primary" type="submit" :disabled="maintenanceSaving || !maintenanceTransitions[selectedMaintenance.status]?.length">
                {{ maintenanceSaving ? 'Saving...' : 'Save Status' }}
              </button>
            </div>
          </form>
        </div>
      </IonContent>
    </IonModal>
  </IonPage>
</template>

<style scoped>
.deposit-highlights{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:18px 0}
.deposit-highlights article{background:#f0f6ff;border:1px solid #dce8fa;border-radius:12px;padding:15px;display:flex;flex-direction:column;gap:6px}
.deposit-highlights span{color:#4c668b;font-size:12px;font-weight:650}.deposit-highlights strong{font-size:22px;color:#19447e}
.deposit-actions{display:flex;gap:6px;flex-wrap:wrap}.deposit-reason{display:block;font-size:12px;color:#9a3b3b;margin-top:5px;max-width:240px}

.portal,
.dialog-content {
  color-scheme: light;
  --navy: #142b49;
  --muted: #52637a;
  --teal: #0b7068;
  --line: #e2e8f0;
  --ion-text-color: #142b49;
  --ion-background-color: #ffffff;
  color: #142b49;
}
.portal {
  --background: #f4f7fb;
}
.topbar {
  --background: #142b49;
  --color: #ffffff;
  --min-height: 64px;
  padding-inline: 12px;
}
.topbar ion-title {
  color: #ffffff;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -.6px;
}
.brand-subtitle {
  margin-left: 12px;
  color: #d0deed;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0;
}
.topbar ion-button {
  --color: #ffffff;
  color: #ffffff;
  text-transform: none;
  font-size: 12px;
}
.layout {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  min-height: 100%;
}
.sidebar {
  padding: 25px 16px;
  border-right: 1px solid var(--line);
  background: #ffffff;
  color: #142b49;
  min-width: 0;
}
.owner {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 4px 24px;
  border-bottom: 1px solid var(--line);
}
.owner > div:last-child {
  min-width: 0;
}
.owner strong {
  color: #142b49;
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.owner small {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 11px;
}
.avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 13px;
  overflow: hidden;
  color: #0b7068;
  background: #e6f5f1;
  font-weight: 800;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar.large {
  width: 84px;
  height: 84px;
  border-radius: 24px;
  font-size: 26px;
  margin: 0 auto 20px;
}
.nav-label {
  font-size: 10px;
  letter-spacing: 1.7px;
  font-weight: 750;
  margin: 25px 12px 12px;
  color: #52637a;
}
.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.sidebar nav button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 11px 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  color: #52637a;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background .18s, color .18s;
}
.sidebar nav button ion-icon {
  font-size: 18px;
  flex-shrink: 0;
}
.sidebar nav button span {
  flex: 1;
}
.sidebar nav button:hover {
  background: #f4f7fb;
}
.sidebar nav button.active {
  background: #e8f5f2;
  border-color: #d4eee7;
  color: #0b7068;
  font-weight: 750;
}
.sidebar nav b {
  padding: 3px 7px;
  border-radius: 6px;
  background: #fff0d5;
  color: #92400e;
  font-size: 10px;
}
.sidebar-note {
  padding: 16px;
  margin-top: 30px;
  border-radius: 12px;
  background: #f5f8fc;
}
.sidebar-note strong {
  color: #142b49;
  font-size: 11px;
}
.sidebar-note p {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.6;
  margin: 6px 0 0;
}
.workspace {
  min-width: 0;
  padding: clamp(20px, 2.2vw, 36px);
  color: #142b49;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.heading-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.eyebrow {
  color: var(--teal);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.8px;
  margin: 0 0 9px;
}
h1 {
  color: #142b49;
  margin: 0;
  font-size: clamp(25px, 2.2vw, 34px);
  font-weight: 800;
  letter-spacing: -.8px;
}
.subtitle {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
  margin: 8px 0 0;
}
h2 {
  margin: 0;
  color: #142b49;
  font-size: 16px;
  font-weight: 750;
  line-height: 1.5;
}
h3 {
  color: #142b49;
  font-size: 15px;
}
p {
  line-height: 1.6;
}
.notice {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  background: #e5f2ee;
  color: #155e52;
  border: 1px solid #cfe6dd;
  padding: 12px 16px;
  border-radius: 11px;
  font-size: 13px;
  margin-bottom: 20px;
  line-height: 1.6;
}
.notice button {
  background: transparent;
  border: 0;
  font-size: 24px;
  color: inherit;
  cursor: pointer;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 15px;
  margin-bottom: 22px;
}
.metric {
  background: #ffffff;
  border: 1px solid var(--line);
  border-top: 3px solid #dce6f2;
  border-radius: 15px;
  padding: 22px;
  min-width: 0;
}
.metric:first-child {
  border-top-color: var(--teal);
}
.metric > span {
  display: block;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}
.metric > strong {
  display: block;
  color: #142b49;
  margin: 12px 0 7px;
  font-size: clamp(22px, 1.8vw, 31px);
  letter-spacing: -.8px;
  overflow-wrap: anywhere;
}
.metric small {
  font-size: 10px;
  color: #52637a;
  line-height: 1.5;
}
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.panel {
  background: #ffffff;
  color: #142b49;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 23px;
  min-width: 0;
  box-shadow: 0 3px 15px rgb(20 43 73 / 3%);
}
.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}
.panel-heading p {
  color: #52637a;
  font-size: 11px;
  margin: 5px 0 0;
}
.pill {
  display: inline-block;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .3px;
  line-height: 1.5;
}
.good {
  color: #166534;
  background: #e5f5eb;
}
.warning {
  color: #92400e;
  background: #fff1d8;
}
.danger {
  color: #991b1b;
  background: #feecec;
}
.neutral {
  color: #465f7d;
  background: #edf2f8;
}
.chart {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  padding: 8px 4px 0;
}
.chart-column {
  text-align: center;
  min-width: 0;
}
.chart-column > strong {
  display: block;
  color: #142b49;
  font-size: 11px;
  margin-bottom: 12px;
  overflow-wrap: anywhere;
}
.chart-column > small {
  display: block;
  margin-top: 13px;
  font-size: 10px;
  color: var(--muted);
}
.bar-track {
  height: 160px;
  background: #f0f5fa;
  border-radius: 8px 8px 3px 3px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}
.bar {
  width: 100%;
  background: linear-gradient(180deg, #19a395, #0d7a71);
  border-radius: 8px 8px 0 0;
  transition: height .3s;
}
.attention {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 15px 0;
  border: 0;
  border-bottom: 1px solid #edf1f6;
  background: transparent;
  color: #142b49;
  text-align: left;
  cursor: pointer;
}
.attention:last-child {
  border-bottom: 0;
}
.attention > span:nth-child(2) {
  flex: 1;
  min-width: 0;
}
.attention strong {
  display: block;
  color: #142b49;
  font-size: 12px;
}
.attention small {
  display: block;
  font-size: 10px;
  color: var(--muted);
  margin-top: 5px;
}
.attention b {
  font-size: 20px;
}
.attention-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #eaf0f8;
  color: #33577c;
  font-weight: 800;
  flex-shrink: 0;
}
.attention-icon.teal {
  background: #e4f5ef;
  color: #0b7068;
}
.attention-icon.amber {
  background: #fff1d8;
  color: #92400e;
}
.unit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px;
}
.unit-tile {
  border: 1px solid #e4eaf2;
  border-radius: 12px;
  padding: 17px;
  background: #f8fafc;
  min-width: 0;
}
.unit-tile h3 {
  margin: 13px 0 4px;
  font-size: 19px;
}
.unit-tile p {
  margin: 0 0 13px;
  color: var(--muted);
  font-size: 11px;
}
.unit-tile > strong {
  color: #142b49;
  font-size: 15px;
  display: block;
}
.unit-tile > strong small {
  color: var(--muted);
  font-size: 10px;
  font-weight: 400;
}
.unit-tile .text-button {
  margin-top: 12px;
}
.record-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 15px 0;
  border-bottom: 1px solid #edf1f6;
}
.record-row:last-child {
  border-bottom: 0;
}
.record-row strong {
  color: #142b49;
  font-size: 12px;
}
.record-row p {
  color: #52637a;
  font-size: 11px;
  margin: 5px 0 7px;
}
.record-row > div {
  min-width: 0;
  overflow-wrap: anywhere;
}
.align-right {
  text-align: right;
}
.align-right .text-button {
  display: block;
  margin: 7px 0 0 auto;
}
.activity-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.activity-list li {
  display: flex;
  gap: 12px;
  padding: 0 0 18px;
}
.activity-list li:last-child {
  padding-bottom: 0;
}
.activity-dot {
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #0b7068;
  margin-top: 6px;
}
.activity-list p {
  margin: 0 0 5px;
  font-size: 12px;
  color: #334155;
}
.activity-list small {
  font-size: 10px;
  color: var(--muted);
}
.button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 10px 15px;
  border-radius: 9px;
  border: 1px solid transparent;
  font: inherit;
  font-size: 12px;
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
.button.secondary {
  background: #ffffff;
  border-color: #dce4ee;
  color: #334155;
}
.button.secondary:hover {
  background: #f3f6fa;
}
.button.danger-button {
  background: #fff2f2;
  border-color: #fecaca;
  color: #991b1b;
}
.text-button {
  border: 0;
  padding: 3px 0;
  background: transparent;
  color: #0b7068;
  font: inherit;
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;
  line-height: 1.5;
}
.text-button:hover {
  text-decoration: underline;
}
.filters {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.filters label {
  min-width: 150px;
}
.filters label > span {
  display: block;
  font-size: 11px;
  color: #52637a;
  margin-bottom: 7px;
}
.search-box {
  flex: 1;
}
input,
select,
textarea {
  width: 100%;
  min-width: 0;
  border: 1px solid #d7e0eb;
  border-radius: 9px;
  padding: 11px 12px;
  background: #ffffff;
  color: #142b49;
  -webkit-text-fill-color: #142b49;
  color-scheme: light;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  box-sizing: border-box;
}
input::placeholder,
textarea::placeholder {
  color: #64748b;
  -webkit-text-fill-color: #64748b;
  opacity: 1;
}
select option {
  background: #ffffff;
  color: #142b49;
}
input[type="file"] {
  font-size: 12px;
  background: #f8fafc;
}
textarea {
  resize: vertical;
}
.table-wrap {
  width: 100%;
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 12px;
}
th {
  background: #f6f8fc;
  color: #52637a;
  font-size: 10px;
  font-weight: 750;
  padding: 13px 12px;
  white-space: nowrap;
  border-bottom: 1px solid #e2e8f0;
}
td {
  padding: 17px 12px;
  border-bottom: 1px solid #edf1f6;
  white-space: nowrap;
  color: #475569;
}
td strong {
  color: #142b49;
}
td small {
  display: block;
  font-size: 10px;
  margin-top: 5px;
  color: #52637a;
}
tbody tr:last-child td {
  border-bottom: 0;
}
tbody tr:hover {
  background: #fbfcfe;
}
.empty {
  padding: 28px 16px;
  text-align: center;
  color: #52637a;
  font-size: 13px;
  white-space: normal;
}
.property-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px;
  margin-bottom: 22px;
}
.property-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #ffffff;
  min-width: 0;
  flex-wrap: wrap;
}
.property-card > div:nth-child(2) {
  flex: 1;
  min-width: 140px;
}
.property-card p {
  font-size: 11px;
  color: var(--muted);
  margin: 5px 0;
}
.property-card small {
  font-size: 10px;
  color: var(--teal);
}
.property-symbol {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #edf3fb;
  display: grid;
  place-items: center;
  color: #33577c;
  flex-shrink: 0;
  font-size: 23px;
}
.request-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}
.request-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}
.muted {
  color: #52637a;
  font-size: 11px;
}
.request-description {
  color: #334155;
  font-size: 13px;
}
.request-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  border-top: 1px solid #edf1f6;
  margin-top: 22px;
  padding-top: 16px;
}
.request-footer small {
  color: #52637a;
  font-size: 10px;
}
.profile-grid {
  display: grid;
  grid-template-columns: minmax(240px, .65fr) minmax(0, 1.35fr);
  gap: 22px;
  align-items: start;
}
.profile-summary {
  text-align: center;
  padding: 34px 24px;
}
.profile-summary .pill {
  margin-top: 12px;
}
.profile-summary p {
  color: #52637a;
  font-size: 12px;
  margin: 18px 0;
}
.details {
  display: grid;
  grid-template-columns: 135px minmax(0, 1fr);
  gap: 0 16px;
  margin: 20px 0;
  font-size: 13px;
}
.details dt,
.details dd {
  padding: 13px 0;
  margin: 0;
  border-bottom: 1px solid #edf1f6;
  line-height: 1.6;
}
.details dt {
  color: #52637a;
}
.details dd {
  color: #142b49;
  overflow-wrap: anywhere;
}
.subheading {
  margin-top: 25px;
}
.page-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 28px;
  padding: 12px 0;
  color: #52637a;
  font-size: 10px;
}
.record-modal {
  --width: 660px;
  --height: 85vh;
  --border-radius: 18px;
}
.modal-toolbar {
  --background: #ffffff;
  --color: #142b49;
  --border-color: #e2e8f0;
}
.modal-toolbar ion-title,
.modal-toolbar ion-button {
  color: #142b49;
  --color: #142b49;
}
.dialog-content {
  --background: #ffffff;
}
.dialog-body {
  padding: 26px;
  color: #142b49;
}
.dialog-body h2 {
  margin: 16px 0;
  font-size: 23px;
}
.dialog-body h3 {
  margin-top: 25px;
}
.dialog-body p {
  font-size: 13px;
}
.dialog-body form > label,
.form-grid > label {
  display: block;
  font-size: 12px;
  font-weight: 650;
  margin-bottom: 18px;
}
.dialog-body label input,
.dialog-body label select,
.dialog-body label textarea {
  display: block;
  margin-top: 8px;
  font-weight: 400;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 22px;
  margin-top: 20px;
  border-top: 1px solid #edf1f6;
}
.helper {
  color: #52637a;
  font-size: 12px !important;
  line-height: 1.7;
}
.lease-completion-note {
  padding: 12px 14px;
  border: 1px solid #d8e4ef;
  border-radius: 12px;
  background: #f2f7fc;
  color: #344c65;
  line-height: 1.6;
}
.form-error {
  background: #fff1f2;
  color: #991b1b;
  border: 1px solid #fecdd3;
  padding: 12px;
  border-radius: 9px;
}
.avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 14px;
  object-fit: cover;
}
.payment-proof {
  max-width: 100%;
  max-height: 350px;
  object-fit: contain;
}
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid #0b7068;
  outline-offset: 3px;
}
@media (min-width: 1800px) {
  .unit-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 1250px) {
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .request-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .property-list {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 1050px) {
  .layout {
    grid-template-columns: 220px minmax(0, 1fr);
  }
  .dashboard-grid,
  .profile-grid {
    grid-template-columns: 1fr;
  }
  .request-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 800px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .sidebar {
    padding: 16px 20px 8px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .owner {
    padding: 0 0 14px;
    border-bottom: 0;
  }
  .sidebar nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 3px 2px 10px;
  }
  .sidebar nav button {
    flex: 0 0 auto;
    width: auto;
    white-space: nowrap;
  }
  .nav-label,
  .sidebar-note {
    display: none;
  }
  .workspace {
    padding: 24px 20px;
  }
  .request-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 560px) {
  .brand-subtitle {
    display: none;
  }
  .workspace {
    padding: 22px 14px;
  }
  .heading-actions {
    width: 100%;
  }
  .heading-actions .button {
    flex: 1;
  }
  .metrics {
    gap: 10px;
  }
  .metric {
    padding: 17px 14px;
  }
  .metric > strong {
    font-size: 24px;
  }
  .panel {
    padding: 18px;
  }
  .dashboard-grid {
    gap: 16px;
  }
  .request-grid {
    grid-template-columns: 1fr;
  }
  .filters label {
    flex: 1 1 100%;
    min-width: 0;
  }
  .chart {
    gap: 10px;
  }
  .chart-column > strong {
    font-size: 9px;
  }
  .bar-track {
    height: 130px;
  }
  .details {
    grid-template-columns: 105px minmax(0, 1fr);
    font-size: 12px;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .record-modal {
    --width: 100%;
    --height: 100%;
    --border-radius: 0;
  }
  .dialog-body {
    padding: 22px 18px;
  }
  .dialog-actions .button {
    flex: 1;
  }
}
@media (max-width: 420px) {
  .topbar ion-title {
    font-size: 18px;
  }
  .topbar ion-button {
    font-size: 11px;
  }
  .panel-heading p {
    font-size: 10px;
  }
  .chart-column > strong {
    font-size: 8px;
  }
}

@media (max-width: 380px) {
  .unit-grid,
  .metrics {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar nav button,
  .bar {
    transition: none;
  }
}

/* Engaging dashboard refresh */
.portal {
  --background: #f3f6fb;
}
.topbar {
  box-shadow: 0 5px 20px rgba(8, 27, 53, .13);
  position: relative;
  z-index: 2;
}
.layout {
  grid-template-columns: 258px minmax(0, 1fr);
}
.sidebar {
  box-shadow: 8px 0 28px rgba(20, 43, 73, .025);
}
.sidebar nav button {
  min-height: 47px;
  border-radius: 12px;
  font-size: 12.5px;
}
.sidebar nav button.active {
  box-shadow: inset 3px 0 0 #0b7068;
}
.workspace {
  max-width: 1700px;
  width: 100%;
  margin-inline: auto;
}
.page-heading {
  margin-bottom: 28px;
}
h1 {
  font-size: clamp(26px, 2.5vw, 34px);
  letter-spacing: -1.1px;
  font-weight: 850;
}
.subtitle {
  max-width: 650px;
  line-height: 1.65;
}
.welcome-hero {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 240px;
  overflow: hidden;
  padding: clamp(24px, 3vw, 40px);
  margin: 0 0 22px;
  border-radius: 24px;
  color: #fff;
  background: linear-gradient(115deg, #142b49 0%, #174a60 56%, #0b7068 100%);
  box-shadow: 0 18px 42px rgba(20, 43, 73, .14);
}
.welcome-hero::before,
.welcome-hero::after {
  content: "";
  position: absolute;
  z-index: -1;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 50%;
}
.welcome-hero::before {
  width: 390px;
  height: 390px;
  right: 2%;
  top: -245px;
}
.welcome-hero::after {
  width: 280px;
  height: 280px;
  right: 11%;
  bottom: -215px;
}
.hero-copy {
  max-width: 620px;
  position: relative;
  z-index: 1;
}
.hero-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #a9e6d8;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.7px;
}
.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #70e1b5;
  box-shadow: 0 0 0 4px rgba(112,225,181,.13);
}
.welcome-hero h2 {
  margin: 15px 0 10px;
  color: #fff;
  font-size: clamp(25px, 3vw, 36px);
  font-weight: 850;
  letter-spacing: -1.1px;
  line-height: 1.15;
}
.welcome-hero p {
  max-width: 520px;
  margin: 0;
  color: #d9e8ef;
  font-size: 13px;
  line-height: 1.8;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  margin-top: 24px;
}
.hero-button,
.hero-link {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 0;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 750;
  transition: transform .18s, background .18s;
}
.hero-button {
  padding: 12px 15px;
  border-radius: 11px;
  color: #14324b;
  background: #fff;
  box-shadow: 0 6px 16px rgba(0,0,0,.12);
}
.hero-button ion-icon {
  font-size: 17px;
  color: #0b7068;
}
.hero-button:hover {
  transform: translateY(-2px);
  background: #e8fbf5;
}
.hero-link {
  padding: 10px 0;
  color: #fff;
  background: transparent;
}
.hero-link:hover {
  color: #a9e6d8;
}
.hero-art {
  position: relative;
  flex: 0 0 255px;
  height: 200px;
  display: grid;
  place-items: center;
}
.hero-orbit {
  position: absolute;
  border: 1px solid rgba(255,255,255,.19);
  border-radius: 50%;
}
.orbit-one { width: 210px; height: 210px; }
.orbit-two { width: 160px; height: 160px; }
.hero-building {
  position: relative;
  width: 105px;
  height: 122px;
  margin-top: 18px;
  padding: 20px 13px 0;
  border: 2px solid rgba(255,255,255,.8);
  border-bottom: 0;
  border-radius: 8px 8px 0 0;
  background: linear-gradient(150deg, rgba(255,255,255,.28), rgba(255,255,255,.08));
  box-shadow: 0 0 38px rgba(164,244,221,.15);
}
.building-roof {
  position: absolute;
  top: -17px;
  left: -9px;
  width: 119px;
  height: 18px;
  border: 2px solid rgba(255,255,255,.8);
  border-radius: 5px 5px 2px 2px;
  background: #2c7180;
}
.building-windows {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.building-windows i {
  display: block;
  height: 16px;
  border: 1px solid rgba(255,255,255,.75);
  border-radius: 2px;
  background: rgba(183,244,225,.58);
}
.building-door {
  position: absolute;
  bottom: 0;
  left: 37px;
  width: 28px;
  height: 36px;
  border: 2px solid rgba(255,255,255,.8);
  border-bottom: 0;
  border-radius: 5px 5px 0 0;
  background: rgba(20,43,73,.6);
}
.floating-stat {
  position: absolute;
  right: -3px;
  bottom: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid rgba(255,255,255,.3);
  border-radius: 14px;
  background: rgba(255,255,255,.96);
  color: #142b49;
  box-shadow: 0 12px 30px rgba(0,0,0,.15);
}
.floating-stat > span { font-size: 23px; }
.floating-stat strong { display: block; font-size: 12px; white-space: nowrap; }
.floating-stat small { display: block; margin-top: 3px; color: #64748b; font-size: 10px; }
.metrics {
  gap: 15px;
  margin-bottom: 22px;
}
.metric {
  position: relative;
  overflow: hidden;
  padding: 22px 21px;
  border: 1px solid #e7edf5;
  border-radius: 17px;
  background: linear-gradient(145deg, #fff, #fbfdff);
  box-shadow: 0 7px 22px rgba(20,43,73,.035);
  transition: transform .2s, box-shadow .2s;
}
.metric:hover {
  transform: translateY(-3px);
  box-shadow: 0 13px 28px rgba(20,43,73,.08);
}
.metric::after {
  content: "";
  position: absolute;
  width: 72px;
  height: 72px;
  right: -32px;
  top: -32px;
  border-radius: 50%;
  background: #e8f5f2;
}
.metric strong {
  font-size: clamp(22px, 2vw, 29px);
  letter-spacing: -.8px;
}
.panel {
  border: 1px solid #e6ecf4;
  border-radius: 17px;
  box-shadow: 0 7px 24px rgba(20,43,73,.035);
  transition: box-shadow .2s, border-color .2s;
}
.panel:hover {
  border-color: #dce7ed;
  box-shadow: 0 10px 28px rgba(20,43,73,.055);
}
.panel-heading h2 {
  letter-spacing: -.35px;
}
.attention {
  border-radius: 12px;
  margin: 3px 0;
  transition: background .18s, transform .18s;
}
.attention:hover {
  background: #f2f8f7;
  transform: translateX(3px);
}
.unit-tile {
  border-radius: 12px;
  border-color: #e5edf3;
  transition: transform .18s, box-shadow .18s;
}
.unit-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(20,43,73,.06);
}
.property-card {
  border-radius: 16px;
  border: 1px solid #e5edf3;
  box-shadow: 0 6px 18px rgba(20,43,73,.035);
}
.property-symbol {
  border-radius: 14px;
  box-shadow: inset 0 0 0 1px rgba(11,112,104,.08);
}
.filters {
  border: 1px solid #e5edf3;
  border-radius: 16px;
  box-shadow: 0 5px 20px rgba(20,43,73,.025);
}
input:focus,
textarea:focus,
select:focus {
  outline: 3px solid rgba(11,112,104,.14);
  border-color: #0b7068 !important;
}
button:focus-visible {
  outline: 3px solid rgba(11,112,104,.45);
  outline-offset: 3px;
}
.table-wrap {
  border-radius: 12px;
}
tbody tr {
  transition: background .15s;
}
tbody tr:hover {
  background: #f7fafc;
}
.page-footer {
  border-top: 1px solid #e3eaf2;
}
@media (max-width: 1000px) {
  .layout { grid-template-columns: 220px minmax(0, 1fr); }
  .hero-art { flex-basis: 205px; transform: scale(.9); margin-right: -12px; }
}
@media (max-width: 760px) {
  .layout { display: block; }
  .sidebar {
    padding: 14px 14px 10px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .owner { padding-bottom: 13px; }
  .sidebar .nav-label { margin-top: 15px; }
  .sidebar nav {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 5px;
  }
  .sidebar nav button {
    width: auto;
    min-width: max-content;
    min-height: 40px;
  }
  .sidebar-note { display: none; }
  .workspace { padding: 20px 14px 28px; }
  .welcome-hero { min-height: auto; padding: 25px 22px; border-radius: 19px; }
  .hero-art { display: none; }
  .welcome-hero h2 { font-size: 27px; }
  .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 420px) {
  .metrics { grid-template-columns: 1fr; }
  .hero-actions { align-items: flex-start; flex-direction: column; gap: 8px; }
  .topbar { padding-inline: 4px; }
  .topbar ion-title { font-size: 19px; }
  .brand-subtitle { margin-left: 6px; font-size: 10px; }
}


/* RentEase premium blue design system — Owner Dashboard */
.portal, .dialog-content {
  --navy: #173562;
  --teal: #2167da;
  --line: #e0e9fa;
  --muted: #667d9e;
}
.portal { --background: #edf3ff; }
.topbar {
  --background: #fff;
  --color: #152f59;
  --min-height: 67px;
  box-shadow: 0 4px 20px rgba(17,59,130,.075);
  padding-inline: 12px;
}
.owner-brand-controls { display:flex;align-items:center;gap:10px;margin-left:8px; }
.owner-brand-mark { display:grid;place-items:center;width:39px;height:39px;border-radius:13px;background:linear-gradient(135deg,#1455c7,#2287eb);color:#fff;box-shadow:0 5px 13px rgba(28,91,200,.23);font-size:20px; }
.owner-brand-text { display:flex;flex-direction:column;gap:2px; }
.owner-brand-text strong { color:#173562;font-size:19px;letter-spacing:-.7px;line-height:1.1; }
.owner-brand-text strong span {color:#21a3ed}
.owner-brand-text small {color:#8b9cb5;font-size:9px;letter-spacing:1.4px;font-weight:800}
.owner-menu-toggle { display:none;border:0;background:#edf4ff;color:#1858ba;border-radius:11px;width:42px;height:42px;cursor:pointer;font-size:22px;place-items:center; }
.topbar ion-button { --color:#1b55ac;color:#1b55ac; }
.topbar ion-button[color="danger"] { --background:linear-gradient(115deg,#1d62d6,#156bdc);--color:white;--border-radius:11px; }
.layout { display:grid;grid-template-columns:250px minmax(0,1fr);gap:18px;align-items:start;padding:13px;min-width:0; }
.sidebar {
  position:sticky;top:13px;align-self:start;min-width:0;
  width:250px;max-height:calc(100dvh - 26px);height:auto;overflow-y:auto;
  border:1px solid rgba(255,255,255,.12);border-radius:23px;
  padding:16px 12px;background:linear-gradient(166deg,#073782 0%,#1050b3 55%,#145ec9 100%);
  color:#fff;box-shadow:0 15px 32px rgba(13,66,152,.18);
}
.owner { border:1px solid rgba(255,255,255,.17);border-radius:14px;padding:12px;background:rgba(255,255,255,.13);margin-bottom:14px; }
.owner strong {color:#fff;font-size:12px}
.owner small {color:#cbdfff}
.avatar { background:#fff;color:#1454be; }
.nav-label {color:#cbdfff;margin:15px 12px 10px}
.sidebar nav {flex-direction:column;gap:7px}
.sidebar nav button {min-height:46px;color:#e4efff;border-radius:12px;font-weight:650;font-size:12px}
.sidebar nav button:hover {background:rgba(255,255,255,.12);color:#fff}
.sidebar nav button.active {background:#fff;color:#164fae;border-color:#fff;box-shadow:0 8px 18px rgba(4,29,76,.19)}
.sidebar nav b {background:#ffefca;color:#a45a00}
.sidebar-note {margin-top:16px;padding:14px;background:rgba(255,255,255,.11);border:1px solid rgba(255,255,255,.13);border-radius:15px}
.sidebar-note strong,.sidebar-note p {color:#fff}
.sidebar-note p {color:#d4e5ff}
.workspace {min-width:0;max-width:none;padding:19px clamp(10px,1.3vw,22px) 28px}
.page-heading h1,.page-heading h2,h1 {color:#183562}
.eyebrow {color:#2866ce}
.welcome-hero {background:linear-gradient(118deg,#063b8d,#125cc0 61%,#249de2);box-shadow:0 18px 38px rgba(20,77,168,.2)}
.welcome-hero::before {background:radial-gradient(circle at 70% 10%,rgba(185,224,255,.23),transparent 32%)}
.panel,.metric,.filters {border:1px solid #e0e9fa;border-radius:18px;box-shadow:0 8px 25px rgba(28,70,141,.065)}
.metric {position:relative;overflow:hidden;background:linear-gradient(150deg,#fff 50%,#f1f7ff);padding:20px}
.metric::before {content:'';position:absolute;left:0;top:0;right:0;height:4px;background:linear-gradient(90deg,#1b5bd5,#3fa9ef)}
.metric:nth-child(2)::before {background:linear-gradient(90deg,#0ca18c,#20d1ae)}
.metric:nth-child(3)::before {background:linear-gradient(90deg,#f39a25,#ffc36e)}
.metric:nth-child(4)::before {background:linear-gradient(90deg,#9b65e5,#d8a2ff)}
.metric strong {color:#153564}
.button.primary,.hero-button {border:0;background:linear-gradient(115deg,#1d5fd4,#187ee8);color:white;box-shadow:0 6px 16px rgba(26,97,214,.16)}
.button.secondary {background:#f6f9ff;color:#1c5ab9;border:1px solid #d3e2fc}
.button,.hero-button {display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:42px;border-radius:11px;font-weight:750;transition:transform .17s,box-shadow .17s,filter .17s}
.button:hover,.hero-button:hover {transform:translateY(-1px);filter:brightness(1.025)}
.button:focus-visible,.owner-menu-toggle:focus-visible {outline:3px solid #86b9ff;outline-offset:2px}
.table-wrap {border:1px solid #e0e9fa;border-radius:15px;max-width:100%;overflow-x:auto}
table {min-width:620px}
th {background:linear-gradient(180deg,#f2f7ff,#eaf2ff);color:#5b779c;letter-spacing:.35px}
td {border-color:#ebf1fa}
tbody tr:nth-child(even) {background:#f9fbff}
tbody tr:hover {background:#eef5ff}
.pill {border-radius:9px}
.premium-property-list {gap:18px}
.owner-property-card {display:block;padding:0;overflow:hidden;border-radius:20px;border:1px solid #dfe8f8;background:white;box-shadow:0 13px 28px rgba(22,61,127,.08);transition:transform .2s,box-shadow .2s}
.owner-property-card:hover {transform:translateY(-3px);box-shadow:0 19px 35px rgba(22,61,127,.14)}
.property-cover {position:relative;display:flex;flex-direction:column;justify-content:space-between;min-height:165px;padding:17px 18px;color:white;background:linear-gradient(126deg,#123b9e,#2377db 59%,#49b0ef);overflow:hidden}
.property-cover::after {content:'';position:absolute;right:-65px;bottom:-115px;width:250px;height:250px;border-radius:50%;border:35px solid rgba(255,255,255,.10)}
.property-cover-top,.property-cover-bottom {display:flex;align-items:center;justify-content:space-between;gap:9px;position:relative;z-index:1}
.property-cover-kicker {display:flex;align-items:center;gap:7px;font-size:10px;font-weight:850;letter-spacing:1.2px}
.property-code {font-weight:800;font-size:11px;padding:5px 9px;background:rgba(255,255,255,.17);border-radius:8px}
.property-cover-icon {align-self:center;font-size:65px;color:#fff;filter:drop-shadow(0 9px 15px rgba(10,42,108,.28));position:relative;z-index:1}
.property-location {font-size:11px;line-height:1.5;overflow-wrap:anywhere}
.property-active-badge {font-size:9px;font-weight:850;border-radius:999px;padding:6px 9px;background:rgba(255,255,255,.94);color:#1959be;white-space:nowrap}
.property-info {padding:20px}
.property-caption {font-size:10px;letter-spacing:1.4px;color:#7e95b3;font-weight:850;margin:0 0 7px}
.owner-property-card .property-info h2 {font-size:19px;letter-spacing:-.4px;margin:0 0 15px;color:#153568}
.property-info-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin-bottom:16px}
.property-info-tile {border:1px solid #e0eafd;border-radius:12px;background:linear-gradient(180deg,#fbfdff,#f1f6ff);padding:12px}
.property-info-tile span {display:block;font-size:10px;color:#7387a4;margin-bottom:5px}
.property-info-tile strong {font-size:17px;color:#173c7b}
.property-view-button {display:flex;width:100%;justify-content:space-between;padding:11px 16px}
.property-view-button ion-icon {font-size:18px}
.owner-nav-backdrop {display:none}
@media(max-width:900px){
  .layout {grid-template-columns:220px minmax(0,1fr);gap:11px}
  .sidebar {width:220px}
  .property-list {grid-template-columns:1fr}
}
@media(max-width:760px){
  .layout {display:block;padding:0;min-width:0}
  .owner-menu-toggle {display:grid}
  .owner-brand-controls {gap:7px;margin-left:3px}
  .owner-brand-mark {width:35px;height:35px}
  .owner-brand-text strong {font-size:16px}
  .owner-brand-text small {font-size:7px}
  .topbar {padding-inline:5px}
  .topbar ion-button {font-size:11px}
  .sidebar {display:none !important;position:fixed;z-index:1002;top:0;left:0;bottom:0;width:min(290px,85vw);max-height:100dvh;border-radius:0 20px 20px 0;overflow-y:auto;padding:calc(18px + env(safe-area-inset-top,0px)) 12px calc(18px + env(safe-area-inset-bottom,0px))}
  .sidebar.mobile-open {display:block !important}
  .sidebar nav {flex-direction:column;overflow:visible}
  .sidebar nav button {width:100%;min-width:0;white-space:normal}
  .nav-label,.sidebar-note {display:block}
  .owner-nav-backdrop {display:block;position:fixed;inset:0;z-index:1001;border:0;background:rgba(6,20,49,.56);backdrop-filter:blur(3px)}
  .workspace {width:100%;max-width:100%;padding:18px 13px calc(28px + env(safe-area-inset-bottom,0px))}
  .page-heading {flex-wrap:wrap}
  .heading-actions {width:100%;display:flex;flex-wrap:wrap}
  .heading-actions .button {flex:1 1 auto}
  .metrics {grid-template-columns:repeat(2,minmax(0,1fr))}
  .property-list {grid-template-columns:1fr}
  .table-wrap {-webkit-overflow-scrolling:touch}
}
@media(max-width:420px){
  .owner-brand-text strong {font-size:14px}
  .brand-subtitle {display:none}
  .metrics {grid-template-columns:1fr}
  .property-cover {min-height:153px}
  .property-info {padding:16px}
}


/* Owner-specific premium detail experience — independent of the Admin theme */
.owner-sidebar-logout {
  width:100%;display:flex;align-items:center;gap:12px;min-height:46px;margin-top:15px;
  padding:11px 13px;border-radius:12px;cursor:pointer;text-align:left;
  border:1px solid rgba(255,255,255,.23);background:rgba(255,255,255,.13);
  color:#fff;font-weight:800;font-size:12px;transition:background .18s,transform .18s;
}
.owner-sidebar-logout ion-icon {font-size:18px;flex-shrink:0}
.owner-sidebar-logout .logout-chevron {margin-left:auto;font-size:15px;opacity:.7}
.owner-sidebar-logout:hover {background:rgba(255,255,255,.23);transform:translateY(-1px)}
.owner-sidebar-logout:focus-visible {outline:3px solid #8ac4ff;outline-offset:2px}
.sidebar-note {margin-top:12px}
.record-modal {--width:min(665px,calc(100% - 28px));--height:auto;--max-height:90%;--border-radius:24px;--box-shadow:0 28px 85px rgba(6,26,70,.26)}
.record-modal::part(content) {border-radius:24px;overflow:hidden}
.modal-toolbar {
  --background:linear-gradient(116deg,#083a84 0%,#176dc2 58%,#168fbd 100%);
  --color:#fff;--border-color:transparent;--min-height:103px;
  color:#fff;position:relative;
}
.modal-toolbar ion-title {color:#fff;--color:#fff;padding-top:16px;padding-bottom:16px;white-space:normal}
.modal-toolbar ion-button {--color:#fff;color:#fff;--background:rgba(255,255,255,.13);--border-radius:11px;width:39px;height:39px}
.owner-dialog-kicker {color:#bedff9;font-size:9px;letter-spacing:1.7px;font-weight:850;margin-bottom:7px}
.owner-dialog-title {font-size:clamp(20px,2.5vw,26px);font-weight:850;letter-spacing:-.6px;line-height:1.2}
.dialog-content {--background:#f8fbff}
.dialog-body {padding:24px 28px 27px;color:#18355c;background:linear-gradient(180deg,#f8fbff,#fff 130px)}
.dialog-body h2 {color:#173969;letter-spacing:-.6px;font-size:23px}
.dialog-body h3 {color:#214b85}
.dialog-body form > label,.form-grid > label {color:#35547b;font-weight:750;font-size:12px}
.dialog-body label input,.dialog-body label textarea,.dialog-body label select {
  width:100%;min-width:0;min-height:44px;padding:11px 13px;border:1px solid #d6e4f8;
  border-radius:12px;background:#fff;color:#1b365e;outline:0;
  box-shadow:0 3px 10px rgba(22,72,142,.03);
  transition:border-color .18s,box-shadow .18s;
}
.dialog-body label textarea {min-height:84px;resize:vertical}
.dialog-body label :is(input,select,textarea):focus {border-color:#3389e7;box-shadow:0 0 0 4px rgba(51,137,231,.12)}
.form-grid {gap:2px 14px}
.form-error {border-radius:12px;background:#fff2f3;border:1px solid #ffdee1;padding:12px;color:#af3549}
.dialog-body .helper {background:#eef6ff;border-left:3px solid #277bda;border-radius:8px;padding:10px 12px;color:#527093}
.dialog-body .details {display:grid;grid-template-columns:minmax(105px,36%) minmax(0,1fr);gap:9px 10px;margin:18px 0}
.dialog-body .details dt,.dialog-body .details dd {
  margin:0;padding:12px 13px;border:1px solid #e3ecfa;background:#fff;
  border-radius:11px;min-width:0;overflow-wrap:anywhere;line-height:1.6;
}
.dialog-body .details dt {color:#617d9f;font-weight:750;background:#f2f7ff;font-size:11px}
.dialog-body .details dd {font-weight:700;color:#1b3f73;font-size:12px}
.dialog-body .pill {display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px}
.dialog-actions {
  display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;
  padding:17px 0 0;margin-top:20px;border-top:1px solid #e2eafa;
}
.dialog-actions .button {min-width:120px;min-height:43px;padding:10px 16px;flex:0 0 auto}
.dialog-actions .button.primary {background:linear-gradient(115deg,#1462cc,#238de5);box-shadow:0 8px 16px rgba(25,100,212,.15)}
.dialog-actions .button.secondary {background:#fff;border:1px solid #d8e6fc;color:#1d5aab}
.dialog-actions .button.danger-button {background:#fff2f2;border:1px solid #f3cbcb;color:#b53a4f}
.record-modal :is(button,input,select,textarea):focus-visible {outline:3px solid #92c6ff;outline-offset:2px}
@media(max-width:760px) {
  .record-modal {--width:100%;--height:100%;--max-height:100%;--border-radius:0}
  .record-modal::part(content) {border-radius:0}
  .modal-toolbar {--min-height:92px}
  .dialog-body {padding:20px 16px calc(26px + env(safe-area-inset-bottom,0px))}
  .dialog-body .details {grid-template-columns:minmax(90px,36%) minmax(0,1fr);gap:7px}
  .dialog-body .details dt,.dialog-body .details dd {padding:10px;font-size:11px}
  .dialog-actions {position:relative;flex-wrap:wrap}
  .dialog-actions .button {flex:1 1 130px;min-width:0;min-height:45px}
}


/* Monthly bill modal: independent light theme; no dark native radio alert. */
:global(ion-modal.billing-workflow-modal) { --width:min(660px,calc(100% - 24px));--height:auto;--max-height:90%;--border-radius:23px;--background:#fff;--color:#19375e; }
:global(ion-modal.billing-workflow-modal::part(content)) {background:#fff;border-radius:23px;box-shadow:0 25px 75px rgba(6,32,85,.24);overflow:hidden}
.billing-modal-toolbar {--background:linear-gradient(114deg,#0c398a,#165fc8 66%,#279ce2);--color:#fff;--min-height:93px;--padding-start:22px;--padding-end:15px}
.billing-modal-toolbar ion-button {--color:#fff}
.billing-modal-heading {display:flex;flex-direction:column;gap:6px;margin-left:10px;color:#fff}
.billing-eyebrow {font-size:10px;letter-spacing:1.1px;color:#cde3ff;font-weight:800}
.billing-modal-heading strong {font-size:21px;font-weight:850;letter-spacing:-.5px}
.billing-modal-content {--background:#fff;--color:#1c3b67;--padding-start:0;--padding-end:0}
.billing-dialog-body {padding:22px 25px;color:#1d385d}
.billing-progress {display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:20px}
.billing-progress span {padding:11px 8px;text-align:center;background:#f0f4fc;color:#788eac;border:1px solid #e0eafa;border-radius:11px;font-size:11px;font-weight:800}
.billing-progress .active {background:linear-gradient(105deg,#1a5bd1,#277fe6);border-color:#1a5bd1;color:#fff}
.billing-progress .done {background:#e1f5ed;color:#087f65;border-color:#b9e5d5}
.billing-lead h2 {font-size:18px;color:#183561;margin:0 0 6px}
.billing-lead p {font-size:12px;color:#7187a5;margin:0 0 16px}
.billing-lease-options {display:grid;gap:10px;max-height:290px;overflow-y:auto;padding:2px}
.billing-lease-option {display:flex;align-items:center;gap:11px;padding:13px;border:1px solid #e0e8f8;border-radius:14px;background:#fff;cursor:pointer;transition:background .2s,border-color .2s,transform .2s}
.billing-lease-option.selected {border-color:#4b8ce5;background:linear-gradient(120deg,#edf5ff,#fff);box-shadow:0 7px 16px rgba(25,87,183,.09)}
.billing-lease-option:hover {border-color:#91b8f0;transform:translateY(-1px)}
.billing-lease-option input {width:18px;height:18px;flex-shrink:0;accent-color:#1d62d6}
.billing-lease-avatar {width:37px;height:37px;flex-shrink:0;display:grid;place-items:center;border-radius:12px;background:linear-gradient(125deg,#1d5fd2,#459eea);color:#fff;font-weight:850}
.billing-lease-copy {min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}
.billing-lease-copy strong {font-size:13px;color:#183561}
.billing-lease-copy small {font-size:11px;color:#7890ae;overflow-wrap:anywhere}
.billing-lease-rent {font-size:12px;font-weight:850;color:#1459ba;white-space:nowrap;text-align:right}
.billing-lease-rent small {display:block;margin-top:4px;color:#8fa0b8;font-size:10px;font-weight:500}
.billing-selected-summary {display:flex;flex-direction:column;gap:5px;padding:15px;border-radius:13px;background:linear-gradient(115deg,#eaf3ff,#f4f9ff);border:1px solid #d9e8fc;margin-bottom:17px}
.billing-selected-summary span {font-size:10px;color:#6a83a8;font-weight:750;text-transform:uppercase}
.billing-selected-summary strong {font-size:14px;color:#163b75}
.billing-selected-summary small {font-size:11px;color:#587cad}
.billing-charge-form label {display:flex;flex-direction:column;gap:7px;font-weight:800;color:#3d587a;font-size:11px}
.billing-charge-form input {width:100%;height:43px;border-radius:11px;border:1px solid #d7e3f5;background:#fff;color:#193c70;padding:9px 11px;font-size:13px;color-scheme:light}
.billing-charge-form input:focus {outline:3px solid #c7dfff;border-color:#2576d9}
.billing-charge-form label small {font-size:10px;color:#8799b2;font-weight:500}
.billing-date-grid {display:grid;grid-template-columns:1fr 1fr;gap:12px}
.billing-subheading {font-size:12px;font-weight:850;color:#1d3f6d;margin:21px 0 11px}
.billing-charges-grid {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}
.billing-total-box {display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:20px;padding:16px;border-radius:13px;background:linear-gradient(112deg,#103f92,#1d70d9);color:#fff}
.billing-total-box span {font-size:12px;font-weight:700}
.billing-total-box span small {display:block;margin-top:5px;color:#cfe3ff;font-size:10px}
.billing-total-box strong {font-size:21px;color:#fff}
.billing-error {background:#fff2f2;color:#ae283a;padding:10px 12px;border-radius:10px;font-size:12px;margin:12px 0 0}
.billing-dialog-footer {display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:15px 25px 20px;border-top:1px solid #e4ebf7;background:#fbfdff}
.billing-dialog-footer .button {min-width:120px;min-height:43px}
@media(max-width:600px){:global(ion-modal.billing-workflow-modal){--width:calc(100% - 12px);--max-height:94%;--border-radius:16px}.billing-dialog-body{padding:17px}.billing-modal-toolbar{--min-height:79px}.billing-modal-heading strong{font-size:17px}.billing-lease-option{flex-wrap:wrap}.billing-lease-rent{margin-left:auto}.billing-date-grid{grid-template-columns:1fr}.billing-charges-grid{grid-template-columns:1fr 1fr}.billing-dialog-footer{padding:12px 15px calc(14px + env(safe-area-inset-bottom,0px))}.billing-dialog-footer .button{flex:1;min-width:0;padding-inline:8px;font-size:11px}}


/* Owner-specific rental notifications and lease preparation */
:global(ion-modal.owner-lease-modal) {--width:min(560px,calc(100% - 22px));--height:auto;--max-height:90%;--border-radius:23px;--box-shadow:0 30px 85px rgba(5,30,72,.25)}
:global(ion-modal.owner-notice-modal) {--width:min(425px,calc(100% - 26px));--height:auto;--max-height:85%;--border-radius:23px;--box-shadow:0 28px 76px rgba(5,30,72,.22)}
:global(ion-modal.owner-lease-modal::part(content)),:global(ion-modal.owner-notice-modal::part(content)){overflow-y:auto;background:#fff}
.lease-modal-shell,.owner-notice-shell{color:#17335c;background:#fff;font-family:Inter,'Segoe UI',sans-serif}
.lease-modal-hero,.owner-notice-hero{background:linear-gradient(120deg,#123d8f,#126dc6 62%,#12a4bd);color:#fff;position:relative;padding:26px 28px;display:flex;align-items:flex-start;justify-content:space-between;gap:15px;overflow:hidden}
.lease-modal-hero::after,.owner-notice-hero::after{content:'';position:absolute;width:210px;height:210px;border:25px solid rgba(255,255,255,.1);border-radius:50%;right:-100px;bottom:-150px;pointer-events:none}
.lease-modal-kicker,.owner-notice-kicker{font-size:10px;letter-spacing:1.4px;font-weight:850;color:#d7eeff}
.lease-modal-hero h2{font-size:23px;color:#fff;margin:10px 0 7px;line-height:1.2}
.lease-modal-hero p{color:#daedff;font-size:12px;line-height:1.6;margin:0;max-width:380px}
.lease-close{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:11px;min-width:36px;min-height:36px;font-size:19px;cursor:pointer}
.lease-modal-body{padding:23px 28px 26px;display:grid;gap:18px}
.lease-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.lease-summary>div{padding:13px;border:1px solid #dce8fb;border-radius:13px;background:linear-gradient(155deg,#fff,#f4f8ff)}
.lease-summary>div:last-child{grid-column:1 / -1}
.lease-summary span{display:block;font-size:9px;font-weight:800;letter-spacing:1px;color:#7b90ac;margin-bottom:7px}
.lease-summary strong{font-size:13px;color:#193a71;overflow-wrap:anywhere}
.lease-field{font-size:12px;font-weight:800;color:#274263;display:grid;gap:9px}
.lease-money-input{display:flex;align-items:center;gap:10px;border-radius:13px;border:1px solid #cfdef4;padding:0 14px;min-height:48px;background:#fff}
.lease-money-input:focus-within{outline:3px solid rgba(38,123,213,.16);border-color:#1878d6}
.lease-money-input>span{font-weight:800;color:#1c64b2}
.lease-money-input input{width:100%;min-width:0;border:0;background:transparent;outline:0;font-size:15px;padding:11px 0;color:#17335c}
.lease-helper{display:flex;align-items:flex-start;gap:10px;font-size:12px;line-height:1.65;color:#5f7492;padding:12px;border-radius:12px;background:#f0f6ff;margin:0}
.lease-helper ion-icon{font-size:17px;color:#2172cd;flex-shrink:0}
.lease-error{margin:0;padding:10px 12px;border-radius:10px;background:#fff1f2;color:#9f3039;font-size:12px}
.lease-modal-actions{display:flex;justify-content:flex-end;align-items:center;gap:10px;border-top:1px solid #e3ecf8;padding-top:16px}
.lease-modal-actions .button{min-width:120px}
.owner-notice-hero{display:flex;flex-direction:column;align-items:center;text-align:center;padding:24px 20px 18px;gap:14px}
.owner-notice-hero.notice-error{background:linear-gradient(120deg,#aa3552,#e16a69)}
.owner-notice-hero.notice-info{background:linear-gradient(120deg,#174994,#1595bd)}
.notice-symbol{display:grid;place-items:center;width:55px;height:55px;border:1px solid rgba(255,255,255,.32);border-radius:18px;background:rgba(255,255,255,.15);font-size:30px}
.owner-notice-body{text-align:center;padding:23px 26px 27px}
.owner-notice-body h2{font-size:20px;color:#153763;margin:0 0 10px}
.owner-notice-body p{color:#5e718c;font-size:13px;line-height:1.7;margin:0 0 22px;overflow-wrap:anywhere}
.owner-notice-ok{width:100%;min-height:45px}
@media(max-width:520px){.lease-modal-hero{padding:22px 18px}.lease-modal-body{padding:18px}.lease-summary{grid-template-columns:1fr}.lease-summary>div:last-child{grid-column:auto}.lease-modal-actions{flex-direction:column-reverse;align-items:stretch}.lease-modal-actions .button{width:100%}}

/* Consistent Ionic confirmation dialogs, including approval and payment review. */
:global(ion-alert.rentease-messagebox) {--background:#fff;--color:#1a365e;--backdrop-opacity:.52}
:global(ion-alert.rentease-messagebox .alert-wrapper) {border-radius:22px;overflow:hidden;box-shadow:0 25px 72px rgba(11,38,85,.26);background:#fff;min-width:min(390px,calc(100vw - 28px));max-width:calc(100vw - 28px)}
:global(ion-alert.rentease-messagebox .alert-head) {padding:22px 24px 14px;background:linear-gradient(115deg,#174caa,#187fc4)}
:global(ion-alert.rentease-messagebox .alert-title) {color:#fff;font-size:19px;font-weight:800}
:global(ion-alert.rentease-messagebox .alert-message) {padding:20px 24px 14px;color:#536c8b;font-size:13px;line-height:1.6;max-height:40vh}
:global(ion-alert.rentease-messagebox .alert-input-group) {padding:12px 24px}
:global(ion-alert.rentease-messagebox .alert-input) {border:1px solid #d5e3f7;border-radius:10px;padding:11px;color:#18375e;background:#fff}
:global(ion-alert.rentease-messagebox .alert-button-group) {padding:10px 18px 18px;gap:8px;justify-content:flex-end}
:global(ion-alert.rentease-messagebox .alert-button) {min-width:90px;min-height:40px;border-radius:10px;color:#185bb8;background:#eff5ff;font-weight:800;margin:0}
:global(ion-alert.rentease-messagebox .alert-button:last-child) {background:linear-gradient(115deg,#1c5ed1,#178bd1);color:#fff}
:global(ion-alert.rentease-messagebox .alert-button-inner) {justify-content:center}

/* Security deposit education and clear financial inputs */
.lease-deposit-explainer{padding:15px 17px;border:1px solid #c9dffc;border-radius:14px;background:linear-gradient(145deg,#f1f7ff,#f9fcff);color:#3c5679}
.deposit-explainer-heading{display:flex;align-items:center;gap:9px;font-size:13px;color:#174d96;margin-bottom:7px}
.deposit-explainer-heading ion-icon{font-size:20px;flex-shrink:0}
.lease-deposit-explainer p{margin:8px 0 0;font-size:12px;line-height:1.7}
.lease-deposit-explainer p strong{color:#1e477c}
.deposit-amount-hint{font-size:11px;line-height:1.6;font-weight:500;color:#647e9e}
@media(max-width:520px){.lease-deposit-explainer{padding:13px}}
</style>