import api from './api';

/** Owner-only operation. Backend verifies ownership, eligible lease, and unit status. */
export async function confirmUnitTurnover(propertyId: number, unitId: number): Promise<void> {
  await api.patch(`/properties/${propertyId}/units/${unitId}/confirm-turnover`);
}
