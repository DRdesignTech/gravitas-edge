import { PartialType } from '@nestjs/swagger';
import { CreateRvaFaqDto } from './create-rva-faq.dto';

export class UpdateRvaFaqDto extends PartialType(CreateRvaFaqDto) {}
