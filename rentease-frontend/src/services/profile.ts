import api from './api';
import { currentUser } from './auth';

export type UserProfile = { name: string; email: string; role: 'admin'|'owner'|'tenant'; mobile: string; avatar_url: string };
export async function getMyProfile(): Promise<UserProfile> {
  const { data } = await api.get('/profile');
  return {...data.profile, avatar_url: avatarSrc(data.profile.avatar_url)};
}
export async function saveMyProfile(name: string, mobile: string, avatar?: string): Promise<UserProfile> {
  const { data } = await api.patch('/profile', {name, mobile});
  if (currentUser.value) currentUser.value = {...currentUser.value, name: data.profile.name};
  let avatar_url = avatar && !avatar.startsWith('data:') ? avatar : '';
  if (avatar?.startsWith('data:')) {
    const uploaded = await api.patch('/profile/avatar', { image: avatar });
    avatar_url = avatarSrc(uploaded.data.avatar_url);
  }
  return {...data.profile, avatar_url};
}

function avatarSrc(path: string | undefined): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${api.defaults.baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
}
