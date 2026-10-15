<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { logout as logoutUser } from '@/services/auth';
import { restoreSession } from '@/services/auth';
onMounted(async () => {
  try {
    const user = await restoreSession();

    if (user) {
      state.profile.name = user.name;
      state.profile.email = user.email;
    }
  } catch (error) {
    console.error('Failed to restore user session:', error);
  }
});
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
  cardOutline,
  constructOutline,
  personOutline,
  closeOutline,
  notificationsOutline,
  logOutOutline,
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
  status: 'ACTIVE' | 'COMPLETED';
};
type Bill = {
  id: number;
  leaseId: number;
  period: string;
  due: string;
  amount: number;
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
        due: dateOffset(-5), amount: 9700,
      },
      {
        id: 2, leaseId: 2, period: monthOffset(0),
        due: dateOffset(3), amount: 8500,
      },
      {
        id: 3, leaseId: 3, period: monthOffset(0),
        due: dateOffset(-2), amount: 9000,
      },
      {
        id: 4, leaseId: 1, period: monthOffset(-1),
        due: `${monthOffset(-1)}-05`, amount: 8000,
      },
      {
        id: 5, leaseId: 2, period: monthOffset(-2),
        due: `${monthOffset(-2)}-05`, amount: 8500,
      },
      {
        id: 6, leaseId: 3, period: monthOffset(-3),
        due: `${monthOffset(-3)}-05`, amount: 9000,
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
const message = ref(storageWarning);
watch(state, () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    message.value = 'Changes are in memory, but browser storage could not save them.';
  }
}, { deep: true });
const section = ref('overview');
const search = ref('');
const statusFilter = ref('ALL');
const propertyFilter = ref('ALL');
const returnToOwnerProfile = ref(false);
const menu = [
  { id: 'overview', label: 'Dashboard Overview', icon: gridOutline },
  { id: 'properties', label: 'Properties & Units', icon: businessOutline },
  { id: 'pending', label: 'Pending Applications', icon: documentTextOutline },
  { id: 'history', label: 'History', icon: timeOutline },
  { id: 'payments', label: 'Payments', icon: cardOutline },
  { id: 'bills', label: 'Bills & Balances', icon: documentTextOutline },
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
let notificationQueue: Promise<void> = Promise.resolve();
let actionDialogOpen = false;
function notify(text: string) {
  message.value = text;
  notificationQueue = notificationQueue
    .then(async () => {
      const alert = await alertController.create({
        header: 'RentEase',
        message: escapeMessage(text),
        cssClass: 'rentease-messagebox',
        backdropDismiss: false,
        buttons: [{ text: 'OK', role: 'confirm' }],
      });
      await alert.present();
      await alert.onDidDismiss();
    })
    .catch(error => {
      console.error('Unable to show message:', error);
    });
}
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
  if (unitLease(id)) return 'OCCUPIED';
  if (state.maintenance.some(
    request => request.unitId === id && request.status !== 'COMPLETED',
  )) {
    return 'MAINTENANCE';
  }
  return 'AVAILABLE';
}
function billLease(bill: Bill): Lease | undefined {
  return state.leases.find(lease => lease.id === bill.leaseId);
}
function billTenant(bill: Bill): string {
  return billLease(bill)?.tenant ?? 'Unknown tenant';
}
function verifiedTotal(billId: number): number {
  return state.payments
    .filter(payment =>
      payment.billId === billId && payment.status === 'VERIFIED',
    )
    .reduce((total, payment) => total + payment.amount, 0);
}
function balance(bill: Bill): number {
  return Math.max(0, bill.amount - verifiedTotal(bill.id));
}
function billStatus(bill: Bill): string {
  if (balance(bill) === 0) return 'PAID';
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
        state.units.filter(unit => !!unitLease(unit.id)).length
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
    leases: ['ACTIVE', 'COMPLETED'],
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
function saveProperty() {
  const name = form.name.trim();
  const address = form.address.trim();
  if (!name || !address) {
    formError.value = 'Enter the property name and address.';
    return;
  }
  if (state.properties.some(property =>
    property.id !== selectedId.value &&
    property.name.toLowerCase() === name.toLowerCase(),
  )) {
    formError.value = 'A property with this name already exists.';
    return;
  }
  const existing = state.properties.find(
    property => property.id === selectedId.value,
  );
  if (existing) {
    Object.assign(existing, { name, address });
  } else {
    state.properties.push({
      id: nextId(state.properties),
      name,
      address,
    });
  }
  activity(`Property "${name}" was ${existing ? 'updated' : 'added'}.`);
  closeDialog();
  notify('Property saved successfully.');
}
function saveUnit() {
  const propertyId = Number(form.propertyId);
  const rent = Number(form.rent);
  const bedrooms = Number(form.bedrooms);
  const capacity = Number(form.capacity);
  const number = form.number.trim();
  if (
    !number ||
    !state.properties.some(property => property.id === propertyId) ||
    !/^\d+(\.\d{1,2})?$/.test(form.rent.trim()) ||
    !Number.isFinite(rent) ||
    rent <= 0 ||
    !form.bedrooms.trim() ||
    !Number.isInteger(bedrooms) ||
    bedrooms < 0 ||
    !form.capacity.trim() ||
    !Number.isInteger(capacity) ||
    capacity < 1
  ) {
    formError.value = 'Enter a valid unit number, property, rent, bedrooms, and capacity.';
    return;
  }
  if (state.units.some(unit =>
    unit.id !== selectedId.value &&
    unit.propertyId === propertyId &&
    unit.number.toLowerCase() === number.toLowerCase(),
  )) {
    formError.value = 'This unit number already exists in the selected property.';
    return;
  }
  const values = { propertyId, number, rent, bedrooms, capacity };
  const existing = state.units.find(unit => unit.id === selectedId.value);
  if (existing) {
    Object.assign(existing, values);
  } else {
    state.units.push({ id: nextId(state.units), ...values });
  }
  activity(`Unit ${number} was ${existing ? 'updated' : 'added'}.`);
  closeDialog();
  notify('Unit saved. Existing lease rent remains unchanged.');
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
function saveProfile() {
  if (
    !form.name.trim() ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ||
    !/^(09\d{9}|\+639\d{9})$/.test(form.mobile.trim())
  ) {
    formError.value = 'Enter your name, a valid email, and a Philippine mobile number.';
    return;
  }
  Object.assign(state.profile, {
    name: form.name.trim(),
    email: form.email.trim(),
    mobile: form.mobile.trim(),
    avatar: form.avatar,
  });
  localStorage.setItem('userName', form.name.trim());
  localStorage.setItem('userEmail', form.email.trim());
  activity('Owner profile was updated.');
  closeDialog();
  notify('Profile saved successfully.');
}
async function reviewApplication(app: Application, approved: boolean) {
  if (app.status !== 'PENDING') return;
  if (approved && unitStatus(app.unitId) !== 'AVAILABLE') {
    notify('This unit is no longer available. Review another unit or reject the application.');
    return;
  }
  if (approved && daysUntil(app.moveIn) < 0) {
    notify('The requested move-in date has passed. The application needs an updated date.');
    return;
  }
  const confirmed = await systemConfirm(
    `${approved ? 'Approve' : 'Reject'} ${app.name}'s application?`,
    approved ? 'Approve application' : 'Reject application',
    approved ? 'Approve' : 'Reject',
  );
  if (!confirmed) return;
  if (
    app.status !== 'PENDING' ||
    !state.applications.includes(app)
  ) return;
  if (approved && unitStatus(app.unitId) !== 'AVAILABLE') {
    notify('The unit is no longer available.');
    return;
  }
  if (approved) {
    const unit = state.units.find(item => item.id === app.unitId);
    if (!unit) return;
    const end = new Date(`${app.moveIn}T12:00:00`);
    const startDay = end.getDate();
    end.setDate(1);
    end.setMonth(end.getMonth() + app.duration);
    const lastDay = new Date(
      end.getFullYear(),
      end.getMonth() + 1,
      0,
    ).getDate();
    end.setDate(Math.min(startDay, lastDay));
    end.setDate(end.getDate() - 1);
    const endDate = [
      end.getFullYear(),
      String(end.getMonth() + 1).padStart(2, '0'),
      String(end.getDate()).padStart(2, '0'),
    ].join('-');
    state.leases.push({
      id: nextId(state.leases),
      unitId: app.unitId,
      tenant: app.name,
      start: app.moveIn,
      end: endDate,
      rent: unit.rent,
      status: 'ACTIVE',
    });
  }
  app.status = approved ? 'APPROVED' : 'REJECTED';
  app.decided = dateOffset(0);
  activity(`${app.name}'s application was ${app.status.toLowerCase()}.`);
  closeDialog();
  notify(
    approved
      ? 'Application approved. A lease was created and the unit reserved.'
      : 'Application rejected. Unit availability was not changed.',
  );
}
async function verifyPayment(payment: Payment) {
  if (payment.status !== 'PENDING') return;
  const bill = paymentBill(payment);
  if (
    !bill ||
    !Number.isFinite(payment.amount) ||
    payment.amount <= 0 ||
    payment.amount > balance(bill)
  ) {
    notify('This payment exceeds the outstanding balance or has an invalid amount.');
    return;
  }
  if (state.payments.some(item =>
    item.id !== payment.id &&
    item.status === 'VERIFIED' &&
    item.method === payment.method &&
    item.reference.trim().toLowerCase() ===
      payment.reference.trim().toLowerCase(),
  )) {
    notify('This payment reference has already been verified.');
    return;
  }
  const confirmed = await systemConfirm(
    `Confirm receipt of ${peso(payment.amount)} from ${paymentTenant(payment)}?`,
    'Verify payment',
    'Verify payment',
  );
  if (!confirmed) return;
  if (
    payment.status !== 'PENDING' ||
    !state.payments.includes(payment)
  ) return;
  if (payment.amount > balance(bill)) {
    notify('The bill balance changed. Please review this payment again.');
    return;
  }
  payment.status = 'VERIFIED';
  activity(`Payment ${payment.reference} was verified.`);
  closeDialog();
  notify('Payment verified. Collections and the bill balance have been updated.');
}
async function rejectPayment(payment: Payment) {
  if (payment.status !== 'PENDING') return;
  const reason = await systemPrompt(
    'Enter the reason for rejecting this payment.',
  );
  if (reason === null) return;
  if (
    payment.status !== 'PENDING' ||
    !state.payments.includes(payment)
  ) return;
  payment.status = 'REJECTED';
  payment.note = reason;
  activity(`Payment ${payment.reference} was rejected.`);
  closeDialog();
  notify('Payment rejected. It does not count toward collections.');
}
const maintenanceTransitions: Record<string, string[]> = {
  PENDING: ['PENDING', 'ASSIGNED'],
  ASSIGNED: ['ASSIGNED', 'IN PROGRESS'],
  'IN PROGRESS': ['IN PROGRESS', 'COMPLETED'],
  COMPLETED: ['COMPLETED'],
};
function updateMaintenance() {
  const request = selectedMaintenance.value;
  if (!request) return;
  if (!maintenanceTransitions[request.status]?.includes(form.status)) {
    formError.value = 'Choose a valid next status.';
    return;
  }
  if (request.status !== form.status) {
    request.status = form.status;
    activity(
      `${unitLabel(request.unitId)} maintenance changed to ${form.status.toLowerCase()}.`,
    );
  }
  closeDialog();
  notify('Maintenance status saved.');
}
async function completeLease(lease: Lease) {
  if (lease.status !== 'ACTIVE') return;
  const outstanding = state.bills
    .filter(bill => bill.leaseId === lease.id)
    .reduce((total, bill) => total + balance(bill), 0);
  const text = outstanding > 0
    ? `Complete ${lease.tenant}'s lease? The remaining balance of ${peso(outstanding)} will stay in Bills & Balances. Outstanding bills will not be cancelled.`
    : `Complete ${lease.tenant}'s lease? The unit will become available unless it has an open maintenance request.`;
  if (!await systemConfirm(
    text,
    'Complete lease',
    'Complete lease',
  )) return;
  if (
    lease.status !== 'ACTIVE' ||
    !state.leases.includes(lease)
  ) return;
  lease.status = 'COMPLETED';
  activity(`${lease.tenant}'s lease was completed.`);
  closeDialog();
  notify(
    outstanding > 0
      ? `Lease completed. The remaining balance of ${peso(outstanding)} is retained in Bills & Balances.`
      : 'Lease completed. Unit availability has been updated.',
  );
}
async function resetDemo() {
  if (!await systemConfirm(
    'Reset all local changes and restore the sample records?',
    'Reset demonstration',
    'Reset data',
  )) return;
  Object.assign(state, seed());
  closeDialog();
  clearFilters();
  returnToOwnerProfile.value = false;
  notify('Sample records restored.');
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
        <IonTitle>
          RentEase
          <span class="brand-subtitle">Owner Portal</span>
        </IonTitle>
        <IonButtons slot="end">
          <IonButton
            aria-label="Open pending payments"
            @click="openFilteredSection('payments', 'PENDING')"
          >
            <IonIcon :icon="notificationsOutline" />
          </IonButton>
          <IonButton
  color="danger"
  fill="solid"
  @click="logout"
>
  <IonIcon slot="start" :icon="logOutOutline" />
  Logout
</IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent class="portal">
      <div class="layout">
        <aside class="sidebar">
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
          <div class="sidebar-note">
            <strong>Local demonstration</strong>
            <p>Changes are saved in this browser only.</p>
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
                    <p>Latest changes in this demonstration</p>
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
            <div class="property-list">
              <article
                v-for="property in filteredProperties"
                :key="property.id"
                class="property-card"
              >
                <div class="property-symbol">
                  <IonIcon :icon="businessOutline" />
                </div>
                <div>
                  <h2>{{ property.name }}</h2>
                  <p>{{ property.address }}</p>
                  <small>
                    {{
                      state.units.filter(
                        unit => unit.propertyId === property.id,
                      ).length
                    }} units
                  </small>
                </div>
                <button
                  type="button"
                  class="button secondary"
                  @click="openDialog('property', property.id)"
                >
                  Edit
                </button>
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
                <p>{{ filteredApps.length }} records</p>
              </div>
            </div>
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
          <section v-if="section === 'leases'" class="panel">
            <div class="panel-heading">
              <div>
                <h2>Rental Agreements</h2>
                <p>Completing a lease preserves its historical records.</p>
              </div>
            </div>
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
              <h2>{{ request.category }}</h2>
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
            <span>RentEase · Local demo data</span>
            <button
              type="button"
              class="text-button"
              @click="resetDemo"
            >
              Reset demo
            </button>
          </footer>
        </main>
      </div>
    </IonContent>
    <IonModal
      :is-open="dialogOpen"
      class="record-modal"
      @didDismiss="dialogOpen = false"
    >
      <IonHeader>
        <IonToolbar class="modal-toolbar">
          <IonTitle>{{ dialogTitle }}</IonTitle>
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
                Save Property
              </button>
            </div>
          </form>
          <form
            v-if="dialog === 'unit'"
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
              Availability follows leases and maintenance records.
              Changing this rate does not change existing agreements.
            </p>
            <div class="dialog-actions">
              <button
                type="button"
                class="button secondary"
                @click="closeDialog"
              >
                Cancel
              </button>
              <button class="button primary" type="submit">
                Save Unit
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
              <dt>Submitted</dt>
              <dd>{{ readableDate(selectedApp.submitted) }}</dd>
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
                @click="reviewApplication(selectedApp, false)"
              >
                Reject
              </button>
              <button
                type="button"
                class="button primary"
                @click="reviewApplication(selectedApp, true)"
              >
                Approve &amp; Create Lease
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
              No proof image is attached to this sample record.
              Verification records an owner confirmation.
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
              <dt>Outstanding balance</dt>
              <dd>{{ peso(selectedLeaseBalance) }}</dd>
            </dl>
            <p class="lease-completion-note">
              Completing a lease ends its active status.
              Outstanding bills remain in Bills &amp; Balances.
              Lease and payment history are retained.
            </p>
            <div
              v-if="selectedLease.status === 'ACTIVE'"
              class="dialog-actions"
            >
              <button
                type="button"
                class="button primary"
                @click="completeLease(selectedLease)"
              >
                Complete Lease
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
            <p>{{ selectedMaintenance.description }}</p>
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
            <p class="helper">
              Workflow: Pending → Assigned → In Progress → Completed.
            </p>
            <div class="dialog-actions">
              <button
                type="button"
                class="button secondary"
                @click="closeDialog"
              >
                Cancel
              </button>
              <button class="button primary" type="submit">
                Save Status
              </button>
            </div>
          </form>
        </div>
      </IonContent>
    </IonModal>
  </IonPage>
</template>

<style scoped>
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
</style>