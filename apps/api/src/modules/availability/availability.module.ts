import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

/**
 * Availability module (SP-128A, D404-11): the top-level
 * `/availability-slots` CRUD surface over the existing `AvailabilitySlot`
 * model (D404-5 — weekly-recurring windows and blocked times, no
 * migration, no bulk operations).  The calendar read model (SP-127A)
 * consumes the stored rows; the editor UI (SP-128B) consumes these routes.
 */
@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
