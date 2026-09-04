import { Module } from '@nestjs/common';
import { VaultsController } from './vaults.controller';
import { VaultsService } from './vaults.service';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [AccessModule],
  controllers: [VaultsController],
  providers: [VaultsService],
})
export class VaultsModule {}
