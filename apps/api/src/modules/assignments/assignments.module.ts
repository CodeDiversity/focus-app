import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

/** EP03 assignment surface: quick create (SP-113A). Proposed stories
 * 2/3/5/6/7 extend this module with edit/delete, type, status, lists/filters
 * and overdue views; do not introduce a competing assignment resource.
 */
@Module({ controllers: [AssignmentsController], providers: [AssignmentsService] })
export class AssignmentsModule {}
