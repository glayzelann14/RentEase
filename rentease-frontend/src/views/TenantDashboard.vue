<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { restoreSession, logout as logoutUser } from '@/services/auth';
import { listAvailableUnits, type RentalUnit } from '@/services/properties';
import { submitRentalApplication, listMyApplications, type RentalApplication } from '@/services/applications';
import { listMyLeases, confirmLease, type RentalLease } from '@/services/leases';
import { listMyBills, listMyPayments, submitBillPayment, type RentalBill, type RentalPayment } from '@/services/billing';
import { listMyDeposits, submitDepositPayment, type DepositMethod, type SecurityDepositPayment } from '@/services/deposits';
import { listMySettlements, type DepositSettlement } from '@/services/depositSettlements';
import { printDepositSettlement } from '@/services/printDepositSettlement';
import { getMyProfile, saveMyProfile } from '@/services/profile';
import { listMyMaintenance, createMaintenanceRequest, type RentalMaintenanceRequest, type MaintenancePriority } from '@/services/maintenance';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonModal, IonIcon } from '@ionic/vue';
import { gridOutline, documentTextOutline, cardOutline, constructOutline, personOutline, logOutOutline, homeOutline, searchOutline, paperPlaneOutline, locationOutline, arrowForwardOutline, timeOutline, informationCircleOutline, closeOutline, addOutline, walletOutline, keyOutline, shieldCheckmarkOutline, notificationsOutline, checkmarkCircleOutline, menuOutline, chevronForwardOutline, sparklesOutline } from 'ionicons/icons';

type Page = 'overview' | 'browse' | 'applications' | 'lease' | 'billing' | 'deposits' | 'maintenance' | 'profile';
type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type PaymentStatus = 'PENDING VERIFICATION' | 'VERIFIED' | 'REJECTED';
type MaintenanceStatus = 'PENDING' | 'IN PROGRESS' | 'COMPLETED';
interface Property { id: number; name: string; location: string; unit: string; monthlyRent: number; bedrooms: number; bathrooms: number; description: string; features: string[]; available: boolean; }
interface Application { id: number; propertyId: number; property: string; unit: string; moveIn: string; occupants: number; contact: string; message: string; submittedAt: string; status: ApplicationStatus; }
interface Lease { id: string; unitId: number; property: string; unit: string; rent: number; deposit: number; start: string; end: string; status: string; }
interface Bill { id: number; period: string; dueDate: string; rent: number; utilities: number; status: 'UNPAID' | 'PARTIALLY PAID' | 'PAID' | 'OVERDUE'; total:number;verified:number; }
interface Payment { id: number; billId: number; amount: number; method: string; reference: string; submittedAt: string; status: PaymentStatus; }
interface Maintenance { id: number; category: string; description: string; urgency: string; createdAt: string; status: MaintenanceStatus | 'ASSIGNED' | 'CANCELLED'; unitId: number; unit: string; }

const router = useRouter();
const section = ref<Page>('overview');
const loading = ref(true);
const sidebarOpen = ref(false);
const modal = ref<'apply' | 'payment' | 'deposit' | 'maintenance' | 'profile' | null>(null);
const selectedProperty = ref<Property | null>(null);
const selectedBillId = ref<number | null>(null);
const search = ref('');
const priceFilter = ref('all');
const profile = reactive({ name: '', email: '', mobile: '', avatar: '' });

// Available rentals are loaded from PostgreSQL through the authenticated API.
const properties = ref<Property[]>([]);
const catalogLoading = ref(false);
const catalogError = ref('');
const applicationsLoading = ref(false);
const applicationsError = ref('');
const submittingApplication = ref(false);
const leases = ref<Lease[]>([]);
const leaseLoading = ref(false);
const leaseError = ref('');
const confirmingLease = ref(false);
const leaseToConfirm = ref<Lease | null>(null);
const depositRecords = ref<SecurityDepositPayment[]>([]);
const mySettlements = ref<DepositSettlement[]>([]);
const settlementsLoading = ref(false);
const settlementsError = ref('');
async function refreshMySettlements() {
  if (settlementsLoading.value) return;
  settlementsLoading.value = true; settlementsError.value = '';
  try { mySettlements.value = await listMySettlements(); }
  catch(e: any) { settlementsError.value = e?.response?.data?.message || e?.message || 'Could not load settlement history.'; }
  finally { settlementsLoading.value = false; }
}

const depositsLoading = ref(false);
const depositsSaving = ref(false);
const depositsError = ref('');
const depositForm = reactive({ leaseId: 0, amount: '0.00', method: 'gcash' as DepositMethod, reference: '' });
const financeLoading=ref(false);
const financeSaving=ref(false);
const financeError=ref('');
const maintenanceLoading=ref(false);
const maintenanceSaving=ref(false);
const maintenanceError=ref('');

function mapRentalUnit(unit: RentalUnit): Property {
  const amenities = typeof unit.amenities === 'string'
    ? unit.amenities.split(',').map(item => item.trim()).filter(Boolean)
    : [];
  const bedrooms = Number(unit.bedrooms ?? 0);
  const address = [unit.address, unit.city].filter(Boolean).join(', ');
  const description = unit.unit_description || unit.description || 'Contact the property owner for more details.';
  return {
    id: Number(unit.unit_id), // Important: this is the actual unit ID, not the property ID.
    name: unit.property_name || `Property #${unit.property_id}`,
    location: address || 'Location not provided',
    unit: `Unit ${unit.unit_number}`,
    monthlyRent: Number(unit.monthly_rent),
    bedrooms,
    bathrooms: 0, // API does not currently return bathroom count; don't invent one.
    description,
    features: [...(unit.unit_type ? [unit.unit_type] : []), ...amenities],
    available: String(unit.status).toLowerCase() === 'available',
  };
}

async function refreshAvailableUnits() {
  if (catalogLoading.value) return;
  catalogLoading.value = true;
  catalogError.value = '';
  try {
    const units = await listAvailableUnits();
    properties.value = units
      .filter(unit => String(unit.status).toLowerCase() === 'available')
      .map(mapRentalUnit)
      .filter(unit => Number.isFinite(unit.id) && Number.isFinite(unit.monthlyRent));
  } catch (error) {
    console.error('[RentEase] Available units loading failed:', error);
    catalogError.value = error instanceof Error ? error.message : 'Could not load available rental units.';
    properties.value = [];
  } finally {
    catalogLoading.value = false;
  }
}

// Do not assign a hardcoded lease/bill to every newly registered tenant.
// These arrays remain empty until real tenant-specific API endpoints are connected.
const applications = ref<Application[]>([]);
const lease = ref<Lease | null>(null);
const bills = ref<Bill[]>([]);
const payments = ref<Payment[]>([]);
const maintenance = ref<Maintenance[]>([]);
const applyForm = reactive({ moveIn: '', durationMonths: 12, occupants: 1, contact: '', message: '' });
const paymentForm = reactive({ amount: 0, method: 'GCash', reference: '', proofName: '' });
const maintenanceForm = reactive({ unitId: 0, category: 'Plumbing', urgency: 'Normal', description: '' });
const profileForm = reactive({ name: '', mobile: '', avatar: '' });

const menu = [
  { id: 'overview' as Page, title: 'Dashboard Overview', icon: gridOutline },
  { id: 'browse' as Page, title: 'Browse Properties', icon: homeOutline },
  { id: 'applications' as Page, title: 'My Applications', icon: paperPlaneOutline },
  { id: 'lease' as Page, title: 'My Lease', icon: documentTextOutline },
  { id: 'billing' as Page, title: 'Billing & Payments', icon: cardOutline },
  { id: 'deposits' as Page, title: 'Security Deposits', icon: walletOutline },
  { id: 'maintenance' as Page, title: 'Maintenance Requests', icon: constructOutline },
  { id: 'profile' as Page, title: 'My Profile', icon: personOutline },
];
const titles: Record<Page, string> = {
  overview: 'My Rental Dashboard', browse: 'Find Your Next Home', applications: 'My Rental Applications',
  lease: 'My Lease Agreement', billing: 'Billing & Payments', deposits: 'Security Deposits', maintenance: 'Maintenance Requests', profile: 'My Profile',
};
const descriptions: Record<Page, string> = {
  overview: 'Your home search, applications, and rental activity in one place.',
  browse: 'Explore available rental units and compare your options.',
  applications: 'Review applications and track their approval status.',
  lease: 'Review the contract for your confirmed rental.',
  billing: 'View statements, submit payment details, and track verification.',
  deposits: 'Track and submit your refundable security deposit separately from monthly rent.',
  maintenance: 'Report property concerns and follow their repair status.',
  profile: 'Review your account details and contact information.',
};
const initials = computed(() => profile.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('') || 'TN');
const amountDue = computed(() => bills.value.reduce((sum,b)=>sum+Math.max(0,b.total-b.verified),0));
const openMaintenance = computed(() => maintenance.value.filter(item => item.status !== 'COMPLETED').length);
const pendingApplications = computed(() => applications.value.filter(item => item.status === 'PENDING').length);
const filteredProperties = computed(() => properties.value.filter(p => {
  const q = search.value.trim().toLowerCase();
  const textMatches = !q || `${p.name} ${p.location} ${p.unit}`.toLowerCase().includes(q);
  const priceMatches = priceFilter.value === 'all' || (priceFilter.value === 'budget' ? p.monthlyRent <= 8000 : p.monthlyRent > 8000);
  return p.available && textMatches && priceMatches;
}));
const hasLease = computed(() => lease.value?.status === 'ACTIVE');
// Billing history belongs to this authenticated tenant even after their lease is completed.
const hasBillingHistory = computed(() => bills.value.length > 0 || payments.value.length > 0);
function peso(n: number) { return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n); }
function statusClass(s: string) { if (['ACTIVE', 'APPROVED', 'PAID', 'VERIFIED', 'COMPLETED'].includes(s)) return 'success'; if (['REJECTED', 'OVERDUE'].includes(s)) return 'error'; return 'pending'; }
function navigate(page: Page) { section.value = page; sidebarOpen.value = false; if (page === 'browse') void refreshAvailableUnits(); if (page === 'applications') void refreshMyApplications(); if (page === 'lease') void refreshMyLeases(); if (page === 'billing') void refreshBilling(); if (page === 'deposits') { void refreshMyLeases(); void refreshMyDeposits(); void refreshMySettlements(); } if (page === 'maintenance') void refreshMyMaintenance(); }
type NoticeTone = 'success' | 'error' | 'info';
const notice = reactive({ open: false, title: '', message: '', tone: 'info' as NoticeTone });
let settleNotice: (() => void) | null = null;
function noticeTone(title: string): NoticeTone {
  if (/failed|unable|invalid|incomplete|not submitted|required|error|already|no active|more detail|select a lease/i.test(title)) return 'error';
  if (/submitted|activated|updated|saved|approved|confirmed/i.test(title)) return 'success';
  return 'info';
}
function dismissNotice() {
  notice.open = false;
  const resolve = settleNotice;
  settleNotice = null;
  resolve?.();
}
async function alertBox(title: string, message: string): Promise<void> {
  // Close the prior notification (if any), preventing dangling awaits.
  if (notice.open) dismissNotice();
  notice.title = title;
  notice.message = message;
  notice.tone = noticeTone(title);
  notice.open = true;
  return new Promise<void>(resolve => { settleNotice = resolve; });
}
function dateOnly(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}
function applicationDisplayDate(value: string | null | undefined): string {
  return dateOnly(value) || 'Not available';
}
function mapApplication(record: RentalApplication): Application {
  // The backend uses the unit_id as the unique rental selection.
  return {
    id: Number(record.application_id),
    propertyId: Number(record.unit_id),
    property: record.property_name || 'Rental Property',
    unit: `Unit ${record.unit_number}`,
    moveIn: applicationDisplayDate(record.move_in_date),
    occupants: Number(record.employment_details?.match(/Occupants:\s*(\d+)/i)?.[1] || 1),
    contact: record.contact_details || '',
    message: record.employment_details || '',
    submittedAt: `#${record.application_id}`,
    status: String(record.status || 'pending').toUpperCase() as ApplicationStatus,
  };
}
async function refreshMyApplications() {
  if (applicationsLoading.value) return;
  applicationsLoading.value = true;
  applicationsError.value = '';
  try {
    const records = await listMyApplications();
    applications.value = records.map(mapApplication);
  } catch (error) {
    console.error('[RentEase] Cannot load tenant applications:', error);
    applicationsError.value = error instanceof Error ? error.message : 'Unable to load applications.';
  } finally {
    applicationsLoading.value = false;
  }
}
function mapLease(row: RentalLease): Lease {
  return { id: String(row.lease_id), unitId: Number(row.unit_id), property: row.property_name, unit: `Unit ${row.unit_number}`,
    rent: Number(row.monthly_rent), deposit: Number(row.security_deposit || 0),
    start: String(row.start_date).slice(0,10), end: String(row.end_date).slice(0,10),
    status: String(row.status).toUpperCase() };
}
async function refreshMyLeases() {
  if (leaseLoading.value) return;
  leaseLoading.value = true;leaseError.value='';
  try {
    leases.value = (await listMyLeases()).map(mapLease);
    lease.value = leases.value.find(l => l.status === 'ACTIVE') || leases.value.find(l => l.status === 'PENDING') || null;
  } catch(error:any){leaseError.value=error?.response?.data?.message || error?.message || 'Could not load leases.';}
  finally{leaseLoading.value=false;}
}
function acceptLease(id: string) {
  if (confirmingLease.value) return;
  leaseToConfirm.value = leases.value.find(item => item.id === id && item.status === 'PENDING') || null;
  if (!leaseToConfirm.value) void alertBox('Agreement unavailable', 'Please refresh your lease agreements and try again.');
}
function cancelLeaseConfirmation() {
  if (!confirmingLease.value) leaseToConfirm.value = null;
}
async function confirmSelectedLease() {
  const selected = leaseToConfirm.value;
  if (!selected || confirmingLease.value) return;
  confirmingLease.value = true;
  try {
    await confirmLease(Number(selected.id));
    leaseToConfirm.value = null;
    await Promise.all([refreshMyLeases(), refreshAvailableUnits()]);
    await alertBox('Lease confirmed', 'Your rental agreement is now active. You can view your rental details and upcoming bills in your account.');
  } catch (error: any) {
    leaseToConfirm.value = null;
    await alertBox('Unable to confirm lease', error?.response?.data?.message || error?.message || 'Your lease could not be confirmed. Please try again.');
  } finally {
    confirmingLease.value = false;
  }
}
function openApplication(property: Property) {
  selectedProperty.value = property;
  Object.assign(applyForm, { moveIn: '', durationMonths: 12, occupants: 1, contact: profile.mobile || '', message: '' });
  modal.value = 'apply';
}
async function submitApplication() {
  if (submittingApplication.value) return;
  const unit = selectedProperty.value;
  if (!unit) return;
  const duration = Number(applyForm.durationMonths);
  const occupants = Number(applyForm.occupants);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(applyForm.moveIn) ||
      !Number.isInteger(duration) || duration < 1 || duration > 120 ||
      !Number.isInteger(occupants) || occupants < 1 || occupants > 20 ||
      !applyForm.contact.trim()) {
    await alertBox('Incomplete application', 'Enter a move-in date, lease duration (1–120 months), occupants (1–20), and contact details.');
    return;
  }
  if (applications.value.some(a => a.propertyId === unit.id && ['PENDING', 'APPROVED'].includes(a.status))) {
    await alertBox('Already applied', 'You already have a pending or approved application for this unit.');
    return;
  }
  submittingApplication.value = true;
  try {
    const optionalDetails = `Occupants: ${occupants}${applyForm.message.trim() ? `\nMessage: ${applyForm.message.trim()}` : ''}`;
    await submitRentalApplication({
      unit_id: unit.id,
      move_in_date: applyForm.moveIn,
      lease_duration_months: duration,
      contact_details: applyForm.contact.trim(),
      employment_details: optionalDetails,
    });
    modal.value = null;
    selectedProperty.value = null;
    await refreshMyApplications();
    navigate('applications');
    await alertBox('Application submitted', 'Your rental application has been sent to the property owner for review. You can track its status under My Applications.');
  } catch (error) {
    console.error('[RentEase] Failed to submit application:', error);
    const message = error instanceof Error ? error.message : 'Application could not be submitted.';
    await alertBox('Application not submitted', message);
  } finally {
    submittingApplication.value = false;
  }
}
function tenantBill(row:RentalBill):Bill{return {id:Number(row.bill_id),period:String(row.billing_period).slice(0,10),dueDate:String(row.due_date).slice(0,10),rent:Number(row.rent_amount),utilities:Number(row.water_charge||0)+Number(row.electricity_charge||0)+Number(row.other_charges||0),total:Number(row.total_amount),verified:Number(row.verified_amount),status:String(row.status).toUpperCase() as Bill['status']};}
function tenantPayment(row:RentalPayment):Payment{return {id:Number(row.payment_id),billId:Number(row.bill_id),amount:Number(row.amount),method:row.payment_method,reference:row.reference_number||'',submittedAt:String(row.payment_date).slice(0,10),status:(row.status==='pending_verification'?'PENDING VERIFICATION':String(row.status).toUpperCase()) as PaymentStatus};}
async function refreshMyDeposits() {
  if (depositsLoading.value) return;
  depositsLoading.value = true; depositsError.value = '';
  try { depositRecords.value = await listMyDeposits(); }
  catch (error: any) { depositsError.value = error?.response?.data?.message || error?.message || 'Unable to load your security deposits.'; }
  finally { depositsLoading.value = false; }
}
function depositPaid(leaseId: string) { return depositRecords.value.filter(d => String(d.lease_id) === leaseId && d.status === 'verified').reduce((s,d) => s + Number(d.amount), 0); }
function depositPending(leaseId: string) { return depositRecords.value.filter(d => String(d.lease_id) === leaseId && d.status === 'pending_verification').reduce((s,d) => s + Number(d.amount), 0); }
function depositRemaining(l: Lease) { return Math.max(0, Math.round((l.deposit - depositPaid(l.id) - depositPending(l.id)) * 100) / 100); }
function openDepositPayment(l: Lease) {
  if (!['ACTIVE', 'PENDING'].includes(l.status) || l.deposit <= 0 || depositRemaining(l) <= 0) return;
  depositForm.leaseId = Number(l.id); depositForm.amount = depositRemaining(l).toFixed(2); depositForm.method = 'gcash'; depositForm.reference = '';
  modal.value = 'deposit';
}
async function submitDeposit() {
  if (depositsSaving.value) return;
  const l = leases.value.find(x => Number(x.id) === depositForm.leaseId);
  const raw = String(depositForm.amount ?? '').trim();
  const amount = Number(raw);
  if (!l || !['ACTIVE', 'PENDING'].includes(l.status) || !/^\d+(?:\.\d{1,2})?$/.test(raw) || !Number.isFinite(amount) || amount <= 0 || amount > depositRemaining(l) || (!depositForm.reference.trim() && depositForm.method !== 'cash')) {
    await alertBox('Invalid deposit payment', 'Enter a valid amount within the remaining deposit balance and a reference for non-cash payments.'); return;
  }
  depositsSaving.value = true;
  try {
    await submitDepositPayment({lease_id: Number(l.id), amount, payment_method: depositForm.method, reference_number: depositForm.reference.trim()});
    modal.value = null;
    await refreshMyDeposits();
    await alertBox('Deposit submitted', 'Your security deposit submission is awaiting owner verification. This is separate from monthly rent.');
  } catch (error: any) {
    await alertBox('Deposit not submitted', error?.response?.data?.message || error?.message || 'Unable to submit deposit.');
  } finally { depositsSaving.value = false; }
}
async function refreshBilling(){if(financeLoading.value)return;financeLoading.value=true;financeError.value='';try{const [b,p]=await Promise.all([listMyBills(),listMyPayments()]);bills.value=b.map(tenantBill);payments.value=p.map(tenantPayment);}catch(e:any){financeError.value=e?.response?.data?.message||e?.message||'Unable to load billing records.';}finally{financeLoading.value=false;}}
function openPayment(bill: Bill) { selectedBillId.value = bill.id; paymentForm.amount = Math.max(0,bill.total-bill.verified); paymentForm.method = 'GCash'; paymentForm.reference = ''; paymentForm.proofName = ''; modal.value = 'payment'; }
function proofSelected(event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; paymentForm.proofName = file?.name ?? ''; }
async function submitPayment(){if(financeSaving.value||selectedBillId.value==null)return;const amount=Number(paymentForm.amount),method=paymentForm.method==='GCash'?'gcash':paymentForm.method==='Bank Transfer'?'bank_transfer':paymentForm.method==='Cash'?'cash':'other';if(!Number.isFinite(amount)||amount<=0||(!paymentForm.reference.trim()&&method!=='cash')){await alertBox('Invalid payment','Enter a positive amount and transaction reference.');return;}financeSaving.value=true;try{await submitBillPayment({bill_id:selectedBillId.value,amount,payment_method:method,reference_number:paymentForm.reference.trim()});modal.value=null;await refreshBilling();await alertBox('Payment submitted','Your payment details have been submitted for the property owners verification. Your balance will update after the payment is approved.');}catch(e:any){await alertBox('Submission failed',e?.response?.data?.message||e?.message||'Unable to submit payment.');}finally{financeSaving.value=false;}}
function mapTenantMaintenance(row:RentalMaintenanceRequest):Maintenance{return {id:Number(row.request_id),category:row.category||'General',description:row.problem_description,urgency:String(row.priority||'medium').toUpperCase(),createdAt:String(row.created_at).slice(0,10),status:String(row.status).toUpperCase().replaceAll('_',' ') as Maintenance['status'],unitId:Number(row.unit_id),unit:`${row.property_name} — Unit ${row.unit_number}`};}
async function refreshMyMaintenance(){if(maintenanceLoading.value)return;maintenanceLoading.value=true;maintenanceError.value='';try{maintenance.value=(await listMyMaintenance()).map(mapTenantMaintenance);}catch(e:any){maintenanceError.value=e?.response?.data?.message||e?.message||'Could not load maintenance requests.';}finally{maintenanceLoading.value=false;}}
async function submitMaintenance(){
 if(maintenanceSaving.value)return;
 const active=leases.value.filter(l=>l.status==='ACTIVE');
 const unit=active.find(l=>l.unitId===Number(maintenanceForm.unitId));
 if(!unit){await alertBox('Select a lease','Select the active rental agreement for the maintenance request.');return;}
 if(maintenanceForm.description.trim().length<10){await alertBox('More detail needed','Describe the problem in at least 10 characters.');return;}
 maintenanceSaving.value=true;
 try{await createMaintenanceRequest({unit_id:Number(maintenanceForm.unitId),category:maintenanceForm.category,priority:({Low:'low',Normal:'medium',High:'high',Urgent:'urgent'} as Record<string,MaintenancePriority>)[maintenanceForm.urgency]||'medium',problem_description:maintenanceForm.description.trim()});
  maintenanceForm.description='';modal.value=null;await refreshMyMaintenance();await alertBox('Request submitted','Your maintenance request has been sent to the property owner. You can track its progress under Maintenance Requests.');
 }catch(e:any){await alertBox('Submission failed',e?.response?.data?.message||e?.message||'Unable to submit maintenance request.');}
 finally{maintenanceSaving.value=false;}
}
function openMaintenanceForm(){const active=leases.value.find(l=>l.status==='ACTIVE');if(!active){void alertBox('No active lease','Maintenance requires an active rental.');return;}maintenanceForm.unitId=active.unitId;modal.value='maintenance';}

function openProfile() { profileForm.name = profile.name; profileForm.mobile = profile.mobile; profileForm.avatar = profile.avatar; modal.value = 'profile'; }
function uploadTenantAvatar(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    void alertBox('Invalid picture', 'Choose a JPG, PNG, or WebP image smaller than 2 MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => { profileForm.avatar = String(reader.result); };
  reader.onerror = () => { void alertBox('Image error', 'Could not read the selected picture.'); };
  reader.readAsDataURL(file);
}
async function saveProfile() {
  if (!profileForm.name.trim()) { await alertBox('Name required', 'Please enter your name.'); return; }
  try {
    const saved = await saveMyProfile(profileForm.name.trim(), profileForm.mobile.trim(), profileForm.avatar);
    profile.name = saved.name; profile.mobile = saved.mobile; profile.avatar = saved.avatar_url || profileForm.avatar; modal.value = null;
    await alertBox('Profile updated', 'Your profile has been updated successfully.');
  } catch (error: any) {
    await alertBox('Profile update failed', error?.response?.data?.message || error?.message || 'Could not save profile.');
  }
}
async function logout() { try { await logoutUser(); await router.replace('/login'); } catch { await alertBox('Logout failed', 'Please try again.'); } }
onMounted(async () => {
  try {
    const user = await restoreSession();
    if (!user) { await router.replace('/login'); return; }
    if (user.role !== 'tenant') { await router.replace(user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/login'); return; }
    profile.name = user.name || ''; profile.email = user.email || '';
    try { const saved = await getMyProfile(); profile.name = saved.name; profile.mobile = saved.mobile; profile.avatar = saved.avatar_url; } catch (error) { console.warn('Could not load profile contact:', error); }
    await Promise.all([refreshAvailableUnits(), refreshMyApplications(), refreshMyLeases(), refreshBilling(), refreshMyDeposits(), refreshMySettlements(), refreshMyMaintenance()]);
  } catch { await router.replace('/login'); } finally { loading.value = false; }
});
</script>

<template>
  <IonPage>
    <IonHeader>
      <IonToolbar class="topbar">
        <IonButtons slot="start" class="tenant-brand-controls">
          <button type="button" class="mobile-toggle" aria-label="Toggle tenant navigation" aria-controls="tenant-navigation" :aria-expanded="sidebarOpen" @click="sidebarOpen = !sidebarOpen"><IonIcon :icon="menuOutline" /></button>
          <span class="tenant-logo"><IonIcon :icon="homeOutline" /></span>
        </IonButtons>
        <IonTitle><span class="brand">RentEase</span><span class="brand-tag">TENANT PORTAL</span></IonTitle>
        <IonButtons slot="end" class="tenant-top-actions">
          <IonButton aria-label="My applications" @click="navigate('applications')"><IonIcon :icon="notificationsOutline" /><span v-if="pendingApplications" class="top-count">{{ pendingApplications }}</span></IonButton>
          <button type="button" class="tenant-header-avatar" aria-label="Open my profile" @click="navigate('profile')"><img v-if="profile.avatar" :src="profile.avatar" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:inherit" /><template v-else>{{ initials }}</template></button>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent class="portal">
      <div v-if="loading" class="loading">Loading tenant account...</div>
      <div v-else class="layout">
        <button v-if="sidebarOpen" type="button" class="tenant-backdrop" aria-label="Close navigation" @click="sidebarOpen = false"></button>
        <aside id="tenant-navigation" class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
          <div class="account" @click="navigate('profile')" role="button" tabindex="0" @keydown.enter="navigate('profile')"><div class="avatar">{{ initials }}</div><div class="account-name"><strong>{{ profile.name || 'Tenant' }}</strong><small>{{ hasLease ? `${lease?.property} · ${lease?.unit}` : 'Looking for a home' }}</small></div></div>
          <p class="nav-caption">YOUR WORKSPACE</p>
          <nav aria-label="Tenant navigation"><button v-for="item in menu" :key="item.id" :class="{ active: section === item.id }" @click="navigate(item.id)"><IonIcon :icon="item.icon" /><span>{{ item.title }}</span><span v-if="item.id === 'applications' && pendingApplications" class="nav-count">{{ pendingApplications }}</span></button></nav>
          <button type="button" class="tenant-logout" @click="logout"><IonIcon :icon="logOutOutline" /> <span>Logout</span><IonIcon :icon="chevronForwardOutline" /></button>
          <div class="sidebar-help"><IonIcon :icon="shieldCheckmarkOutline" /><strong>Your rental journey</strong><p>Find a place, settle in, and feel at home. Everything in one workspace.</p></div>
        </aside>
        <main class="workspace">
          <div class="page-heading"><div><p class="eyebrow">RENTEASE · TENANT EXPERIENCE</p><h1>{{ titles[section] }}</h1><p class="subtitle">{{ descriptions[section] }}</p></div><div class="heading-actions"><button v-if="section === 'overview' || section === 'browse'" class="btn primary" @click="navigate('browse')"><IonIcon :icon="searchOutline" />Browse Rentals</button><button v-if="section === 'maintenance' && hasLease" class="btn primary" @click="openMaintenanceForm"><IonIcon :icon="addOutline" />New Request</button><button v-if="section === 'profile'" class="btn primary" @click="openProfile"><IonIcon :icon="personOutline" />Edit Details</button></div></div>
          
          <template v-if="section === 'overview'">
            <section class="welcome"><div><span class="welcome-kicker"><IonIcon :icon="sparklesOutline" /> YOUR HOME, YOUR SPACE</span><h2>Hello, {{ profile.name.split(' ')[0] || 'there' }}!</h2><p>{{ hasLease ? 'Review your lease, outstanding bills, and property requests.' : 'Start by exploring available homes and applying for the unit that fits you.' }}</p><button class="btn light" @click="navigate(hasLease ? 'billing' : 'browse')">{{ hasLease ? 'Review Billing' : 'Explore Properties' }}<IonIcon :icon="arrowForwardOutline" /></button></div><IonIcon :icon="homeOutline" class="welcome-art" /></section>
            <div class="metrics"><article class="metric"><span class="metric-icon"><IonIcon :icon="homeOutline" /></span><small>My Rental</small><strong>{{ hasLease ? lease?.unit : 'Not assigned' }}</strong><p>{{ hasLease ? lease?.property : 'Explore available units' }}</p></article><article class="metric"><span class="metric-icon"><IonIcon :icon="paperPlaneOutline" /></span><small>My Applications</small><strong>{{ applications.length }}</strong><p>{{ pendingApplications }} awaiting owner review</p></article><article class="metric"><span class="metric-icon"><IonIcon :icon="walletOutline" /></span><small>Outstanding Balance</small><strong>{{ hasLease ? peso(amountDue) : '—' }}</strong><p>{{ hasLease ? 'Based on current statements' : 'Available with an active lease' }}</p></article><article class="metric"><span class="metric-icon"><IonIcon :icon="constructOutline" /></span><small>Open Maintenance</small><strong>{{ hasLease ? openMaintenance : '—' }}</strong><p>{{ hasLease ? 'Active requests' : 'Available after move-in' }}</p></article></div>
            <div class="two-columns"><section class="panel"><div class="panel-head"><div><h2>{{ hasLease ? 'Current Lease' : 'Get Started' }}</h2><p>{{ hasLease ? 'Your confirmed rental information' : 'Simple steps toward your next home' }}</p></div></div><template v-if="hasLease"><div class="info-line"><span>Property</span><strong>{{ lease?.property }}</strong></div><div class="info-line"><span>Unit</span><strong>{{ lease?.unit }}</strong></div><div class="info-line"><span>Monthly Rent</span><strong>{{ peso(lease?.rent || 0) }}</strong></div><button class="text-link" @click="navigate('lease')">View lease details <IonIcon :icon="arrowForwardOutline" /></button></template><div v-else class="steps"><div><b>1</b><span><strong>Explore units</strong><small>Browse properties that are available for rent.</small></span></div><div><b>2</b><span><strong>Apply online</strong><small>Fill in a rental application for your chosen unit.</small></span></div><div><b>3</b><span><strong>Wait for approval</strong><small>Owner reviews your application and prepares a lease.</small></span></div></div></section><section class="panel"><div class="panel-head"><div><h2>{{ applications.length ? 'Recent Applications' : 'Quick Access' }}</h2><p>{{ applications.length ? 'Your latest application activity' : 'Everything you need in one place' }}</p></div></div><div v-if="applications.length" class="application-mini" v-for="item in applications.slice(0, 3)" :key="item.id"><div><strong>{{ item.property }} — {{ item.unit }}</strong><small>Application #{{ item.id }}</small></div><span class="pill" :class="statusClass(item.status)">{{ item.status }}</span></div><div v-else class="quick-grid"><button @click="navigate('browse')"><IonIcon :icon="homeOutline" /><span>Find Rentals</span><IonIcon :icon="arrowForwardOutline" /></button><button @click="navigate('applications')"><IonIcon :icon="paperPlaneOutline" /><span>My Applications</span><IonIcon :icon="arrowForwardOutline" /></button><button @click="navigate('lease')"><IonIcon :icon="documentTextOutline" /><span>Lease Details</span><IonIcon :icon="arrowForwardOutline" /></button><button @click="navigate('profile')"><IonIcon :icon="personOutline" /><span>My Profile</span><IonIcon :icon="arrowForwardOutline" /></button></div></section></div>
          </template>

          <template v-else-if="section === 'browse'">
            <div v-if="catalogError" class="demo-notice" role="alert"><IonIcon :icon="informationCircleOutline" /><div><strong>Could not load available units</strong><span>{{ catalogError }}</span></div><button type="button" class="btn secondary" @click="refreshAvailableUnits">Retry</button></div>
            <div v-if="catalogLoading" class="loading">Loading available rental units...</div>
            <div class="filter-panel"><div class="searchbox"><IonIcon :icon="searchOutline" /><input v-model="search" aria-label="Search properties" placeholder="Search property, unit or location" /></div><select v-model="priceFilter" aria-label="Filter by rent"><option value="all">All monthly rents</option><option value="budget">₱8,000 and below</option><option value="premium">Above ₱8,000</option></select><span class="result-count">{{ filteredProperties.length }} units available</span><button type="button" class="btn secondary" :disabled="catalogLoading" @click="refreshAvailableUnits">Refresh</button></div><div v-if="!catalogLoading && !catalogError && filteredProperties.length" class="property-grid"><article v-for="property in filteredProperties" :key="property.id" class="property-card"><div class="property-visual"><IonIcon :icon="homeOutline" /><span class="availability">Available</span></div><div class="property-body"><p class="property-location"><IonIcon :icon="locationOutline" />{{ property.location }}</p><h2>{{ property.name }}</h2><p class="unit-name">{{ property.unit }} · {{ property.bedrooms }} bed<span v-if="property.bathrooms > 0"> · {{ property.bathrooms }} bath</span></p><p class="property-description">{{ property.description }}</p><div class="chips"><span v-for="feature in property.features" :key="feature">{{ feature }}</span></div><div class="property-bottom"><div><strong>{{ peso(property.monthlyRent) }}</strong><small>/month</small></div><button class="btn primary" @click="openApplication(property)">Apply for Unit <IonIcon :icon="arrowForwardOutline" /></button></div></div></article></div><div v-else-if="!catalogLoading && !catalogError" class="empty panel"><IonIcon :icon="searchOutline" /><h2>No units match your filters</h2><p>Try a different search or price range.</p><button class="btn secondary" @click="search = ''; priceFilter = 'all'">Clear Filters</button></div></template>

          <template v-else-if="section === 'applications'"><div v-if="applicationsError" class="demo-notice" role="alert"><IonIcon :icon="informationCircleOutline" /><div><strong>Unable to load applications</strong><span>{{ applicationsError }}</span></div><button type="button" class="btn secondary" @click="refreshMyApplications">Retry</button></div><div v-if="applicationsLoading" class="loading">Loading your saved applications...</div><button type="button" class="btn secondary" style="margin-bottom:16px" :disabled="applicationsLoading" @click="refreshMyApplications">Refresh applications</button><div class="section-overview"><div><strong>{{ applications.length }}</strong><span>Total applications</span></div><div><strong>{{ pendingApplications }}</strong><span>Pending review</span></div><div><strong>{{ applications.filter(a => a.status === 'APPROVED').length }}</strong><span>Approved</span></div></div><div v-if="applications.length" class="stack"><article v-for="app in applications" :key="app.id" class="panel"><div class="panel-head"><div><h2>{{ app.property }} — {{ app.unit }}</h2><p>Application #{{ app.id }}</p></div><span class="pill" :class="statusClass(app.status)">{{ app.status }}</span></div><div class="info-grid"><div><small>Preferred Move-in</small><strong>{{ app.moveIn }}</strong></div><div><small>Occupants</small><strong>{{ app.occupants }}</strong></div><div><small>Contact</small><strong>{{ app.contact }}</strong></div></div><div class="inline-note"><IonIcon :icon="timeOutline" />{{ app.status === 'PENDING' ? 'Awaiting owner review. An approved application does not automatically activate a lease.' : 'Check with the property owner for the next steps.' }}</div></article></div><div v-else class="empty panel"><IonIcon :icon="paperPlaneOutline" /><h2>No rental applications yet</h2><p>Browse available units and apply to start your rental journey.</p><button class="btn primary" @click="navigate('browse')">Browse Properties</button></div></template>

          <template v-else-if="section === 'lease'">
            <div v-if="leaseError" class="demo-notice" role="alert"><IonIcon :icon="informationCircleOutline" /><div><strong>Unable to load leases</strong><span>{{ leaseError }}</span></div></div>
            <div v-if="leaseLoading" class="loading">Loading lease records...</div>
            <button type="button" class="btn secondary" style="margin-bottom:16px" :disabled="leaseLoading" @click="refreshMyLeases">Refresh Leases</button>
            <div v-if="leases.length" class="stack">
              <article v-for="item in leases" :key="item.id" class="panel">
                <div class="panel-head"><div><h2>Lease #{{ item.id }} — {{ item.property }}</h2><p>{{ item.unit }}</p></div><span class="pill" :class="statusClass(item.status)">{{ item.status }}</span></div>
                <div class="info-grid"><div><small>Monthly Rent</small><strong>{{ peso(item.rent) }}</strong></div><div><small>Security Deposit</small><strong>{{ peso(item.deposit) }}</strong></div><div><small>Start Date</small><strong>{{ item.start }}</strong></div><div><small>End Date</small><strong>{{ item.end }}</strong></div></div>
                <div v-if="item.status === 'PENDING'" class="inline-note"><IonIcon :icon="informationCircleOutline" />The owner has prepared this lease. Review its terms, including rent, deposit, and dates, before confirmation.</div>
                <button v-if="item.status === 'PENDING'" class="btn primary" style="margin-top:16px" :disabled="confirmingLease" @click="acceptLease(item.id)">{{ confirmingLease ? 'Confirming...' : 'Confirm Lease Agreement' }}</button>
                <div v-else class="inline-note"><IonIcon :icon="informationCircleOutline" />{{ item.status === 'ACTIVE' ? 'Your rental agreement is active.' : 'This lease has ended.' }} For a signed copy of your lease agreement, please coordinate with the property owner.</div>
              </article>
            </div>
            <div v-else-if="!leaseLoading && !leaseError" class="empty panel"><IonIcon :icon="keyOutline" /><h2>No lease agreement yet</h2><p>When the owner prepares a lease for your approved application, you can review it here.</p><button class="btn primary" @click="navigate('applications')">View Applications</button></div>
          </template>

          <template v-else-if="section === 'billing'"><div v-if="financeError" class="demo-notice">{{ financeError }}</div><button type="button" class="btn secondary" style="margin-bottom:15px" :disabled="financeLoading" @click="refreshBilling">Refresh Billing & Payments</button><template v-if="hasLease || hasBillingHistory"><div v-if="!hasLease" class="inline-note" role="status"><IonIcon :icon="informationCircleOutline" />Your lease is no longer active. You can still review previous bills, outstanding balances, and payment records. New monthly bills require an active lease.</div><div class="metrics billing-metrics"><article class="metric"><small>Outstanding Balance</small><strong>{{ peso(amountDue) }}</strong><p>Across unpaid statements</p></article><article class="metric"><small>Billing Records</small><strong>{{ bills.length }}</strong><p>Statements on file</p></article><article class="metric"><small>Pending Payments</small><strong>{{ payments.filter(p => p.status === 'PENDING VERIFICATION').length }}</strong><p>Awaiting verification</p></article></div><section class="panel"><div class="panel-head"><div><h2>My Statements</h2><p>Only owner-issued bills appear here.</p></div></div><div v-if="bills.length" class="table-wrap"><table><thead><tr><th>Period</th><th>Due Date</th><th>Rent</th><th>Utilities</th><th>Total</th><th>Status</th><th>Action</th></tr></thead><tbody><tr v-for="bill in bills" :key="bill.id"><td>{{ bill.period }}</td><td>{{ bill.dueDate }}</td><td>{{ peso(bill.rent) }}</td><td>{{ peso(bill.utilities) }}</td><td><strong>{{ peso(bill.total) }}</strong></td><td><span class="pill" :class="statusClass(bill.status)">{{ bill.status }}</span></td><td><button v-if="bill.total-bill.verified>0.001" class="btn small secondary" @click="openPayment(bill)">Submit Payment</button><span v-else>—</span></td></tr></tbody></table></div><div v-else class="empty compact"><IonIcon :icon="cardOutline" /><h2>No statements yet</h2><p>Billing records will appear when your property owner issues a statement.</p></div></section><section class="panel spaced"><div class="panel-head"><div><h2>Payment Submissions</h2><p>Submitted does not mean verified or paid.</p></div></div><div v-if="payments.length" class="table-wrap"><table><thead><tr><th>Reference</th><th>Amount</th><th>Method</th><th>Submitted</th><th>Status</th></tr></thead><tbody><tr v-for="payment in payments" :key="payment.id"><td>{{ payment.reference }}</td><td>{{ peso(payment.amount) }}</td><td>{{ payment.method }}</td><td>{{ payment.submittedAt }}</td><td><span class="pill" :class="statusClass(payment.status)">{{ payment.status }}</span></td></tr></tbody></table></div><div v-else class="empty compact"><IonIcon :icon="walletOutline" /><h2>No payments submitted</h2><p>Once a statement is issued, you can submit transaction details for owner verification.</p></div></section></template><div v-else class="empty panel"><IonIcon :icon="walletOutline" /><h2>No billing records yet</h2><p>Monthly statements will appear after your lease becomes active and the property owner issues a bill. Any past statements and payments will remain available here after your lease ends.</p><button class="btn primary" @click="navigate('applications')">View Applications</button></div></template>

          <template v-else-if="section === 'deposits'">
            <div v-if="depositsError" class="demo-notice" role="alert">{{ depositsError }}</div>
            <button type="button" class="btn secondary" style="margin-bottom:15px" :disabled="depositsLoading" @click="refreshMyDeposits">{{ depositsLoading ? 'Loading...' : 'Refresh Security Deposits' }}</button>
            <section class="panel"><div class="panel-head"><div><h2>My Security Deposits</h2><p>Deposits are separate from rental bills. Only verified submissions count as collected.</p></div></div>
              <div v-if="leases.length" class="deposit-lease-grid"><article v-for="l in leases" :key="l.id" class="deposit-lease-card"><div class="panel-head"><div><h2>{{ l.property }} — {{ l.unit }}</h2><p>Lease #{{ l.id }} · {{ l.status }}</p></div><span class="pill" :class="statusClass(l.status)">{{ l.status }}</span></div>
                <div class="info-grid"><div><small>Required deposit</small><strong>{{ peso(l.deposit) }}</strong></div><div><small>Verified received</small><strong>{{ peso(depositPaid(l.id)) }}</strong></div><div><small>Awaiting verification</small><strong>{{ peso(depositPending(l.id)) }}</strong></div><div><small>Remaining to submit</small><strong>{{ peso(depositRemaining(l)) }}</strong></div></div>
                <button v-if="['ACTIVE','PENDING'].includes(l.status) && depositRemaining(l) > 0" type="button" class="btn primary" :disabled="depositsSaving" @click="openDepositPayment(l)">Submit Deposit Payment</button><p v-else class="inline-note">{{ l.deposit <= 0 ? 'No security deposit was required for this lease.' : l.status === 'COMPLETED' ? 'Deposit collection is closed for this completed lease.' : 'There is no remaining deposit amount available for submission.' }}</p>
              </article></div><div v-else class="empty compact"><h2>No lease agreements yet</h2><p>Security deposit amounts appear after the owner prepares a lease.</p></div>
            </section>
            <section class="panel spaced"><div class="panel-head"><div><h2>Deposit Submission History</h2><p>Only the property owner can verify payment. Rejected submissions do not count toward the paid balance.</p></div></div>
              <div v-if="depositRecords.length" class="table-wrap"><table><thead><tr><th>Lease</th><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status / Reason</th></tr></thead><tbody><tr v-for="d in depositRecords" :key="d.deposit_payment_id"><td>#{{ d.lease_id }} — {{ d.property_name }} / {{ d.unit_number }}</td><td>{{ String(d.submitted_at).slice(0,10) }}</td><td>{{ peso(Number(d.amount)) }}</td><td>{{ d.payment_method }}</td><td>{{ d.reference_number || 'Cash' }}</td><td><span class="pill" :class="statusClass(d.status === 'verified' ? 'VERIFIED' : d.status === 'rejected' ? 'REJECTED' : 'PENDING')">{{ d.status.replaceAll('_',' ').toUpperCase() }}</span><p v-if="d.rejection_reason">{{ d.rejection_reason }}</p></td></tr></tbody></table></div><div v-else class="empty compact"><h2>No deposit payments submitted</h2><p>Your security deposit payments will appear here after submission.</p></div>
            </section>
            <section class="panel spaced" aria-label="Security Deposit Settlement History">
              <div class="panel-head"><div><h2>Deposit Deductions & Refunds</h2><p>Review finalized settlement amounts, itemized deductions, and confirmed refund payouts. Drafts are visible only to the owner.</p></div><button class="btn secondary" type="button" :disabled="settlementsLoading" @click="refreshMySettlements">{{ settlementsLoading ? 'Loading...' : 'Refresh' }}</button></div>
              <p v-if="settlementsError" class="inline-note" role="alert">{{ settlementsError }}</p>
              <div v-for="s in mySettlements" :key="s.settlement_id" class="panel" style="margin:12px 0; padding:18px">
                <div class="panel-head"><div><h3>Lease #{{ s.lease_id }} — {{ s.property_name }}</h3><p>Unit {{ s.unit_number }} · Settlement #{{ s.settlement_id }}</p></div><span class="pill" :class="statusClass(s.status === 'settled' ? 'COMPLETED' : 'PENDING')">{{ s.status.toUpperCase() }}</span></div>
                <button type="button" class="btn secondary" style="margin:10px 0" @click="printDepositSettlement(s)">Print Settlement Statement</button>
                <div class="info-grid"><div><small>Verified collection</small><strong>{{ peso(Number(s.summary.verified_deposit)) }}</strong></div><div><small>Total deductions</small><strong>{{ peso(Number(s.summary.total_deductions)) }}</strong></div><div><small>Refundable amount</small><strong>{{ peso(Number(s.summary.refundable_amount)) }}</strong></div><div><small>Confirmed refunds</small><strong>{{ peso(Number(s.summary.confirmed_refunds)) }}</strong></div><div><small>Remaining refund</small><strong>{{ peso(Number(s.summary.remaining_refund)) }}</strong></div></div>
                <h4>Itemized Deductions</h4><div v-for="d in s.deductions" :key="d.deduction_id" class="info-line"><span>{{ d.description }}<small v-if="d.evidence_note"> — {{ d.evidence_note }}</small></span><strong>{{ peso(Number(d.amount)) }}</strong></div><p v-if="!s.deductions.length" class="inline-note">No deductions recorded.</p>
                <h4>Refund History</h4><div v-for="r in s.refunds" :key="r.refund_id" class="info-line"><span>{{ r.payment_method }} · {{ r.status.toUpperCase() }}<small v-if="r.reference_number"> · {{ r.reference_number }}</small></span><strong>{{ peso(Number(r.amount)) }}</strong></div><p v-if="!s.refunds.length" class="inline-note">No refund transactions yet.</p>
                <div class="inline-note"><IonIcon :icon="informationCircleOutline" />Pending refund records are not proof of payout. Contact the property owner about a disputed deduction or refund.</div>
              </div><div v-if="!mySettlements.length" class="empty compact"><h2>No finalized settlements yet</h2><p>Finalized settlement details will appear here after your lease is completed and the owner closes the deposit account.</p></div>
            </section>
          </template>
          <template v-else-if="section === 'maintenance'"><div v-if="maintenanceError" class="demo-notice" role="alert">{{ maintenanceError }}</div><button type="button" class="btn secondary" style="margin-bottom:14px" :disabled="maintenanceLoading" @click="refreshMyMaintenance">Refresh Maintenance</button><template v-if="hasLease"><div v-if="maintenance.length" class="request-grid"><article v-for="item in maintenance" :key="item.id" class="panel"><div class="panel-head"><div><h2>{{ item.category }}</h2><p>Request #{{ item.id }} · {{ item.createdAt }}</p></div><span class="pill" :class="statusClass(item.status)">{{ item.status }}</span></div><p>{{ item.description }}</p><div class="inline-note">{{ item.unit }} · Priority: {{ item.urgency }}</div></article></div><div v-else class="empty panel"><IonIcon :icon="constructOutline" /><h2>No maintenance requests</h2><p>Something needs repair? Submit a request and follow its status here.</p><button class="btn primary" @click="openMaintenanceForm">Report an Issue</button></div></template><div v-else class="empty panel"><IonIcon :icon="constructOutline" /><h2>No assigned rental unit</h2><p>Maintenance requests are for tenants with an active lease. Once your move-in is confirmed, this section will be available.</p><button class="btn secondary" @click="navigate('browse')">Find a Rental</button></div></template>

          <template v-else-if="section === 'profile'"><div class="profile-grid"><section class="panel profile-card"><div class="profile-avatar" style="overflow:hidden"><img v-if="profile.avatar" :src="profile.avatar" alt="Tenant profile" style="width:100%;height:100%;object-fit:cover" /><template v-else>{{ initials }}</template></div><h2>{{ profile.name || 'Tenant' }}</h2><p>{{ profile.email }}</p><span class="pill success">TENANT ACCOUNT</span><button class="btn secondary full" @click="openProfile">Edit Contact Details</button></section><section class="panel"><div class="panel-head"><div><h2>Account Information</h2><p>Information linked to your signed-in account</p></div></div><div class="info-line"><span>Full Name</span><strong>{{ profile.name || 'Not available' }}</strong></div><div class="info-line"><span>Email Address</span><strong>{{ profile.email || 'Not available' }}</strong></div><div class="info-line"><span>Phone Number</span><strong>{{ profile.mobile || 'Not provided' }}</strong></div><div class="info-line"><span>Account Role</span><strong>Tenant</strong></div><div class="info-line"><span>Assigned Unit</span><strong>{{ hasLease ? `${lease?.property}, ${lease?.unit}` : 'None yet' }}</strong></div><div class="inline-note"><IonIcon :icon="shieldCheckmarkOutline" />Your name and mobile number are saved to your account. Email changes require administrator assistance.</div></section></div></template>
          <footer>RentEase Tenant Portal <span>Find a place. Feel at home.</span></footer>
        </main>
      </div>
    </IonContent>

    <!-- Rental agreement confirmation: a readable, tenant-focused dialog -->
    <IonModal :is-open="leaseToConfirm !== null" css-class="tenant-lease-confirm" :backdrop-dismiss="!confirmingLease" @didDismiss="cancelLeaseConfirmation">
      <div class="lease-confirm-shell" role="dialog" aria-modal="true" aria-label="Confirm lease agreement">
        <div class="lease-confirm-hero">
          <div class="lease-confirm-kicker"><IonIcon :icon="homeOutline" /> RENTEASE · RENTAL AGREEMENT</div>
          <div class="lease-confirm-heading">
            <span class="lease-confirm-icon"><IonIcon :icon="documentTextOutline" /></span>
            <div><h2>Confirm your lease</h2><p>Review the rental terms before accepting your agreement.</p></div>
          </div>
        </div>
        <div class="lease-confirm-body" v-if="leaseToConfirm">
          <div class="lease-confirm-property"><span>YOUR NEW RENTAL</span><strong>{{ leaseToConfirm.property }}</strong><small>{{ leaseToConfirm.unit }} · Lease #{{ leaseToConfirm.id }}</small></div>
          <div class="lease-confirm-grid">
            <div><span>Monthly rent</span><strong>{{ peso(leaseToConfirm.rent) }}</strong></div>
            <div><span>Security deposit</span><strong>{{ peso(leaseToConfirm.deposit) }}</strong></div>
            <div><span>Lease begins</span><strong>{{ leaseToConfirm.start }}</strong></div>
            <div><span>Lease ends</span><strong>{{ leaseToConfirm.end }}</strong></div>
          </div>
          <div class="lease-confirm-note"><IonIcon :icon="informationCircleOutline" /><p>By confirming, you accept the rental terms shown above. Your lease becomes active, and the unit is reserved as occupied.</p></div>
          <div class="lease-confirm-actions">
            <button type="button" class="btn secondary" :disabled="confirmingLease" @click="cancelLeaseConfirmation">Review Later</button>
            <button type="button" class="btn primary" :disabled="confirmingLease" @click="confirmSelectedLease"><IonIcon :icon="shieldCheckmarkOutline" />{{ confirmingLease ? 'Confirming...' : 'Accept & Confirm Lease' }}</button>
          </div>
        </div>
      </div>
    </IonModal>

    <!-- Branded notifications: instead of the default dark Ionic alert -->
    <IonModal
      :is-open="notice.open"
      css-class="tenant-notification"
      :backdrop-dismiss="false"
      @didDismiss="dismissNotice"
    >
      <div class="notice-shell" role="alertdialog" aria-modal="true" :aria-label="notice.title">
        <div class="notice-hero" :class="'notice-' + notice.tone">
          <div class="notice-brand"><IonIcon :icon="homeOutline" /> <span>RentEase · TENANT PORTAL</span></div>
          <span class="notice-icon"><IonIcon :icon="notice.tone === 'success' ? checkmarkCircleOutline : notice.tone === 'error' ? informationCircleOutline : notificationsOutline" /></span>
          <div class="notice-orbit"></div>
        </div>
        <div class="notice-content">
          <span class="notice-eyebrow">{{ notice.tone === 'success' ? 'ACTION COMPLETED' : notice.tone === 'error' ? 'NEEDS ATTENTION' : 'RENTEASE UPDATE' }}</span>
          <h2>{{ notice.title }}</h2>
          <p>{{ notice.message }}</p>
          <div class="notice-footer"><button type="button" class="btn primary notice-confirm" @click="dismissNotice">Got it <IonIcon :icon="arrowForwardOutline" /></button></div>
        </div>
      </div>
    </IonModal>

    <IonModal :is-open="modal !== null" css-class="tenant-dialog" @didDismiss="modal = null"><IonHeader><IonToolbar class="modal-toolbar"><IonTitle>{{ modal === 'apply' ? 'Apply for Rental' : modal === 'payment' ? 'Submit Payment' : modal === 'deposit' ? 'Submit Security Deposit' : modal === 'maintenance' ? 'New Maintenance Request' : 'Edit Contact Details' }}</IonTitle><IonButtons slot="end"><IonButton aria-label="Close" @click="modal = null"><IonIcon :icon="closeOutline" /></IonButton></IonButtons></IonToolbar></IonHeader><IonContent class="modal-content"><div class="form-body">
      <form v-if="modal === 'apply' && selectedProperty" @submit.prevent="submitApplication"><div class="form-summary"><strong>{{ selectedProperty.name }} — {{ selectedProperty.unit }}</strong><span>{{ peso(selectedProperty.monthlyRent) }}/month · {{ selectedProperty.location }}</span></div><label>Preferred Move-in Date <input v-model="applyForm.moveIn" type="date" required /></label><label>Lease Duration (Months) <input v-model.number="applyForm.durationMonths" type="number" min="1" max="120" required /></label><label>Number of Occupants <input v-model.number="applyForm.occupants" type="number" min="1" max="20" required /></label><label>Contact Number <input v-model="applyForm.contact" type="tel" placeholder="e.g. 09XXXXXXXXX" required /></label><label>Message to Owner (Optional) <textarea v-model="applyForm.message" rows="4" placeholder="Introduce yourself or ask questions about the unit"></textarea></label><p class="form-note">Your application will be sent to the property owner for review. An agreement will be prepared if your application is approved.</p><div class="form-actions"><button type="button" class="btn secondary" @click="modal = null">Cancel</button><button type="submit" class="btn primary" :disabled="submittingApplication">{{ submittingApplication ? 'Submitting...' : 'Submit Application' }}</button></div></form>
      <form v-else-if="modal === 'payment'" @submit.prevent="submitPayment"><label>Amount Paid (PHP) <input v-model.number="paymentForm.amount" type="number" min="0.01" step="0.01" required /></label><label>Payment Method <select v-model="paymentForm.method"><option>GCash</option><option>Maya</option><option>Bank Transfer</option><option>Cash</option></select></label><label>Reference / Receipt Number <input v-model="paymentForm.reference" type="text" minlength="5" required placeholder="Enter transaction reference" /></label><p class="form-note">Enter your payment details accurately. The property owner will verify your submission before your balance is updated.</p><div class="form-actions"><button type="button" class="btn secondary" @click="modal = null">Cancel</button><button type="submit" class="btn primary" :disabled="financeSaving">{{ financeSaving ? 'Submitting...' : 'Submit for Verification' }}</button></div></form>
      <form v-else-if="modal === 'deposit'" @submit.prevent="submitDeposit">
        <div class="form-summary"><strong>Security Deposit — Lease #{{ depositForm.leaseId }}</strong><span>This transaction is not a monthly rent payment.</span></div>
        <label>Deposit amount (PHP)<input v-model="depositForm.amount" type="number" min="0.01" step="0.01" required /></label>
        <label>Payment method<select v-model="depositForm.method"><option value="gcash">GCash</option><option value="bank_transfer">Bank Transfer</option><option value="cash">Cash</option><option value="other">Other</option></select></label>
        <label>Transaction reference<input v-model="depositForm.reference" type="text" maxlength="150" :required="depositForm.method !== 'cash'" placeholder="Receipt / transaction reference" /></label>
        <p class="form-note">Submitting a reference does not mean your deposit has been received. The owner must verify actual payment.</p>
        <div class="form-actions"><button type="button" class="btn secondary" :disabled="depositsSaving" @click="modal = null">Cancel</button><button type="submit" class="btn primary" :disabled="depositsSaving">{{ depositsSaving ? 'Submitting...' : 'Submit for Verification' }}</button></div>
      </form>
      <form v-else-if="modal === 'maintenance'" @submit.prevent="submitMaintenance"><label>Active Rental Unit<select v-model.number="maintenanceForm.unitId" required><option v-for="l in leases.filter(x => x.status === 'ACTIVE')" :key="l.id" :value="l.unitId">{{ l.property }} — {{ l.unit }}</option></select></label><label>Issue Category <select v-model="maintenanceForm.category"><option>Plumbing</option><option>Electrical</option><option>Appliance / Fixture</option><option>General</option></select></label><label>Urgency <select v-model="maintenanceForm.urgency"><option>Low</option><option>Normal</option><option>High</option><option>Urgent</option></select></label><label>Problem Description <textarea v-model="maintenanceForm.description" minlength="10" rows="5" required placeholder="Describe the issue and affected area"></textarea></label><p class="form-note">Your request will be sent to the property owner for review.</p><div class="form-actions"><button type="button" class="btn secondary" @click="modal = null">Cancel</button><button type="submit" class="btn primary" :disabled="maintenanceSaving">{{ maintenanceSaving ? 'Submitting...' : 'Submit Request' }}</button></div></form>
      <form v-else-if="modal === 'profile'" @submit.prevent="saveProfile"><label>Full Name <input v-model="profileForm.name" required /></label><label>Phone Number <input v-model="profileForm.mobile" type="tel" placeholder="09XXXXXXXXX" /></label><label>Profile Picture <input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadTenantAvatar" /></label><img v-if="profileForm.avatar" :src="profileForm.avatar" alt="Selected profile picture" style="width:75px;height:75px;border-radius:15px;object-fit:cover" /><div class="form-note">JPG, PNG or WebP. Maximum 2 MB.</div><div class="form-note">Email: {{ profile.email }} (read-only). Name and mobile number will be saved to your account.</div><div class="form-actions"><button type="button" class="btn secondary" @click="modal = null">Cancel</button><button type="submit" class="btn primary">Save Profile</button></div></form>
    </div></IonContent></IonModal>
  </IonPage>
</template>

<style scoped>
.deposit-lease-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,350px),1fr));gap:14px}.deposit-lease-card{padding:18px;border:1px solid #dae6f8;border-radius:14px;background:#f7faff}.deposit-lease-card .info-grid{margin:15px 0}

.portal,.modal-content{--background:#f5f7fb;color:#182d48;color-scheme:light;--ion-text-color:#182d48;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.topbar{--background:#142b49;--color:white;--min-height:64px;padding-inline:15px}.topbar ion-button{--color:white}.topbar ion-title{padding-inline:10px}.brand{color:white;font-weight:850;font-size:23px;letter-spacing:-.9px}.brand-tag{color:#b8cce1;font-size:10px;letter-spacing:1.3px;margin-left:16px;font-weight:700}.logout-label{font-size:12px;margin-left:7px}.top-count,.nav-count{border-radius:30px;background:#e2f5ef;color:#067366;font-size:10px;font-weight:800;padding:3px 7px;margin-left:5px}.mobile-toggle{display:none}.layout{display:grid;grid-template-columns:258px minmax(0,1fr);min-height:100%}.sidebar{background:#fff;border-right:1px solid #e1e8f0;padding:28px 17px;display:flex;flex-direction:column;gap:0}.account{display:flex;align-items:center;gap:12px;border-bottom:1px solid #e8edf3;padding:0 5px 24px;cursor:pointer}.avatar,.profile-avatar{display:grid;place-items:center;flex-shrink:0;width:46px;height:46px;border-radius:14px;background:#e4f5f0;color:#08756d;font-weight:800}.account-name{min-width:0}.account-name strong,.account-name small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.account-name strong{font-size:13px}.account-name small{color:#75869a;font-size:11px;margin-top:5px}.nav-caption{font-size:10px;font-weight:800;letter-spacing:1.7px;color:#8b9aae;margin:26px 13px 12px}.sidebar nav{display:grid;gap:5px}.sidebar nav button{width:100%;display:flex;align-items:center;gap:11px;background:transparent;border:1px solid transparent;color:#607187;min-height:45px;padding:11px 12px;border-radius:11px;text-align:left;font-size:12px;font-weight:600;cursor:pointer;transition:.18s}.sidebar nav button ion-icon{font-size:19px}.sidebar nav button span:nth-child(2){flex:1}.sidebar nav button:hover{background:#f1f6f8;color:#142b49}.sidebar nav button.active{background:#e5f4f0;color:#08766e;border-color:#d3ebe4;font-weight:800}.sidebar-help{margin-top:auto;background:#f4f7fb;padding:17px;border-radius:13px;display:grid;gap:7px}.sidebar-help ion-icon{font-size:22px;color:#08766e}.sidebar-help strong{font-size:12px}.sidebar-help p{font-size:11px;color:#6f7f93;line-height:1.6;margin:0}.workspace{min-width:0;padding:clamp(20px,2.8vw,40px)}.page-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:20px;flex-wrap:wrap}.eyebrow{font-size:10px;font-weight:850;letter-spacing:1.8px;color:#08766e;margin:0 0 10px}h1{font-size:clamp(25px,2.3vw,36px);margin:0;color:#172e4c;letter-spacing:-.9px;font-weight:850}.subtitle{color:#667991;font-size:13px;line-height:1.65;margin:8px 0 0}.heading-actions{display:flex;gap:9px}.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid transparent;padding:11px 16px;border-radius:10px;font-size:12px;font-weight:750;min-height:42px;cursor:pointer;transition:transform .2s,box-shadow .2s,background .2s;white-space:nowrap}.btn ion-icon{font-size:16px}.btn:hover{transform:translateY(-1px)}.btn:focus-visible,.sidebar button:focus-visible,.quick-grid button:focus-visible{outline:3px solid #7bdac8;outline-offset:2px}.btn.primary{background:#142b49;color:white;box-shadow:0 4px 10px #142b491b}.btn.primary:hover{background:#21486e;box-shadow:0 7px 16px #142b4926}.btn.secondary{background:#fff;color:#243c57;border-color:#d9e2ed}.btn.secondary:hover{background:#f1f5f9}.btn.light{background:#fff;color:#142b49}.btn.small{min-height:32px;padding:7px 12px;font-size:11px}.btn.full{width:100%;margin-top:22px}.demo-notice{display:flex;gap:11px;align-items:flex-start;background:#fff8e8;color:#745417;border:1px solid #f2deaa;padding:12px 15px;border-radius:12px;margin-bottom:21px}.demo-notice ion-icon{font-size:20px;flex-shrink:0}.demo-notice strong,.demo-notice span{display:block}.demo-notice strong{font-size:12px;margin-bottom:3px}.demo-notice span{font-size:11px;line-height:1.5}.welcome{background:linear-gradient(115deg,#142b49,#145866);min-height:185px;border-radius:18px;padding:31px 34px;color:white;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;overflow:hidden}.welcome-kicker{font-size:10px;font-weight:800;color:#9fdfd7;letter-spacing:1.8px}.welcome h2{font-size:29px;letter-spacing:-.7px;margin:9px 0 8px;color:#fff}.welcome p{font-size:13px;opacity:.86;line-height:1.6;max-width:600px;margin:0 0 18px}.welcome-art{font-size:140px;opacity:.11;transform:rotate(-12deg);flex-shrink:0}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:20px}.metric,.panel{background:white;border:1px solid #e0e7f0;border-radius:16px;box-shadow:0 3px 13px #142b4908}.metric{padding:20px;min-width:0}.metric-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:#e5f4f1;color:#08766e;font-size:19px;margin-bottom:13px}.metric small,.metric strong,.metric p{display:block}.metric small{font-size:11px;color:#718297}.metric strong{font-size:clamp(18px,1.65vw,26px);letter-spacing:-.5px;margin-top:6px;overflow-wrap:anywhere}.metric p{font-size:10px;color:#8290a2;line-height:1.5;margin:6px 0 0}.two-columns,.profile-grid{display:grid;grid-template-columns:1.15fr 1fr;gap:18px;align-items:start}.panel{padding:24px;min-width:0}.panel-head{display:flex;justify-content:space-between;gap:12px;align-items:start;margin-bottom:20px}.panel h2{font-size:17px;margin:0;color:#172e4c}.panel-head p{font-size:12px;color:#8391a1;margin:6px 0 0}.steps{display:grid;gap:18px}.steps>div{display:flex;align-items:center;gap:13px}.steps b{width:32px;height:32px;border-radius:10px;background:#e1f3ee;color:#097469;display:grid;place-items:center;flex-shrink:0}.steps strong,.steps small{display:block}.steps strong{font-size:12px}.steps small{font-size:11px;color:#718297;margin-top:4px}.quick-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.quick-grid button{display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e5eaf0;padding:15px 12px;border-radius:10px;cursor:pointer;text-align:left;color:#243950;font-size:11px;font-weight:700}.quick-grid button span{flex:1}.quick-grid button ion-icon:first-child{color:#08766e;font-size:19px}.application-mini{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #edf0f4;padding:14px 0}.application-mini strong,.application-mini small{display:block;font-size:12px}.application-mini small{font-size:10px;color:#8490a2;margin-top:5px}.filter-panel{display:flex;gap:12px;align-items:center;padding:17px;background:#fff;border:1px solid #e0e7f0;border-radius:14px;margin-bottom:20px}.searchbox{display:flex;align-items:center;gap:9px;border:1px solid #dce5ed;border-radius:9px;padding:0 13px;flex:1;min-width:180px}.searchbox ion-icon{font-size:19px;color:#8291a4}.searchbox input{border:0;outline:0;width:100%;height:42px;font-size:12px;color:#182d48}.filter-panel select{height:44px;border:1px solid #dce5ed;border-radius:9px;padding:0 12px;color:#253a53;background:#fff;font-size:12px}.result-count{font-size:11px;color:#758498;white-space:nowrap}.property-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(275px,1fr));gap:18px}.property-card{background:#fff;border:1px solid #e0e7f0;border-radius:17px;overflow:hidden;box-shadow:0 3px 13px #142b4908;transition:transform .2s}.property-card:hover{transform:translateY(-3px)}.property-visual{height:135px;background:linear-gradient(135deg,#daece9,#dce7f4);display:grid;place-items:center;position:relative;color:#659fa1}.property-visual>ion-icon{font-size:70px;opacity:.65}.availability{position:absolute;right:14px;top:14px;background:#e5f6e9;color:#16703b;border-radius:7px;padding:7px 10px;font-size:10px;font-weight:800}.property-body{padding:20px}.property-location{display:flex;align-items:center;gap:5px;font-size:11px;color:#08766e;margin:0 0 8px}.property-body h2{font-size:18px;margin:0}.unit-name{color:#5e7188;font-size:12px;margin:7px 0}.property-description{font-size:12px;color:#78889a;line-height:1.6;min-height:38px}.chips{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0}.chips span{background:#f3f6fa;border-radius:6px;color:#6d7d8f;padding:6px 8px;font-size:10px}.property-bottom{display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px solid #ecf0f4;padding-top:17px;flex-wrap:wrap}.property-bottom strong{font-size:19px;color:#132e4b}.property-bottom small{font-size:11px;color:#8091a3}.section-overview{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:18px}.section-overview>div{background:#fff;border:1px solid #e0e7f0;border-radius:12px;padding:18px}.section-overview strong{display:block;font-size:25px}.section-overview span{font-size:11px;color:#748399}.stack{display:grid;gap:15px}.pill{display:inline-flex;align-items:center;padding:6px 9px;border-radius:7px;font-size:9px;letter-spacing:.3px;font-weight:800;white-space:nowrap}.pill.success{background:#e5f6eb;color:#17703f}.pill.pending{background:#fff2db;color:#986218}.pill.error{background:#fee9e9;color:#a52d2d}.info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:18px}.info-grid small,.info-grid strong{display:block}.info-grid small{color:#7a899a;font-size:11px}.info-grid strong{font-size:13px;margin-top:6px;overflow-wrap:anywhere}.inline-note{display:flex;gap:9px;align-items:start;background:#f2f7fb;color:#62768d;font-size:11px;line-height:1.6;border-radius:9px;padding:12px 13px;margin-top:22px}.inline-note ion-icon{flex-shrink:0;font-size:16px;color:#08766e}.empty{display:flex;align-items:center;flex-direction:column;text-align:center;justify-content:center;padding:55px 25px}.empty>ion-icon{font-size:45px;color:#81a7aa;background:#e6f4f0;padding:17px;border-radius:20px;margin-bottom:17px}.empty h2{font-size:19px;margin:0}.empty p{color:#77869b;font-size:12px;line-height:1.7;max-width:420px;margin:10px 0 20px}.empty.compact{padding:30px 15px}.empty.compact>ion-icon{font-size:30px;padding:12px}.empty.compact h2{font-size:15px}.billing-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}.spaced{margin-top:19px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left;min-width:620px}th{font-size:10px;letter-spacing:.4px;color:#7b8b9d;background:#f7f9fc;padding:13px;border-bottom:1px solid #e7ecf2}td{font-size:12px;color:#435770;padding:14px 13px;border-bottom:1px solid #edf1f5}.request-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:17px}.request-grid .panel>p{font-size:13px;color:#64748b;line-height:1.6}.profile-grid{grid-template-columns:330px minmax(0,1fr)}.profile-card{text-align:center}.profile-avatar{width:83px;height:83px;font-size:28px;margin:5px auto 16px;border-radius:24px}.profile-card p{font-size:12px;color:#7b8b9e;overflow-wrap:anywhere}.profile-card .pill{margin-top:7px}.info-line{display:flex;gap:12px;justify-content:space-between;align-items:center;padding:15px 0;border-bottom:1px solid #edf0f4;font-size:12px}.info-line span{color:#74859a}.info-line strong{text-align:right;overflow-wrap:anywhere}footer{display:flex;justify-content:space-between;color:#8b99aa;font-size:11px;margin:30px 0 8px}.loading{padding:45px;text-align:center;color:#697f93}.modal-toolbar{--background:#fff;--color:#142b49}.modal-content{--background:#fff}.form-body{padding:24px}.form-body form{display:grid;gap:16px}.form-body label{display:block;font-size:12px;font-weight:700;color:#263b52}.form-body input,.form-body select,.form-body textarea{display:block;width:100%;border:1px solid #d7e1ec;border-radius:9px;padding:12px;margin-top:7px;font:inherit;font-size:13px;outline:none;box-sizing:border-box;color:#1d344e;background:#fff}.form-body input:focus,.form-body select:focus,.form-body textarea:focus{border-color:#118b7c;box-shadow:0 0 0 3px #118b7c1f}.form-summary{background:#f1f7f7;padding:14px;border-radius:10px}.form-summary strong,.form-summary span{display:block}.form-summary strong{font-size:13px}.form-summary span{font-size:11px;color:#60758b;margin-top:5px}.form-note{font-size:11px;line-height:1.7;color:#80692e;background:#fff8e9;padding:12px;border-radius:9px;margin:0}.form-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:6px;border-top:1px solid #e9edf2;padding-top:17px}
@media(max-width:1160px){.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.two-columns{grid-template-columns:1fr}}@media(max-width:800px){.mobile-toggle{display:block}.layout{grid-template-columns:1fr}.sidebar{display:none;border-right:0;border-bottom:1px solid #e1e8f0}.sidebar.sidebar-open{display:block}.sidebar-help{margin-top:20px}.workspace{padding:20px}.profile-grid{grid-template-columns:1fr}.filter-panel{flex-wrap:wrap}.filter-panel .searchbox{flex-basis:100%}}@media(max-width:520px){.brand{font-size:19px}.brand-tag{font-size:8px;margin-left:7px}.logout-label{display:none}.welcome{padding:25px}.welcome h2{font-size:24px}.welcome-art{display:none}.metrics,.billing-metrics,.section-overview{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.metric{padding:15px}.metric strong{font-size:19px}.section-overview>div{padding:13px}.panel{padding:18px}.page-heading{align-items:start}.heading-actions{width:100%}.heading-actions .btn{width:100%}.property-grid{grid-template-columns:1fr}.property-bottom{align-items:flex-start}.quick-grid{grid-template-columns:1fr}.form-actions{flex-direction:column-reverse}.form-actions .btn{width:100%}footer{gap:8px;flex-direction:column}}

/* Premium Tenant Experience — visually distinct from platform Admin and property Owner */
.portal,.modal-content {--background:#f1f6ff;color-scheme:light;--ion-text-color:#163154;}
.topbar {--background:#fff;--color:#18345e;--min-height:68px;padding-inline:10px;box-shadow:0 4px 18px rgba(19,65,131,.07)}
.topbar ion-button {--color:#2468c8}
.topbar ion-title {padding-inline:6px}
.brand {color:#173c79;font-size:21px;letter-spacing:-.6px}
.brand-tag {color:#829ac0;letter-spacing:1.2px;margin-left:12px}
.tenant-brand-controls {display:flex;align-items:center;gap:9px;margin-left:8px}
.tenant-logo {width:39px;height:39px;display:grid;place-items:center;background:linear-gradient(135deg,#1558cb,#2e9bdf);color:#fff;font-size:22px;border-radius:13px;box-shadow:0 7px 15px rgba(25,107,207,.2)}
.tenant-top-actions {display:flex;align-items:center;gap:8px;margin-right:10px}
.tenant-header-avatar {width:38px;height:38px;border-radius:13px;border:2px solid #dbe9ff;background:linear-gradient(135deg,#eaf3ff,#fff);color:#1d57ad;font-weight:850;cursor:pointer}
.mobile-toggle {display:none;place-items:center;width:39px;height:39px;border:0;border-radius:12px;background:#eef5ff;color:#1e61c4;font-size:21px;cursor:pointer}
.layout {grid-template-columns:254px minmax(0,1fr);gap:16px;align-items:start;padding:14px;min-width:0}
.sidebar {position:sticky;top:14px;align-self:start;width:254px;max-height:calc(100dvh - 28px);overflow-y:auto;height:auto;padding:17px 12px;border:1px solid rgba(255,255,255,.2);border-radius:24px;background:linear-gradient(158deg,#0c3d8d 0%,#1156ac 58%,#1876cc 100%);color:#fff;box-shadow:0 15px 35px rgba(12,66,141,.18)}
.account {background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.17);border-radius:16px;padding:13px;margin-bottom:12px}
.avatar {background:#fff;color:#1352b3;box-shadow:0 4px 13px rgba(4,35,87,.15)}
.account-name strong {color:white}.account-name small {color:#cadfff}
.nav-caption {color:#c9ddff;margin:15px 12px 12px}
.sidebar nav {gap:6px}
.sidebar nav button {color:#e4efff;border-radius:12px;min-height:47px;font-size:12px}
.sidebar nav button:hover {color:#fff;background:rgba(255,255,255,.14)}
.sidebar nav button.active {background:#fff;color:#1252b4;border-color:#fff;box-shadow:0 7px 20px rgba(7,39,90,.16)}
.sidebar nav button .nav-count {margin-left:auto}
.tenant-logout {display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:11px 13px;margin:13px 0 0;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.1);color:white;font-weight:800;font-size:12px;cursor:pointer}
.tenant-logout ion-icon:last-child {margin-left:auto}
.tenant-logout:hover {background:rgba(255,255,255,.2)}
.sidebar-help {margin-top:13px;background:linear-gradient(150deg,rgba(255,255,255,.19),rgba(255,255,255,.06));border:1px solid rgba(255,255,255,.13);color:white;border-radius:16px}
.sidebar-help strong,.sidebar-help ion-icon {color:white}.sidebar-help p {color:#d8e9ff}
.workspace {width:100%;max-width:none;padding:22px clamp(12px,1.8vw,27px) 32px}
.eyebrow,.property-location {color:#276acb}
h1,.panel h2 {color:#183865}
.welcome {position:relative;isolation:isolate;border:1px solid rgba(255,255,255,.16);border-radius:24px;background:linear-gradient(114deg,#0d408e 0%,#1672d0 60%,#40b6cc 100%);box-shadow:0 18px 36px rgba(15,87,178,.18);min-height:215px}
.welcome::before {content:'';position:absolute;inset:0;z-index:-1;background:radial-gradient(circle at 80% 10%,rgba(255,255,255,.23),transparent 32%)}
.welcome-kicker {display:flex;gap:8px;align-items:center;color:#c5eeff}
.welcome-art {opacity:.22;filter:drop-shadow(0 12px 15px rgba(4,33,97,.16))}
.btn {border-radius:12px;min-height:44px;padding:11px 17px;transition:transform .17s,box-shadow .17s,background .17s}
.btn.primary {background:linear-gradient(120deg,#1755ca,#2184e7);color:white;box-shadow:0 7px 16px rgba(27,94,204,.18)}
.btn.primary:hover {background:linear-gradient(120deg,#124bad,#1973cf);box-shadow:0 10px 20px rgba(27,94,204,.24)}
.btn.secondary {border:1px solid #d5e3fb;background:#f8fbff;color:#1c59b6}
.btn.light {border:0;color:#1658b4}
.btn:disabled {cursor:not-allowed;opacity:.6;box-shadow:none;transform:none}
.btn:focus-visible,.sidebar nav button:focus-visible,.tenant-logout:focus-visible,.tenant-header-avatar:focus-visible {outline:3px solid #81bbff;outline-offset:2px}
.metric,.panel,.property-card,.section-overview>div {border-radius:20px;border:1px solid #dfe9fa;box-shadow:0 10px 27px rgba(20,71,149,.06)}
.metric {position:relative;overflow:hidden;background:linear-gradient(155deg,#fff 56%,#f1f7ff);padding:21px}
.metric::before {content:'';position:absolute;inset:0 auto auto 0;width:100%;height:4px;background:linear-gradient(90deg,#286ce5,#57aaf4)}
.metric:nth-child(2)::before {background:linear-gradient(90deg,#06a792,#5cdabc)}
.metric:nth-child(3)::before {background:linear-gradient(90deg,#8760d9,#c7a3ff)}
.metric:nth-child(4)::before {background:linear-gradient(90deg,#e99a2d,#ffd168)}
.metric-icon {background:linear-gradient(135deg,#e6efff,#d3e7ff);color:#2664c9;border-radius:13px;width:42px;height:42px}
.metric strong {color:#183d76;font-size:clamp(21px,1.7vw,28px)}
.panel {padding:24px}
.panel-head {align-items:center;gap:12px}
.quick-grid button,.info-grid>div {border:1px solid #e2ebfa;border-radius:13px;background:linear-gradient(160deg,#fff,#f5f9ff)}
.quick-grid button:hover {background:#eaf3ff;transform:translateY(-2px)}
.quick-grid button ion-icon:first-child {color:#2571d3}
.steps b {background:#e6f0ff;color:#1e60bf}
.property-grid,.request-grid {gap:18px}
.property-card {overflow:hidden;transition:transform .2s,box-shadow .2s}
.property-card:hover {transform:translateY(-3px);box-shadow:0 17px 30px rgba(20,71,149,.12)}
.property-visual {height:160px;background:linear-gradient(127deg,#174aab,#2d8ee4 65%,#67ceda);color:#fff}
.property-visual::before {content:'';position:absolute;inset:0;background:radial-gradient(circle at 74% 18%,rgba(255,255,255,.22),transparent 36%)}
.property-visual>ion-icon {font-size:82px;opacity:.85;filter:drop-shadow(0 8px 16px rgba(4,35,104,.22))}
.availability {background:#e5fff2;color:#0d8053;border-radius:999px}
.property-body {padding:21px}
.property-bottom .btn {min-width:150px}
.chips span {background:#eef5ff;color:#245aab;border-radius:999px}
.filter-panel {background:linear-gradient(160deg,#fff,#f4f8ff);border-radius:17px;border-color:#e0eafa;box-shadow:0 5px 16px rgba(25,70,135,.04)}
.searchbox,.filter-panel select {border-radius:12px;border-color:#d8e5fa}
.section-overview>div {position:relative;overflow:hidden;background:linear-gradient(145deg,#fff,#f1f7ff);padding:20px}
.section-overview>div::before {content:'';position:absolute;inset:0 auto auto 0;width:100%;height:4px;background:linear-gradient(90deg,#1f69d4,#4ba8f0)}
.section-overview strong {color:#1b559c;font-size:29px}
.table-wrap {max-width:100%;border:1px solid #dfe8f8;border-radius:15px;overflow-x:auto;-webkit-overflow-scrolling:touch}
table {border-collapse:separate;border-spacing:0}
th {background:linear-gradient(180deg,#f2f7ff,#eaf2ff);color:#5c7597;font-weight:850}
td {border-color:#edf2fc}
tbody tr:nth-child(even) {background:#f9fbff}tbody tr:hover {background:#eef5ff}
.pill {border-radius:999px}
.info-grid>div {padding:14px}
.inline-note {background:#f0f6ff;border:1px solid #e2ecff;color:#567295;border-radius:13px}
.inline-note ion-icon {color:#286cd3}
.profile-avatar {background:linear-gradient(125deg,#1b61ce,#35a2e3);color:#fff}
.tenant-backdrop {display:none}
/* Ionic modal theme: polished and readable on desktop and mobile */
.modal-toolbar {--background:linear-gradient(115deg,#104397,#1978d5 65%,#2aa4c9);--color:#fff;--min-height:68px}
.modal-toolbar ion-title {color:#fff;font-size:19px;font-weight:800}
.modal-toolbar ion-button {--color:#fff}
.modal-content {--background:#f7faff}
.form-body {padding:23px 26px 27px}
.form-body form {gap:17px}
.form-body label {font-weight:750;color:#355273}
.form-body input,.form-body select,.form-body textarea {min-height:45px;border-radius:13px;border-color:#d8e5fa;background:white;transition:border-color .18s,box-shadow .18s}
.form-body input:focus,.form-body select:focus,.form-body textarea:focus {border-color:#2677dc;box-shadow:0 0 0 4px rgba(38,119,220,.1)}
.form-summary {background:linear-gradient(120deg,#e9f2ff,#f4faff);border:1px solid #d4e4ff;border-radius:15px;padding:16px}
.form-summary strong {color:#184f9e}
.form-note {background:#edf5ff;border:1px solid #d9e8ff;color:#557195;border-radius:12px}
.form-actions {gap:11px;padding-top:18px;border-color:#e2ebf9}
.form-actions .btn {min-width:132px;min-height:44px}
:global(ion-modal.tenant-dialog) {--width:min(620px,calc(100% - 28px));--height:auto;--max-height:90%;--border-radius:22px}
:global(ion-modal.tenant-dialog::part(content)) {border-radius:22px;box-shadow:0 28px 80px rgba(6,37,90,.24);overflow:hidden}
@media(max-width:1050px){.layout {grid-template-columns:225px minmax(0,1fr);gap:10px}.sidebar {width:225px}.metrics {grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:800px){
 .layout {display:block;padding:0;min-width:0}
 .sidebar {display:none !important;position:fixed;top:0;left:0;bottom:0;z-index:1002;width:min(294px,84vw);max-height:100dvh;overflow-y:auto;border-radius:0 23px 23px 0;padding:calc(17px + env(safe-area-inset-top,0px)) 12px calc(17px + env(safe-area-inset-bottom,0px))}
 .sidebar.sidebar-open {display:block !important}
 .sidebar nav {display:grid;grid-template-columns:1fr;gap:6px}
 .sidebar-help {margin-top:13px}
 .tenant-backdrop {display:block;position:fixed;inset:0;z-index:1001;border:0;background:rgba(5,22,54,.55);backdrop-filter:blur(3px)}
 .mobile-toggle {display:grid}
 .workspace {padding:19px 14px calc(28px + env(safe-area-inset-bottom,0px));min-width:0}
 .profile-grid,.two-columns {grid-template-columns:1fr}
 .filter-panel {flex-wrap:wrap}
 .filter-panel .searchbox {flex-basis:100%}
}
@media(max-width:520px){
 .topbar {--min-height:62px;padding-inline:3px}
 .tenant-brand-controls {margin-left:4px;gap:4px}
 .tenant-logo {width:32px;height:32px;font-size:18px}
 .brand {font-size:18px}
 .brand-tag {display:block;font-size:7px;margin:2px 0 0;letter-spacing:.9px}
 .tenant-top-actions {gap:3px;margin-right:4px}
 .tenant-header-avatar {width:32px;height:32px;border-radius:11px;font-size:11px}
 .welcome {padding:24px 20px;min-height:190px}
 .welcome h2 {font-size:25px}
 .metrics,.billing-metrics,.section-overview {grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
 .metric {padding:16px;border-radius:17px}
 .metric strong {font-size:19px}
 .section-overview>div {padding:15px}
 .panel {padding:17px}
 .property-grid {grid-template-columns:1fr}
 .property-bottom .btn {width:100%}
 .heading-actions {width:100%}
 .heading-actions .btn {width:100%}
 .form-body {padding:19px 17px 22px}
 .form-actions {flex-direction:column-reverse}
 .form-actions .btn {width:100%}
 :global(ion-modal.tenant-dialog) {--width:calc(100% - 16px);--max-height:92%;--border-radius:18px}
}
@media(max-width:360px){.metrics,.billing-metrics {grid-template-columns:1fr}.tenant-top-actions ion-button{margin:0}.brand {font-size:16px}}


/* Tenant premium polish: record cards, controls and branded notification */
.portal { --background:#eef4fc; }
.panel,.property-card,.metric,.section-overview>div {border:1px solid #e0e9f7;box-shadow:0 12px 30px rgba(19,64,130,.075);}
.panel,.property-card {border-radius:20px;transition:box-shadow .2s,transform .2s;}
.property-card:hover {transform:translateY(-4px);box-shadow:0 20px 44px rgba(19,64,130,.14);}
.section-overview>div {position:relative;overflow:hidden;border-radius:19px;padding:20px 22px;background:linear-gradient(147deg,#fff 48%,#edf5ff);}
.section-overview>div::before {content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#2461d9,#3aa7e6);}
.section-overview>div:nth-child(2)::before {background:linear-gradient(90deg,#e69b34,#f9c574);}
.section-overview>div:nth-child(3)::before {background:linear-gradient(90deg,#0ba68a,#65d9bb);}
.section-overview strong {font-size:32px;font-weight:850;color:#174479;letter-spacing:-.8px;}
.section-overview span {font-weight:700;letter-spacing:.15px;}
.stack .panel {background:linear-gradient(150deg,#fff,#f9fcff);padding:25px;}
.stack .panel-head {padding-bottom:16px;border-bottom:1px solid #e8eef9;}
.info-grid>div {background:#f2f7ff;border:1px solid #e0eafa;border-radius:13px;padding:14px;min-width:0;}
.info-grid small {color:#7186a3;font-weight:700;}
.info-grid strong {color:#183b73;font-size:14px;}
.inline-note {border:1px solid #dce9fa;background:linear-gradient(110deg,#f1f6ff,#f9fcff);border-radius:13px;}
.btn {border-radius:12px;min-height:44px;}
.btn.primary {background:linear-gradient(110deg,#164ebc,#267bdb 70%,#3e9bea);color:white;box-shadow:0 8px 17px rgba(29,92,199,.2);}
.btn.primary:hover {background:linear-gradient(110deg,#1249ac,#196fd1 70%,#2c8be2);box-shadow:0 11px 21px rgba(29,92,199,.28);}
.btn.secondary {color:#1859b4;background:linear-gradient(180deg,#fff,#f4f8ff);border-color:#d4e2f7;}
.btn.secondary:hover {background:#eaf2ff;border-color:#b5cef3;}
.btn:disabled {cursor:not-allowed;opacity:.58;transform:none!important;box-shadow:none!important;}
.pill {border-radius:100px;padding:7px 11px;font-size:10px;letter-spacing:.4px;}
.table-wrap {border:1px solid #e3ebf9;border-radius:15px;overflow-x:auto;}
th {background:linear-gradient(180deg,#f2f7ff,#eaf2ff);color:#567498;font-weight:850;}
tbody tr:nth-child(even) {background:#f9fbff;}
tbody tr:hover {background:#f0f6ff;}
td {padding:15px;}
.filter-panel {background:linear-gradient(135deg,#fff,#f6faff);border-color:#e1eaf8;border-radius:17px;box-shadow:0 8px 25px rgba(18,62,124,.045);}
.request-grid .panel {border-top:4px solid #347bd9;}
:global(ion-modal.tenant-notification) {--width:min(460px,calc(100% - 32px));--height:auto;--max-height:90%;--border-radius:24px;--background:#fff;}
:global(ion-modal.tenant-notification::part(content)) {height:auto;max-height:90%;border-radius:24px;background:#fff;box-shadow:0 28px 90px rgba(8,29,70,.28);overflow-y:auto;}
.notice-shell {overflow:hidden;background:white;color:#19365d;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;}
.notice-hero {position:relative;isolation:isolate;overflow:hidden;min-height:133px;padding:19px 25px;background:linear-gradient(120deg,#123f9a,#2879da 70%,#60b3ef);color:white;display:flex;align-items:center;justify-content:center;}
.notice-hero.notice-success {background:linear-gradient(115deg,#104d9b,#1579c5 58%,#1fbea6);}
.notice-hero.notice-error {background:linear-gradient(115deg,#263b84,#7653b8 63%,#ed8f8c);}
.notice-brand {position:absolute;top:15px;left:22px;display:flex;align-items:center;gap:7px;font-size:10px;font-weight:850;letter-spacing:1.1px;color:rgba(255,255,255,.89);}
.notice-brand ion-icon {font-size:17px;}
.notice-icon {width:66px;height:66px;display:grid;place-items:center;border-radius:21px;background:rgba(255,255,255,.21);border:1px solid rgba(255,255,255,.3);box-shadow:0 12px 25px rgba(4,26,78,.16);z-index:1;transform:translateY(12px);}
.notice-icon ion-icon {font-size:38px;}
.notice-orbit {position:absolute;width:190px;height:190px;border:1px solid rgba(255,255,255,.16);border-radius:50%;right:-55px;bottom:-115px;box-shadow:0 0 0 27px rgba(255,255,255,.035),0 0 0 65px rgba(255,255,255,.025);}
.notice-content {padding:26px 27px 25px;text-align:center;}
.notice-eyebrow {font-size:10px;letter-spacing:1.7px;color:#2872c7;font-weight:850;}
.notice-content h2 {margin:9px 0 10px;font-size:clamp(22px,4.7vw,26px);color:#163563;font-weight:850;letter-spacing:-.6px;}
.notice-content p {margin:0;font-size:13px;line-height:1.8;color:#647892;white-space:pre-line;overflow-wrap:anywhere;}
.notice-footer {display:flex;justify-content:center;margin-top:25px;padding-top:20px;border-top:1px solid #e8eff8;}
.notice-confirm {min-width:165px;}
@media(max-width:520px){.notice-hero {min-height:118px}.notice-content {padding:23px 19px}.notice-footer .btn {width:100%}.stack .panel {padding:18px}.info-grid {grid-template-columns:1fr 1fr;gap:9px}.info-grid>div {padding:11px}.section-overview>div {padding:15px 12px}.section-overview strong {font-size:26px}}
@media(max-width:360px){.info-grid {grid-template-columns:1fr}.section-overview {grid-template-columns:1fr 1fr}}


/* Branded lease confirmation: desktop and mobile */
:global(ion-modal.tenant-lease-confirm) { --width:min(570px,calc(100% - 28px)); --height:auto; --max-height:92%; --border-radius:24px; --background:#fff; }
:global(ion-modal.tenant-lease-confirm::part(content)) { height:auto;max-height:92%;border-radius:24px;background:#fff;box-shadow:0 28px 80px rgba(10,33,75,.30);overflow-y:auto; }
.lease-confirm-shell { color:#19375b;background:#fff;overflow:hidden;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif; }
.lease-confirm-hero { position:relative;padding:24px 27px 28px;color:#fff;background:linear-gradient(120deg,#123d8f,#176cc9 62%,#20b5bb);overflow:hidden; }
.lease-confirm-hero::after { content:'';position:absolute;right:-57px;top:-69px;width:205px;height:205px;border-radius:50%;border:29px solid rgba(255,255,255,.11);pointer-events:none; }
.lease-confirm-kicker { display:flex;align-items:center;gap:8px;letter-spacing:1.2px;font-size:10px;font-weight:850;opacity:.91; }
.lease-confirm-kicker ion-icon {font-size:16px}
.lease-confirm-heading {position:relative;display:flex;align-items:center;gap:15px;margin-top:21px;z-index:1}
.lease-confirm-heading h2 {color:#fff;margin:0 0 5px;font-size:25px;letter-spacing:-.7px;font-weight:850}
.lease-confirm-heading p {margin:0;color:rgba(255,255,255,.88);font-size:12px;line-height:1.6}
.lease-confirm-icon {display:grid;place-items:center;flex-shrink:0;width:60px;height:60px;border-radius:17px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.26)}
.lease-confirm-icon ion-icon {font-size:30px}
.lease-confirm-body {padding:25px 27px 27px}
.lease-confirm-property {display:flex;flex-direction:column;gap:5px;padding:16px 18px;background:linear-gradient(120deg,#edf5ff,#f7fbff);border:1px solid #dce9fc;border-radius:16px}
.lease-confirm-property span {font-size:9px;font-weight:850;letter-spacing:1.3px;color:#3171bd}
.lease-confirm-property strong {font-size:18px;color:#18375f;overflow-wrap:anywhere}
.lease-confirm-property small {font-size:12px;color:#6d819d}
.lease-confirm-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:15px}
.lease-confirm-grid>div {display:flex;flex-direction:column;gap:8px;padding:15px;border-radius:13px;border:1px solid #e1eafb;background:#fbfdff}
.lease-confirm-grid span {font-size:11px;color:#7388a4}
.lease-confirm-grid strong {font-size:15px;color:#1b4075;overflow-wrap:anywhere}
.lease-confirm-note {display:flex;align-items:flex-start;gap:10px;margin-top:17px;padding:13px;border-radius:12px;background:#fff9e9;border:1px solid #f3e7c6;color:#85612c}
.lease-confirm-note ion-icon {font-size:20px;flex-shrink:0}
.lease-confirm-note p {font-size:12px;line-height:1.6;margin:0}
.lease-confirm-actions {display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:21px;padding-top:18px;border-top:1px solid #e4ecf8}
.lease-confirm-actions .btn {min-height:46px;white-space:normal;text-align:center}
.lease-confirm-actions .btn.primary {background:linear-gradient(115deg,#185bc9,#1889db);color:white}
.lease-confirm-actions .btn:disabled {opacity:.65;cursor:wait}
@media(max-width:520px) {
 :global(ion-modal.tenant-lease-confirm) {--width:calc(100% - 22px);--max-height:90%}
 .lease-confirm-hero {padding:20px 18px 22px}
 .lease-confirm-body {padding:18px}
 .lease-confirm-heading h2 {font-size:21px}
 .lease-confirm-icon {width:48px;height:48px}
 .lease-confirm-grid {gap:8px}
 .lease-confirm-grid>div {padding:12px}
 .lease-confirm-grid strong {font-size:13px}
 .lease-confirm-actions {flex-direction:column-reverse}
 .lease-confirm-actions .btn {width:100%}
}

</style>
