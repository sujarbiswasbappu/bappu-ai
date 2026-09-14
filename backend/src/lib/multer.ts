import { v4 as uuidv4 } from 'uuid';
import { createWriteStream, mkdirSync } from 'fs';
import { join } from 'path';
import multer from 'multer';

const uploadDir = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
try {
  mkdirSync(uploadDir, { recursive: true });
} catch (error) {
  console.error('Error creating upload directory:', error);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = file.originalname.split('.').pop();
    cb(null, `${file.fieldname}-${uniqueSuffix}.${ext}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Allow only images and PDFs
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB default
  },
});
