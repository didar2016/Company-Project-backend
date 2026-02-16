import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

interface ImageResizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

const defaultOptions: ImageResizeOptions = {
  quality: 80,
  format: 'webp',
};

export const optimizeImage = async (
  inputPath: string,
  outputPath?: string,
  options: ImageResizeOptions = {}
): Promise<string> => {
  const opts = { ...defaultOptions, ...options };
  const output = outputPath || inputPath.replace(/\.[^.]+$/, `.${opts.format}`);

  let pipeline = sharp(inputPath);

  // Resize if dimensions provided
  if (opts.width || opts.height) {
    pipeline = pipeline.resize(opts.width, opts.height, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Convert to specified format with quality
  switch (opts.format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: opts.quality });
      break;
    case 'png':
      pipeline = pipeline.png({ quality: opts.quality });
      break;
    case 'webp':
    default:
      pipeline = pipeline.webp({ quality: opts.quality });
      break;
  }

  await pipeline.toFile(output);

  // Remove original if different format
  if (output !== inputPath && fs.existsSync(inputPath)) {
    fs.unlinkSync(inputPath);
  }

  return output;
};

export const createThumbnail = async (
  inputPath: string,
  size: number = 200
): Promise<string> => {
  const ext = path.extname(inputPath);
  const thumbnailPath = inputPath.replace(ext, `_thumb${ext}`);

  await sharp(inputPath)
    .resize(size, size, {
      fit: 'cover',
      position: 'center',
    })
    .toFile(thumbnailPath);

  return thumbnailPath;
};

export const getImageMetadata = async (imagePath: string): Promise<{
  width: number;
  height: number;
  format: string;
  size: number;
}> => {
  const metadata = await sharp(imagePath).metadata();
  const stats = fs.statSync(imagePath);

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: stats.size,
  };
};

export const resizeForGallery = async (inputPath: string): Promise<{
  original: string;
  large: string;
  medium: string;
  thumbnail: string;
}> => {
  const ext = path.extname(inputPath);
  const basePath = inputPath.replace(ext, '');

  const [large, medium, thumbnail] = await Promise.all([
    // Large: 1920px wide
    sharp(inputPath)
      .resize(1920, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(`${basePath}_large.webp`),
   
    // Medium: 800px wide
    sharp(inputPath)
      .resize(800, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(`${basePath}_medium.webp`),
   
    // Thumbnail: 300x300
    sharp(inputPath)
      .resize(300, 300, { fit: 'cover', position: 'center' })
      .webp({ quality: 75 })
      .toFile(`${basePath}_thumb.webp`),
  ]);

  return {
    original: inputPath,
    large: `${basePath}_large.webp`,
    medium: `${basePath}_medium.webp`,
    thumbnail: `${basePath}_thumb.webp`,
  };
};
