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
