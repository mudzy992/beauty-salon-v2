export interface User {
  id: string;
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  phone?: string;
  gender?: 'MALE' | 'FEMALE' | null;
  /** false dok korisnik ne potvrdi spol u onboarding / profilu (admin može imati gender u bazi prije toga) */
  genderOnboardingCompleted?: boolean;
  avatar?: string;
  isAvatarPublic?: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  mustChangePassword?: boolean;
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
  gender: 'MALE' | 'FEMALE';
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
  | 'AWAITING_DAILY_LOG'
  | 'COMPLETED'
  | 'CANCELLED_BY_CLIENT'
  | 'CANCELLED_BY_STYLISTS'
  | 'NO_SHOW';

export interface ReservationServiceItem {
  id: string;
  reservationId?: string;
  serviceId: string;
  sortOrder?: number;
  service?: Service;
}

export interface Reservation {
  id: string;
  clientId: string;
  serviceId: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  bookingOrigin?: 'CLIENT_SELF_SERVICE' | 'STAFF_ADMIN' | 'STAFF_STYLIST';
  acceptanceMode?: 'INBOX' | 'DIRECT_ASSIGN';
  attendancePolicy?: 'CLIENT_REQUIRED' | 'STAFF_WAIVED';
  clientNotes?: string;
  confirmedStylistId?: string;
  attendanceConfirmedAt?: string;
  attendanceClientDeadlineAt?: string | null;
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
  payDebtsIntent?: boolean;
  publicReferenceCode?: string | null;
  createdAt: string;
  service?: Service;
  items?: ReservationServiceItem[];
  confirmedStylist?: StylistProfile;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    cancellationCount?: Array<{ cancellationCount: number; penaltyUntil?: string | null }>;
  };
  stylistResponses?: StylistResponse[];
}

export interface ReservationPaymentSummary {
  publicReferenceCode: string;
  actualPrice: number;
  tipAmount: number;
  serviceAmount: number;
  completedAt: string;
  loyaltyDiscountAmount: number;
  items: Array<{ name: string; unitPrice: number }>;
}

export interface StylistResponse {
  id: string;
  reservationId: string;
  stylistProfileId: string;
  status: 'PENDING' | 'LOCKED' | 'ACCEPTED' | 'REJECTED';
  lockedAt?: string;
  lockExpiresAt?: string;
  hasLockedOnce?: boolean;
  respondedAt?: string;
  rejectionReason?: string;
  stylistProfile?: StylistProfile;
}

export interface DailyLogEntry {
  id: string;
  publicReferenceCode?: string | null;
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
  items?: Array<{
    id?: string;
    serviceId: string;
    unitPrice?: number | string;
    sortOrder?: number;
    service?: { id: string; name: string; price?: number | string } | null;
  }>;
  debtPaymentEntries?: Array<{
    id: string;
    actualPrice: number | string;
    tipAmount?: number | string;
    debtId?: string | null;
    notes?: string | null;
    date?: string;
    service?: { id: string; name: string } | null;
    debt?: {
      id: string;
      amount: number | string;
      createdAt: string;
      service?: { id: string; name: string } | null;
    } | null;
  }>;
  client?: { id: string; firstName: string; lastName: string };
  stylistProfile?: StylistProfile;
  reservation?: {
    id: string;
    status: ReservationStatus;
    cancelReason: string | null;
    reservationDate: string;
    startTime: string;
    endTime: string;
    publicReferenceCode: string | null;
  } | null;
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
  holdState?: 'none' | 'pending_hold';
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string;
  heroImage?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  createdAt?: string;
  author?: { firstName: string; lastName: string };
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

export type ClientDebtStatus = 'OPEN' | 'SETTLED'

export interface ClientDebt {
  id: string
  clientId: string
  stylistProfileId: string
  serviceId?: string | null
  manualEntryId?: string | null
  reservationId?: string | null
  amount: number
  note?: string | null
  status: ClientDebtStatus
  createdById: string
  createdAt: string
  settledAt?: string | null
  settledById?: string | null
  service?: { id: string; name: string } | null
  stylistProfile?: StylistProfile | null
}
