import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Message, User } from '@/types';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';
const messagesFilePath = path.join(process.cwd(), 'src', 'data', 'messages.json');
const usersFilePath = path.join(process.cwd(), 'src', 'data', 'users.json');

const ensureFile = (filePath: string) => {
  const dataDir = path.dirname(filePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  }
};

const readJsonFile = <T>(filePath: string): T[] => {
  ensureFile(filePath);
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T[];
};

async function syncUsers(users: User[]) {
  for (const user of users) {
    if (!user?.id || !user?.name || user.isBot) {
      continue;
    }
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
      console.error(`Failed to sync user ${user.id}:`, error);
    }
  }
}

export async function POST() {
  try {
    const users = readJsonFile<User>(usersFilePath);
    const messages = readJsonFile<Message>(messagesFilePath).filter(
      (message) =>
        Boolean(message.id) &&
        Boolean(message.senderId) &&
        Boolean(message.receiverId) &&
        Boolean(message.content && message.content.trim()) &&
        !message.skipGraphSync
    );

    await syncUsers(users);

    const response = await fetch(`${FASTAPI_URL}/api/sync-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((message) => ({
          id: message.id,
          senderId: message.senderId,
          receiverId: message.receiverId,
          content: message.content,
          timestamp: message.timestamp || new Date().toISOString(),
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `FastAPI sync failed: ${response.status}`, detail: errorText },
        { status: 502 }
      );
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      usersSynced: users.filter((user) => !user.isBot).length,
      ...result,
    });
  } catch (error) {
    console.error('Failed to sync messages to graph:', error);
    return NextResponse.json({ error: 'Failed to sync messages to graph' }, { status: 500 });
  }
}
