import { PartialType } from '@nestjs/swagger';
import { CreateRvaPlanDto } from './create-rva-plan.dto';

export class UpdateRvaPlanDto extends PartialType(CreateRvaPlanDto) {}
