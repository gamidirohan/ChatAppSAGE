import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { User } from '@/types'

const usersFilePath = path.join(process.cwd(), 'src', 'data', 'users.json')
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000'

const ensureUsersFileExists = () => {
  const dataDir = path.dirname(usersFilePath)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify([], null, 2))
  }
}

const readUsers = (): User[] => {
  ensureUsersFileExists()
  return JSON.parse(fs.readFileSync(usersFilePath, 'utf8')) as User[]
}

const writeUsers = (users: User[]) => {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2))
}

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
    })
  } catch (error) {
    console.error('Failed to sync user to graph:', error)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const avatar = typeof body.avatar === 'string' ? body.avatar.trim() : ''

    if (!name || !email) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
    }

    const users = readUsers()
    const index = users.findIndex((user) => user.id === id)

    if (index === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const emailTaken = users.some((user) => user.id !== id && user.email?.toLowerCase() === email)
    if (emailTaken) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 409 })
    }

    const currentUser = users[index]
    const updatedUser: User = {
      ...currentUser,
      name,
      email,
      avatar: avatar || undefined,
    }

    users[index] = updatedUser
    writeUsers(users)
    await syncUserToGraph(updatedUser)

    const { password: _password, ...safeUser } = updatedUser
    return NextResponse.json(safeUser)
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
