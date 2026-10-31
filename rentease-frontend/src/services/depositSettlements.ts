
import api from './api';

export type SettlementStatus =
  | 'draft'
  | 'finalized'
  | 'settled';

export type RefundStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled';

export type RefundMethod =
  | 'cash'
  | 'gcash'
  | 'bank_transfer'
  | 'other';

export interface DepositDeduction {
  deduction_id: number;
  settlement_id: number;
  description: string;
  amount: string | number;
  evidence_note: string | null;
  created_at: string;
}

export interface DepositRefund {
  refund_id: number;
  settlement_id: number;
  amount: string | number;
  payment_method: RefundMethod;
  reference_number: string | null;
  status: RefundStatus;
  recorded_by: number;
  created_at: string;
  confirmed_at: string | null;
}

export interface SettlementSummary {
  verified_deposit: string;
  total_deductions: string;
  refundable_amount: string;
  confirmed_refunds: string;
  pending_refunds: string;
  remaining_refund: string;
}

export interface DepositSettlement {
  settlement_id: number;
  lease_id: number;
  status: SettlementStatus;
  notes: string | null;
  created_by: number;
  created_at: string;
  finalized_at: string | null;
  settled_at: string | null;
  tenant_id: number;
  lease_status: string;
  security_deposit: string | number;
  owner_id: number;
  property_name: string;
  unit_number: string;
  tenant_name: string;
  deductions: DepositDeduction[];
  refunds: DepositRefund[];
  summary: SettlementSummary;
}

// ============================================================
// OWNER: VIEW ALL SETTLEMENTS
// ============================================================

export async function listOwnerSettlements():
  Promise<DepositSettlement[]> {
  const { data } = await api.get(
    '/owner/deposit-settlements'
  );

  return data.settlements ?? [];
}

// ============================================================
// TENANT: VIEW FINALIZED SETTLEMENT HISTORY
// ============================================================

export async function listMySettlements():
  Promise<DepositSettlement[]> {
  const { data } = await api.get(
    '/deposit-settlements/my'
  );

  return data.settlements ?? [];
}

// ============================================================
// OWNER: CREATE DRAFT SETTLEMENT
// ============================================================

export async function createDepositSettlement(
  leaseId: number
): Promise<DepositSettlement> {
  const { data } = await api.post(
    '/owner/deposit-settlements',
    { lease_id: leaseId }
  );

  return data.settlement;
}

// ============================================================
// OWNER: ADD ITEMIZED DEDUCTION
// ============================================================

export async function addDepositDeduction(
  settlementId: number,
  payload: {
    description: string;
    amount: number;
    evidence_note?: string;
  }
): Promise<DepositSettlement> {
  const { data } = await api.post(
    `/owner/deposit-settlements/${settlementId}/deductions`,
    payload
  );

  return data.settlement;
}

// ============================================================
// OWNER: REMOVE DRAFT DEDUCTION
// ============================================================

export async function removeDepositDeduction(
  settlementId: number,
  deductionId: number
): Promise<DepositSettlement> {
  const { data } = await api.delete(
    `/owner/deposit-settlements/${settlementId}/deductions/${deductionId}`
  );

  return data.settlement;
}

// Compatibility alias for OwnerDashboard.vue.
// Both names use the same API function.
export const deleteDepositDeduction = removeDepositDeduction;

// ============================================================
// OWNER: FINALIZE SETTLEMENT
// ============================================================

export async function finalizeDepositSettlement(
  settlementId: number
): Promise<DepositSettlement> {
  const { data } = await api.patch(
    `/owner/deposit-settlements/${settlementId}/finalize`
  );

  return data.settlement;
}

// ============================================================
// OWNER: RECORD REFUND
// ============================================================

export async function recordDepositRefund(
  settlementId: number,
  payload: {
    amount: number;
    payment_method: RefundMethod;
    reference_number?: string;
  }
): Promise<DepositSettlement> {
  const { data } = await api.post(
    `/owner/deposit-settlements/${settlementId}/refunds`,
    payload
  );

  return data.settlement;
}

// ============================================================
// OWNER: CONFIRM OR CANCEL REFUND
// ============================================================

export async function decideDepositRefund(
  settlementId: number,
  refundId: number,
  decision: 'confirmed' | 'cancelled'
): Promise<DepositSettlement> {
  const { data } = await api.patch(
    `/owner/deposit-settlements/${settlementId}/refunds/${refundId}`,
    { decision }
  );

  return data.settlement;
}
