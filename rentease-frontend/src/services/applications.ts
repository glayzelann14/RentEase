import api from './api';

export interface RentalApplication {
  application_id: number;
  tenant_id: number;
  unit_id: number;
  move_in_date: string;
  lease_duration_months: number;
  employment_details: string | null;
  contact_details: string | null;
  status: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  tenant_name: string;
  tenant_email: string;
  unit_number: string;
  monthly_rent: string;
  unit_status: string;
  property_id: number;
  property_name: string;
  address: string;
  city: string | null;
  owner_id: number;
}

export interface NewRentalApplication {
  unit_id: number;
  move_in_date: string;
  lease_duration_months: number;
  contact_details: string;
  employment_details?: string;
}

export async function submitRentalApplication(input: NewRentalApplication): Promise<RentalApplication> {
  const { data } = await api.post('/applications', input);
  return data.application;
}

export async function listMyApplications(): Promise<RentalApplication[]> {
  const { data } = await api.get('/applications/my');
  return data.applications;
}

export async function listOwnerApplications(): Promise<RentalApplication[]> {
  const { data } = await api.get('/owner/applications');
  return data.applications;
}

export async function reviewRentalApplication(applicationId: number, decision: 'approved' | 'rejected'): Promise<RentalApplication> {
  const { data } = await api.patch(`/owner/applications/${applicationId}/decision`, { decision });
  return data.application;
}
