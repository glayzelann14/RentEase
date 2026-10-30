import api from './api';
export interface RentalLease {
  lease_id: number; application_id: number | null; tenant_id: number; unit_id: number;
  start_date: string; end_date: string; monthly_rent: string | number;
  security_deposit: string | number | null; status: string;
  tenant_name: string; unit_number: string; property_name: string; owner_id: number;
}
export async function listOwnerLeases(): Promise<RentalLease[]> {
  const {data}=await api.get('/owner/leases');return data.leases;
}
export async function listMyLeases(): Promise<RentalLease[]> {
  const {data}=await api.get('/leases/my');return data.leases;
}
export async function prepareLease(application_id:number,security_deposit:number):Promise<RentalLease> {
  const {data}=await api.post('/owner/leases',{application_id,security_deposit});return data.lease;
}
export async function confirmLease(id:number):Promise<RentalLease> {
  const {data}=await api.patch(`/leases/${id}/confirm`);return data.lease;
}
export async function finishLease(id:number):Promise<RentalLease> {
  const {data}=await api.patch(`/owner/leases/${id}/complete`);return data.lease;
}
