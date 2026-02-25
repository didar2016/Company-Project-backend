import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest, catchAsync, CustomError, deleteFile as deleteFileUtil } from '../middleware';
import { optimizeImage, resizeForGallery, saveImageBuffer, sanitizeWebsiteName, getWebsiteUploadDir } from '../utils';
import { Website } from '../models';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Upload single image
export const uploadImage = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    throw new CustomError('No file uploaded', 400);
  }

  // Optimize the uploaded image
  const optimizedPath = await optimizeImage(req.file.path, undefined, {
    quality: 85,
    format: 'webp',
  });

  res.status(200).json({
    success: true,
    message: 'Image uploaded successfully',
    data: {
      filename: path.basename(optimizedPath),
      path: optimizedPath,
      originalName: req.file.originalname,
      size: req.file.size,
    },
  });
});

// Upload multiple images
export const uploadMultipleImages = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw new CustomError('No files uploaded', 400);
  }

  const uploadedFiles = await Promise.all(
    files.map(async (file) => {
      // Optimize each image
      const optimizedPath = await optimizeImage(file.path, undefined, {
        quality: 85,
        format: 'webp',
      });

      return {
        filename: path.basename(optimizedPath),
        path: optimizedPath,
        originalName: file.originalname,
        size: file.size,
      };
    })
  );

  res.status(200).json({
    success: true,
    message: `${uploadedFiles.length} images uploaded successfully`,
    data: { files: uploadedFiles },
  });
});

// Upload gallery images with multiple sizes
export const uploadGalleryImages = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw new CustomError('No files uploaded', 400);
  }

  const uploadedFiles = await Promise.all(
    files.map(async (file) => {
      // Create multiple sizes for gallery
      const sizes = await resizeForGallery(file.path);

      return {
        originalName: file.originalname,
        ...sizes,
      };
    })
  );

  res.status(200).json({
    success: true,
    message: `${uploadedFiles.length} gallery images uploaded successfully`,
    data: { files: uploadedFiles },
  });
});

// Delete image
export const deleteImage = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { filename } = req.params;
  const { websiteId } = req.query;

  if (!filename) {
    throw new CustomError('Filename is required', 400);
  }

  // Construct the file path
  let filePath = filename;
  if (websiteId) {
    // Look for the file in website-specific directories
    const websiteDir = path.join(UPLOAD_DIR, `website-${websiteId}`);
    
    // Search for the file recursively
    const findFile = (dir: string, targetFilename: string): string | null => {
      if (!fs.existsSync(dir)) return null;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          const found = findFile(itemPath, targetFilename);
          if (found) return found;
        } else if (item === targetFilename) {
          return itemPath;
        }
      }
      return null;
    };

    const foundPath = findFile(websiteDir, filename);
    if (foundPath) {
      filePath = foundPath;
    }
  }

  await deleteFileUtil(filePath);

  res.status(200).json({
    success: true,
    message: 'Image deleted successfully',
  });
});

// Upload single image to website public folder
export const uploadWebsiteImage = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    throw new CustomError('No file uploaded', 400);
  }

  const { websiteId } = req.body;
  if (!websiteId) {
    throw new CustomError('Website ID is required', 400);
  }

  const website = await Website.findById(websiteId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  const url = saveImageBuffer(req.file.buffer, website.name, req.file.originalname);

  res.status(200).json({
    success: true,
    message: 'Image uploaded successfully',
    data: { url },
  });
});

// Upload multiple images to website public folder
export const uploadWebsiteImages = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw new CustomError('No files uploaded', 400);
  }

  const { websiteId } = req.body;
  if (!websiteId) {
    throw new CustomError('Website ID is required', 400);
  }

  const website = await Website.findById(websiteId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  const urls = files.map((file) =>
    saveImageBuffer(file.buffer, website.name, file.originalname)
  );

  res.status(200).json({
    success: true,
    message: `${urls.length} images uploaded successfully`,
    data: { urls },
  });
});

// List website images
export const listWebsiteImages = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { websiteId } = req.params;

  const websiteDir = path.join(UPLOAD_DIR, `website-${websiteId}`);

  if (!fs.existsSync(websiteDir)) {
    res.status(200).json({
      success: true,
      data: { images: [] },
    });
    return;
  }

  const images: Array<{
    filename: string;
    path: string;
    size: number;
    createdAt: Date;
  }> = [];

  // Recursively find all images
  const findImages = (dir: string): void => {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        findImages(itemPath);
      } else {
        // Check if it's an image
        const ext = path.extname(item).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
          images.push({
            filename: item,
            path: itemPath.replace(UPLOAD_DIR + path.sep, ''),
            size: stat.size,
            createdAt: stat.birthtime,
          });
        }
      }
    }
  };

  findImages(websiteDir);

  // Sort by creation date (newest first)
  images.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.status(200).json({
    success: true,
    count: images.length,
    data: { images },
  });
});
