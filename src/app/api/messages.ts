import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const messagesFilePath = path.join(process.cwd(), 'src', 'data', 'messages.json')

// Ensure the data directory exists
const ensureDirectoryExists = () => {
  const dataDir = path.dirname(messagesFilePath)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  // Create an empty messages file if it doesn't exist
  if (!fs.existsSync(messagesFilePath)) {
    fs.writeFileSync(messagesFilePath, JSON.stringify([], null, 2))
  }
}

export async function GET() {
  ensureDirectoryExists()
  const data = fs.readFileSync(messagesFilePath, 'utf-8')
  const messages = JSON.parse(data)
  return NextResponse.json(messages)
}

export async function POST(request: NextRequest) {
  const { senderId, receiverId, content } = await request.json()
  ensureDirectoryExists()
  const data = fs.readFileSync(messagesFilePath, 'utf-8')
  const messages = JSON.parse(data)

  const newMessage = {
    id: uuidv4(),
    senderId,
    receiverId,
    content,
    timestamp: Date.now(),
  }

  messages.push(newMessage)
  fs.writeFileSync(messagesFilePath, JSON.stringify(messages, null, 2))

  return NextResponse.json({ success: true, message: newMessage })
}
