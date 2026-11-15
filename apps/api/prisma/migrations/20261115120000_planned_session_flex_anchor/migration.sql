-- EP13G (D13-4, option b): day-anchored flexible sessions.
--
-- Additive. `startTime`/`endTime` stay non-nullable and keep their meaning
-- for FIXED rows; for FLEX_DAY rows they become the *suggested* slot, so
-- every existing consumer (calendar, conflict math, today read) keeps
-- working without a null check.
--
-- Backfill: the column default is FIXED, so every row that existed before
-- this migration keeps exactly the EP06/EP08 clock-commitment semantics.
-- `windowHint` is nullable and only ever set on a flex row.
--
-- Rollback: drop the two columns, then the two enum types, in that order.

CREATE TYPE "PlannedSessionAnchor" AS ENUM ('FIXED', 'FLEX_DAY');

CREATE TYPE "PartOfDay" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

ALTER TABLE "planned_sessions"
  ADD COLUMN "anchor" "PlannedSessionAnchor" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN "windowHint" "PartOfDay";
