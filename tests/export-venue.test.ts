import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import JSZip from "jszip";
import { createAdminClient } from "../src/lib/supabase/admin";
import { exportVenue, assertOutsideRepo, scanForSecrets } from "../src/lib/export/venueExport";
import { parseCsv } from "../src/lib/export/csv";

// Venue data export (hardening-2 task 7) on two DISPOSABLE venues made here and removed afterwards (service role; storage
// objects only under the two fixture venue folders). Proves: counts match the database, the file checksums match, every file of
// the other venue is absent, no secrets appear, the folder guards work, the zip matches, and the export writes nothing.
const admin = createAdminClient();
const suffix = randomUUID().slice(0, 8);
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "larder-export-test-"));

type Seeded = { slug: string; venueId: string; staffIds: string[]; staffNames: string[]; authId: string; pinHash: string; recordIds: string[]; objectPaths: Record<string, string> };

async function seed(tag: string): Promise<Seeded> {
  const slug = `ex-${tag}-${suffix}`;
  const { data: v, error } = await admin.from("venues").insert({ name: `Export Test ${tag} (test data)`, slug }).select("id").single();
  if (error) throw error;
  const venueId = v!.id;
  await admin.from("venue_licence_profile").insert({ venue_id: venueId, state: "VIC", licence_type: "general" });
  await admin.from("venue_compliance_settings").insert({ venue_id: venueId, trade_waste_agreement: "yes", offers_accommodation: false, high_risk_activities: [], venue_type: "pub" });
  const { data: role } = await admin.from("staff_roles").insert({ venue_id: venueId, name: `Kitchen Hand ${tag}`, department: "BOH", fallback_tier: "frontline" }).select("id").single();
  const { data: au } = await admin.auth.admin.createUser({ email: `delivered+ex${tag}${suffix}@resend.dev`, password: randomUUID() + "Aa1!", email_confirm: true });
  const pinHash = await bcrypt.hash("1234-test-only", 10);
  const names = [`O'Brien, Sam "Sammy" ${tag}`, `Zoe ${tag}`];
  const staffIds: string[] = [];
  for (const [i, name] of names.entries()) {
    const { data: s, error: se } = await admin
      .from("app_users")
      .insert({ venue_id: venueId, role: "staff", name, email: `person${i}${tag}${suffix}@example.invalid`, staff_role_id: role!.id, ...(i === 0 ? { auth_id: au!.user!.id, pin_hash: pinHash } : {}) })
      .select("id")
      .single();
    if (se) throw se;
    staffIds.push(s!.id);
  }
  const { data: mod } = await admin.from("modules").insert({ venue_id: venueId, title: `Opening procedure ${tag}`, status: "live", version: 2 }).select("id").single();
  await admin.from("module_sections").insert({ module_id: mod!.id, section_order: 1, content: `Crème brûlée station ${tag}. Wash hands first.`, citation: "Venue SOP" });
  await admin.from("module_versions").insert({ module_id: mod!.id, version: 2, changelog: "Added the wash step" });
  const { data: prog } = await admin.from("staff_module_progress").insert({ user_id: staffIds[0], module_id: mod!.id, status: "completed", completed_at: new Date().toISOString() }).select("id").single();
  const { data: sig } = await admin.from("esignatures").insert({ user_id: staffIds[0], module_id: mod!.id, typed_name: names[0], ip_address: "203.0.113.5", device_info: "Export test agent" }).select("id").single();
  await admin.from("staff_module_progress").update({ esignature_id: sig!.id }).eq("id", prog!.id);
  await admin.from("sop_documents").insert({ module_id: mod!.id, content: `SOP text ${tag}`, generated_from_hash: `hash-${tag}` }).throwOnError();

  const objectPaths: Record<string, string> = {};
  const { data: ct } = await admin.from("certificate_types").insert({ venue_id: venueId, name: `RSA ${tag}`, cert_kind: "rsa", tracking_type: "hard_expiry", validity_years: 3 }).select("id").single();
  objectPaths.cert = `${venueId}/${staffIds[0]}/${ct!.id}/1-cert.png`;
  await admin.storage.from("certs").upload(objectPaths.cert, PNG, { contentType: "image/png" });
  await admin.from("staff_certificates").insert({ user_id: staffIds[0], certificate_type_id: ct!.id, photo_ref: objectPaths.cert, issued_date: "2026-03-01", expiry_date: "2029-03-01" });
  objectPaths.photo = `${venueId}/library/pass-${tag}.png`;
  await admin.storage.from("photo-library").upload(objectPaths.photo, PNG, { contentType: "image/png" });
  await admin.from("photo_library").insert({ venue_id: venueId, storage_path: objectPaths.photo, tag: "general" }).throwOnError();
  objectPaths.sop = `${venueId}/sop/menu-${tag}.png`;
  await admin.storage.from("onboarding-uploads").upload(objectPaths.sop, PNG, { contentType: "image/png" });
  await admin.from("sop_source_documents").insert({ venue_id: venueId, topic_key: `menu-${tag}`, file_ref: objectPaths.sop, raw_content: `Raw SOP words ${tag}` }).throwOnError();

  // compliance records through the real functions: a failing pest sighting with a formula looking note, and a temperature reading
  const recordIds: string[] = [];
  const rules = { version: 1, form_version: "1", event: true, allow_correction: true, cosign: false, fields: [{ key: "kind", type: "choice", options: ["sighting", "trap_check"], required: true }, { key: "location", type: "text", required: true }], fail: [{ field: "kind", op: "eq", value: "sighting", label: "Pest sighting" }] };
  const { data: rec, error: re } = await admin.rpc("submit_compliance_record", { p_venue_id: venueId, p_staff_id: staffIds[1], p_form_id: "B12", p_gate_roles: ["BOH"], p_visible_roles: ["BOH"], p_rules: rules, p_entry: { client_request_id: randomUUID(), values: { kind: "sighting", location: `Dry store ${tag}` }, corrective_action: "=HYPERLINK(\"http://x\",\"click\"), called the contractor" }, p_device_stamp: "export test" });
  if (re) throw re;
  recordIds.push((rec as { id: string }).id);
  const { data: unit } = await admin.from("venue_refrigeration_units").insert({ venue_id: venueId, name: `Cool room ${tag}`, unit_type: "cold", max_temp_c: 5 }).select("id").single();
  const { data: b2, error: be } = await admin.rpc("submit_compliance_form", { p_venue_id: venueId, p_staff_id: staffIds[1], p_form_id: "B2", p_visible_to_roles: ["BOH"], p_entries: [{ client_request_id: randomUUID(), unit_id: unit!.id, reading_c: 4.5 }], p_device_stamp: "export test" });
  if (be) throw be;
  recordIds.push(...(b2 as { id: string }[]).map((r) => r.id));
  return { slug, venueId, staffIds, staffNames: names, authId: au!.user!.id, pinHash, recordIds, objectPaths };
}

let A: Seeded;
let B: Seeded;

beforeAll(async () => {
  A = await seed("a");
  B = await seed("b");
}, 120_000);

afterAll(async () => {
  // cleaned by this run's own slugs and logins, so a seed that failed half way is removed too (only objects under the fixture venue folders)
  for (const slug of [`ex-a-${suffix}`, `ex-b-${suffix}`]) {
    const { data: v } = await admin.from("venues").select("id").eq("slug", slug).maybeSingle();
    if (!v) continue;
    for (const bucket of ["certs", "photo-library", "onboarding-uploads"]) {
      const walk = async (prefix: string): Promise<string[]> => {
        const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
        const out: string[] = [];
        for (const item of data ?? []) out.push(...(item.id ? [`${prefix}/${item.name}`] : await walk(`${prefix}/${item.name}`)));
        return out;
      };
      const paths = await walk(v.id);
      if (paths.length) await admin.storage.from(bucket).remove(paths);
    }
    await admin.from("venues").delete().eq("id", v.id);
  }
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of list?.users ?? []) if (u.email === `delivered+exa${suffix}@resend.dev` || u.email === `delivered+exb${suffix}@resend.dev`) await admin.auth.admin.deleteUser(u.id);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(`${tmp}-zipcheck`, { recursive: true, force: true });
});

const readAll = (dir: string): { rel: string; text: string }[] => {
  const out: { rel: string; text: string }[] = [];
  const walk = (d: string) => {
    for (const n of fs.readdirSync(d)) {
      const full = path.join(d, n);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (/\.(csv|json|txt|md)$/i.test(n)) out.push({ rel: path.relative(dir, full).split(path.sep).join("/"), text: fs.readFileSync(full, "utf8") });
    }
  };
  walk(dir);
  return out;
};

describe("venue data export", () => {
  let outDir = "";
  let result: Awaited<ReturnType<typeof exportVenue>>;
  let beforeCounts = "";

  const dbCounts = async (s: Seeded) => {
    const c = async (t: string, col: string, ids: string[]) => (await admin.from(t as never).select("*", { count: "exact", head: true }).in(col, ids)).count ?? 0;
    return JSON.stringify({
      records: (await admin.from("compliance_form_submissions").select("*", { count: "exact", head: true }).eq("venue_id", s.venueId)).count,
      sigs: await c("esignatures", "user_id", s.staffIds),
      progress: await c("staff_module_progress", "user_id", s.staffIds),
      certs: await c("staff_certificates", "user_id", s.staffIds),
      staff: (await admin.from("app_users").select("*", { count: "exact", head: true }).eq("venue_id", s.venueId)).count,
    });
  };

  it("exports venue A with counts that match the database, and writes nothing", async () => {
    beforeCounts = await dbCounts(A);
    outDir = path.join(tmp, "a");
    result = await exportVenue(admin, A.slug, outDir, { zip: true, secretValues: [process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", process.env.ANTHROPIC_API_KEY ?? "", process.env.RESEND_API_KEY ?? ""] });
    const db = JSON.parse(beforeCounts);
    expect(result.counts.compliance_records).toBe(db.records);
    expect(result.counts.compliance_records).toBe(A.recordIds.length);
    expect(result.counts.esignatures).toBe(db.sigs);
    expect(result.counts.completion_records).toBe(db.progress);
    expect(result.counts.certificates).toBe(db.certs);
    expect(result.counts.staff).toBe(db.staff);
    expect(result.counts).toMatchObject({ modules: 1, module_sections: 1, sop_documents: 1, sop_source_documents: 1, certificate_files: 1, photos: 1, sop_source_files: 1 });
    expect(result.skipped).toEqual([]);
    expect(await dbCounts(A)).toBe(beforeCounts); // read only
  });

  it("the manifest lists every file with a matching size and SHA-256, and the row counts of the csv files match", async () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(outDir, "manifest.json"), "utf8"));
    const { createHash } = await import("node:crypto");
    expect(manifest.files.length).toBe(result.files.length);
    for (const f of manifest.files as { path: string; bytes: number; sha256: string; rows?: number }[]) {
      const buf = fs.readFileSync(path.join(outDir, f.path));
      expect(buf.length, f.path).toBe(f.bytes);
      expect(createHash("sha256").update(buf).digest("hex"), f.path).toBe(f.sha256);
      if (f.path.endsWith(".csv") && f.rows !== undefined) expect(parseCsv(buf.toString("utf8")).length - 1, f.path).toBe(f.rows);
    }
    for (const must of ["README.txt", "settings/venue.json", "compliance/records-all.csv", "compliance/records-all.json", "compliance/by-form/B12.csv", "compliance/by-form/B2.csv", "temperature/readings.csv", "signatures/esignatures.csv", "training/roster.csv", "training/completion-records.csv", "certificates/certificates.csv", "settings/role-changes.csv"]) {
      expect(manifest.files.map((f: { path: string }) => f.path), must).toContain(must);
    }
    expect(manifest.excluded.length).toBeGreaterThan(3);
  });

  it("the original files come out byte for byte (certificate, photo, SOP upload)", () => {
    const certFile = result.files.find((f) => f.path.startsWith("certificates/files/"))!;
    const photoFile = result.files.find((f) => f.path.startsWith("content/photos/") && f.path.endsWith(".png"))!;
    const sopFile = result.files.find((f) => f.path.startsWith("content/sop-source/files/"))!;
    for (const f of [certFile, photoFile, sopFile]) expect(fs.readFileSync(path.join(outDir, f.path)).equals(PNG), f.path).toBe(true);
  });

  it("records, signatures and roster carry the right content, awkward cells survive and formulas are neutralised", () => {
    const records = parseCsv(fs.readFileSync(path.join(outDir, "compliance/records-all.csv"), "utf8"));
    const header = records[0];
    const pest = records.find((r) => r[header.indexOf("Form")] === "B12")!;
    expect(pest[header.indexOf("Result")]).toBe("Fail");
    expect(pest[header.indexOf("Corrective action")]).toMatch(/^'=HYPERLINK/);
    expect(pest[header.indexOf("Submitted by")]).toBe(A.staffNames[1]);
    expect(pest[header.indexOf("Submitted at (venue time)")]).toMatch(/\d/);
    const roster = parseCsv(fs.readFileSync(path.join(outDir, "training/roster.csv"), "utf8"));
    expect(roster.map((r) => r[1])).toContain(A.staffNames[0]); // the name with a comma and quotes round trips
    const sigs = parseCsv(fs.readFileSync(path.join(outDir, "signatures/esignatures.csv"), "utf8"));
    expect(sigs[1][sigs[0].indexOf("Typed name")]).toBe(A.staffNames[0]);
    expect(sigs[1][sigs[0].indexOf("IP address")]).toBe("203.0.113.5");
    const temps = parseCsv(fs.readFileSync(path.join(outDir, "temperature/readings.csv"), "utf8"));
    expect(temps[1][temps[0].indexOf("Reading (C)")]).toBe("4.5");
    expect(fs.readFileSync(path.join(outDir, "content/modules/Opening procedure a.md"), "utf8")).toContain("Crème brûlée station a");
  });

  it("no secrets appear: no PIN hash, no login id, no keys, no secret column names", () => {
    const text = readAll(outDir).map((f) => f.text).join("\n");
    expect(text).not.toContain(A.pinHash);
    expect(text).not.toContain(A.authId);
    expect(text).not.toMatch(/pin_hash|pin_locked|auth_id/i);
    expect(text).not.toMatch(/\$2[aby]\$\d\d\$/);
    for (const key of [process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.ANTHROPIC_API_KEY, process.env.RESEND_API_KEY, process.env.VOYAGE_API_KEY]) if (key) expect(text).not.toContain(key);
    expect(scanForSecrets(outDir, [process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""])).toEqual([]);
  });

  it("no data of the other venue appears anywhere in the export", () => {
    const files = readAll(outDir);
    const text = files.map((f) => f.text).join("\n");
    for (const needle of [B.venueId, B.slug, ...B.staffIds, ...B.staffNames, ...B.recordIds, B.objectPaths.cert, B.objectPaths.photo, B.objectPaths.sop, "Export Test b", "Cool room b", "Dry store b", "Opening procedure b", "menu-b", "RSA b"]) {
      expect(text.includes(needle), `leaked: ${needle}`).toBe(false);
    }
    for (const f of result.files) expect(f.path.toLowerCase()).not.toContain("-b-");
    expect(text).toContain(A.venueId === "" ? "x" : A.staffIds[0]); // sanity: our own ids are there
  });

  it("the zip holds the same files as the folder", async () => {
    expect(result.zipPath).not.toBeNull();
    const zip = await JSZip.loadAsync(fs.readFileSync(result.zipPath!));
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort();
    expect(names).toEqual([...result.files.map((f) => f.path), "manifest.json"].sort());
    expect(Buffer.from(await zip.file("compliance/records-all.csv")!.async("uint8array")).equals(fs.readFileSync(path.join(outDir, "compliance/records-all.csv")))).toBe(true);
  });

  it("refuses a folder inside the repository, a folder that already has files, and an unknown venue", async () => {
    expect(() => assertOutsideRepo(path.join(process.cwd(), "scratch", "x"), process.cwd())).toThrow(/OUTSIDE/);
    expect(() => assertOutsideRepo(process.cwd(), process.cwd())).toThrow(/OUTSIDE/);
    expect(assertOutsideRepo(tmp, process.cwd())).toBe(path.resolve(tmp));
    await expect(exportVenue(admin, A.slug, path.join(process.cwd(), "scratch", "export-should-not-exist"))).rejects.toThrow(/OUTSIDE/);
    expect(fs.existsSync(path.join(process.cwd(), "scratch", "export-should-not-exist"))).toBe(false);
    await expect(exportVenue(admin, A.slug, outDir)).rejects.toThrow(/already has files/);
    await expect(exportVenue(admin, `no-such-venue-${suffix}`, `${tmp}-zipcheck`)).rejects.toThrow(/no venue/);
  });
});
