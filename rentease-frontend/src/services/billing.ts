import api from './api';
export interface RentalBill { bill_id:number;lease_id:number;billing_period:string;rent_amount:string|number;water_charge:string|number|null;electricity_charge:string|number|null;other_charges:string|number|null;due_date:string;status:string;tenant_id:number;unit_id:number;unit_number:string;property_name:string;owner_id:number;tenant_name:string;total_amount:string|number;verified_amount:string|number; }
export interface RentalPayment {payment_id:number;bill_id:number;amount:string|number;payment_method:string;reference_number:string|null;payment_date:string;status:string;verified_by:number|null;verified_at:string|null;lease_id:number;tenant_id:number;unit_number:string;property_name:string;owner_id:number;tenant_name:string;}
export async function listOwnerBills():Promise<RentalBill[]>{const {data}=await api.get('/owner/bills');return data.bills;}
export async function listMyBills():Promise<RentalBill[]>{const {data}=await api.get('/billing/my');return data.bills;}
export async function createBill(input:{lease_id:number;billing_period:string;due_date:string;water_charge:number;electricity_charge:number;other_charges:number}):Promise<RentalBill>{const {data}=await api.post('/owner/bills',input);return data.bill;}
export async function listOwnerPayments():Promise<RentalPayment[]>{const {data}=await api.get('/owner/payments');return data.payments;}
export async function listMyPayments():Promise<RentalPayment[]>{const {data}=await api.get('/payments/my');return data.payments;}
export async function submitBillPayment(input:{bill_id:number;amount:number;payment_method:'gcash'|'cash'|'bank_transfer'|'other';reference_number:string}):Promise<RentalPayment>{const {data}=await api.post('/payments',input);return data.payment;}
export async function decidePayment(id:number,decision:'verified'|'rejected'):Promise<RentalPayment>{const {data}=await api.patch(`/owner/payments/${id}/decision`,{decision});return data.payment;}
