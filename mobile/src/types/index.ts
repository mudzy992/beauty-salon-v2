export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  roles: UserRole[];
  createdAt: string;
}

export interface UserRole {
  id: string;
  role: Role;
}

export interface Role {
  id: string;
  name: 'SYSTEM_ADMIN' | 'OWNER' | 'STYLIST' | 'CLIENT';
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  subcategories?: ServiceSubcategory[];
}

export interface ServiceSubcategory {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  services?: Service[];
}

export interface Service {
  id: string;
  subcategoryId: string;
  name: string;
  shortDescription?: string;
  heroImage?: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  sortOrder: number;
  subcategory?: ServiceSubcategory;
}

export interface StylistProfile {
  id: string;
  userId: string;
  bio?: string;
  specialization?: string;
  isActive: boolean;
  user?: User;
}

export type ReservationStatus =
  | 'PENDING'
  | 'STYLIST_REVIEW'
  | 'CONFIRMED'
  | 'ATTENDANCE_CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED_BY_CLIENT'
  | 'CANCELLED_BY_STYLISTS'
  | 'NO_SHOW';

export interface Reservation {
  id: string;
  clientId: string;
  serviceId: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  clientNotes?: string;
  confirmedStylistId?: string;
  attendanceConfirmedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  rescheduleProposedStartTime?: string | null;
  rescheduleProposedEndTime?: string | null;
  rescheduleStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | null;
  loyaltyDiscountPercent?: number;
  loyaltyDiscountAmount?: number;
  loyaltyPointsUsed?: number;
  createdAt: string;
  service?: Service;
  confirmedStylist?: StylistProfile;
  client?: { id: string; firstName: string; lastName: string };
  stylistResponses?: StylistResponse[];
}

export interface StylistResponse {
  id: string;
  reservationId: string;
  stylistProfileId: string;
  status: 'PENDING' | 'LOCKED' | 'ACCEPTED' | 'REJECTED';
  lockedAt?: string;
  lockExpiresAt?: string;
  respondedAt?: string;
  rejectionReason?: string;
  stylistProfile?: StylistProfile;
}

export interface DailyLogEntry {
  id: string;
  stylistProfileId: string;
  reservationId?: string;
  serviceId: string;
  clientId: string;
  date: string;
  actualPrice: number;
  tipAmount: number;
  loyaltyDiscountPercent?: number;
  loyaltyDiscountAmount?: number;
  loyaltyPointsUsed?: number;
  notes?: string;
  status: 'PENDING' | 'COMPLETED';
  completedAt?: string;
  isManual: boolean;
  createdAt: string;
  service?: { id: string; name: string };
  client?: { id: string; firstName: string; lastName: string };
  stylistProfile?: StylistProfile;
  images?: DailyLogImage[];
}

export interface DailyLogImage {
  id: string;
  dailyLogEntryId: string;
  uploadId: string;
  isBefore: boolean;
  isAfter: boolean;
  description?: string;
  sortOrder: number;
  upload?: Upload;
}

export interface AvailableDate {
  date: string;
  available: boolean;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  availableStylistCount: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  heroImage?: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  author?: User;
}

export interface Review {
  id: string;
  userId: string;
  serviceId: string;
  stylistProfileId?: string;
  reservationId?: string;
  serviceRating: number;
  stylistRating?: number;
  comment?: string;
  isApproved: boolean;
  createdAt: string;
  user?: User;
  service?: Service;
}

export interface GalleryCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  images?: GalleryImage[];
}

export interface GalleryImage {
  id: string;
  categoryId: string;
  uploadId: string;
  title?: string;
  description?: string;
  sortOrder: number;
  upload?: Upload;
}

export interface Upload {
  id: string;
  originalName: string;
  mimeType: string;
  pathOriginal: string;
  pathThumb?: string;
  pathSmall?: string;
  pathMedium?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
  channel: 'PUSH' | 'EMAIL' | 'BOTH';
  isRead: boolean;
  sentAt: string;
  readAt?: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  type: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
}

export interface AppSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
