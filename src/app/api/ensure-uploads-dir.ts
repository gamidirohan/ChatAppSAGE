import { existsSync, mkdirSync } from 'fs';
import path from 'path';

// Define the uploads directory
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

// Ensure the uploads directory exists
export function ensureUploadsDir() {
  if (!existsSync(uploadsDir)) {
    try {
      mkdirSync(uploadsDir, { recursive: true });
      console.log('Created uploads directory:', uploadsDir);
    } catch (error) {
      console.error('Failed to create uploads directory:', error);
    }
  }
}

// Call this function when the module is imported
ensureUploadsDir();
