import { api } from './api';
import {
  Opportunity,
  OpportunityQuery,
  PaginatedResult,
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

export function updateMyProfile(dto: Partial<UserProfile>) {
  return api.patch<User>('/users/me/profile', dto);
}

export function fetchMe() {
  return api.get<User>('/users/me');
}

export function fetchPublicPlans() {
  return api.get<SubscriptionPlan[]>('/subscriptions/plans');
}
