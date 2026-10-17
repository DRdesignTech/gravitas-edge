import { CreateCouponDto } from '../../coupons/dto/create-coupon.dto';

/**
 * Recruitment Vendor Access coupon payload. Reuses the vault coupon transport
 * shape (same rules, same validation) but the admin service only ever applies
 * it to the isolated `RecruitmentVendorCoupon*` tables, so `planIds` must
 * reference `RecruitmentVendorPlan` rows.
 */
export class CreateRvaCouponDto extends CreateCouponDto {}
