import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Public directory for website images (relative to project root)
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export const ensureDir = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Sanitize website name for use as a folder name.
 */
export const sanitizeWebsiteName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'default';
};

/**
 * Get the upload directory for a website, creating it if needed.
 */
export const getWebsiteUploadDir = (websiteName: string): string => {
  const sanitized = sanitizeWebsiteName(websiteName);
  const dir = path.join(PUBLIC_DIR, sanitized);
  ensureDir(dir);
  return dir;
};

/**
 * Save a buffer to the website's public directory and return the relative URL path.
 */
export const saveImageBuffer = (
  buffer: Buffer,
  websiteName: string,
  originalFilename: string
): string => {
  const sanitized = sanitizeWebsiteName(websiteName);
  const dir = getWebsiteUploadDir(websiteName);
  const ext = path.extname(originalFilename).toLowerCase() || '.jpg';
  const filename = `${uuidv4()}${ext}`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);
  return `/public/${sanitized}/${filename}`;
};

/**
 * Delete an image file given its stored URL path (e.g. "/public/hotel-name/uuid.jpg").
 */
export const deleteImageFile = (imageUrl: string): void => {
  if (!imageUrl || !imageUrl.startsWith('/public/')) return;
  try {
    const relativePath = imageUrl.replace(/^\/public\//, '');
    const filePath = path.join(PUBLIC_DIR, relativePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Failed to delete image file:', imageUrl, err);
  }
};

/**
 * Delete multiple image files.
 */
export const deleteMultipleImageFiles = (imageUrls: string[]): void => {
  if (!imageUrls || !Array.isArray(imageUrls)) return;
  imageUrls.forEach((url) => deleteImageFile(url));
};

/**
 * Delete an entire website's image folder.
 */
export const deleteWebsiteFolder = (websiteName: string): void => {
  const sanitized = sanitizeWebsiteName(websiteName);
  const dir = path.join(PUBLIC_DIR, sanitized);
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('Failed to delete website folder:', dir, err);
  }
};

export { PUBLIC_DIR };
