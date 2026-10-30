import api from './api';

export interface PlatformOverview {
  properties: Array<{id:number;name:string;owner:string;units:number;location:string}>;
  bills: Array<{id:number;tenant:string;unit:string;period:string;amount:number;status:string}>;
  leases: Array<{id:number;tenant:string;unit:string;start:string;end:string;status:string}>;
  maintenance: Array<{id:number;unit:string;category:string;description:string;status:string}>;
}

export async function getAdminOverview(): Promise<PlatformOverview> {
  const {data} = await api.get<PlatformOverview & {success:boolean}>('/admin/overview');
  if (!data.success) throw new Error('Unable to load platform overview.');
  return data;
}
