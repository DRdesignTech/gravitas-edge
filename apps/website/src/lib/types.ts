export interface UserProfile {
  fullName?: string | null;
  phone?: string | null;
  location?: string | null;
  yearsExperience?: number | null;
  monthsExperience?: number | null;
  currentJobTitle?: string | null;
  currentCompany?: string | null;
  profileImg?: string | null;
  createdAt?: string;
}

export interface User {
  id: string;
  email: string;
  phone?: string | null;
  status: string;
  emailVerified?: boolean;
  createdAt: string;
  roles: string[];
  profile?: UserProfile | null;
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
  locked?: boolean;
  sortOrder?: number;
  experienceLevels?: ExperienceLevel[];
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
  salary?: string | null;
  experienceText?: string | null;
  externalRef?: string | null;
  applicationUrl?: string | null;
  applicationContact?: string | null;
  source?: string | null;
  category: string;
  status: string;
  publishedDate?: string | null;
  expiryDate?: string | null;
  createdAt: string;
  experienceLevels?: ExperienceLevel[];
  vaults?: Vault[];
  isPremium?: boolean;
  isFullAccess?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  durationDays: number;
  isActive: boolean;
  vaults?: Vault[];
}

export interface Subscription {
  id: string;
  plan?: {
    id: string;
    name?: string;
    description?: string | null;
    price?: number;
    currency?: string;
    durationDays?: number;
  };
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  cancelledAt?: string | null;
  vaultAccess?: { vaultId: string; vaultName?: string | null }[];
  effectiveStatus?: string;
  isActive?: boolean;
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

export interface OpportunityQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  country?: string;
  location?: string;
  industry?: string;
  employmentType?: string;
  experienceLevelId?: string;
  vaultId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

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

export const VAULT_TYPES = ['INDIA', 'GLOBAL', 'MIDDLE_EAST', 'INTERNATIONAL', 'OTHER'] as const;

export const VAULT_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;

export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;

export const SUBSCRIPTION_STATUSES = [
  'ACTIVE',
  'EXPIRED',
  'CANCELLED',
  'PENDING',
  'FAILED',
] as const;

export const OPPORTUNITY_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'EXPIRED'] as const;

// ── Referral types ──────────────────────────────────────────────────

export interface ReferralCode {
  referralCode: string;
  referralLink: string;
}

export interface ReferralSummary extends ReferralCode {
  counts: {
    totalReferrals: number;
    successfulReferrals: number;
    pendingReferrals: number;
    invalidReferrals: number;
    suspendedReferrals: number;
  };
  commissionTotalAmount: string;
}

export interface ReferralItem {
  id: string;
  referrerId: string;
  referredUserId: string;
  code: string;
  referralLink: string | null;
  status: string;
  successfulDate: string | null;
  invalidReason: string | null;
  suspendedReason: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  referredUser: {
    id: string;
    email: string;
    status: string;
  } | null;
  commissions: {
    id: string;
    status: string;
    commissionAmount: string;
  }[];
}

export interface CommissionItem {
  id: string;
  referralId: string;
  subscriptionId: string | null;
  commissionPercentage: string;
  commissionAmount: string;
  subscriptionAmount: string;
  status: string;
  approvedDate: string | null;
  paidDate: string | null;
  payoutReference: string | null;
  rejectedReason: string | null;
  createdAt: string;
  updatedAt: string;
  referral: {
    id: string;
    referredUser: {
      id: string;
      email: string;
    } | null;
    successfulDate: string | null;
  } | null;
  subscription: {
    id: string;
    plan: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface CommissionStatistics {
  counts: {
    total: number;
    pending: number;
    approved: number;
    paid: number;
    rejected: number;
    cancelled: number;
  };
  totalCommissionAmount: string;
}

export const REFERRAL_STATUSES = ['PENDING', 'SUCCESSFUL', 'INVALID', 'SUSPENDED'] as const;

export const COMMISSION_STATUSES = [
  'PENDING',
  'APPROVED',
  'PAID',
  'REJECTED',
  'CANCELLED',
] as const;

export interface ReferralQuery {
  page?: number;
  limit?: number;
  status?: string;
}

export interface CommissionQuery {
  page?: number;
  limit?: number;
  status?: string;
}

export interface Resume {
  id: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  uploadStatus?: string;
  uploadedAt: string;
}

export interface GuestResumeInfo {
  originalName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  linked?: boolean;
}
