// Legal status tag every compliance form template carries (Compliance Forms
// Build Reference, Legend). Shown to owners as "Legally required" /
// "Required if..." / "Best practice". The form catalog that uses this is
// Stage 0b work; only the type lives here for now.
export type ComplianceStatusTag = "M" | "M*" | "C" | "BP";

export type RefrigerationUnitType = "cold" | "frozen" | "hot_hold";

export type HighRiskActivity =
  | "sous_vide"
  | "raw_egg"
  | "rare_minced_meat"
  | "off_site_catering"
  | "modified_atmosphere";

export type TradeWasteAgreement = "yes" | "no" | "unsure";
