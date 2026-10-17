import { api, apiFetch, uploadFile } from './api';
import {
  AvailableCouponsResult,
  CommissionItem,
  CommissionQuery,
  CommissionStatistics,
  ConfirmPurchaseResult,
  CouponValidationResult,
  ExperienceLevel,
  GuestResumeInfo,
  Opportunity,
  OpportunityQuery,
  PaginatedResult,
  PaymentSession,
  PricingGroup,
  PurchaseResult,
  ReferralCode,
  ReferralItem,
  ReferralQuery,
  ReferralSummary,
  Resume,
  RvaConfirmResult,
  RvaFaq,
  RvaOpportunity,
  RvaOverview,
  RvaPaymentSession,
  RvaPlan,
  RvaPurchaseResult,
  Subscription,
  SubscriptionPlan,
  User,
  UserProfile,
  Vault,
  VaultOpportunityCount,
} from './types';

export function fetchOpportunities(query: OpportunityQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return api.get<PaginatedResult<Opportunity>>(`/opportunities${qs ? `?${qs}` : ''}`);
}

export function fetchOpportunity(id: string) {
  return api.get<Opportunity>(`/opportunities/${id}`);
}

export function fetchVaults() {
  return api.get<Vault[]>('/vaults');
}

export function fetchExperienceLevels() {
  return api.get<ExperienceLevel[]>('/experience-levels');
}

export async function fetchVaultById(id: string): Promise<Vault | null> {
  try {
    return await api.get<Vault>(`/vaults/${id}`);
  } catch {
    return null;
  }
}

export function fetchMySubscriptions() {
  return api.get<Subscription[]>('/subscriptions/me');
}

export function fetchMyActiveSubscriptions() {
  return api.get<Subscription[]>('/subscriptions/me/active');
}

export function fetchMyProfile(): Promise<UserProfile | null> {
  return api.get<UserProfile | null>('/users/me/profile');
}

export async function fetchMyResumes(): Promise<Resume[]> {
  const res = await api.get<{ data: Resume[]; meta: PaginatedResult<Resume>['meta'] }>('/resumes');
  return res?.data ?? [];
}

export function updateMyProfile(dto: Partial<UserProfile>) {
  return api.patch<User>('/users/me/profile', dto);
}

export function uploadProfileImage(file: File) {
  return uploadFile<User>('/users/me/profile-image', file);
}

export function uploadResume(file: File) {
  return uploadFile<Resume>('/resumes', file, 'resume');
}

export function uploadGuestResume(file: File, details: GuestResumeDetails) {
  const formData = new FormData();
  formData.append('resume', file);
  formData.append('fullName', details.fullName);
  formData.append('email', details.email);
  if (details.phone) formData.append('phone', details.phone);
  return postFormData<GuestResumeResult>('/resumes/guest', formData);
}

export function getGuestResume(token: string) {
  return api.get<{ resume: GuestResumeInfo }>(`/resumes/guest/${encodeURIComponent(token)}`);
}

export function replaceGuestResume(token: string, file: File) {
  return uploadFile<{ resume: GuestResumeInfo }>(
    `/resumes/guest/${encodeURIComponent(token)}`,
    file,
    'resume',
    'PUT',
  );
}

export function linkGuestResume(token: string) {
  return api.post<{ message: string; resumeId: string }>(
    `/resumes/guest/${encodeURIComponent(token)}/link`,
  );
}

export interface GuestResumeDetails {
  fullName: string;
  email: string;
  phone?: string;
}

export interface GuestResumeResult {
  token: string;
  resume: GuestResumeInfo;
}

function postFormData<T = any>(path: string, formData: FormData): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: formData });
}

export function removeProfileImage() {
  return api.delete<User>('/users/me/profile-image');
}

export function fetchMe() {
  return api.get<User>('/users/me');
}

export function fetchPublicPlans() {
  return api.get<SubscriptionPlan[]>('/subscriptions/plans');
}

export function fetchPublicPricing() {
  return api.get<PricingGroup[]>('/subscriptions/pricing');
}

export function purchasePlan(planId: string, vaultId?: string, couponCode?: string) {
  return api.post<PurchaseResult>('/subscriptions/purchase', {
    planId,
    ...(vaultId ? { vaultId } : {}),
    ...(couponCode ? { couponCode } : {}),
  });
}

export function validateCoupon(couponCode: string, planId: string) {
  return api.post<CouponValidationResult>('/coupons/validate', { couponCode, planId });
}

export function fetchAvailableCoupons(planId: string) {
  return api.get<AvailableCouponsResult>(`/coupons/available?planId=${encodeURIComponent(planId)}`);
}

export function verifyPayment(payload: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  paymentId: string;
}) {
  return api.post<ConfirmPurchaseResult>('/subscriptions/purchase/verify', payload);
}

export function confirmPurchase(paymentId: string) {
  return api.post<ConfirmPurchaseResult>('/subscriptions/purchase/confirm', { paymentId });
}

export function failPayment(paymentId: string) {
  return api.post<{ paymentId: string; status: string }>('/subscriptions/purchase/fail', {
    paymentId,
  });
}

export function fetchPaymentSession(paymentId: string) {
  return api.get<PaymentSession>(`/subscriptions/payments/${paymentId}`);
}

// ── Referral services ──────────────────────────────────────────────

export function generateReferralCode() {
  return api.post<ReferralCode>('/referrals');
}

export function fetchReferralSummary() {
  return api.get<ReferralSummary>('/referrals/me');
}

export function fetchMyReferrals(query: ReferralQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return api.get<PaginatedResult<ReferralItem>>(`/referrals/me/referrals${qs ? `?${qs}` : ''}`);
}

export function fetchMyCommissions(query: CommissionQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return api.get<PaginatedResult<CommissionItem>>(`/referrals/me/commissions${qs ? `?${qs}` : ''}`);
}

export function fetchCommissionStatistics() {
  return api.get<CommissionStatistics>('/referrals/me/statistics');
}

// ── Recruitment Vendor Access (RVA) services ───────────────────────

/** Aggregated landing-page data for the RVA vault (public). */
export function fetchRvaOverview(previewLimit?: number) {
  const qs = previewLimit ? `?previewLimit=${encodeURIComponent(String(previewLimit))}` : '';
  return api.get<RvaOverview>(`/recruitment-vendor/overview${qs}`);
}

export function fetchRvaPlans() {
  return api.get<RvaPlan[]>('/recruitment-vendor/plans');
}

export function fetchRvaFaqs() {
  return api.get<RvaFaq[]>('/recruitment-vendor/faqs');
}

export function fetchRvaOpportunities(query: { page?: number; limit?: number; search?: string } = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return api.get<PaginatedResult<RvaOpportunity>>(
    `/recruitment-vendor/opportunities${qs ? `?${qs}` : ''}`,
  );
}

export function fetchRvaOpportunity(id: string) {
  return api.get<RvaOpportunity>(`/recruitment-vendor/opportunities/${id}`);
}

export function purchaseRvaPlan(planId: string, couponCode?: string) {
  return api.post<RvaPurchaseResult>('/recruitment-vendor/purchase', {
    planId,
    ...(couponCode ? { couponCode } : {}),
  });
}

export function validateRvaCoupon(couponCode: string, planId: string) {
  return api.post<CouponValidationResult>('/recruitment-vendor/coupons/validate', {
    couponCode,
    planId,
  });
}

export function fetchAvailableRvaCoupons(planId: string) {
  return api.get<AvailableCouponsResult>(
    `/recruitment-vendor/coupons/available?planId=${encodeURIComponent(planId)}`,
  );
}

export function fetchRvaPaymentSession(paymentId: string) {
  return api.get<RvaPaymentSession>(`/recruitment-vendor/payments/${paymentId}`);
}

export function verifyRvaPayment(payload: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  paymentId: string;
}) {
  return api.post<RvaConfirmResult>('/recruitment-vendor/purchase/verify', payload);
}

export function failRvaPayment(paymentId: string) {
  return api.post<{ paymentId: string; status: string }>('/recruitment-vendor/purchase/fail', {
    paymentId,
  });
}

/** Fetch published opportunity counts per vault for the Free Preview. */
export function fetchVaultOpportunityCounts(): Promise<VaultOpportunityCount[]> {
  return api.get<VaultOpportunityCount[]>('/opportunities/vault-counts');
}
