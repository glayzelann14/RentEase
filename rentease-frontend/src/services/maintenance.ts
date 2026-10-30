import api from './api';
export type MaintenanceStatus = 'pending'|'assigned'|'in_progress'|'completed'|'cancelled';
export type MaintenancePriority = 'low'|'medium'|'high'|'urgent';
export interface RentalMaintenanceRequest {
 request_id:number; tenant_id:number; unit_id:number;category:string|null;problem_description:string;
 priority:MaintenancePriority|null;status:MaintenanceStatus; assigned_to:number|null;
 created_at:string;completed_at:string|null;unit_number:string;property_id:number;
 property_name:string;owner_id:number;tenant_name:string;tenant_email:string;
}
export async function listMyMaintenance():Promise<RentalMaintenanceRequest[]> {const {data}=await api.get('/maintenance/my');return data.requests;}
export async function listOwnerMaintenance():Promise<RentalMaintenanceRequest[]> {const {data}=await api.get('/owner/maintenance');return data.requests;}
export async function createMaintenanceRequest(input:{unit_id:number;category:string;problem_description:string;priority:MaintenancePriority}):Promise<RentalMaintenanceRequest>{const {data}=await api.post('/maintenance',input);return data.request;}
export async function updateMaintenanceStatus(id:number,status:Exclude<MaintenanceStatus,'pending'>):Promise<RentalMaintenanceRequest>{const {data}=await api.patch(`/owner/maintenance/${id}/status`,{status});return data.request;}
