// Helper functions to work with user data

import users from '@/data/users.json';

export async function getUser(userId: string) {
  // In a real app, this would be a database or API call
  return users.find(user => user.id === userId);
}

export async function getAllUsers() {
  // In a real app, this would be a database or API call
  return users;
}

export async function authenticateUser(email: string, password: string) {
  // In a real app, this would include proper password hashing and validation
  const user = users.find(user => user.email === email && user.password === password);
  return user ? { ...user, password: undefined } : null; // Remove password before returning
}
