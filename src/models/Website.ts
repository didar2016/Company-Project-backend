import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Embedded Room subdocument
export interface IRoom {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  maxOccupancy: number;
  bedType: string;
  size: number;
  basePrice: number;
  mainImage: string;
  discountPercentage?: string;
  discountPrice: number;
  detailImages: string[];
  images: string[];
  amenities: string[];
  features: string[];
  servicesIncluded: string[];
  popularFacilities: string[];
  isAvailable: boolean;
}

// Our Story subdocument (single embedded object)
export interface IOurStory {
  title: string;
  subTitle: string;
  percentage: string;
  suites: string;
  images: string[];
}

// Facility subdocument
export interface IFacility {
  _id: mongoose.Types.ObjectId;
  image: string;
  title: string;
  subTitle: string;
}

// Review subdocument
export interface IReview {
  _id: mongoose.Types.ObjectId;
  avatar: string;
  name: string;
  review: string;
  rating: number;
}

// Offer subdocument
export interface IOffer {
  _id: mongoose.Types.ObjectId;
  title: string;
  subtitle: string;
  offer_available: boolean;
  offer_percentage: number;
  offer_image: string;
}

// Site Settings subdocument
export interface ISiteSettings {
  logo: string;
  footerLogo: string;
  footerDescription: string;
}

// Embedded Hero Section subdocument
export type HeroPageType =
  | 'home'
  | 'facilities'
  | 'about'
  | 'contact'
  | 'room'
  | 'roomdetails'
  | 'location'
  | 'dining';

export interface IHeroSection {
  _id: mongoose.Types.ObjectId;
  page: HeroPageType;
  image: string;
  text: string;
  subText: string;
  detailsText: string;
  isActive: boolean;
}

export interface IWebsite extends Document {
  _id: mongoose.Types.ObjectId;
  uniqueId: string;
  name: string;
  domain: string;
  subdomain: string;
  theme: string;
  // Hotel info (embedded)
  hotelInfo: {
    title: string;
    description: string;
    contact: {
      phone: string;
      email: string;
      address: string;
      coordinates: {
        lat: number;
        lng: number;
      };
    };
    socialLinks: {
      facebook?: string;
      twitter?: string;
      instagram?: string;
      linkedin?: string;
    };
    images: {
      banner: string;
      logo: string;
      gallery: string[];
    };
    amenities: string[];
    nearbyAttractions: Array<{
      name: string;
      distance: string;
      type: string;
    }>;
    transportLinks: Array<{
      name: string;
      distance: string;
      type: string;
    }>;
  };
  // Embedded rooms
  rooms: IRoom[];
  // Embedded hero sections
  heroSections: IHeroSection[];
  // Our Story section (single object)
  ourStory: IOurStory;
  // Facilities section
  facilities: IFacility[];
  // Reviews section
  reviews: IReview[];
  // Offer section
  offer: IOffer;
  // Site settings (logo, footer)
  siteSettings: ISiteSettings;
  assignedAdmin: mongoose.Types.ObjectId;
  settings: {
    language: string;
    currency: string;
    timezone: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      maxlength: [100, 'Room name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    maxOccupancy: {
      type: Number,
      required: [true, 'Max occupancy is required'],
      min: [1, 'Max occupancy must be at least 1'],
      max: [20, 'Max occupancy cannot exceed 20'],
    },
    bedType: {
      type: String,
      required: [true, 'Bed type is required'],
      enum: ['Single', 'Double', 'Queen', 'King', 'Twin', 'Suite', 'Bunk'],
    },
    size: {
      type: Number,
      min: [0, 'Size cannot be negative'],
      default: 0,
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountPrice: {
      type: Number,
      min: [0, 'Discount price cannot be negative'],
      default: 0,
    },
    mainImage: {
      type: String,
      default: '',
    },
    discountPercentage: {
      type: String,
      default: '',
    },
    detailImages: [{
      type: String,
    }],
    images: [{
      type: String,
    }],
    amenities: [{
      type: String,
      trim: true,
    }],
    features: [{
      type: String,
      trim: true,
    }],
    servicesIncluded: [{
      type: String,
      trim: true,
    }],
    popularFacilities: [{
      type: String,
      trim: true,
    }],
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const HeroSectionSchema = new Schema<IHeroSection>(
  {
    page: {
      type: String,
      required: [true, 'Page type is required'],
      enum: ['home', 'facilities', 'about', 'contact', 'room', 'roomdetails', 'location', 'dining'],
    },
    image: {
      type: String,
      default: '',
    },
    text: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Hero text cannot exceed 500 characters'],
    },
    subText: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Hero sub text cannot exceed 1000 characters'],
    },
    detailsText: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Hero details text cannot exceed 2000 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const OurStorySchema = new Schema<IOurStory>(
  {
    title: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    subTitle: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Sub title cannot exceed 500 characters'],
    },
    percentage: {
      type: String,
      default: '',
      trim: true,
    },
    suites: {
      type: String,
      default: '',
      trim: true,
    },
    images: [{
      type: String,
    }],
  },
  { _id: false }
);

const FacilitySchema = new Schema<IFacility>(
  {
    image: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    subTitle: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Sub title cannot exceed 500 characters'],
    },
  },
  { _id: true }
);

const ReviewSchema = new Schema<IReview>(
  {
    avatar: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      required: [true, 'Reviewer name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    review: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Review cannot exceed 2000 characters'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
  },
  { _id: true }
);

const OfferSchema = new Schema<IOffer>(
  {
    title: {
      type: String,
      required: [true, 'Offer title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    subtitle: {
      type: String,
      required: [true, 'Offer subtitle is required'],
      trim: true,
      maxlength: [500, 'Subtitle cannot exceed 500 characters'],
    },
    offer_available: {
      type: Boolean,
      required: [true, 'Offer availability is required'],
      default: true,
    },
    offer_percentage: {
      type: Number,
      required: [true, 'Offer percentage is required'],
      min: [0, 'Offer percentage cannot be negative'],
      max: [100, 'Offer percentage cannot exceed 100'],
    },
    offer_image: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const WebsiteSchema = new Schema<IWebsite>(
  {
    uniqueId: {
      type: String,
      unique: true,
      default: () => uuidv4(),
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Website name is required'],
      trim: true,
      maxlength: [100, 'Website name cannot exceed 100 characters'],
    },
    domain: {
      type: String,
      required: [true, 'Domain is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    subdomain: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    theme: {
      type: String,
      default: 'default',
    },
    hotelInfo: {
      title: { type: String, trim: true, default: '' },
      description: { type: String, trim: true, default: '' },
      contact: {
        phone: { type: String, trim: true, default: '' },
        email: { type: String, lowercase: true, trim: true, default: '' },
        address: { type: String, trim: true, default: '' },
        coordinates: {
          lat: { type: Number, min: -90, max: 90, default: 0 },
          lng: { type: Number, min: -180, max: 180, default: 0 },
        },
      },
      socialLinks: {
        facebook: String,
        twitter: String,
        instagram: String,
        linkedin: String,
      },
      images: {
        banner: { type: String, default: '' },
        logo: { type: String, default: '' },
        gallery: [{ type: String }],
      },
      amenities: [{ type: String, trim: true }],
      nearbyAttractions: [{
        name: String,
        distance: String,
        type: String,
      }],
      transportLinks: [{
        name: String,
        distance: String,
        type: String,
      }],
    },
    rooms: [RoomSchema],
    heroSections: [HeroSectionSchema],
    ourStory: OurStorySchema,
    facilities: [FacilitySchema],
    reviews: [ReviewSchema],
    offer: OfferSchema,
    siteSettings: {
      logo: { type: String, default: '' },
      footerLogo: { type: String, default: '' },
      footerDescription: { type: String, default: '' },
    },
    settings: {
      language: { type: String, default: 'en' },
      currency: { type: String, default: 'USD' },
      timezone: { type: String, default: 'UTC' },
    },
    seo: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      keywords: [{ type: String }],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    assignedAdmin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
WebsiteSchema.index({ uniqueId: 1 });
WebsiteSchema.index({ domain: 1 });
WebsiteSchema.index({ subdomain: 1 });
WebsiteSchema.index({ isActive: 1 });
WebsiteSchema.index({ assignedAdmin: 1 });

export const Website = mongoose.model<IWebsite>('Website', WebsiteSchema);
