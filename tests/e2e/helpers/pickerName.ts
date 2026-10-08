import { rosterDisplayNames } from "../../../src/lib/staff/rosterDisplayName";

// The staff login picker shows short names ("Priya N."), not full names. Specs pass the full name they created.
export const pickerName = (fullName: string): string => rosterDisplayNames([{ id: "x", name: fullName }]).get("x") ?? fullName;
