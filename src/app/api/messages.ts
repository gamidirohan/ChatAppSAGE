import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const messagesFilePath = path.join(process.cwd(), 'data', 'messages.json')

export async function GET() {
  const data = fs.readFileSync(messagesFilePath, 'utf-8')
  const messages = JSON.parse(data)
  return NextResponse.json(messages)
}

export async function POST(request: NextRequest) {
  const { senderId, receiverId, content } = await request.json()
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
