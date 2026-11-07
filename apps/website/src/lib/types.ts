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
  subscriptions?: Subscription[];
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

export interface VaultOpportunityCount {
  vaultId: string;
  vaultName: string;
  vaultType: string;
  count: number;
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
  salary?: string | null;
  experienceText?: string | null;
  externalRef?: string | null;
  jobId?: string | null;
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
  /** Server-masked teaser of protected fields 7-9 for callers without Vault access. */
  lockedPreview?: {
    qualification: string | null;
    otherDetails: string | null;
    howToApply: string | null;
    applicationContact: string | null;
  };
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

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  regularPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  currency: string;
  durationDays: number;
  durationLabel: string;
}

export interface PricingGroup {
  vault: { id: string; name: string; description?: string | null };
  plans: PricingPlan[];
}

export interface PurchaseCouponInfo {
  id: string;
  code: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
}

/** Server-frozen payment session, fetched by /subscriptions/payments/:id. */
export interface PaymentSession {
  paymentId: string;
  orderId: string | null;
  subscriptionId?: string | null;
  razorpaySubscriptionId?: string | null;
  shortUrl?: string | null;
  status: string;
  amount: number;
  currency: string;
  planId: string | null;
  planName: string | null;
  vaultId: string | null;
  vaultName: string | null;
  durationDays: number | null;
  couponCode: string | null;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  keyId?: string;
  recurring?: boolean;
  cleanupPending?: boolean;
}

export interface PurchaseResult {
  paymentId: string;
  orderId?: string;
  subscriptionId?: string;
  razorpaySubscriptionId?: string;
  shortUrl?: string;
  amount: number;
  currency: string;
  planId: string;
  planName: string;
  vaultId: string;
  vaultName: string;
  durationDays: number;
  status: string;
  coupon?: PurchaseCouponInfo;
  keyId?: string;
  recurring?: boolean;
}

export interface CouponSummary {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number | null;
  perUserUsageLimit: number;
  appliesToAllUsers: boolean;
  isActive: boolean;
}

export interface CouponValidationResult {
  coupon: CouponSummary;
  planId: string;
  planName: string;
  currency: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
}

export interface AvailableCoupon {
  coupon: CouponSummary;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
}

export interface AvailableCouponsResult {
  planId: string;
  currency: string;
  originalAmount: number;
  coupons: AvailableCoupon[];
}

export interface VerifyPaymentPayload {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  paymentId: string;
}

export interface VerifySubscriptionPayload {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
  paymentId: string;
}

export interface VerifySubscriptionResult {
  status: 'SUCCESS' | 'PENDING';
  message?: string;
  subscription?: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    vaultAccess?: { id?: string; vaultId: string; name?: string }[];
  };
  payment?: { id: string; status: string; amount: number; currency: string };
}

export interface ConfirmPurchaseResult {
  subscription: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    vaultAccess?: { vaultId: string; vaultName?: string | null }[];
  };
  payment: { id: string; status: string; orderId: string | null; amount: number; currency: string };
}

export interface Subscription {
  id: string;
  plan?: {
    id: string;
    name?: string;
    description?: string | null;
    price?: number;
    regularPrice?: number;
    discountPercentage?: number;
    discountedPrice?: number;
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
  /** When true, spread results evenly across all vaults (round-robin). */
  balanced?: boolean;
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

// ── Recruitment Vendor Access (RVA) ─────────────────────────────────

export interface RvaCategory {
  value: string;
  label: string;
  count: number;
}

export interface RvaPlan {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  autoPayAmount?: number | null;
  regularPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  currency: string;
  durationDays: number;
  durationLabel: string;
  vault: string;
}

/** Server-masked teaser of protected RVA fields for callers without access. */
export interface RvaLockedPreview {
  qualification: string | null;
  otherDetails: string | null;
  howToApply: string | null;
  applicationContact: string | null;
  budget: string | null;
}

/** Plan summary embedded in an RVA subscription / entitlement response. */
export interface RvaSubscriptionPlan {
  id: string;
  name: string;
  price: number;
  regularPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  currency: string;
  durationDays: number;
  durationLabel: string;
}

/** The signed-in user's own RVA subscription (scoped to RVA tables only). */
export interface RvaSubscriptionSummary {
  id: string;
  status: string;
  effectiveStatus: string;
  paymentReference?: string | null;
  startDate: string;
  endDate: string;
  cancelledAt?: string | null;
  autoRenew?: boolean;
  recurring?: boolean;
  nextBillingDate?: string | null;
  createdAt: string;
  vault: string;
  plan: RvaSubscriptionPlan | null;
}

/** `GET /recruitment-vendor/access/me` — lightweight RVA entitlement summary. */
export interface RvaAccessInfo {
  hasAccess: boolean;
  vault: string;
  subscription: RvaSubscriptionSummary | null;
}

export interface RvaOpportunity {
  id: string;
  serialNo: number | null;
  jobId: string | null;
  referenceId: string | null;
  title: string;
  role: string | null;
  category: string;
  categoryLabel: string;
  sector: string | null;
  company: string | null;
  organization: string | null;
  location: string | null;
  geography: string | null;
  country: string | null;
  experienceText: string | null;
  minExperience: number | null;
  maxExperience: number | null;
  publishedDate: string | null;
  expiryDate: string | null;
  createdAt: string;
  status: string;
  isFullAccess: boolean;
  /** Field 8 — Vendor Requirement / Scope (always visible). */
  requirements: string | null;
  /** Field 9 — Eligibility / Vendor Criteria (always visible). */
  eligibility: string | null;
  /** Always-visible safe teaser (null when the caller has no access). */
  budget?: string | null;
  /** Only present for entitled callers (last 3 workbook columns). */
  qualification?: string | null;
  otherDetails?: string | null;
  description?: string | null;
  howToApply?: string | null;
  applicationUrl?: string | null;
  applicationContact?: string | null;
  source?: string | null;
  lockedPreview?: RvaLockedPreview;
}

export interface RvaFaq {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
  sortOrder: number;
}

export interface RvaOverview {
  vault: string;
  publishedOpportunityCount: number;
  categories: RvaCategory[];
  previewOpportunities: RvaOpportunity[];
  previewMeta: PaginatedResult<RvaOpportunity>['meta'];
  plans: RvaPlan[];
  faqs: RvaFaq[];
}

export interface RvaPurchaseResult {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  planId: string;
  planName: string;
  durationDays: number;
  status: string;
  originalAmount?: number;
  discountAmount?: number;
  coupon?: CouponSummary;
  keyId?: string;
}

export interface RvaPaymentSession {
  paymentId: string;
  orderId: string | null;
  razorpaySubscriptionId?: string | null;
  status: string;
  amount: number;
  currency: string;
  planId: string | null;
  planName: string | null;
  durationDays: number | null;
  couponCode: string | null;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  keyId?: string;
}

export interface RvaConfirmResult {
  subscription: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    vault: string;
    plan?: {
      id: string;
      name: string;
      price: number;
      regularPrice: number;
      discountedPrice: number;
      discountPercentage: number;
      currency: string;
      durationDays: number;
      durationLabel: string;
    } | null;
  } | null;
  payment: { id: string; status: string; amount: number; currency: string };
  coupon?: PurchaseCouponInfo;
}
