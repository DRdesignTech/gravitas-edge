import { api, apiFetch, uploadFile } from './api';
import {
  CommissionItem,
  CommissionQuery,
  CommissionStatistics,
  ExperienceLevel,
  GuestResumeInfo,
  Opportunity,
  OpportunityQuery,
  PaginatedResult,
  PricingGroup,
  PurchaseResult,
  ConfirmPurchaseResult,
  ReferralCode,
  ReferralItem,
  ReferralQuery,
  ReferralSummary,
  Resume,
  Subscription,
  SubscriptionPlan,
  User,
  UserProfile,
  Vault,
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
  const vaults = await fetchVaults();
  return vaults.find((v) => v.id === id) ?? null;
}

export function fetchMySubscriptions() {
  return api.get<Subscription[]>('/subscriptions/me');
}

export function fetchMyActiveSubscriptions() {
  return api.get<Subscription[]>('/subscriptions/me/active');
}

export function fetchMyProfile() {
  return api.get<UserProfile>('/users/me/profile');
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

export function purchasePlan(planId: string, vaultId?: string) {
  return api.post<PurchaseResult>('/subscriptions/purchase', { planId, ...(vaultId ? { vaultId } : {}) });
}

export function confirmPurchase(paymentId: string) {
  return api.post<ConfirmPurchaseResult>('/subscriptions/purchase/confirm', { paymentId });
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
