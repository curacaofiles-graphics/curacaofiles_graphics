import type { Key, Translate } from "./i18n";

// Register vocabulary (roles, entity groups, company types, domain statuses) -> translation key.
// The register uses a small fixed set of these words; anything not listed here is shown as written.
const TERMS: Record<string, Key> = {
  "Ultimate Beneficiary Owner": "term.ubo",
  "Managing Director": "term.managingDirector",
  "Compliance Officer": "term.complianceOfficer",
  "Official Representative": "term.officialRepresentative",
  "Non Executive Director": "term.nonExecutiveDirector",
  "Chief Executive Officer": "term.ceo",
  "Chief Financial Officer": "term.cfo",
  "Chief Technical Officer": "term.cto",
  Founder: "term.founder",
  Administrator: "term.administrator",
  "Chief Operations Officer": "term.coo",
  "Corporate Trustee": "term.corporateTrustee",
  Trustee: "term.trustee",
  "Qualified Person": "term.qualifiedPerson",
  "Local Representative": "term.localRepresentative",
  "Gaming Operator": "term.gamingOperator",
  Holdings: "term.holdings",
  "Local Representative Provider": "term.localRepProvider",
  "Trust Services": "term.trustServices",
  "Master Licensor": "term.masterLicensor",
  Unknown: "term.unknown",
  Unkinown: "term.unknown", // spelled so in the source list
  "B2C Operator": "term.b2cOperator",
  active: "term.active",
  inactive: "term.inactive",
  deleted: "term.deleted",
};

/** A register word in the interface language; unknown words are returned unchanged. */
export function term(t: Translate, value: string | null | undefined): string {
  if (!value) return "";
  const key = TERMS[value];
  return key ? t(key) : value;
}

/** True when `term` would translate the word (the original is then worth showing as a tooltip). */
export function isTerm(value: string | null | undefined): boolean {
  return !!value && value in TERMS;
}
