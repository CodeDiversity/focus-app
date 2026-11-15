import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Body accepted by `POST /study-sessions/from-planned/:plannedSessionId`
 * (EP13I, D-I4). Optional and additive: EP13B/EP13D callers post no body and
 * keep their exact behaviour (the target defaults to the planned row's
 * duration).
 *
 * `plannedMinutes` exists for the micro-start (D-I1/D-I2): "Just 10 min"
 * starts the *linked* planned session with a 10-minute target, so the row
 * still moves IN_PROGRESS and the lifecycle stays EP13B's. Bounds mirror
 * EP07's session-duration band.
 */
export class StartFromPlannedDto {
  @IsOptional()
  @IsInt({ message: 'plannedMinutes must be an integer' })
  @Min(5, { message: 'plannedMinutes must be between 5 and 480' })
  @Max(480, { message: 'plannedMinutes must be between 5 and 480' })
  plannedMinutes?: number | null;
}
