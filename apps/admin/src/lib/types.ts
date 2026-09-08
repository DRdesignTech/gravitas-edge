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

export interface Vault {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  status: string;
  sortOrder?: number;
  createdAt?: string;
  experienceLevels?: ExperienceLevel[];
  plans?: { id: string; name: string; isActive: boolean }[];
  _count?: { subscriptionAccess?: number };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  durationDays: number;
  isActive: boolean;
  createdAt?: string;
  vaults?: Vault[];
  _count?: { subscriptions?: number };
}

export interface AdminSubscription {
  id: string;
  userId: string;
  user?: { id: string; email: string };
  plan?: { id: string; name: string; price: number; currency: string } | null;
  status: string;
  effectiveStatus?: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  cancelledAt?: string | null;
  vaultAccessCount?: number;
}

export interface Opportunity {
  id: string;
  title: string;
  description?: string | null;
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

export type DateRange = '7d' | '30d' | '90d' | '1y' | 'custom';

export interface AnalyticsOverview {
  totalUsers: number;
  newUsers: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  cancelledSubscriptions: number;
  pendingSubscriptions: number;
  totalOpportunities: number;
  publishedOpportunities: number;
  totalPlans: number;
  activePlans: number;
  totalVaults: number;
  activeVaults: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export interface RevenueTimeline {
  month: string;
  revenue: number;
  paymentCount: number;
}

export interface RevenueData {
  totalRevenue: number;
  periodRevenue: number;
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
