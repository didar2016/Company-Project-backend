import mongoose, { Schema, Document } from 'mongoose';

export interface IContactMessage extends Document {
  _id: mongoose.Types.ObjectId;
  websiteId: mongoose.Types.ObjectId;
  email: string;
  phone: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      required: [true, 'Website ID is required'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: [255, 'Email cannot exceed 255 characters'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: [50, 'Phone cannot exceed 50 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

ContactMessageSchema.index({ websiteId: 1, createdAt: -1 });

export const ContactMessage = mongoose.model<IContactMessage>('ContactMessage', ContactMessageSchema);
