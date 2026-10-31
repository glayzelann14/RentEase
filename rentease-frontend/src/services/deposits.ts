import api from './api';

export type DepositMethod = 'cash' | 'gcash' | 'bank_transfer' | 'other';
export type DepositStatus = 'pending_verification' | 'verified' | 'rejected';

export interface SecurityDepositPayment {
  deposit_payment_id: number;
  lease_id: number;
  amount: string | number;
  payment_method: DepositMethod;
  reference_number: string | null;
  status: DepositStatus;
  submitted_at: string;
  verified_by: number | null;
  verified_at: string | null;
  rejection_reason: string | null;
  tenant_id: number;
  security_deposit: string | number;
  lease_status: string;
  owner_id: number;
  property_name: string;
  unit_number: string;
  tenant_name: string;
}

export async function listMyDeposits(): Promise<SecurityDepositPayment[]> {
  const { data } = await api.get('/deposits/my');
  return data.deposits ?? [];
}

export async function listOwnerDeposits(): Promise<SecurityDepositPayment[]> {
  const { data } = await api.get('/owner/deposits');
  return data.deposits ?? [];
}

export async function submitDepositPayment(payload: {
  lease_id: number;
  amount: number;
  payment_method: DepositMethod;
  reference_number: string;
}): Promise<SecurityDepositPayment> {
  const { data } = await api.post('/deposits', payload);
  return data.deposit;
}

export async function decideDepositPayment(id: number, decision: 'verified' | 'rejected', rejectionReason = ''): Promise<SecurityDepositPayment> {
  const { data } = await api.patch(`/owner/deposits/${id}/decision`, {
    decision,
    rejection_reason: rejectionReason,
  });
  return data.deposit;
}
