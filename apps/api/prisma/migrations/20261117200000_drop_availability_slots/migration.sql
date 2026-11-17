-- EP15I (AC1, contracts.md § Data model, Migration 2): drop the retired
-- availability_slots table. The data was copied into schedule_blocks by
-- 20261117120000_schedule_blocks_and_day_bounds (Migration 1); since then
-- nothing has read or written this table except the old /availability-slots
-- API, which this child deletes.
--
-- IRREVERSIBLE BY DESIGN (R-EP15-05): one-off blocks, multi-weekday series
-- and exceptions have no slot representation, so no reverse copy can restore
-- the table faithfully and none is provided. The deploy that applies this
-- migration takes a pre-drop backup first (pg_dump -t availability_slots);
-- recovery is restore-from-backup, never a reverse migration.

DROP TABLE "availability_slots";
