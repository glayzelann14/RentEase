import { ref } from 'vue';

export type UserRole = 'tenant' | 'owner' | 'admin';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

type AuthResponse = {
  success: boolean;
  message?: string;
  user?: AuthUser;
};

const API_URL = 'http://localhost:5000/api';

export const currentUser = ref<AuthUser | null>(null);

export function dashboardPath(role: UserRole): string {
  const paths: Record<UserRole, string> = {
    tenant: '/tenant',
    owner: '/owner',
    admin: '/admin',
  };

  return paths[role];
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;

  const user = value as Partial<AuthUser>;

  return (
    typeof user.id === 'number' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    ['tenant', 'owner', 'admin'].includes(user.role ?? '')
  );
}

function removeLegacyAuthentication() {
  for (const key of [
    'userEmail',
    'userRole',
    'userName',
    'registeredEmail',
  ]) {
    localStorage.removeItem(key);
  }
}

async function request(
  path: string,
  body?: Record<string, unknown>,
): Promise<AuthResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: body ? 'POST' : 'GET',
      credentials: 'include',
      headers: body
        ? { 'Content-Type': 'application/json' }
        : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      'Cannot connect to the server. Make sure the backend is running.',
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.message || 'The request could not be completed.',
    );
  }

  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const data = await request('/login', {
    email: email.trim().toLowerCase(),
    password,
  });

  if (!isAuthUser(data.user)) {
    throw new Error('The server returned invalid account details.');
  }

  currentUser.value = data.user;
  removeLegacyAuthentication();

  return data.user;
}

export async function signup(values: {
  name: string;
  email: string;
  password: string;
  role: 'tenant' | 'owner';
}): Promise<void> {
  await request('/signup', {
    ...values,
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
  });

  removeLegacyAuthentication();
}

export async function restoreSession(): Promise<AuthUser | null> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/me`, {
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    currentUser.value = null;

    throw new Error(
      'Cannot connect to the authentication server.',
    );
  }

  if (response.status === 401) {
    currentUser.value = null;
    removeLegacyAuthentication();
    return null;
  }

  const data = await response.json().catch(() => null);

  if (
    !response.ok ||
    !data?.success ||
    !isAuthUser(data.user)
  ) {
    currentUser.value = null;

    throw new Error(
      data?.message || 'Could not verify your account session.',
    );
  }

  currentUser.value = data.user;
  removeLegacyAuthentication();

  return data.user;
}

export async function logout(): Promise<void> {
  await request('/logout', {});

  currentUser.value = null;
  removeLegacyAuthentication();
}