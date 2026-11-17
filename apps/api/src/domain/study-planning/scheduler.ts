import { compareAssignments } from './ordering';
import { energyOf, freeIntervals, preferredPieces } from './intervals';
import type {
  AssignmentScheduleResult,
  DatedInterval,
  DeficitCategory,
  EnergyLevelValue,
  PartOfDayValue,
  PlannedSessionProposal,
  SchedulerInput,
  SchedulerOutput,
  SchedulableAssignment,
  WeeklyWindow,
} from './types';

/**
 * The deterministic scheduling engine (EP06C, **placement v2** — EP13F).
 *
 * A pure function: given the same input it returns the same output, with no
 * clock, no randomness, no database, no HTTP and no import from `@nestjs/*`
 * or the Prisma client. "Today" is `input.days[0]`; every time window is
 * supplied by the caller (D06-17, D06-24).
 *
 * The ordering rules are unchanged (the one shared comparator in
 * `ordering.ts`) and so is the one shared free-interval helper
 * (`intervals.ts`). What EP13F replaced is **placement**: v1 walked one
 * assignment at a time and packed fixed-length blocks back to back from the
 * earliest gap, which let a single assignment own a whole day, produced
 * plans with no breathing room, ignored `minSessionMinutes`/
 * `maxSessionMinutes` entirely (D06-20) and could place a 3-minute tail.
 *
 * Placement v2 is **day-centric** — for each day of the window, in order:
 *
 * 1. **Breaks** (`breakMinutes`): two sessions this run places on the same
 *    day are separated by at least the break. The break is consumed free
 *    time, never a stored row: it is implemented as a search-time buffer
 *    around each placed session, so the session rows themselves are
 *    unchanged. The buffer applies only between *placed* sessions — a
 *    session may still start the minute a class ends.
 * 2. **Density cap** (`densityPercent`): the minutes placed on a day are at
 *    most `densityPercent`% of that day's free minutes (free = the student's
 *    declared availability minus blocked time, classes and busy intervals,
 *    measured **before** this run places anything on the day) and never
 *    above `dailyCapMinutes`. `densityPercent: 100` reproduces the v1
 *    cap-only behaviour.
 * 3. **Interleaving**: within a day the engine rotates round-robin over the
 *    schedulable assignments in comparator order, so a day reads as variety
 *    rather than one long block of the same work. **Feasibility beats
 *    variety**: an assignment that cannot still fit in the days *after* this
 *    one (an optimistic upper-bound estimate) is *critical* and is served
 *    first, in deadline order, before any rotation happens.
 * 4. **Min/max honoured**: every placed block is within
 *    `[minSessionMinutes, maxSessionMinutes]`. A tail shorter than the
 *    minimum is never placed on its own — it merges into this run's previous
 *    block for the same assignment (growing it up to `maxSessionMinutes`, if
 *    the time right after it is free and the day's budget allows) or it is
 *    reported in the deficit, never silently dropped.
 * 5. **Purity and determinism**: every iteration is over a sorted structure
 *    and every tie-break is total, so the same input yields byte-identical
 *    output.
 *
 * EP13G adds one more rule on top of placement v2:
 *
 * 6. **Day-anchored by default** (D13-4 option b): a placed block is emitted
 *    `FLEX_DAY` — its slot is a suggestion, it belongs to its day, and it
 *    cannot be missed at a clock time — unless the assignment's deadline
 *    leaves no slack, in which case all of its blocks are `FIXED` and keep
 *    EP06's clock-commitment semantics. Flex blocks carry an honest
 *    `windowHint` derived from the slot the engine suggested.
 *
 * EP15C (D15-1, D15-6; contracts.md § Engine input) changes the **inputs**
 * and adds one ranking key, leaving every rule above untouched:
 *
 * 7. **Base = day bounds.** A day's free time starts from its `[wake,
 *    sleep)` bound (`dayBounds`, dated), minus `blocked` (events, dated —
 *    a one-off blocks only its date), classes, busy and placed time. A day
 *    with no bound has no free time.
 * 8. **Preferred tier.** The day's free gaps are split at the edges of the
 *    student's study blocks (`preferred`); pieces inside a block carry its
 *    energy and key, pieces outside are NORMAL and unkeyed. Placement
 *    scans the preferred tier first, then the rest; **within** each tier
 *    EP14E's `byEnergyPreference` applies unchanged (D-C2). Critical work
 *    ignores energy but still fills the preferred tier first. Inside a
 *    course-tied piece the rotation serves that course's assignments
 *    first (D-C3; feasibility still wins). Study blocks never change a
 *    day's free minutes (AC-E15-07). With `preferred` empty the output is
 *    byte-identical to the EP14E engine (EP15C-AC4).
 */

/** Convert a weekly window list into dated intervals for one civil date. */
function weeklyToDated(windows: WeeklyWindow[], date: string): DatedInterval[] {
  // The weekday of a civil date is getUTCDay() on its UTC midnight — the
  // same arithmetic as `dayOfWeekOf` in `common/lib/calendar-date.ts`,
  // Sunday = 0. Kept inline so this module stays zone-free (D06-17).
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const result: DatedInterval[] = [];
  for (const window of windows) {
    if (window.dayOfWeek !== weekday) {
      continue;
    }
    result.push(
      window.energy !== undefined
        ? {
            date,
            startMinute: window.startMinute,
            endMinute: window.endMinute,
            energy: window.energy,
          }
        : { date, startMinute: window.startMinute, endMinute: window.endMinute }
    );
  }
  return result;
}

/**
 * EP13J (D-J1, refines D13-10) — *demanding* work: a PAPER, PROJECT or EXAM,
 * or more than two hours of remaining work at the start of the run. Read
 * from the input, never the in-run remainder, so the label is stable.
 *
 * EP14E (D-E1/D-E2): the student's own `hard` flag wins when set —
 * `true` is demanding and `false` is light regardless of type and size;
 * `null`/absent keeps the D13-10 rule exactly (Auto).
 */
const DEMANDING_TYPES: ReadonlySet<string> = new Set(['PAPER', 'PROJECT', 'EXAM']);
export const DEMANDING_REMAINING_MINUTES = 120;

export function isDemanding(assignment: {
  assignmentType?: string | null;
  hard?: boolean | null;
  remainingMinutes: number;
}): boolean {
  if (assignment.hard != null) return assignment.hard;
  return (
    (assignment.assignmentType != null && DEMANDING_TYPES.has(assignment.assignmentType)) ||
    assignment.remainingMinutes > DEMANDING_REMAINING_MINUTES
  );
}

/**
 * EP13J (D-J3) — the gap scan order: demanding work looks at HIGH, then
 * NORMAL, then LOW gaps; light work at LOW, then NORMAL, then HIGH. A stable
 * sort keeps earliest-first inside each level, so when every gap is NORMAL
 * the order is exactly placement v2's (EP13J-AC3).
 *
 * EP14E (D-E3, D-E7) — the light-work timing guard, applied **within one
 * day's gap list** (`free` is a single date's earliest-first list, so days
 * are never compared and which day a block lands on is untouched): the
 * *anchor* is that day's earliest NORMAL gap that can host a legal block
 * (≥ `minBlock`). A LOW gap keeps rank 0 only when it sits in the same part
 * of the day (`windowHintOf`) as the anchor; otherwise it ranks after every
 * NORMAL gap and still before HIGH (a preference, never a constraint). With
 * no usable NORMAL gap the guard does not apply; with every gap NORMAL there
 * is no LOW gap, so the output is identical (EP13J-AC3).
 */
const DEMANDING_RANK: Record<EnergyLevelValue, number> = { HIGH: 0, NORMAL: 1, LOW: 2 };
const LIGHT_RANK: Record<EnergyLevelValue, number> = { LOW: 0, NORMAL: 1, HIGH: 2 };
const LIGHT_RANK_LOW_OFF_PART_OF_DAY = 1.5;

/** Exported for the domain spec only (EP14E-AC3 pins the D-E7 rank order). */
export function byEnergyPreference(
  free: DatedInterval[],
  demanding: boolean,
  minBlock: number
): DatedInterval[] {
  const rank = demanding ? DEMANDING_RANK : LIGHT_RANK;
  const anchor = demanding
    ? undefined
    : free.find((gap) => energyOf(gap) === 'NORMAL' && gap.endMinute - gap.startMinute >= minBlock);
  const anchorPart = anchor ? windowHintOf(anchor.startMinute) : null;
  const rankOf = (gap: DatedInterval): number => {
    const level = energyOf(gap);
    if (anchorPart !== null && level === 'LOW' && windowHintOf(gap.startMinute) !== anchorPart) {
      return LIGHT_RANK_LOW_OFF_PART_OF_DAY;
    }
    return rank[level];
  };
  return free
    .map((interval, index) => ({ interval, index }))
    .sort((a, b) => rankOf(a.interval) - rankOf(b.interval) || a.index - b.index)
    .map(({ interval }) => interval);
}

/** Sum the free minutes of a list of intervals. */
function freeMinutes(intervals: DatedInterval[]): number {
  let total = 0;
  for (const interval of intervals) {
    total += interval.endMinute - interval.startMinute;
  }
  return total;
}

/**
 * A defensive integer read. The engine's input type says these are numbers,
 * but the module is also reachable from JavaScript callers and from fixtures
 * written before EP13F added the two keys — a missing value must fall back,
 * never poison the arithmetic with `NaN`.
 */
function safeInt(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

/**
 * EP13G — the part-of-day hint for a flex block, read off the slot the
 * engine suggested. Deliberately mechanical: the hint is a description of
 * the suggestion, never an extra preference to reconcile.
 */
function windowHintOf(startMinute: number): PartOfDayValue {
  if (startMinute < 12 * 60) return 'MORNING';
  if (startMinute < 17 * 60) return 'AFTERNOON';
  return 'EVENING';
}

/** The per-assignment mutable state of one run. */
type Progress = {
  assignment: SchedulableAssignment;
  /** What is still to place. */
  remaining: number;
  /** What has been placed so far. */
  placedMinutes: number;
  /** The days this assignment may be placed on (its horizon). */
  horizon: Set<string>;
  /** The last block this run placed for it, or `null`. */
  lastBlock: PlannedSessionProposal | null;
  /** EP13J (D-J1) — fixed for the run. */
  demanding: boolean;
};

export function schedule(input: SchedulerInput): SchedulerOutput {
  const { days, preferences } = input;
  const today = days.length > 0 ? days[0] : '';
  const lastDay = days.length > 0 ? days[days.length - 1] : '';

  // Normalize the two placement levers defensively: the engine's input type
  // allows any `StudyPreferences`, and a non-HTTP caller may hand in values
  // the defensive reader would have repaired (D06-14 lives at the service
  // boundary, not here).
  const breakMinutes = Math.max(0, safeInt(preferences.breakMinutes, 0));
  const densityPercent = Math.min(100, Math.max(0, safeInt(preferences.densityPercent, 100)));
  const maxBlock = Math.max(1, safeInt(preferences.maxSessionMinutes, 1));
  const minBlock = Math.max(1, Math.min(safeInt(preferences.minSessionMinutes, 1), maxBlock));

  // Sort the assignments by the one shared comparator (D06-22).
  const sorted: SchedulableAssignment[] = [...input.assignments].sort((a, b) =>
    compareAssignments(
      { id: a.id, dueDate: a.dueDate, priority: a.priority, createdAt: a.createdAt },
      { id: b.id, dueDate: b.dueDate, priority: b.priority, createdAt: b.createdAt },
      today
    )
  );

  const sessions: PlannedSessionProposal[] = [];
  const placedSessions: DatedInterval[] = []; // every session placed so far

  /** The day's free intervals, given everything placed so far (rule 7). */
  const freeFor = (date: string, placed: DatedInterval[]): DatedInterval[] =>
    freeIntervals({
      date,
      base: { kind: 'declared', windows: input.dayBounds },
      blocked: input.blocked,
      classes: weeklyToDated(input.classes, date),
      busy: input.busy,
      placed,
    });

  /**
   * Rule 8 — the gap scan order for one day: preferred pieces first, then
   * the rest; EP14E's energy order (or the plain earliest-first scan for
   * critical work) inside each tier. With no study blocks the preferred
   * tier is empty and the result is exactly the pre-EP15 order.
   */
  const rankGaps = (
    free: DatedInterval[],
    date: string,
    demanding: boolean,
    preferEnergy: boolean
  ): DatedInterval[] => {
    const pieces = preferredPieces(free, input.preferred, date);
    const preferredTier = pieces.filter((gap) => gap.preferredKey !== undefined);
    const otherTier = pieces.filter((gap) => gap.preferredKey === undefined);
    if (!preferEnergy) return [...preferredTier, ...otherTier];
    return [
      ...byEnergyPreference(preferredTier, demanding, minBlock),
      ...byEnergyPreference(otherTier, demanding, minBlock),
    ];
  };

  // The free minutes of each day **before** this run places anything. They
  // are the density denominator (rule 2) and the capacity estimate the
  // feasibility check reads (rule 3), and they never change during the run.
  const baselineFreeMinutes = new Map<string, number>();
  for (const date of days) {
    baselineFreeMinutes.set(date, freeMinutes(freeFor(date, [])));
  }

  /** The most this run may place on a day (rule 2). */
  const dayBudgetOf = (date: string): number => {
    const free = baselineFreeMinutes.get(date) ?? 0;
    return Math.min(preferences.dailyCapMinutes, Math.floor((free * densityPercent) / 100));
  };

  // Per-assignment state, in comparator order.
  const progress: Progress[] = sorted.map((assignment) => {
    const overdue = assignment.dueDate < today;
    // Horizon dates: overdue → every day of the window; otherwise the days
    // up to and including the due date (D06-2 — never after the deadline).
    const horizon = overdue ? [...days] : days.filter((d) => d <= assignment.dueDate);
    return {
      assignment,
      remaining: assignment.remainingMinutes,
      placedMinutes: 0,
      horizon: new Set(horizon),
      lastBlock: null,
      demanding: isDemanding(assignment),
    };
  });

  /**
   * An optimistic upper bound on what an assignment could still receive on
   * the days **after** `date`: the per-day budgets of its remaining horizon,
   * ignoring breaks and competing work. Optimistic on purpose — the
   * feasibility override (rule 3) must fire only when variety would *really*
   * cost a deadline, never merely because another assignment might compete.
   */
  const capacityAfter = (item: Progress, date: string): number => {
    let total = 0;
    for (const day of days) {
      if (day > date && item.horizon.has(day)) {
        total += dayBudgetOf(day);
      }
    }
    return total;
  };

  /**
   * Expand every placed interval of `date` by the break on both sides (rule
   * 1). Subtracting these from the day's free time is what guarantees the
   * gap; the stored sessions keep their own minutes.
   */
  const withBreakBuffers = (placed: DatedInterval[], date: string): DatedInterval[] => {
    if (breakMinutes === 0) return placed;
    return placed.map((interval) =>
      interval.date === date
        ? {
            date: interval.date,
            startMinute: Math.max(0, interval.startMinute - breakMinutes),
            endMinute: interval.endMinute + breakMinutes,
          }
        : interval
    );
  };

  /**
   * Try to grow this run's previous block for `item` by `minutes` (rule 4's
   * merge). The growth must stay inside `maxSessionMinutes`, land on free
   * time directly after the block, and fit the day's remaining budget.
   * Returns the minutes actually merged (`0` when the merge is impossible).
   */
  const tryMergeTail = (
    item: Progress,
    minutes: number,
    budgetLeft: Map<string, number>
  ): number => {
    const block = item.lastBlock;
    if (!block || minutes <= 0) return 0;
    if (block.durationMinutes + minutes > maxBlock) return 0;
    const budget = budgetLeft.get(block.date) ?? 0;
    if (budget < minutes) return 0;

    // The extension must be free time directly after the block. Free
    // intervals are computed with every placement except this block itself,
    // so the window right after it shows up as free.
    const others = placedSessions.filter(
      (placed) =>
        !(
          placed.date === block.date &&
          placed.startMinute === block.startMinute &&
          placed.endMinute === block.endMinute
        )
    );
    const free = freeFor(block.date, withBreakBuffers(others, block.date));
    const host = free.find(
      (interval) =>
        interval.startMinute <= block.startMinute && interval.endMinute >= block.endMinute + minutes
    );
    if (!host) return 0;

    // Grow the block in place: same row, longer.
    block.endMinute += minutes;
    block.durationMinutes += minutes;
    const index = placedSessions.findIndex(
      (placed) =>
        placed.date === block.date &&
        placed.startMinute === block.startMinute &&
        placed.endMinute === block.endMinute - minutes
    );
    if (index >= 0) {
      placedSessions[index] = {
        date: block.date,
        startMinute: block.startMinute,
        endMinute: block.endMinute,
      };
    }
    budgetLeft.set(block.date, budget - minutes);
    item.remaining -= minutes;
    item.placedMinutes += minutes;
    return minutes;
  };

  /** Rule 4 — the desired block length for `item` on a day with `budget` left. */
  const desiredFor = (item: Progress, budget: number): number =>
    Math.min(preferences.sessionLengthMinutes, item.remaining, maxBlock, budget);

  /**
   * The first gap of the day's ranked scan that can host a legal block for
   * `item`, or `null`. EP13J (D-J3): energy reorders the scan (a
   * preference, never a constraint — every gap is still tried); critical
   * work keeps the plain earliest-first scan so feasibility is never traded
   * for preference. EP15C rule 8 adds the preferred tier in front.
   */
  const pickGap = (
    item: Progress,
    date: string,
    desired: number,
    preferEnergy: boolean
  ): DatedInterval | null => {
    const earliestFirst = freeFor(date, withBreakBuffers(placedSessions, date));
    for (const interval of rankGaps(earliestFirst, date, item.demanding, preferEnergy)) {
      // A gap that cannot host a legal block is skipped, not half-filled.
      if (Math.min(desired, interval.endMinute - interval.startMinute) >= minBlock) {
        return interval;
      }
    }
    return null;
  };

  /** Commit a block for `item` at the start of `interval`. Returns the minutes placed. */
  const commitBlock = (
    item: Progress,
    date: string,
    interval: DatedInterval,
    desired: number,
    budgetLeft: Map<string, number>
  ): number => {
    const budget = budgetLeft.get(date) ?? 0;
    const usable = Math.min(desired, interval.endMinute - interval.startMinute);
    const block: PlannedSessionProposal = {
      assignmentId: item.assignment.id,
      assignmentTitle: item.assignment.title,
      date,
      startMinute: interval.startMinute,
      endMinute: interval.startMinute + usable,
      durationMinutes: usable,
      // EP13G rule 6: day-anchored by default. The post-pass below pins
      // the blocks of any assignment whose deadline leaves no slack.
      anchor: 'FLEX_DAY',
      windowHint: windowHintOf(interval.startMinute),
    };
    sessions.push(block);
    placedSessions.push({
      date,
      startMinute: block.startMinute,
      endMinute: block.endMinute,
    });
    budgetLeft.set(date, budget - usable);
    item.remaining -= usable;
    item.placedMinutes += usable;
    item.lastBlock = block;
    return usable;
  };

  /**
   * Place one block for `item` on `date` if the rules allow. Returns the
   * minutes placed (`0` when nothing could be placed on this day).
   *
   * EP15C rule 8 (D-C3) — the course tie: when the gap this item would
   * take lies inside a study block tied to **another** candidate's course,
   * that candidate takes the gap instead (comparator order among several)
   * and `item` is retried on what is left. Only the turn order inside the
   * tied piece changes; the rotation, budgets and every other rule are
   * untouched, and critical work (`preferEnergy = false`) never defers.
   */
  const placeBlock = (
    item: Progress,
    date: string,
    budgetLeft: Map<string, number>,
    preferEnergy = true,
    courseCandidates: Progress[] = []
  ): number => {
    const budget = budgetLeft.get(date) ?? 0;
    if (budget <= 0 || item.remaining <= 0) return 0;

    const desired = desiredFor(item, budget);

    // A tail shorter than the minimum is never placed on its own: it merges
    // into the previous block or it is reported as a deficit (rule 4).
    if (desired < minBlock) {
      return tryMergeTail(item, Math.min(item.remaining, maxBlock), budgetLeft);
    }

    const gap = pickGap(item, date, desired, preferEnergy);
    if (!gap) return 0;

    if (
      preferEnergy &&
      gap.courseId !== undefined &&
      gap.courseId !== null &&
      gap.courseId !== (item.assignment.courseId ?? null)
    ) {
      const owner = courseCandidates.find(
        (candidate) =>
          candidate !== item &&
          candidate.remaining > 0 &&
          (candidate.assignment.courseId ?? null) === gap.courseId
      );
      if (owner) {
        const ownerDesired = desiredFor(owner, budget);
        if (
          ownerDesired >= minBlock &&
          Math.min(ownerDesired, gap.endMinute - gap.startMinute) >= minBlock
        ) {
          commitBlock(owner, date, gap, ownerDesired, budgetLeft);
          // The gap is taken; `item` tries again on what the day has left.
          return placeBlock(item, date, budgetLeft, preferEnergy, courseCandidates);
        }
      }
    }

    return commitBlock(item, date, gap, desired, budgetLeft);
  };

  // ---------------------------------------------------------------------
  // The day-centric placement loop.
  // ---------------------------------------------------------------------
  const budgetLeft = new Map<string, number>();
  for (const date of days) {
    budgetLeft.set(date, dayBudgetOf(date));
  }

  for (const date of days) {
    // The day's candidates, in comparator order (`progress` is already
    // sorted, so the rotation inherits the shared order — D06-22).
    let candidates = progress.filter((item) => item.remaining > 0 && item.horizon.has(date));
    if (candidates.length === 0) continue;

    // Rule 3's feasibility override: work that cannot still fit after today
    // is served first, in deadline order, without rotation.
    const critical = candidates.filter((item) => item.remaining > capacityAfter(item, date));
    for (const item of critical) {
      // Keep placing this assignment until the day can give it no more.
      while (item.remaining > 0 && (budgetLeft.get(date) ?? 0) > 0) {
        if (placeBlock(item, date, budgetLeft, false) === 0) break;
      }
    }

    // Rule 3 — round-robin over whatever is left of the day.
    candidates = candidates.filter((item) => item.remaining > 0);
    let cursor = 0;
    while (candidates.length > 0 && (budgetLeft.get(date) ?? 0) > 0) {
      if (cursor >= candidates.length) cursor = 0;
      const item = candidates[cursor];
      const placed = placeBlock(item, date, budgetLeft, true, candidates);
      // EP15C (D-C3): a course tie may have served another candidate out of
      // turn; one that is now done leaves the rotation without disturbing
      // the others' order.
      for (let i = candidates.length - 1; i >= 0; i -= 1) {
        if (candidates[i] !== item && candidates[i].remaining <= 0) {
          candidates.splice(i, 1);
          if (i < cursor) cursor -= 1;
        }
      }
      if (placed === 0 || item.remaining <= 0) {
        // This assignment is done for today (or done entirely): drop it from
        // the rotation without disturbing the others' turn order.
        candidates.splice(cursor, 1);
        continue;
      }
      cursor += 1;
    }
  }

  // ---------------------------------------------------------------------
  // Deficit / deferred classification (unchanged categories, D06-11).
  // ---------------------------------------------------------------------
  const results: AssignmentScheduleResult[] = progress.map((item) => {
    const { assignment } = item;
    const remainingTotal = assignment.remainingMinutes;
    const overdue = assignment.dueDate < today;
    const beyondWindow = !overdue && days.length > 0 && assignment.dueDate > lastDay;

    let deferredMinutes = 0;
    let deficitMinutes = 0;
    let deficitCategory: DeficitCategory | null = null;

    if (overdue) {
      deficitCategory = 'OVERDUE';
      deficitMinutes = remainingTotal; // full remaining, whatever was placed
    } else if (beyondWindow) {
      deferredMinutes = Math.max(0, remainingTotal - item.placedMinutes);
    } else if (item.placedMinutes < remainingTotal) {
      // Capacity in this assignment's horizon, measured on the *inputs* —
      // "did the student have free time at all?". EP13F changed this from
      // v1's "capacity left after earlier assignments took their pick": a
      // week consumed by other work is `INSUFFICIENT_TIME_BEFORE_DEADLINE`,
      // not "you have no available time".
      let horizonCapacity = 0;
      for (const date of days) {
        if (item.horizon.has(date)) horizonCapacity += baselineFreeMinutes.get(date) ?? 0;
      }
      if (horizonCapacity === 0) {
        deficitCategory = 'NO_AVAILABLE_TIME';
        deficitMinutes = remainingTotal;
      } else {
        // Everything the rules declined to place — the density cap's
        // leftovers and dropped tails included — is reported here (AC-2:
        // no silent loss).
        deficitCategory = 'INSUFFICIENT_TIME_BEFORE_DEADLINE';
        deficitMinutes = remainingTotal - item.placedMinutes;
      }
    }

    return {
      assignmentId: assignment.id,
      placedMinutes: item.placedMinutes,
      deferredMinutes,
      deficitMinutes,
      deficitCategory,
    };
  });

  // ---------------------------------------------------------------------
  // EP13G rule 6 — the FLEX_DAY / FIXED partition (D13-4 option b).
  //
  // Blocks are day-anchored intentions unless the deadline makes their exact
  // placement load-bearing. An assignment pins when, inside its own horizon,
  // its remaining work leaves less than one minimum session of slack, or
  // when it ends with a deadline deficit.
  //
  // Two groups deliberately never pin:
  // - **overdue** work — there is no deadline left to protect, and pinning it
  //   would re-create exactly the "scheduled opportunity to fail" this story
  //   removes;
  // - work due **after** the window — its unplaced minutes are *deferred*,
  //   not a deficit, so this week carries no deadline pressure for it.
  //
  // `results` is built by mapping `progress`, so the indices line up.
  // ---------------------------------------------------------------------
  const pinned = new Set<string>();
  for (let index = 0; index < progress.length; index += 1) {
    const item = progress[index];
    const result = results[index];
    const { assignment } = item;
    const overdue = assignment.dueDate < today;
    const beyondWindow = !overdue && days.length > 0 && assignment.dueDate > lastDay;
    if (overdue || beyondWindow) continue;

    let horizonCapacity = 0;
    for (const date of days) {
      if (item.horizon.has(date)) horizonCapacity += dayBudgetOf(date);
    }
    const noSlack = assignment.remainingMinutes + minBlock > horizonCapacity;
    if (noSlack || result.deficitCategory === 'INSUFFICIENT_TIME_BEFORE_DEADLINE') {
      pinned.add(assignment.id);
    }
  }
  for (const session of sessions) {
    if (pinned.has(session.assignmentId)) {
      session.anchor = 'FIXED';
      session.windowHint = null;
    }
  }

  return { sessions, results };
}
