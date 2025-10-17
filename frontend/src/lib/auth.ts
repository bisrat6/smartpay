export interface User {
  id: string;
  name: string;
  email: string;
  role: 'employer' | 'employee';
  companyId?: string;
}

export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const removeToken = (): void => {
  localStorage.removeItem('token');
};

export const decodeToken = (token: string): User | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    // Backend signs: { id, role }
    return { id: payload.id, name: payload.name, email: payload.email, role: payload.role, companyId: payload.companyId } as any;
  } catch {
    return null;
  }
};

export const getCurrentUser = (): User | null => {
  const token = getToken();
  if (!token) return null;
  return decodeToken(token);
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export const isEmployer = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'employer';
};

export const isEmployee = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'employee';
};
