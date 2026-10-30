
import api from './api';

export interface RentalProperty {
  property_id: number;
  owner_id: number;
  property_name: string;
  description: string | null;
  address: string;
  city: string | null;
  property_type: string | null;
  owner_name: string;
  unit_count: number;
  available_unit_count: number;
}

export interface RentalUnit {
  unit_id: number;
  property_id: number;
  unit_number: string;
  unit_type: string | null;
  monthly_rent: string;
  bedrooms: number;
  capacity: number;
  amenities: string | null;
  description?: string | null;
  unit_description?: string | null;
  status: string;
  property_name?: string;
  address?: string;
  city?: string | null;
}

export type NewProperty =
  Pick<RentalProperty, 'property_name' | 'address'> &
  Partial<
    Pick<
      RentalProperty,
      'description' | 'city' | 'property_type'
    >
  >;

export type NewUnit =
  Pick<RentalUnit, 'unit_number' | 'monthly_rent'> &
  Partial<
    Pick<
      RentalUnit,
      | 'unit_type'
      | 'bedrooms'
      | 'capacity'
      | 'amenities'
      | 'description'
    >
  >;

// GET: Owner's properties or all properties for admin
export async function listProperties():
  Promise<RentalProperty[]> {
  const { data } = await api.get('/properties');
  return data.properties;
}

// POST: Create property in PostgreSQL
export async function createProperty(
  input: NewProperty
): Promise<RentalProperty> {
  const { data } = await api.post('/properties', input);
  return data.property;
}

// GET: Units belonging to a property
export async function listPropertyUnits(
  propertyId: number
): Promise<RentalUnit[]> {
  const { data } = await api.get(
    `/properties/${propertyId}/units`
  );
  return data.units;
}

// POST: Create rental unit in PostgreSQL
export async function createUnit(
  propertyId: number,
  input: NewUnit
): Promise<RentalUnit> {
  const { data } = await api.post(
    `/properties/${propertyId}/units`,
    input
  );
  return data.unit;
}

// GET: Available rental units for tenants
export async function listAvailableUnits():
  Promise<RentalUnit[]> {
  const { data } = await api.get('/available-units');
  return data.units;
}

// PATCH: Update existing property
export async function updateProperty(
  propertyId: number,
  input: Pick<NewProperty, 'property_name' | 'address'>
): Promise<RentalProperty> {
  const { data } = await api.patch(
    `/properties/${propertyId}`,
    input
  );
  return data.property;
}

// PATCH: Update existing rental unit
export async function updateUnit(
  propertyId: number,
  unitId: number,
  input: NewUnit
): Promise<RentalUnit> {
  const { data } = await api.patch(
    `/properties/${propertyId}/units/${unitId}`,
    input
  );
  return data.unit;
}
