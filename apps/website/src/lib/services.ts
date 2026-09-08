import { api } from './api';
import {
  CommissionItem,
  CommissionQuery,
  CommissionStatistics,
  Opportunity,
  OpportunityQuery,
  PaginatedResult,
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

export function fetchMySubscriptions() {
  return api.get<Subscription[]>('/subscriptions/me');
}

export function fetchMyActiveSubscriptions() {
  return api.get<Subscription[]>('/subscriptions/me/active');
}

export function fetchMyProfile() {
  return api.get<UserProfile>('/users/me/profile');
}

export function fetchMyResumes() {
  return api.get<Resume[]>('/resumes');
}

export function updateMyProfile(dto: Partial<UserProfile>) {
  return api.patch<User>('/users/me/profile', dto);
}

export function fetchMe() {
  return api.get<User>('/users/me');
}

export function fetchPublicPlans() {
  return api.get<SubscriptionPlan[]>('/subscriptions/plans');
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
