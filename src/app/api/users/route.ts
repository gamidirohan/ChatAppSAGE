import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { User } from '@/types';

const usersFilePath = path.join(process.cwd(), 'src', 'data', 'users.json');
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

const ensureUsersFileExists = () => {
  const dataDir = path.dirname(usersFilePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify([], null, 2));
  }
};

const readUsers = (): User[] => {
  ensureUsersFileExists();
  return JSON.parse(fs.readFileSync(usersFilePath, 'utf8')) as User[];
};

const writeUsers = (users: User[]) => {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

async function syncUserToGraph(user: User) {
  try {
    await fetch(`${FASTAPI_URL}/api/sync-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        team: user.team || [],
      }),
    });
  } catch (error) {
    console.error('Failed to sync user to graph:', error);
  }
}

export async function GET() {
  try {
    const users = readUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to read users:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'name, email and password are required' }, { status: 400 });
    }

    const users = readUsers();
    const emailTaken = users.some((user) => user.email?.toLowerCase() === email);
    if (emailTaken) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 409 });
    }

    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      password,
      avatar: body.avatar || '🙂',
      team: Array.isArray(body.team) ? body.team : [],
    };

    users.push(newUser);
    writeUsers(users);
    await syncUserToGraph(newUser);

    const { password: _password, ...safeUser } = newUser;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error('Failed to register user:', error);
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}
