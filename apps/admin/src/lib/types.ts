export interface UserProfile {
  fullName?: string | null;
  phone?: string | null;
  location?: string | null;
  yearsExperience?: number | null;
  monthsExperience?: number | null;
  currentJobTitle?: string | null;
  currentCompany?: string | null;
}

export interface User {
  id: string;
  email: string;
  phone?: string | null;
  status: string;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
  roles: string[];
  profile?: UserProfile | null;
  subscriptions?: { id: string; status: string; plan?: { name?: string } }[];
}

export interface ExperienceLevel {
  id: string;
  name: string;
  slug?: string;
  code?: string;
  minYears: number;
  maxYears?: number | null;
  description?: string | null;
  sortOrder?: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  badge?: string | null;
  quote: string;
  linkedinUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Vault {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  status: string;
  sortOrder?: number;
  createdAt?: string;
  deletedAt?: string | null;
  experienceLevels?: ExperienceLevel[];
  plans?: { id: string; name: string; isActive: boolean }[];
  _count?: { subscriptionAccess?: number };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  regularPrice: number;
  discountPercentage: number;
  currency: string;
  durationDays: number;
  isActive: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt?: string;
  deletedAt?: string | null;
  vaults?: Vault[];
  _count?: { subscriptions?: number };
}

export interface AdminSubscription {
  id: string;
  userId: string;
  user?: { id: string; email: string };
  plan?: {
    id: string;
    name: string;
    price: number;
    regularPrice?: number;
    discountPercentage?: number;
    currency: string;
  } | null;
  status: string;
  effectiveStatus?: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  cancelledAt?: string | null;
  vaultAccessCount?: number;
}

export type CouponStatus =
  'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'DISABLED' | 'USAGE_LIMIT_REACHED' | 'ARCHIVED';

export const COUPON_STATUSES: CouponStatus[] = [
  'ACTIVE',
  'SCHEDULED',
  'EXPIRED',
  'DISABLED',
  'USAGE_LIMIT_REACHED',
  'ARCHIVED',
];

export const COUPON_DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED'] as const;

export interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  discountType: (typeof COUPON_DISCOUNT_TYPES)[number];
  discountValue: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number | null;
  perUserUsageLimit: number;
  appliesToAllUsers: boolean;
  isActive: boolean;
  status?: CouponStatus;
  usageCount?: number;
  remainingUsage?: number | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  plans?: { id: string; name: string }[];
  users?: { id: string; email: string; name?: string | null }[];
}

export interface CouponUsageRow {
  id: string;
  usedAt: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  user: { id: string; email: string; name: string | null };
  plan: { id: string; name: string };
  payment: { id: string; status: string };
  subscription: { id: string; status: string } | null;
}

export interface Opportunity {
  id: string;
  title: string;
  description?: string | null;
  qualification?: string | null;
  company?: string | null;
  location?: string | null;
  country?: string | null;
  employmentType?: string | null;
  industry?: string | null;
  functionalArea?: string | null;
  minExperience?: number | null;
  maxExperience?: number | null;
  applicationUrl?: string | null;
  applicationContact?: string | null;
  source?: string | null;
  salary?: string | null;
  experienceText?: string | null;
  externalRef?: string | null;
  jobId?: string | null;
  serialNo?: number;
  category: string;
  status: string;
  publishedDate?: string | null;
  expiryDate?: string | null;
  createdAt: string;
  updatedAt?: string;
  experienceLevels?: ExperienceLevel[];
  vaults?: Vault[];
  creator?: { id: string; email: string };
  _count?: { vaults?: number; experienceLevels?: number };
}

export interface ImportPreviewRow {
  excelRow: number;
  classification: 'VALID' | 'INVALID' | 'DUPLICATE' | 'SKIPPED';
  title: string | null;
  reason: string | null;
  fields: Record<string, unknown> | null;
}

export interface ImportSheetSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicate: number;
  skipped: number;
}

export interface ImportPreviewSheet {
  sheetName: string;
  status: 'IMPORTED' | 'EMPTY' | 'SKIPPED';
  matchStatus: 'matched' | 'unmatched' | 'ambiguous' | 'meta';
  vault: { id: string; name: string; type: string } | null;
  reason: string | null;
  summary: ImportSheetSummary;
  rows: ImportPreviewRow[];
}

export interface ImportPreviewResponse {
  sourceType: 'csv' | 'xlsx';
  selectedVault: { id: string; name: string; type: string };
  sheets: ImportPreviewSheet[];
  summary: ImportSheetSummary;
  matchedSheets: Array<{ sheetName: string; vaultName: string | null }>;
  unmatchedSheets: Array<{ sheetName: string; reason: string }>;
}

export interface ImportSheetSelection {
  sheetName: string;
  include: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export const VAULT_TYPES = ['INDIA', 'GLOBAL', 'MIDDLE_EAST', 'INTERNATIONAL', 'OTHER'] as const;
export const VAULT_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
export const SUBSCRIPTION_STATUSES = [
  'ACTIVE',
  'EXPIRED',
  'CANCELLED',
  'PENDING',
  'FAILED',
] as const;
export const OPPORTUNITY_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'EXPIRED'] as const;
export const OPPORTUNITY_CATEGORIES = [
  'INDIA',
  'GLOBAL',
  'MIDDLE_EAST',
  'INTERNATIONAL',
  'OTHER',
] as const;
export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'FREELANCE',
  'REMOTE',
  'HYBRID',
  'OTHER',
] as const;
export const ROLES = ['USER', 'ADMIN'] as const;

export interface UserSummary {
  id: string;
  email: string;
  status?: string;
  referralCode?: string | null;
}

export interface ReferralCommissionMin {
  id: string;
  status: string;
  commissionAmount: number | string;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  code: string;
  referralLink?: string | null;
  status: string;
  successfulDate?: string | null;
  invalidReason?: string | null;
  suspendedReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  referrer: UserSummary;
  referredUser: UserSummary;
  commissions: ReferralCommissionMin[];
}

export interface ReferralCommission {
  id: string;
  referralId: string;
  subscriptionId?: string | null;
  commissionPercentage: number | string;
  commissionAmount: number | string;
  subscriptionAmount: number | string;
  status: string;
  approvedDate?: string | null;
  paidDate?: string | null;
  payoutReference?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  referral?: {
    id: string;
    code: string;
    status: string;
    successfulDate?: string | null;
    referrer: { id: string; email: string };
    referredUser: { id: string; email: string };
  } | null;
  subscription?: {
    id: string;
    status: string;
    plan: { id: string; name: string; price: number; currency: string } | null;
  } | null;
}

export interface ReferralSlab {
  id: string;
  minReferrals: number;
  maxReferrals?: number | null;
  commissionPercentage: number | string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReferralSlabList {
  items: ReferralSlab[];
}

export interface AdminReferralQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AdminCommissionQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export const REFERRAL_STATUSES = ['PENDING', 'SUCCESSFUL', 'INVALID', 'SUSPENDED'] as const;
export const COMMISSION_STATUSES = [
  'PENDING',
  'APPROVED',
  'PAID',
  'REJECTED',
  'CANCELLED',
] as const;

export const REFERRAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  SUCCESSFUL: 'Successful',
  INVALID: 'Invalid',
  SUSPENDED: 'Suspended',
};

export const COMMISSION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  PAID: 'Paid',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export type DateRange = 'today' | '7d' | '30d' | '90d' | '1y' | 'month' | 'custom';

export interface AnalyticsOverview {
  totalUsers: number;
  newUsers: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  cancelledSubscriptions: number;
  pendingSubscriptions: number;
  failedSubscriptions: number;
  totalOpportunities: number;
  publishedOpportunities: number;
  totalPlans: number;
  activePlans: number;
  totalVaults: number;
  activeVaults: number;
  grossRevenue: number;
  monthlyRevenue: number;
  refundedCount: number;
  refundedAmount: number;
  referralRegistrations: number;
  periodReferralRegistrations: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalCommissions: number;
  periodCommissions: number;
  totalResumes: number;
  periodResumes: number;
}

export interface RevenueTimeline {
  period: string;
  revenue: number;
  paymentCount: number;
}

export interface RevenueData {
  totalRevenue: number;
  periodRevenue: number;
  refundedCount: number;
  refundedAmount: number;
  timeline: RevenueTimeline[];
}

export interface VaultAnalytics {
  id: string;
  name: string;
  type: string;
  status: string;
  purchases: number;
  activeUsers: number;
  revenue: number;
  percentageShare: number;
}

export interface OpportunityAnalytics {
  byCategory: { category: string; count: number }[];
  byEmploymentType: { type: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byCountry: { country: string; count: number }[];
  newInPeriod: number;
}

export interface RecentUser {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  createdAt: string;
}

export interface RecentSubscription {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  planName: string;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface RecentOpportunity {
  id: string;
  title: string;
  company: string | null;
  category: string;
  status: string;
  location: string | null;
  createdAt: string;
}

export interface TopVault {
  id: string;
  name: string;
  activeUsers: number;
}

export interface UsersAnalytics {
  recentUsers: RecentUser[];
  recentSubscriptions: RecentSubscription[];
  recentOpportunities: RecentOpportunity[];
  topVaults: TopVault[];
}

export interface TrendPoint {
  period: string;
  count: number;
}

export interface UserTrendData {
  totalUsers: number;
  newUsers: number;
  timeline: TrendPoint[];
}

export interface RecentReferral {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  successfulDate: string | null;
  referrerName: string | null;
  referrerEmail: string;
  referredName: string | null;
  referredEmail: string;
}

export interface ReferralAnalytics {
  totalReferrals: number;
  periodReferrals: number;
  byStatus: {
    successful: number;
    pending: number;
    invalid: number;
    suspended: number;
  };
  recentReferrals: RecentReferral[];
}

export interface CommissionStatusBreakdown {
  status: string;
  count: number;
  amount: number;
}

export interface CommissionAnalytics {
  totalCommissions: number;
  totalCount: number;
  periodCommissions: number;
  periodCount: number;
  byStatus: CommissionStatusBreakdown[];
}

export interface ResumeStatusBreakdown {
  status: string;
  count: number;
}

export interface ResumeAnalytics {
  totalResumes: number;
  periodResumes: number;
  byUploadStatus: ResumeStatusBreakdown[];
  timeline: TrendPoint[];
}
