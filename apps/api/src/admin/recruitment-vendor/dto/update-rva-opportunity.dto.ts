import { PartialType } from '@nestjs/swagger';
import { CreateRvaOpportunityDto } from './create-rva-opportunity.dto';

export class UpdateRvaOpportunityDto extends PartialType(CreateRvaOpportunityDto) {}
