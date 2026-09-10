import { api, uploadFile } from './api';
import {
  AdminSubscription,
  ImportPreviewResponse,
  Opportunity,
  PaginatedResult,
  SubscriptionPlan,
  User,
  Vault,
  ExperienceLevel,
  DateRange,
  AnalyticsOverview,
  RevenueData,
  VaultAnalytics,
  OpportunityAnalytics,
  UsersAnalytics,
  Referral,
  ReferralCommission,
  ReferralSlab,
  ReferralSlabList,
  AdminReferralQuery,
  AdminCommissionQuery,
  UserTrendData,
  ReferralAnalytics,
  CommissionAnalytics,
  ResumeAnalytics,
} from './types';

export interface UserQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
}

export interface VaultQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface PlanQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface SubscriptionQuery {
  page?: number;
  limit?: number;
  userId?: string;
  status?: string;
}

export interface OpportunityQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  country?: string;
  location?: string;
  industry?: string;
  employmentType?: string;
  vaultId?: string;
  sortBy?: string;
  sortOrder?: string;
}

const qs = (params: Record<string, any>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  });
  const str = p.toString();
  return str ? `?${str}` : '';
};

export function adminListUsers(query: UserQuery = {}) {
  return api.get<PaginatedResult<User>>(`/admin/users${qs(query)}`);
}

export function adminGetUser(id: string) {
  return api.get<User>(`/admin/users/${id}`);
}

export function adminUpdateUser(id: string, body: { status?: string; roles?: string[] }) {
  return api.patch<User>(`/admin/users/${id}`, body);
}

export function adminCreateUser(body: {
  email: string;
  password: string;
  role?: string;
  status?: string;
}) {
  return api.post<User>(`/admin/users`, body);
}

export function adminDeleteUser(id: string) {
  return api.del(`/admin/users/${id}`);
}

export function adminListVaults(query: VaultQuery = {}) {
  return api.get<PaginatedResult<Vault>>(`/admin/vaults${qs(query)}`);
}

export function adminGetVault(id: string) {
  return api.get<Vault>(`/admin/vaults/${id}`);
}

export function adminCreateVault(body: Partial<Vault>) {
  return api.post<Vault>('/admin/vaults', body);
}

export function adminUpdateVault(id: string, body: Partial<Vault>) {
  return api.patch<Vault>(`/admin/vaults/${id}`, body);
}

export function adminDeleteVault(id: string) {
  return api.del(`/admin/vaults/${id}`);
}

export function adminLinkVaultExperienceLevel(vaultId: string, experienceLevelId: string) {
  return api.post<ExperienceLevel[]>(`/admin/vaults/${vaultId}/experience-levels`, {
    experienceLevelId,
  });
}

export function adminUnlinkVaultExperienceLevel(vaultId: string, experienceLevelId: string) {
  return api.del<ExperienceLevel[]>(
    `/admin/vaults/${vaultId}/experience-levels/${experienceLevelId}`,
  );
}

export function adminListExperienceLevels() {
  return api.get<ExperienceLevel[]>('/admin/experience-levels');
}

export function adminCreateExperienceLevel(body: Partial<ExperienceLevel>) {
  return api.post<ExperienceLevel>('/admin/experience-levels', body);
}

export function adminUpdateExperienceLevel(id: string, body: Partial<ExperienceLevel>) {
  return api.patch<ExperienceLevel>(`/admin/experience-levels/${id}`, body);
}

export function adminDeleteExperienceLevel(id: string) {
  return api.del(`/admin/experience-levels/${id}`);
}

export function adminListPlans(query: PlanQuery = {}) {
  return api.get<PaginatedResult<SubscriptionPlan>>(`/admin/subscription-plans${qs(query)}`);
}

export function adminGetPlan(id: string) {
  return api.get<SubscriptionPlan>(`/admin/subscription-plans/${id}`);
}

export function adminCreatePlan(body: Partial<SubscriptionPlan>) {
  return api.post<SubscriptionPlan>('/admin/subscription-plans', body);
}

export function adminUpdatePlan(id: string, body: Partial<SubscriptionPlan>) {
  return api.patch<SubscriptionPlan>(`/admin/subscription-plans/${id}`, body);
}

export function adminDeletePlan(id: string) {
  return api.del(`/admin/subscription-plans/${id}`);
}

export function adminLinkPlanVault(planId: string, vaultId: string) {
  return api.post<Vault[]>(`/admin/subscription-plans/${planId}/vaults`, { vaultId });
}

export function adminUnlinkPlanVault(planId: string, vaultId: string) {
  return api.del<Vault[]>(`/admin/subscription-plans/${planId}/vaults/${vaultId}`);
}

export function adminListSubscriptions(query: SubscriptionQuery = {}) {
  return api.get<PaginatedResult<AdminSubscription>>(`/admin/subscriptions${qs(query)}`);
}

export function adminGetSubscription(id: string) {
  return api.get<AdminSubscription>(`/admin/subscriptions/${id}`);
}

export function adminListOpportunities(query: OpportunityQuery = {}) {
  return api.get<PaginatedResult<Opportunity>>(`/admin/opportunities${qs(query)}`);
}

export function adminGetOpportunity(id: string) {
  return api.get<Opportunity>(`/admin/opportunities/${id}`);
}

export function adminCreateOpportunity(
  body: Partial<Opportunity> & { vaultIds?: string[]; experienceLevelIds?: string[] },
) {
  return api.post<Opportunity>('/admin/opportunities', body);
}

export function adminUpdateOpportunity(
  id: string,
  body: Partial<Opportunity> & { vaultIds?: string[]; experienceLevelIds?: string[] },
) {
  return api.patch<Opportunity>(`/admin/opportunities/${id}`, body);
}

export function adminDeleteOpportunity(id: string) {
  return api.del(`/admin/opportunities/${id}`);
}

export function adminListReferrals(query: AdminReferralQuery = {}) {
  return api.get<PaginatedResult<Referral>>(`/admin/referrals${qs(query)}`);
}

export function adminGetReferral(id: string) {
  return api.get<Referral>(`/admin/referrals/${id}`);
}

export function adminSuspendReferral(id: string, body: { reason: string }) {
  return api.post<Referral>(`/admin/referrals/${id}/suspend`, body);
}

export function adminListCommissions(query: AdminCommissionQuery = {}) {
  return api.get<PaginatedResult<ReferralCommission>>(`/admin/commissions${qs(query)}`);
}

export function adminGetCommission(id: string) {
  return api.get<ReferralCommission>(`/admin/commissions/${id}`);
}

export function adminApproveCommission(id: string, body: { note?: string } = {}) {
  return api.post<ReferralCommission>(`/admin/commissions/${id}/approve`, body);
}

export function adminRejectCommission(id: string, body: { reason: string }) {
  return api.post<ReferralCommission>(`/admin/commissions/${id}/reject`, body);
}

export function adminPayCommission(id: string, body: { payoutReference?: string } = {}) {
  return api.post<ReferralCommission>(`/admin/commissions/${id}/pay`, body);
}

export function adminCancelCommission(id: string, body: { reason?: string } = {}) {
  return api.post<ReferralCommission>(`/admin/commissions/${id}/cancel`, body);
}

export function adminListReferralSlabs() {
  return api.get<ReferralSlabList>('/admin/referral-slabs');
}

export function adminUpdateReferralSlab(id: string, body: Partial<ReferralSlab>) {
  return api.patch<ReferralSlab>(`/admin/referral-slabs/${id}`, body);
}

export function adminImportOpportunities(file: File, vaultId: string, defaultStatus?: string) {
  return uploadFile<{
    imported: number;
    failed: number;
    skipped: number;
    errors: Array<{ row: number; title?: string; error: string }>;
  }>('/admin/opportunities/import', file, { vaultId, ...(defaultStatus ? { defaultStatus } : {}) });
}

export function adminPreviewImport(file: File, vaultId: string, defaultStatus?: string) {
  return uploadFile<ImportPreviewResponse>('/admin/opportunities/import/preview', file, {
    vaultId,
    ...(defaultStatus ? { defaultStatus } : {}),
  });
}

export function adminAnalyticsOverview(range: DateRange, startDate?: string, endDate?: string) {
  return api.get<AnalyticsOverview>(
    `/admin/analytics/overview${analyticsQs(range, startDate, endDate)}`,
  );
}

export function adminAnalyticsRevenue(range: DateRange, startDate?: string, endDate?: string) {
  return api.get<RevenueData>(`/admin/analytics/revenue${analyticsQs(range, startDate, endDate)}`);
}

export function adminAnalyticsVaults(range: DateRange, startDate?: string, endDate?: string) {
  return api.get<VaultAnalytics[]>(
    `/admin/analytics/vaults${analyticsQs(range, startDate, endDate)}`,
  );
}

export function adminAnalyticsOpportunities(
  range: DateRange,
  startDate?: string,
  endDate?: string,
) {
  return api.get<OpportunityAnalytics>(
    `/admin/analytics/opportunities${analyticsQs(range, startDate, endDate)}`,
  );
}

export function adminAnalyticsUsers(range: DateRange, startDate?: string, endDate?: string) {
  return api.get<UsersAnalytics>(`/admin/analytics/users${analyticsQs(range, startDate, endDate)}`);
}

export function adminAnalyticsUserTrend(range: DateRange, startDate?: string, endDate?: string) {
  return api.get<UserTrendData>(
    `/admin/analytics/user-trend${analyticsQs(range, startDate, endDate)}`,
  );
}

export function adminAnalyticsReferrals(range: DateRange, startDate?: string, endDate?: string) {
  return api.get<ReferralAnalytics>(
    `/admin/analytics/referrals${analyticsQs(range, startDate, endDate)}`,
  );
}

export function adminAnalyticsCommissions(range: DateRange, startDate?: string, endDate?: string) {
  return api.get<CommissionAnalytics>(
    `/admin/analytics/commissions${analyticsQs(range, startDate, endDate)}`,
  );
}

export function adminAnalyticsResumes(range: DateRange, startDate?: string, endDate?: string) {
  return api.get<ResumeAnalytics>(
    `/admin/analytics/resumes${analyticsQs(range, startDate, endDate)}`,
  );
}

function analyticsQs(range: DateRange, startDate?: string, endDate?: string) {
  const p = new URLSearchParams();
  p.set('range', range);
  if (startDate) p.set('startDate', startDate);
  if (endDate) p.set('endDate', endDate);
  return `?${p.toString()}`;
}
