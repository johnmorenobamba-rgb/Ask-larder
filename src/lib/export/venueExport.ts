import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import JSZip from "jszip";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { formatLocalDateTime, venueTimeZone } from "@/lib/compliance/b2";
import { flattenValues, toCsv } from "./csv";

// Venue data export (hardening-2 task 7, the "no lock-in" function). FOUNDER RUN with the service role (scripts/export-venue.ts):
// one venue's records in a folder (and optionally a zip) OUTSIDE the repo. There is no owner facing button yet.
// Read only: it never writes to the database or to storage. What is left out, and why, is listed in EXCLUDED and in the manifest.
export const EXPORT_VERSION = "1";

export const EXCLUDED = [
  "PIN hashes, login ids (auth ids), session data, passwords and API keys: security, never exported",
  "Other venues' data",
  "Larder internal tables (embeddings and knowledge chunks, suggestion runs, onboarding specialist data): derived or internal, not the venue's records",
  "Ask Larder chat history: personal questions typed by staff, exported only on request with the staff member's agreement",
  "Billing and pricing fields",
];

type Admin = SupabaseClient<Database>;
type FileEntry = { path: string; bytes: number; sha256: string; rows?: number };
export type ExportResult = {
  outDir: string;
  zipPath: string | null;
  files: FileEntry[];
  counts: Record<string, number>;
  skipped: string[];
};

const PAGE = 1000;
const IN_CHUNK = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const safeName = (s: string) => s.replace(/[/\\?%*:|"<>\u0000-\u001f]/g, "-").replace(/\s+/g, " ").trim().slice(0, 80) || "untitled";
const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/** Refuses a destination inside the repository, so an export can never be committed by accident. */
export function assertOutsideRepo(outDir: string, repoRoot: string): string {
  const abs = path.resolve(outDir);
  const rel = path.relative(path.resolve(repoRoot), abs);
  if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) {
    throw new Error("The export folder must be OUTSIDE the repository.");
  }
  return abs;
}

/** Finds anything that looks like a secret in the text files of an export. Returns what it found (empty is good). */
export function scanForSecrets(dir: string, secretValues: string[] = []): string[] {
  const findings: string[] = [];
  const walk = (d: string) => {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (/\.(csv|json|txt|md)$/i.test(name)) {
        const text = fs.readFileSync(full, "utf8");
        const rel = path.relative(dir, full);
        if (/pin_hash|pin_locked|auth_id/i.test(text)) findings.push(`${rel}: a secret column name`);
        if (/\$2[aby]\$\d\d\$[./A-Za-z0-9]{20,}/.test(text)) findings.push(`${rel}: a password hash`);
        if (/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./.test(text)) findings.push(`${rel}: a token`);
        for (const v of secretValues) if (v.length >= 16 && text.includes(v)) findings.push(`${rel}: a configured secret value`);
      }
    }
  };
  walk(dir);
  return findings;
}

export async function exportVenue(
  admin: Admin,
  slug: string,
  outDir: string,
  opts: { zip?: boolean; secretValues?: string[]; repoRoot?: string } = {},
): Promise<ExportResult> {
  const abs = assertOutsideRepo(outDir, opts.repoRoot ?? process.cwd());
  if (fs.existsSync(abs) && fs.readdirSync(abs).length > 0) throw new Error("The export folder already has files in it. Choose an empty or new folder.");
  fs.mkdirSync(abs, { recursive: true });

  const files: FileEntry[] = [];
  const counts: Record<string, number> = {};
  const skipped: string[] = [];
  const writeText = (rel: string, text: string, rows?: number) => {
    const full = path.join(abs, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, text, "utf8");
    files.push({ path: rel.split(path.sep).join("/"), bytes: Buffer.byteLength(text), sha256: sha256(text), rows });
  };
  const writeBinary = (rel: string, buf: Buffer) => {
    const full = path.join(abs, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, buf);
    files.push({ path: rel.split(path.sep).join("/"), bytes: buf.length, sha256: sha256(buf) });
  };
  const must = <T>(label: string, r: { data: T | null; error: { message: string } | null }): T => {
    if (r.error) throw new Error(`export: could not read ${label}: ${r.error.message}`);
    return (r.data ?? ([] as unknown)) as T;
  };

  // ---- the venue and its settings
  const { data: venue, error: venueError } = await admin.from("venues").select("id, name, slug, roster_location, created_at").eq("slug", slug).maybeSingle();
  if (venueError) throw new Error(`export: could not read the venue: ${venueError.message}`);
  if (!venue) throw new Error(`export: no venue with the slug ${slug}`);
  const venueId = venue.id;
  const [profile, settings, forms, units, stations, roles, staff, certTypes] = await Promise.all([
    admin.from("venue_licence_profile").select("abn, address, approved_trading_hours, conditions, late_night_endorsement, legal_name, licence_number, licence_status, licence_type, licensed_capacity, state").eq("venue_id", venueId).maybeSingle(),
    admin.from("venue_compliance_settings").select("high_risk_activities, offers_accommodation, trade_waste_agreement, trading_day_cutoff_hour, venue_type").eq("venue_id", venueId).maybeSingle(),
    admin.from("venue_compliance_forms").select("form_id, enabled, enabled_at").eq("venue_id", venueId).order("form_id"),
    admin.from("venue_refrigeration_units").select("id, name, unit_type, min_temp_c, max_temp_c, is_active").eq("venue_id", venueId).order("name"),
    admin.from("stations").select("id, name, qr_code_slug, equipment_manufacturer, equipment_model, equipment_serial").eq("venue_id", venueId).order("name"),
    admin.from("staff_roles").select("id, name, department, fallback_tier").eq("venue_id", venueId).order("name"),
    admin.from("app_users").select("id, name, role, email, phone, staff_role_id, created_at, deactivated_at, onboarding_completed_at").eq("venue_id", venueId).order("name"),
    admin.from("certificate_types").select("id, name, cert_kind, tracking_type, validity_years").eq("venue_id", venueId).order("name"),
  ]);
  const profileRow = must("licence profile", profile);
  const settingsRow = must("compliance settings", settings);
  const formRows = must("form choices", forms) as { form_id: string; enabled: boolean; enabled_at: string }[];
  const unitRows = must("units", units);
  const stationRows = must("stations", stations);
  const roleRows = must("roles", roles);
  const staffRows = must("staff", staff);
  const certTypeRows = must("certificate types", certTypes);
  const tz = venueTimeZone((profileRow as { state?: string | null } | null)?.state ?? null);
  const staffName = new Map(staffRows.map((s) => [s.id, s.name]));
  const roleById = new Map(roleRows.map((r) => [r.id, r]));
  const staffIds = staffRows.map((s) => s.id);

  writeText(
    "settings/venue.json",
    JSON.stringify(
      {
        venue: { name: venue.name, slug: venue.slug, roster_location: venue.roster_location, created_at: venue.created_at },
        licence_profile: profileRow,
        compliance_settings: settingsRow,
        form_choices: formRows,
        refrigeration_units: unitRows,
        stations: stationRows,
        staff_roles: roleRows,
        certificate_types: certTypeRows,
      },
      null,
      2,
    ),
  );

  // ---- staff roster (no PIN hashes, no login ids)
  writeText(
    "training/roster.csv",
    toCsv(
      ["Staff id", "Name", "App role", "Job role", "Department", "Tier", "Email", "Phone", "Added", "Deactivated"],
      staffRows.map((s) => {
        const r = s.staff_role_id ? roleById.get(s.staff_role_id) : undefined;
        return [s.id, s.name, s.role, r?.name ?? "", r?.department ?? "", r?.fallback_tier ?? "", s.email ?? "", s.phone ?? "", s.created_at, s.deactivated_at ?? ""];
      }),
    ),
    staffRows.length,
  );
  counts.staff = staffRows.length;

  // ---- modules (content), sections and versions
  const moduleRows = must("modules", await admin.from("modules").select("id, title, status, version, topic_key, approved_at, created_at").eq("venue_id", venueId).order("title"));
  const moduleIds = moduleRows.map((m) => m.id);
  const sections: Database["public"]["Tables"]["module_sections"]["Row"][] = [];
  const versions: Database["public"]["Tables"]["module_versions"]["Row"][] = [];
  const sopDocs: Database["public"]["Tables"]["sop_documents"]["Row"][] = [];
  for (const ids of chunk(moduleIds, IN_CHUNK)) {
    sections.push(...must("module sections", await admin.from("module_sections").select("*").in("module_id", ids).order("section_order")));
    versions.push(...must("module versions", await admin.from("module_versions").select("*").in("module_id", ids).order("published_at")));
    sopDocs.push(...must("sop documents", await admin.from("sop_documents").select("*").in("module_id", ids)));
  }
  const usedNames = new Set<string>();
  for (const m of moduleRows) {
    let base = safeName(m.title);
    while (usedNames.has(base.toLowerCase())) base += `-${m.id.slice(0, 4)}`;
    usedNames.add(base.toLowerCase());
    const secs = sections.filter((s) => s.module_id === m.id);
    const vers = versions.filter((v) => v.module_id === m.id);
    const md = [
      `# ${m.title}`,
      "",
      `Status: ${m.status ?? "unknown"}. Version: ${m.version ?? "unknown"}.${m.approved_at ? ` Approved: ${m.approved_at}.` : ""}`,
      "",
      ...secs.flatMap((s, i) => [`## Section ${i + 1}${s.is_restricted ? " (restricted from staff)" : ""}`, "", s.content ?? "", s.citation ? `\nSource: ${s.citation}` : "", ""]),
      vers.length ? "## Version history\n" : "",
      ...vers.map((v) => `- Version ${v.version}, published ${v.published_at}${v.changelog ? `: ${v.changelog}` : ""}`),
      "",
    ].join("\n");
    writeText(`content/modules/${base}.md`, md);
  }
  counts.modules = moduleRows.length;
  counts.module_sections = sections.length;

  // ---- SOP documents and source documents
  for (const d of sopDocs) {
    const m = moduleRows.find((x) => x.id === d.module_id);
    writeText(`content/sop-documents/${safeName(m?.title ?? d.id)}-${d.id.slice(0, 6)}.md`, `# ${m?.title ?? "SOP document"}\n\nGenerated: ${d.generated_at ?? "unknown"}\n\n${d.content ?? ""}\n`);
  }
  counts.sop_documents = sopDocs.length;
  const sources = must("sop source documents", await admin.from("sop_source_documents").select("id, topic_key, file_ref, raw_content, uploaded_at, processed_status").eq("venue_id", venueId).order("uploaded_at"));
  for (const s of sources) {
    if (s.raw_content) writeText(`content/sop-source/${safeName(s.topic_key ?? "source")}-${s.id.slice(0, 6)}.txt`, s.raw_content);
  }
  counts.sop_source_documents = sources.length;

  // ---- storage files that belong to this venue (read only, only paths under the venue's own folder)
  const download = async (bucket: string, objectPath: string | null, destRel: string): Promise<boolean> => {
    if (!objectPath) return false;
    if (!objectPath.startsWith(`${venueId}/`) || objectPath.includes("..")) {
      skipped.push(`${bucket}/${objectPath}: not under this venue's folder`);
      return false;
    }
    const { data, error } = await admin.storage.from(bucket).download(objectPath);
    if (error || !data) {
      skipped.push(`${bucket}/${objectPath}: could not be downloaded`);
      return false;
    }
    writeBinary(destRel, Buffer.from(await data.arrayBuffer()));
    return true;
  };
  let sourceFiles = 0;
  for (const s of sources) {
    const ext = s.file_ref && s.file_ref.includes(".") ? s.file_ref.slice(s.file_ref.lastIndexOf(".")) : "";
    if (s.file_ref && (await download("onboarding-uploads", s.file_ref, `content/sop-source/files/${safeName(s.topic_key ?? "source")}-${s.id.slice(0, 6)}${ext}`))) sourceFiles++;
  }
  counts.sop_source_files = sourceFiles;
  const photos = must("photo library", await admin.from("photo_library").select("id, storage_path, tag, created_at").eq("venue_id", venueId).order("created_at"));
  let photoFiles = 0;
  const photoRows: unknown[][] = [];
  for (const p of photos) {
    const ext = p.storage_path.includes(".") ? p.storage_path.slice(p.storage_path.lastIndexOf(".")) : "";
    const rel = `content/photos/${safeName(p.tag ?? "photo")}-${p.id.slice(0, 6)}${ext}`;
    const ok = await download("photo-library", p.storage_path, rel);
    if (ok) photoFiles++;
    photoRows.push([p.id, p.tag ?? "", p.created_at, ok ? rel : ""]);
  }
  writeText("content/photos/photos.csv", toCsv(["Photo id", "Tag", "Added", "File in this export"], photoRows), photos.length);
  counts.photos = photoFiles;

  // ---- training completion, e-signatures, certificates
  const progress: Database["public"]["Tables"]["staff_module_progress"]["Row"][] = [];
  const sigs: Database["public"]["Tables"]["esignatures"]["Row"][] = [];
  const certs: Database["public"]["Tables"]["staff_certificates"]["Row"][] = [];
  for (const ids of chunk(staffIds, IN_CHUNK)) {
    progress.push(...must("progress", await admin.from("staff_module_progress").select("*").in("user_id", ids)));
    sigs.push(...must("e-signatures", await admin.from("esignatures").select("*").in("user_id", ids).order("signed_at")));
    certs.push(...must("certificates", await admin.from("staff_certificates").select("*").in("user_id", ids)));
  }
  const moduleTitle = new Map(moduleRows.map((m) => [m.id, m.title]));
  const moduleVersion = new Map(moduleRows.map((m) => [m.id, m.version]));
  writeText(
    "training/completion-records.csv",
    toCsv(
      ["Staff id", "Staff name", "Module", "Module version now", "Status", "Completed at", "E-signature id"],
      progress.map((p) => [p.user_id, staffName.get(p.user_id ?? "") ?? "", moduleTitle.get(p.module_id ?? "") ?? "", moduleVersion.get(p.module_id ?? "") ?? "", p.status ?? "", p.completed_at ?? "", p.esignature_id ?? ""]),
    ),
    progress.length,
  );
  counts.completion_records = progress.length;
  writeText(
    "signatures/esignatures.csv",
    toCsv(
      ["E-signature id", "Staff id", "Staff name", "Module", "Typed name", "Signed at (UTC)", "Signed at (venue time)", "IP address", "Device"],
      sigs.map((s) => [s.id, s.user_id, staffName.get(s.user_id ?? "") ?? "", moduleTitle.get(s.module_id ?? "") ?? "", s.typed_name, s.signed_at, s.signed_at ? formatLocalDateTime(s.signed_at, tz) : "", s.ip_address ?? "", s.device_info ?? ""]),
    ),
    sigs.length,
  );
  counts.esignatures = sigs.length;
  const typeName = new Map(certTypeRows.map((t) => [t.id, t.name]));
  const certRows: unknown[][] = [];
  let certFiles = 0;
  for (const c of certs) {
    const ext = c.photo_ref && c.photo_ref.includes(".") ? c.photo_ref.slice(c.photo_ref.lastIndexOf(".")) : "";
    const rel = `certificates/files/${safeName(staffName.get(c.user_id ?? "") ?? "staff")}-${safeName(typeName.get(c.certificate_type_id ?? "") ?? "certificate")}-${c.id.slice(0, 6)}${ext}`;
    const ok = await download("certs", c.photo_ref, rel);
    if (ok) certFiles++;
    certRows.push([c.id, c.user_id, staffName.get(c.user_id ?? "") ?? "", typeName.get(c.certificate_type_id ?? "") ?? "", c.issued_date ?? "", c.expiry_date ?? "", c.status ?? "", ok ? rel : ""]);
  }
  writeText("certificates/certificates.csv", toCsv(["Certificate id", "Staff id", "Staff name", "Certificate type", "Issued", "Expires", "Status", "File in this export"], certRows), certs.length);
  counts.certificates = certs.length;
  counts.certificate_files = certFiles;

  // ---- compliance records: every record, newest last, with corrections and second signers
  type Rec = Database["public"]["Tables"]["compliance_form_submissions"]["Row"];
  const records: Rec[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = must("compliance records", await admin.from("compliance_form_submissions").select("*").eq("venue_id", venueId).order("submitted_at", { ascending: true }).order("id").range(from, from + PAGE - 1));
    records.push(...page);
    if (page.length < PAGE) break;
  }
  const pay = (r: Rec) => (r.payload ?? {}) as Record<string, unknown>;
  const baseHeaders = ["Record id", "Form", "Subject", "Submitted at (UTC)", "Submitted at (venue time)", "Submitted by", "Result", "Why it failed", "Corrective action", "Corrects record", "Second signer", "Chain id", "Step", "Device"];
  const baseCells = (r: Rec): unknown[] => {
    const p = pay(r);
    const reasons = Array.isArray(p.fail_reasons) ? (p.fail_reasons as unknown[]).join("; ") : "";
    return [r.id, r.form_id, p.subject_key ?? p.unit_name ?? "", r.submitted_at, formatLocalDateTime(r.submitted_at, tz), r.submitted_by_name, r.out_of_range ? "Fail" : "Pass", reasons, r.corrective_action ?? "", r.corrects_submission_id ?? "", p.cosigned_by_name ?? "", p.chain_id ?? "", p.stage ?? "", r.device_stamp ?? ""];
  };
  writeText("compliance/records-all.csv", toCsv([...baseHeaders, "Values (JSON)"], records.map((r) => [...baseCells(r), JSON.stringify(pay(r).values ?? pay(r))])), records.length);
  writeText("compliance/records-all.json", JSON.stringify(records.map((r) => ({ id: r.id, form_id: r.form_id, submitted_at: r.submitted_at, submitted_by: r.submitted_by_name, out_of_range: r.out_of_range, corrective_action: r.corrective_action, corrects_submission_id: r.corrects_submission_id, device_stamp: r.device_stamp, payload: r.payload })), null, 2), records.length);
  counts.compliance_records = records.length;
  const formIds = [...new Set(records.map((r) => r.form_id))].sort();
  for (const formId of formIds) {
    const recs = records.filter((r) => r.form_id === formId);
    const flat: Record<string, unknown>[] = recs.map((r) => {
      const p = pay(r);
      const topLevel: Record<string, unknown> = formId === "B2" ? { unit_name: p.unit_name, unit_type: p.unit_type, reading_c: p.reading_c, limit_kind: p.limit_kind, limit_c: p.limit_c } : {};
      return { ...topLevel, ...flattenValues(p.values) };
    });
    const keys = [...new Set(flat.flatMap((f) => Object.keys(f)))].sort();
    writeText(`compliance/by-form/${safeName(formId)}.csv`, toCsv([...baseHeaders, ...keys], recs.map((r, i) => [...baseCells(r), ...keys.map((k) => flat[i][k])])), recs.length);
  }
  const b2 = records.filter((r) => r.form_id === "B2");
  writeText(
    "temperature/readings.csv",
    toCsv(
      ["Record id", "Unit", "Type", "Reading (C)", "Limit", "Result", "Corrective action", "Recorded by", "Time (UTC)", "Time (venue time)"],
      b2.map((r) => {
        const p = pay(r);
        return [r.id, p.unit_name ?? "", p.unit_type ?? "", p.reading_c ?? "", p.limit_c !== undefined ? `${p.limit_kind === "min" ? "at least" : "at most"} ${p.limit_c}` : "", r.out_of_range ? "Out of range" : "In range", r.corrective_action ?? "", r.submitted_by_name, r.submitted_at, formatLocalDateTime(r.submitted_at, tz)];
      }),
    ),
    b2.length,
  );

  // ---- who changed roles (the change log, when the venue has one)
  const changes = must("role changes", await admin.from("staff_role_changes").select("*").eq("venue_id", venueId).order("changed_at"));
  writeText(
    "settings/role-changes.csv",
    toCsv(["Changed at", "Person", "Changed by", "Old role", "New role", "Old tier", "New tier"], changes.map((c) => [c.changed_at, staffName.get(c.staff_user_id) ?? c.staff_user_id, c.changed_by ? (staffName.get(c.changed_by) ?? "") : "system", c.old_role_name ?? "", c.new_role_name ?? "", c.old_tier ?? "", c.new_tier ?? ""])),
    changes.length,
  );
  counts.role_changes = changes.length;

  // ---- README and manifest
  const exportedAt = new Date().toISOString();
  writeText(
    "README.txt",
    [
      `Larder data export for ${venue.name}`,
      `Exported ${exportedAt} (export format ${EXPORT_VERSION}).`,
      "",
      "What is in this folder:",
      "  compliance/records-all.csv and .json   every compliance record, with corrections, second signers and the venue time",
      "  compliance/by-form/                    one file per form with its own columns",
      "  temperature/readings.csv               the temperature log",
      "  signatures/esignatures.csv             e-signature records (typed name, time, IP address, device)",
      "  training/                              the staff roster and module completion records",
      "  certificates/                          certificate details and the original files",
      "  content/modules/                       the training modules, one file each, with version history",
      "  content/sop-documents/ and sop-source/ the venue's own SOP documents and uploads",
      "  content/photos/                        the venue photo library",
      "  settings/                              venue profile, licence, form choices, units, roles and the role change log",
      "  manifest.json                          every file with its size, row count and SHA-256 checksum",
      "",
      "Spreadsheet files are UTF-8 with a byte order mark so Excel shows accents correctly. A cell that began with = + - or @ has a leading apostrophe so it is read as text.",
      "Keep these records for as long as your Food Safety Program and your council require. Larder does not delete anything from this folder.",
      "",
      "Not included, on purpose:",
      ...EXCLUDED.map((e) => `  ${e}`),
      "",
    ].join("\n"),
  );
  files.sort((a, b) => a.path.localeCompare(b.path));
  const manifest = { export_version: EXPORT_VERSION, exported_at: exportedAt, venue: { name: venue.name, slug: venue.slug }, timezone: tz, counts, files, skipped, excluded: EXCLUDED };
  fs.writeFileSync(path.join(abs, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  const found = scanForSecrets(abs, opts.secretValues ?? []);
  if (found.length) throw new Error(`export: the secret scan found ${found.length} problem(s): ${found.join("; ")}`);

  let zipPath: string | null = null;
  if (opts.zip) {
    const zip = new JSZip();
    const add = (dir: string, prefix: string) => {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) add(full, `${prefix}${name}/`);
        else zip.file(`${prefix}${name}`, fs.readFileSync(full));
      }
    };
    add(abs, "");
    zipPath = `${abs}.zip`;
    fs.writeFileSync(zipPath, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  }
  return { outDir: abs, zipPath, files, counts, skipped };
}
