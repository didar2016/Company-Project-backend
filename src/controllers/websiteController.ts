import { Response } from 'express';
import { Website, User } from '../models';
import { AuthRequest, catchAsync, CustomError } from '../middleware';
import { deleteImageFile, deleteMultipleImageFiles, deleteWebsiteFolder } from '../utils/fileStorage';

// ========================
// WEBSITE CRUD
// ========================

// Get all websites
export const getWebsites = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  let query = {};
  if (req.user && req.user.role === 'admin' && req.websiteId) {
    query = { _id: req.websiteId };
  }
  const websites = await Website.find(query)
    .populate('assignedAdmin', 'name email')
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: websites.length,
    data: { websites },
  });
});

// Get single website
export const getWebsite = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const website = await Website.findById(req.params.id);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }
  res.status(200).json({
    success: true,
    data: { website },
  });
});

// Create website
export const createWebsite = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, domain, subdomain, theme, settings, seo } = req.body;

  const existingWebsite = await Website.findOne({ domain });
  if (existingWebsite) {
    throw new CustomError('Website with this domain already exists', 400);
  }

  const website = await Website.create({
    name,
    domain,
    subdomain,
    theme,
    settings,
    seo,
    hotelInfo: {
      title: `Welcome to ${name}`,
      description: '',
      contact: { phone: '', email: '', address: '', coordinates: { lat: 0, lng: 0 } },
      socialLinks: {},
      images: { banner: '', logo: '', gallery: [] },
      amenities: [],
      nearbyAttractions: [],
      transportLinks: [],
    },
    rooms: [],
    heroSections: [],
    ourStory: {
      title: '',
      subTitle: '',
      percentage: '',
      suites: '',
      images: [],
    },
    facilities: [],
    reviews: [],
    siteSettings: {
      logo: '',
      footerLogo: '',
      footerDescription: '',
    },
  });

  res.status(201).json({
    success: true,
    message: 'Website created successfully',
    data: { website },
  });
});

// Update website
export const updateWebsite = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, domain, subdomain, theme, settings, seo, isActive, hotelInfo } = req.body;

  if (domain) {
    const existingWebsite = await Website.findOne({ domain, _id: { $ne: req.params.id } });
    if (existingWebsite) {
      throw new CustomError('Domain is already in use', 400);
    }
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (domain !== undefined) updateData.domain = domain;
  if (subdomain !== undefined) updateData.subdomain = subdomain;
  if (theme !== undefined) updateData.theme = theme;
  if (settings !== undefined) updateData.settings = settings;
  if (seo !== undefined) updateData.seo = seo;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (hotelInfo !== undefined) updateData.hotelInfo = hotelInfo;

  const website = await Website.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Website updated successfully',
    data: { website },
  });
});

// Delete website
export const deleteWebsite = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const website = await Website.findById(req.params.id);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  // Unassign admin if present
  if (website.assignedAdmin) {
    await User.findByIdAndUpdate(website.assignedAdmin, {
      $unset: { websiteId: 1 },
      $pull: { websiteAccess: website._id },
    });
  }

  // Delete website image folder from public
  deleteWebsiteFolder(website.name);

  await website.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Website deleted successfully',
  });
});

// Switch active website
export const switchWebsite = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const website = await Website.findById(req.params.id)
    .populate('assignedAdmin', 'name email');
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  if (req.user && req.user.role === 'admin' && req.websiteId) {
    if (website._id.toString() !== req.websiteId) {
      throw new CustomError('You do not have access to this website', 403);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Website switched successfully',
    data: { website },
  });
});

// Assign admin to website (super_admin only)
export const assignAdmin = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { adminId } = req.body;
  const websiteId = req.params.id;

  const website = await Website.findById(websiteId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  if (adminId) {
    const admin = await User.findById(adminId);
    if (!admin) {
      throw new CustomError('Admin user not found', 404);
    }
    if (admin.role !== 'admin') {
      throw new CustomError('User must have admin role to be assigned to a website', 400);
    }

    website.assignedAdmin = admin._id;
    admin.websiteId = website._id;
    if (!admin.websiteAccess.includes(website._id)) {
      admin.websiteAccess.push(website._id);
    }
    await admin.save();
  } else {
    const previousAdminId = website.assignedAdmin;
    website.assignedAdmin = undefined as any;
    if (previousAdminId) {
      await User.findByIdAndUpdate(previousAdminId, {
        $pull: { websiteAccess: website._id },
        $unset: { websiteId: 1 },
      });
    }
  }

  await website.save();

  const updatedWebsite = await Website.findById(websiteId)
    .populate('assignedAdmin', 'name email');

  res.status(200).json({
    success: true,
    message: adminId ? 'Admin assigned successfully' : 'Admin removed successfully',
    data: { website: updatedWebsite },
  });
});

// ========================
// ROOM CRUD (embedded in Website)
// ========================

// Get rooms for a website
export const getRooms = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const websiteId = req.params.websiteId || req.websiteId;
  const website = await Website.findById(websiteId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  res.status(200).json({
    success: true,
    count: website.rooms.length,
    data: { rooms: website.rooms },
  });
});

// Add room to website
export const addRoom = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const websiteId = req.params.websiteId || req.websiteId;
  const { name, description, maxOccupancy, bedType, size, basePrice, mainImage, discountPercentage, discountPrice, detailImages, images, amenities, features, servicesIncluded, popularFacilities, isAvailable } = req.body;

  const website = await Website.findById(websiteId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  // Validate detailImages max 10
  if (detailImages && detailImages.length > 10) {
    throw new CustomError('Maximum 10 detail images allowed', 400);
  }

  website.rooms.push({
    name,
    description: description || '',
    maxOccupancy,
    bedType,
    size: size || 0,
    basePrice,
    mainImage: mainImage || '',
    discountPercentage: discountPercentage || '',
    detailImages: detailImages || [],
    images: images || [],
    amenities: amenities || [],
    features: features || [],
    servicesIncluded: servicesIncluded || [],
    popularFacilities: popularFacilities || [],
    isAvailable: isAvailable !== undefined ? isAvailable : true,
    discountPrice: discountPrice || 0,
  } as any);

  await website.save();

  const newRoom = website.rooms[website.rooms.length - 1];

  res.status(201).json({
    success: true,
    message: 'Room added successfully',
    data: { room: newRoom },
  });
});

// Update room in website
export const updateRoom = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { websiteId, roomId } = req.params;
  const wId = websiteId || req.websiteId;
  const { name, description, maxOccupancy, bedType, size, basePrice, mainImage, discountPercentage, discountPrice,
    detailImages, images, amenities, features, servicesIncluded, popularFacilities, isAvailable } = req.body;

  const website = await Website.findById(wId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  const room = website.rooms.find(r => r._id?.toString() === roomId);
  if (!room) {
    throw new CustomError('Room not found', 404);
  }

  if (name !== undefined) room.name = name;
  if (description !== undefined) room.description = description;
  if (maxOccupancy !== undefined) room.maxOccupancy = maxOccupancy;
  if (bedType !== undefined) room.bedType = bedType;
  if (size !== undefined) room.size = size;
  if (basePrice !== undefined) room.basePrice = basePrice;
  if (discountPrice !== undefined) room.discountPrice = discountPrice;
  if (mainImage !== undefined) {
    // Clean up old image file if replaced
    if (room.mainImage && room.mainImage !== mainImage) {
      deleteImageFile(room.mainImage);
    }
    room.mainImage = mainImage;
  }
  if (discountPercentage !== undefined) room.discountPercentage = discountPercentage;
  if (detailImages !== undefined) {
    if (detailImages.length > 10) {
      throw new CustomError('Maximum 10 detail images allowed', 400);
    }
    // Clean up removed detail image files
    const removedImages = (room.detailImages || []).filter((img: string) => !detailImages.includes(img));
    deleteMultipleImageFiles(removedImages);
    room.detailImages = detailImages;
  }
  if (images !== undefined) room.images = images;
  if (amenities !== undefined) room.amenities = amenities;
  if (features !== undefined) room.features = features;
  if (servicesIncluded !== undefined) room.servicesIncluded = servicesIncluded;
  if (popularFacilities !== undefined) room.popularFacilities = popularFacilities;
  if (isAvailable !== undefined) room.isAvailable = isAvailable;

  await website.save();

  res.status(200).json({
    success: true,
    message: 'Room updated successfully',
    data: { room },
  });
});

// Delete room from website
export const deleteRoom = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { websiteId, roomId } = req.params;
  const wId = websiteId || req.websiteId;

  const website = await Website.findById(wId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  const room = website.rooms.find(r => r._id?.toString() === roomId);
  if (!room) {
    throw new CustomError('Room not found', 404);
  }

  // Clean up image files
  deleteImageFile(room.mainImage);
  deleteMultipleImageFiles(room.detailImages || []);
  deleteMultipleImageFiles(room.images || []);

  website.rooms = website.rooms.filter(r => r._id?.toString() !== roomId);
  await website.save();

  res.status(200).json({
    success: true,
    message: 'Room deleted successfully',
  });
});

// ========================
// HERO SECTION CRUD (embedded in Website)
// ========================

// Get hero sections for a website
export const getHeroSections = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const websiteId = req.params.websiteId || req.websiteId;
  const website = await Website.findById(websiteId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  res.status(200).json({
    success: true,
    count: website.heroSections.length,
    data: { heroSections: website.heroSections },
  });
});

// Upsert hero section (create or update by page type)
export const upsertHeroSection = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const websiteId = req.params.websiteId || req.websiteId;
  const { page, image, text, subText, detailsText, isActive } = req.body;

  const website = await Website.findById(websiteId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  const existingIdx = website.heroSections.findIndex(h => h.page === page);
  if (existingIdx >= 0) {
    // Update existing
    const hero = website.heroSections[existingIdx];
    if (image !== undefined) {
      // Clean up old image file if replaced
      if (hero.image && hero.image !== image) {
        deleteImageFile(hero.image);
      }
      hero.image = image;
    }
    if (text !== undefined) hero.text = text;
    if (subText !== undefined) hero.subText = subText;
    if (detailsText !== undefined) hero.detailsText = detailsText;
    if (isActive !== undefined) hero.isActive = isActive;
  } else {
    // Create new
    website.heroSections.push({
      page,
      image: image || '',
      text: text || '',
      subText: subText || '',
      detailsText: detailsText || '',
      isActive: isActive !== undefined ? isActive : true,
    } as any);
  }

  await website.save();

  const heroSection = website.heroSections.find(h => h.page === page);

  res.status(200).json({
    success: true,
    message: 'Hero section saved successfully',
    data: { heroSection },
  });
});

// Delete hero section
export const deleteHeroSection = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { websiteId, heroId } = req.params;
  const wId = websiteId || req.websiteId;

  const website = await Website.findById(wId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  const hero = website.heroSections.find(h => h._id?.toString() === heroId);
  if (!hero) {
    throw new CustomError('Hero section not found', 404);
  }

  // Clean up image file
  deleteImageFile(hero.image);

  website.heroSections = website.heroSections.filter(h => h._id?.toString() !== heroId);
  await website.save();

  res.status(200).json({
    success: true,
    message: 'Hero section deleted successfully',
  });
});

// ========================
// PUBLIC API
// ========================

// Get website content by unique ID (no auth required)
export const getWebsiteByUniqueId = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { uniqueId } = req.params;

  const website = await Website.findOne({ uniqueId, isActive: true });

  console.log('Public API - Get website by unique ID:', uniqueId, 'Found:', website);

  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  // Return comprehensive website data for public consumption
  res.status(200).json({
    success: true,
    data: {
      website: {
        uniqueId: website.uniqueId,
        name: website.name,
        domain: website.domain,
        theme: website.theme,
        settings: website.settings,
        seo: website.seo,
        isActive: website.isActive,
      },
      hotelInfo: website.hotelInfo,
      rooms: website.rooms.filter(r => r.isAvailable),
      heroSections: website.heroSections.filter(h => h.isActive),
      ourStory: website.ourStory,
      facilities: website.facilities,
      reviews: website.reviews,
      siteSettings: website.siteSettings,
      // Additional data that might be useful for the frontend
      totalRooms: website.rooms.filter(r => r.isAvailable).length,
      totalFacilities: website.facilities.length,
      averageRating: website.reviews.length > 0 
        ? website.reviews.reduce((sum, review) => sum + review.rating, 0) / website.reviews.length 
        : 0,
    },
  });
});

// ========================
// SITE SETTINGS (logo, footer)
// ========================

// Get site settings
export const getSiteSettings = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const websiteId = req.params.websiteId || req.websiteId;
  const website = await Website.findById(websiteId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { siteSettings: website.siteSettings || { logo: '', footerLogo: '', footerDescription: '' } },
  });
});

// Update site settings
export const updateSiteSettings = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const websiteId = req.params.websiteId || req.websiteId;
  const { logo, footerLogo, footerDescription } = req.body;

  const website = await Website.findById(websiteId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  if (!website.siteSettings) {
    (website as any).siteSettings = { logo: '', footerLogo: '', footerDescription: '' };
  }

  if (logo !== undefined) {
    // Clean up old logo file if replaced
    if (website.siteSettings.logo && website.siteSettings.logo !== logo) {
      deleteImageFile(website.siteSettings.logo);
    }
    website.siteSettings.logo = logo;
  }
  if (footerLogo !== undefined) {
    // Clean up old footer logo file if replaced
    if (website.siteSettings.footerLogo && website.siteSettings.footerLogo !== footerLogo) {
      deleteImageFile(website.siteSettings.footerLogo);
    }
    website.siteSettings.footerLogo = footerLogo;
  }
  if (footerDescription !== undefined) website.siteSettings.footerDescription = footerDescription;

  await website.save();

  res.status(200).json({
    success: true,
    message: 'Site settings updated successfully',
    data: { siteSettings: website.siteSettings },
  });
});

// ========================
// OUR STORY (single embedded object in Website)
// ========================

// Get our story
export const getOurStory = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const websiteId = req.params.websiteId || req.websiteId;
  const website = await Website.findById(websiteId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { ourStory: website.ourStory || { title: '', subTitle: '', percentage: '', suites: '', images: [] } },
  });
});

// Update our story
export const updateOurStory = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const websiteId = req.params.websiteId || req.websiteId;
  const { title, subTitle, percentage, suites, images } = req.body;

  const website = await Website.findById(websiteId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  // Validate images max 20
  if (images && images.length > 20) {
    throw new CustomError('Maximum 20 images allowed', 400);
  }

  // Initialize ourStory if not exists
  if (!website.ourStory) {
    (website as any).ourStory = { title: '', subTitle: '', percentage: '', suites: '', images: [] };
  }

  if (title !== undefined) website.ourStory.title = title;
  if (subTitle !== undefined) website.ourStory.subTitle = subTitle;
  if (percentage !== undefined) website.ourStory.percentage = percentage;
  if (suites !== undefined) website.ourStory.suites = suites;
  if (images !== undefined) {
    // Clean up removed image files
    const oldImages = website.ourStory.images || [];
    const removedImages = oldImages.filter((img: string) => !images.includes(img));
    deleteMultipleImageFiles(removedImages);
    website.ourStory.images = images;
  }

  await website.save();

  res.status(200).json({
    success: true,
    message: 'Our Story updated successfully',
    data: { ourStory: website.ourStory },
  });
});

// ========================
// FACILITIES CRUD (embedded in Website)
// ========================

// Get all facilities
export const getFacilities = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const websiteId = req.params.websiteId || req.websiteId;
  const website = await Website.findById(websiteId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  res.status(200).json({
    success: true,
    count: website.facilities.length,
    data: { facilities: website.facilities },
  });
});

// Add facility
export const addFacility = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const websiteId = req.params.websiteId || req.websiteId;
  const { image, title, subTitle } = req.body;

  const website = await Website.findById(websiteId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  // Max 6 facilities
  if (website.facilities.length >= 6) {
    throw new CustomError('Maximum 6 facilities allowed', 400);
  }

  website.facilities.push({
    image: image || '',
    title: title || '',
    subTitle: subTitle || '',
  } as any);

  await website.save();

  const newFacility = website.facilities[website.facilities.length - 1];

  res.status(201).json({
    success: true,
    message: 'Facility added successfully',
    data: { facility: newFacility },
  });
});

// Update facility
export const updateFacility = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { websiteId, facilityId } = req.params;
  const wId = websiteId || req.websiteId;
  const { image, title, subTitle } = req.body;

  const website = await Website.findById(wId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  const facility = website.facilities.find(f => f._id?.toString() === facilityId);
  if (!facility) {
    throw new CustomError('Facility not found', 404);
  }

  if (image !== undefined) {
    // Clean up old image file if replaced
    if (facility.image && facility.image !== image) {
      deleteImageFile(facility.image);
    }
    facility.image = image;
  }
  if (title !== undefined) facility.title = title;
  if (subTitle !== undefined) facility.subTitle = subTitle;

  await website.save();

  res.status(200).json({
    success: true,
    message: 'Facility updated successfully',
    data: { facility },
  });
});

// Delete facility
export const deleteFacility = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { websiteId, facilityId } = req.params;
  const wId = websiteId || req.websiteId;

  const website = await Website.findById(wId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  const facility = website.facilities.find(f => f._id?.toString() === facilityId);
  if (!facility) {
    throw new CustomError('Facility not found', 404);
  }

  // Clean up image file
  deleteImageFile(facility.image);

  website.facilities = website.facilities.filter(f => f._id?.toString() !== facilityId);
  await website.save();

  res.status(200).json({
    success: true,
    message: 'Facility deleted successfully',
  });
});

// ========================
// REVIEWS CRUD (embedded in Website)
// ========================

// Get all reviews
export const getReviews = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const websiteId = req.params.websiteId || req.websiteId;
  const website = await Website.findById(websiteId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  res.status(200).json({
    success: true,
    count: website.reviews.length,
    data: { reviews: website.reviews },
  });
});

// Add review
export const addReview = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const websiteId = req.params.websiteId || req.websiteId;
  const { avatar, name, review, rating } = req.body;

  const website = await Website.findById(websiteId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  website.reviews.push({
    avatar: avatar || '',
    name,
    review: review || '',
    rating,
  } as any);

  await website.save();

  const newReview = website.reviews[website.reviews.length - 1];

  res.status(201).json({
    success: true,
    message: 'Review added successfully',
    data: { review: newReview },
  });
});

// Update review
export const updateReview = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { websiteId, reviewId } = req.params;
  const wId = websiteId || req.websiteId;
  const { avatar, name, review, rating } = req.body;

  const website = await Website.findById(wId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  const rev = website.reviews.find(r => r._id?.toString() === reviewId);
  if (!rev) {
    throw new CustomError('Review not found', 404);
  }

  if (avatar !== undefined) {
    // Clean up old avatar file if replaced
    if (rev.avatar && rev.avatar !== avatar) {
      deleteImageFile(rev.avatar);
    }
    rev.avatar = avatar;
  }
  if (name !== undefined) rev.name = name;
  if (review !== undefined) rev.review = review;
  if (rating !== undefined) rev.rating = rating;

  await website.save();

  res.status(200).json({
    success: true,
    message: 'Review updated successfully',
    data: { review: rev },
  });
});

// Delete review
export const deleteReview = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { websiteId, reviewId } = req.params;
  const wId = websiteId || req.websiteId;

  const website = await Website.findById(wId);
  if (!website) {
    throw new CustomError('Website not found', 404);
  }

  const rev = website.reviews.find(r => r._id?.toString() === reviewId);
  if (!rev) {
    throw new CustomError('Review not found', 404);
  }

  // Clean up avatar file
  deleteImageFile(rev.avatar);

  website.reviews = website.reviews.filter(r => r._id?.toString() !== reviewId);
  await website.save();

  res.status(200).json({
    success: true,
    message: 'Review deleted successfully',
  });
});
