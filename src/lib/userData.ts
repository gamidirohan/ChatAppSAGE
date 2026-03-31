// Helper functions to work with user data

import users from '@/data/users.json';
import { User } from '@/types';

async function fetchUsersFromApi(): Promise<User[] | null> {
  try {
    const response = await fetch('/api/users', { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as User[];
  } catch {
    return null;
  }
}

export async function getUser(userId: string) {
  const apiUsers = await fetchUsersFromApi();
  const source = apiUsers || users;
  return source.find((user) => user.id === userId);
}

export async function getAllUsers() {
  const apiUsers = await fetchUsersFromApi();
  return apiUsers || users;
}

export async function authenticateUser(email: string, password: string) {
  const apiUsers = await fetchUsersFromApi();
  const source = apiUsers || users;
  const user = source.find((item) => item.email === email && item.password === password);
  return user ? { ...user, password: undefined } : null; // Remove password before returning
}
