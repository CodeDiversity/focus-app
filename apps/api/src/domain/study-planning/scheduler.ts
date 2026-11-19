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
 *
 * EP17B (contracts.md §3; D17-3, D-B1…D-B4) adds the pacing objective. It
 * changes *how much* one assignment may take on one day; it changes nothing
 * about ordering, gap choice, energy, study blocks, breaks, min/max block
 * length or the FLEX/FIXED partition:
 *
 * 9. **Daily pacing** (`spreadPercent`). The engine no longer fills each
 *    day to its budget before looking at the next one. For an assignment
 *    `A` and a day `D` of `A`'s horizon:
 *
 *    ```text
 *    evenShare(A)    = max(oneSitting(A), ceil(A.remainingAtRunStart / |usableDays(A)|))
 *    paceTarget(A,D) = dayBudget(D) - (dayBudget(D) - evenShare(A)) * spreadPercent/100
 *    dayTake(A,D)    = max(paceTarget(A,D), A.remaining - capacityAfter(A,D))
 *    ```
 *
 *    and `A` takes at most `dayTake(A, D)` minutes on `D`.
 *    - `usableDays(A)` are the days of `A`'s horizon whose **run-start**
 *      budget is non-zero (D-B3); the share is rounded up (D-B4) and read
 *      from run-start inputs only, so it is stable within a run and
 *      independent of iteration order (purity, rule 5).
 *    - `oneSitting(A)` is one full session for `A`
 *      (`min(A.remainingAtRunStart, sessionLengthMinutes)`, never below
 *      `minSessionMinutes`). Pacing spreads work across days; it never
 *      shatters a single sitting into sub-session slivers, and so it never
 *      throttles the *number* of distinct pieces of work a day may hold
 *      (D17-3, EP17B-AC5). Without this floor twelve 20-minute assignments
 *      would each be paced to a few unplaceable minutes a day.
 *    - The `max(…)` term is the **feasibility floor** (R-EP17-01): pacing
 *      never voluntarily defers minutes the later horizon days cannot
 *      nominally absorb. Because `capacityAfter` is optimistic by design
 *      (it ignores gap fragmentation and competing work), the guarantee is
 *      *no worse than the rule 3 guarantee the engine already makes*, not
 *      "never a new deficit".
 *    - Rule 3's critical pass ignores the target entirely (D-B2): a
 *      deadline is a constraint, smoothness is a preference.
 *    - The target never *raises* a day's budget — rule 2's `dayBudgetOf`
 *      is still the hard cap — and minutes the target declines flow into
 *      the existing deficit/deferred classification, in no new category
 *      and never silently (EP17B-AC3).
 *    - `spreadPercent = 0` makes `paceTarget = dayBudget(D)`: the pre-EP17
 *      engine, byte for byte (EP17B-AC4, TR-E17-02).
 *
 * EP17C (contracts.md §4; ▲ D17-2 (a), D-C1, ▲ D-C2 (a)) adds the companion
 * rule that decides *which days* rule 9 spreads over:
 *
 * 9b. **Study-day selection** (`weeklyGoalDays`). The plan no longer assumes
 *    it may use all seven days. Once per run, from the run-start
 *    `baselineFreeMinutes` only:
 *
 *    ```text
 *    studyDays(window) = the `weeklyGoalDays` days of the window with the
 *                        most baseline free minutes; ties by earlier date
 *    ```
 *
 *    - `weeklyGoalDays` is the student's existing momentum yardstick, which
 *      ▲ D17-2 (a) promotes to a planning instruction as well (the momentum
 *      read's own use of the key is unchanged). The engine's defensive
 *      fallback for a missing or non-finite value is `7` — every day usable,
 *      i.e. the pre-EP17C engine byte for byte (EP17C-AC2, TR-E17-02) — and
 *      a window shorter than the count selects the whole window.
 *    - Ranking by free minutes (D-C1) puts the work where the student
 *      actually has room; the tie-break on the earlier date is total, and the
 *      input is run-start data, so the selection is deterministic (rule 5).
 *    - The narrowed budget is **pass-aware** (R-EP17-03); a single zeroing of
 *      `dayBudgetOf` would starve the deadline pass too. Per consumer:
 *      the **normal rotation** sees `0` on an unselected day; the **rule 3
 *      critical pass** keeps the *real* budget on every day, so a deadline
 *      always beats the preference and a one-day-a-week student with a
 *      Tuesday deadline still gets Tuesday; **`capacityAfter`** reads the
 *      narrowed budgets, so "can this still fit?" is asked about the days
 *      the plan may normally use — which is what lets rule 3 notice a
 *      deadline the selection alone would have missed; and the **anchor
 *      pass** reads the narrowed budgets per ▲ D-C2 (a): a narrower week
 *      genuinely makes a placement load-bearing, so more assignments pin
 *      `FIXED`, and that is intended rather than a regression.
 *    - **Full-horizon fallback.** An assignment with no selected day of
 *      positive budget inside its horizon keeps its *whole* horizon for the
 *      normal pass — smoothness never manufactures a miss. That fallback and
 *      the critical pass are the only two ways a session lands outside the
 *      selection (EP17C-AC1's two carve-outs).
 *    - The selection never raises a day's budget and adds no deficit
 *      category: minutes it declines flow through the same classification
 *      (`NO_AVAILABLE_TIME` still asks whether the student had free time at
 *      all, measured on the *unnarrowed* baseline, so no assignment changes
 *      category because of the selection alone — EP17C-AC3).
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

/**
 * EP17C rule 9b (D-C1) — the study-day selection: the `count` days of
 * `days` with the most baseline free minutes, ties broken by the earlier
 * date (`days` is in date order, so the original index *is* the date order).
 * Returns every day when `count` covers the window, which is what makes
 * `weeklyGoalDays = 7` a no-op (EP17C-AC2).
 *
 * Pure and total: the sort key pair (free minutes, index) is unique per day,
 * so the result cannot depend on the sort's stability or on input order
 * (EP17C-AC4). Exported for the domain spec only.
 */
export function selectStudyDays(
  days: readonly string[],
  freeMinutesOf: (date: string) => number,
  count: number
): Set<string> {
  if (count >= days.length) return new Set(days);
  const ranked = days
    .map((date, index) => ({ date, index, free: freeMinutesOf(date) }))
    .sort((a, b) => b.free - a.free || a.index - b.index);
  return new Set(ranked.slice(0, Math.max(0, count)).map((entry) => entry.date));
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
  // EP17B rule 9. The fallback is `0` — the pre-EP17 behaviour — so a caller
  // or a fixture written before EP17A added the key gets exactly the engine
  // it was written against (the service always supplies the real value,
  // defaulted to 70 by `readStudyPreferences`).
  const spreadPercent = Math.min(100, Math.max(0, safeInt(preferences.spreadPercent, 0)));
  /** One full sitting for an assignment — the floor of `evenShare` (rule 9). */
  const sittingLength = Math.max(
    minBlock,
    Math.min(safeInt(preferences.sessionLengthMinutes, maxBlock), maxBlock)
  );
  // EP17C rule 9b. The fallback is `7` — every day usable, the pre-EP17C
  // behaviour — so a caller or a fixture written against the older engine
  // gets exactly that engine (the service always supplies the real value,
  // defaulted to 3 by `readStudyPreferences`). Bounds 1…7 mirror
  // `STUDY_PREFERENCE_BOUNDS.weeklyGoalDays`.
  const weeklyGoalDays = Math.min(7, Math.max(1, safeInt(preferences.weeklyGoalDays, 7)));

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

  // EP17C rule 9b — the study-day selection, computed once from run-start
  // data only (`baselineFreeMinutes` never changes during the run), so it is
  // deterministic and independent of placement order (EP17C-AC4).
  const studyDays = selectStudyDays(
    days,
    (date) => baselineFreeMinutes.get(date) ?? 0,
    weeklyGoalDays
  );

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
   * EP17C rule 9b — the **full-horizon fallback**: an assignment with no
   * selected day of positive budget inside its horizon would otherwise be
   * starved by the selection alone, so its normal pass keeps the whole
   * horizon. Smoothness never manufactures a miss (contracts §4,
   * EP17C-AC3). Computed from run-start data only.
   */
  const fullHorizonFallback = new Set<Progress>();
  for (const item of progress) {
    const hasUsableDay = days.some(
      (date) => item.horizon.has(date) && studyDays.has(date) && dayBudgetOf(date) > 0
    );
    if (!hasUsableDay) fullHorizonFallback.add(item);
  }

  /**
   * EP17C rule 9b — the budget the **normal** pass may spend on `item` on
   * `date`: the real day budget on a selected day (or for a fallback
   * assignment), `0` otherwise. This is the one narrowed reading; the rule 3
   * critical pass deliberately keeps `dayBudgetOf` / `budgetLeft`.
   */
  const normalBudgetOf = (item: Progress, date: string): number =>
    studyDays.has(date) || fullHorizonFallback.has(item) ? dayBudgetOf(date) : 0;

  /**
   * An optimistic upper bound on what an assignment could still receive on
   * the days **after** `date`: the per-day budgets of its remaining horizon,
   * ignoring breaks and competing work. Optimistic on purpose — the
   * feasibility override (rule 3) must fire only when variety would *really*
   * cost a deadline, never merely because another assignment might compete.
   *
   * EP17C rule 9b (contracts §4): the budgets read here are the **narrowed**
   * ones, so the estimate is about the days the plan may normally use. That
   * is what lets rule 3 notice a deadline the selection alone could not
   * meet and serve it on any day of the window.
   */
  const capacityAfter = (item: Progress, date: string): number => {
    let total = 0;
    for (const day of days) {
      if (day > date && item.horizon.has(day)) {
        total += normalBudgetOf(item, day);
      }
    }
    return total;
  };

  /**
   * EP17B rule 9 — the per-assignment even share, computed **once**, from
   * run-start inputs only (`remainingMinutes` as handed in, the run-start
   * day budgets and the horizon), never from `item.remaining`, which
   * mutates during the run. That is what makes the target stable within a
   * run and independent of iteration order (EP17B-AC4).
   */
  const evenShareOf = new Map<Progress, number>();
  for (const item of progress) {
    // EP17C rule 9b: `usableDays(A)` are the horizon days that survive the
    // study-day selection (contracts §3 + §4), i.e. the days with a positive
    // **narrowed** budget. Reading the unnarrowed budgets here would divide
    // the share over days the normal pass may not use, and a student who
    // asked for three study days would get seven days' worth of thin,
    // under-filled targets.
    let usableDays = 0;
    for (const date of days) {
      if (item.horizon.has(date) && normalBudgetOf(item, date) > 0) usableDays += 1;
    }
    const atRunStart = Math.max(0, safeInt(item.assignment.remainingMinutes, 0));
    // D-B4: round the share up, so rounding can never leave a residue no day
    // may absorb. With no usable day there is nothing to share over.
    const share = usableDays > 0 ? Math.ceil(atRunStart / usableDays) : atRunStart;
    evenShareOf.set(item, Math.max(Math.min(atRunStart, sittingLength), share));
  }

  /**
   * EP17B rule 9 — the most `item` may take on `date` in the **normal**
   * pass: the blend of the day's budget and the even share, raised back up
   * by the feasibility floor (R-EP17-01). Never above the day's budget —
   * pacing only ever lowers a take (rule 2 stays the hard cap).
   */
  const dayTakeOf = (item: Progress, date: string): number => {
    // EP17C rule 9b: the normal pass's budget — `0` on an unselected day.
    const budget = normalBudgetOf(item, date);
    if (spreadPercent === 0) return budget;
    const share = evenShareOf.get(item) ?? budget;
    const paceTarget = budget - Math.floor(((budget - share) * spreadPercent) / 100);
    const floored = Math.max(paceTarget, item.remaining - capacityAfter(item, date));
    return Math.max(0, Math.min(budget, floored));
  };

  /**
   * How many minutes `item` may still take **today** under rule 9. Seeded
   * per day in the placement loop; an assignment the day's critical pass
   * owns is absent from the map and so is uncapped (D-B2).
   */
  let paceLeft = new Map<Progress, number>();
  const paceLeftOf = (item: Progress): number => paceLeft.get(item) ?? Number.POSITIVE_INFINITY;

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
    // EP17B rule 9: the day's pacing allowance is consumed by whatever is
    // placed, whichever path placed it (the rotation, or a course tie that
    // served this item out of turn).
    const pace = paceLeft.get(item);
    if (pace !== undefined) paceLeft.set(item, Math.max(0, pace - usable));
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
    const dayBudget = budgetLeft.get(date) ?? 0;
    if (dayBudget <= 0 || item.remaining <= 0) return 0;

    // EP17C rule 9b: the normal rotation sees a zero budget on a day outside
    // the study-day selection. `preferEnergy === false` is the rule 3
    // critical pass, which keeps the real budget on every day (contracts §4)
    // — a deadline always beats the preference.
    if (preferEnergy && normalBudgetOf(item, date) <= 0) return 0;

    // EP17B rule 9: in the normal pass the day's budget is narrowed to what
    // this assignment's pacing target still allows today. It can only lower
    // the take; `budgetLeft` remains the hard per-day cap.
    const budget = Math.min(dayBudget, paceLeftOf(item));
    if (budget <= 0) return 0;

    const desired = desiredFor(item, budget);

    // A tail shorter than the minimum is never placed on its own: it merges
    // into the previous block or it is reported as a deficit (rule 4).
    if (desired < minBlock) {
      // EP17B rule 9: when it is the *pacing target* — not the work itself
      // or the day's budget — that has fallen below one legal block, the
      // day simply declines. Merging here would hand the assignment minutes
      // its target just refused (and, since `lastBlock` may belong to an
      // earlier day, would also move them backwards in the week).
      if (budget < dayBudget && desiredFor(item, dayBudget) >= minBlock) return 0;
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
          // EP17C rule 9b: the out-of-turn owner is still a normal-pass
          // placement, so it needs its own day to be usable too.
          normalBudgetOf(candidate, date) > 0 &&
          (candidate.assignment.courseId ?? null) === gap.courseId
      );
      if (owner) {
        // EP17B rule 9: the owner takes the gap under *its own* allowance.
        const ownerDesired = desiredFor(owner, Math.min(dayBudget, paceLeftOf(owner)));
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

    // EP17B rule 9: today's pacing allowance, seeded from each candidate's
    // state **at the start of the day** so it cannot drift with the
    // rotation. Critical work is left out of the map entirely, which is
    // what makes it uncapped (D-B2) — on the critical pass *and* in the
    // rotation that follows, where it is still the same deadline.
    paceLeft = new Map<Progress, number>();
    if (spreadPercent > 0) {
      const criticalToday = new Set(critical);
      for (const item of candidates) {
        if (!criticalToday.has(item)) paceLeft.set(item, dayTakeOf(item, date));
      }
    }

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

    // EP17C rule 9b (▲ D-C2 (a)): the **narrowed** budgets. A narrower week
    // leaves less slack, so more assignments pin `FIXED` — intended, because
    // the partition's premise (EP13G D13-4) is "pin when the deadline makes
    // the exact placement load-bearing", and three study days genuinely make
    // it more load-bearing. Telling the student a session is flexible when
    // it is not would be the real regression.
    let horizonCapacity = 0;
    for (const date of days) {
      if (item.horizon.has(date)) horizonCapacity += normalBudgetOf(item, date);
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

  // EP17D (contracts §5): the rule 9b selection travels with the output, in
  // date order and independent of whether anything was placed on a day — the
  // service cannot recompute it (it never sees `baselineFreeMinutes`), and
  // the client cannot infer it (a selected-but-empty day is indistinguishable
  // from an unselected one in `sessions`). Days used only by the rule 3
  // critical pass are *not* here: they are outside the selection.
  return { sessions, results, studyDays: days.filter((date) => studyDays.has(date)) };
}
