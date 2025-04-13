import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Define the uploads directory
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

// Ensure the uploads directory exists
const ensureUploadsDir = async () => {
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }
};

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
];

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * POST handler for file uploads
 */
export async function POST(request: NextRequest) {
  try {
    // Ensure uploads directory exists
    await ensureUploadsDir();

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, TXT, and DOCX files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const fileId = uuidv4();
    const fileExtension = file.name.split('.').pop() || '';
    const fileName = `${fileId}.${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Convert file to buffer and write to disk
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, fileBuffer);

    // Generate the public URL for the file
    const fileUrl = `/uploads/${fileName}`;

    // Return success response with file details
    return NextResponse.json({
      success: true,
      file: {
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        url: fileUrl
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}