-- EP13J (D-J5, D13-10): energy-tagged availability windows.
--
-- Additive. Every existing row reads back NORMAL (the column default), and
-- with every window NORMAL the scheduler's output is byte-identical to the
-- pre-EP13J engine (EP13J-AC3), so existing students see no change until
-- they tag a window. Blocked rows (`isAvailable = false`) carry the default
-- and the engine ignores it (D-J4).
--
-- Rollback: drop the column, then the enum type, in that order.

CREATE TYPE "EnergyLevel" AS ENUM ('HIGH', 'NORMAL', 'LOW');

ALTER TABLE "availability_slots"
  ADD COLUMN "energy" "EnergyLevel" NOT NULL DEFAULT 'NORMAL';
