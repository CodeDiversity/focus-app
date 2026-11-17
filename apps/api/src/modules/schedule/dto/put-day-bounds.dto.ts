import { ArrayMaxSize, ArrayMinSize, IsArray } from 'class-validator';

/**
 * Body accepted by `PUT /schedule/day-bounds` (EP15B, D-B4): exactly seven
 * `{ dayOfWeek, wakeTime, sleepTime }` entries, one per weekday.
 *
 * The array shape is declared here for the global `FieldValidationPipe`;
 * the **entries** are validated in the service so every failure is a
 * field-level error keyed `days[<i>].<field>` (plus `days` for the
 * one-per-weekday rule) — a nested DTO would collapse them into the stock
 * `message` array only. Unknown keys inside an entry are rejected there
 * too (whitelist parity).
 */
export class PutDayBoundsDto {
  @IsArray({ message: 'days must be an array of seven entries, one per weekday' })
  @ArrayMinSize(7, { message: 'days must hold exactly seven entries, one per weekday' })
  @ArrayMaxSize(7, { message: 'days must hold exactly seven entries, one per weekday' })
  days!: unknown[];
}
