import { PartialType } from '@nestjs/swagger';
import { CreateRvaCouponDto } from './create-rva-coupon.dto';

export class UpdateRvaCouponDto extends PartialType(CreateRvaCouponDto) {}
