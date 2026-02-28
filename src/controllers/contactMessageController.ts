import { Request, Response } from 'express';
import { ContactMessage } from '../models/ContactMessage';
import { Website } from '../models';
import { AuthRequest, catchAsync, CustomError } from '../middleware';

// ========================
// PUBLIC - Submit contact message (no auth required)
// ========================
export const submitContactMessage = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { websiteId } = req.params;
  const { email, phone, message } = req.body;

  if (!email || !message) {
    throw new CustomError('Email and message are required', 400);
  }

  // Verify website exists by uniqueId
  const website = await Website.findOne({ uniqueId: websiteId, isActive: true });
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  const contactMessage = await ContactMessage.create({
    websiteId: website._id,
    email,
    phone: phone || '',
    message,
  });

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: { contactMessage: { _id: contactMessage._id } },
  });
});

// ========================
// AUTHENTICATED - Get all contact messages for a website
// ========================
export const getContactMessages = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const websiteId = req.params.websiteId || req.websiteId;

  const website = await Website.findById(websiteId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [messages, totalCount] = await Promise.all([
    ContactMessage.find({ websiteId: website._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ContactMessage.countDocuments({ websiteId: website._id }),
  ]);

  res.status(200).json({
    success: true,
    count: messages.length,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
    data: { messages },
  });
});

// ========================
// AUTHENTICATED - Mark message as read/unread
// ========================
export const toggleMessageRead = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { messageId } = req.params;

  const message = await ContactMessage.findById(messageId);
  if (!message) {
    throw new CustomError('Message not found', 404);
  }

  message.isRead = !message.isRead;
  await message.save();

  res.status(200).json({
    success: true,
    message: `Message marked as ${message.isRead ? 'read' : 'unread'}`,
    data: { message },
  });
});

// ========================
// AUTHENTICATED - Delete a contact message
// ========================
export const deleteContactMessage = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { messageId } = req.params;

  const message = await ContactMessage.findById(messageId);
  if (!message) {
    throw new CustomError('Message not found', 404);
  }

  await message.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Message deleted successfully',
  });
});
