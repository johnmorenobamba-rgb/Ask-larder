// Suggestion assistant (John's review, 21 Sep 2026): a raw headcount
// threshold like "3 distinct staff members" can silently never fire for a
// genuinely small venue (a 4 to 6 person team could never produce 3 people
// asking the same question before a huge share of the whole team already
// has). Thresholds are sized as a proportion of the venue's own active
// staff count instead, with a floor so a single stray report never counts
// as a pattern even at a tiny venue, and an optional per-venue override
// (venues.content_suggestion_thresholds) for future manual tuning -- null
// for every venue today, so the computed default is what actually governs.

export interface ThresholdOverride {
  repeated_gap_staff_fraction?: number;
  repeated_gap_min_count?: number;
  escalation_min_count?: number;
  near_miss_min_count?: number;
}

export interface ResolvedThresholds {
  /** Minimum distinct staff members who must ask about the same clustered topic. */
  repeatedGapDistinctStaff: number;
  /** Minimum escalation reports in the same cluster. */
  escalationMinCount: number;
  /** Minimum near-miss reports in the same cluster. */
  nearMissMinCount: number;
}

const DEFAULT_REPEATED_GAP_STAFF_FRACTION = 0.3;
const DEFAULT_REPEATED_GAP_MIN_COUNT = 2;
const DEFAULT_ESCALATION_MIN_COUNT = 3;
const DEFAULT_NEAR_MISS_MIN_COUNT = 2;

export function resolveThresholds(activeStaffCount: number, override: ThresholdOverride | null | undefined): ResolvedThresholds {
  const staffFraction = override?.repeated_gap_staff_fraction ?? DEFAULT_REPEATED_GAP_STAFF_FRACTION;
  const minCount = override?.repeated_gap_min_count ?? DEFAULT_REPEATED_GAP_MIN_COUNT;

  // A venue genuinely mid-setup (zero or near-zero active staff) still gets
  // the floor, not zero -- ceil(0 * fraction) would otherwise let a single
  // report "pass" as a pattern.
  const proportional = Math.ceil(Math.max(0, activeStaffCount) * staffFraction);
  const repeatedGapDistinctStaff = Math.max(minCount, proportional);

  return {
    repeatedGapDistinctStaff,
    escalationMinCount: override?.escalation_min_count ?? DEFAULT_ESCALATION_MIN_COUNT,
    nearMissMinCount: override?.near_miss_min_count ?? DEFAULT_NEAR_MISS_MIN_COUNT,
  };
}
