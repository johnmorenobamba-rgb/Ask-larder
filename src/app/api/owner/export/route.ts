import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

// CLAUDE.md non-negotiable: "On cancellation, content/completion records
// are exportable by the venue... build data export as a real function
// early, not bolted on under pressure later." Confirmed live 14 Sep 2026:
// this had never been built at all -- no export route, no ZIP library,
// nothing. This is the first real implementation.
//
// Synchronous by design (matches the scoping): a real venue's export is
// small enough (modules, a roster, completion rows, cert files) to build
// in one request/response cycle. Gated on the existing owner/manager
// session the same way every other owner-only route already is -- no new
// auth mechanism.

function csvEscape(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  return lines.join("\r\n");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").trim() || "untitled";
}

export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  const venueId = staff.venue_id;

  const [{ data: venue }, { data: modules }, { data: staffList }, { data: progress }, { data: certs }] =
    await Promise.all([
      supabase.from("venues").select("name").eq("id", venueId).maybeSingle(),
      supabase
        .from("modules")
        .select("id, title, status, version, created_at, module_sections(section_order, content)")
        .eq("venue_id", venueId)
        .order("title"),
      supabase
        .from("app_users")
        .select("id, name, role, email, created_at, deactivated_at, staff_roles(name, department)")
        .eq("venue_id", venueId)
        .order("name"),
      supabase
        .from("staff_module_progress")
        .select("user_id, module_id, status, completed_at, app_users!inner(name, venue_id), modules(title)")
        .eq("app_users.venue_id", venueId),
      supabase
        .from("staff_certificates")
        .select("id, photo_ref, issued_date, expiry_date, app_users!inner(name, venue_id), certificate_types(name)")
        .eq("app_users.venue_id", venueId),
    ]);

  const venueName = venue?.name ?? "venue";
  const zip = new JSZip();

  // --- modules/*.md ---
  const moduleFolder = zip.folder("modules")!;
  for (const m of modules ?? []) {
    const sections = (m.module_sections ?? []).slice().sort((a, b) => (a.section_order ?? 0) - (b.section_order ?? 0));
    const body = sections.map((s) => s.content ?? "").join("\n\n---\n\n");
    const md = `# ${m.title}\n\nStatus: ${m.status ?? "draft"}  \nVersion: ${m.version ?? 1}  \nCreated: ${m.created_at ?? "unknown"}\n\n${body}\n`;
    moduleFolder.file(`${sanitizeFilename(m.title)}.md`, md);
  }

  // --- staff-roster.csv ---
  const rosterCsv = toCsv(
    ["Name", "Role", "Department", "Email", "Joined", "Deactivated"],
    (staffList ?? []).map((s) => [
      s.name,
      s.staff_roles?.name ?? s.role,
      s.staff_roles?.department ?? "",
      s.email ?? "",
      s.created_at ?? "",
      s.deactivated_at ?? "",
    ]),
  );
  zip.file("staff-roster.csv", rosterCsv);

  // --- completion-records.csv ---
  const completionCsv = toCsv(
    ["Staff name", "Module", "Status", "Completed at"],
    (progress ?? []).map((p) => [p.app_users?.name ?? "Unknown", p.modules?.title ?? "Unknown", p.status ?? "not_started", p.completed_at ?? ""]),
  );
  zip.file("completion-records.csv", completionCsv);

  // --- certificates.csv + real certificate files ---
  const certFolder = zip.folder("certificates")!;
  const certRows: (string | number | null)[][] = [];
  for (const c of certs ?? []) {
    const staffName = c.app_users?.name ?? "Unknown";
    const certTypeName = c.certificate_types?.name ?? "Unknown";
    let includedFile = "";

    if (c.photo_ref) {
      const { data: fileData, error: downloadError } = await supabase.storage.from("certs").download(c.photo_ref);
      if (!downloadError && fileData) {
        const ext = c.photo_ref.includes(".") ? c.photo_ref.slice(c.photo_ref.lastIndexOf(".")) : "";
        const filename = `${sanitizeFilename(staffName)}-${sanitizeFilename(certTypeName)}-${c.id.slice(0, 8)}${ext}`;
        const buf = await fileData.arrayBuffer();
        certFolder.file(filename, buf);
        includedFile = `certificates/${filename}`;
      }
    }

    certRows.push([staffName, certTypeName, c.issued_date, c.expiry_date, includedFile]);
  }
  zip.file("certificates.csv", toCsv(["Staff name", "Certificate type", "Issued", "Expires", "File in this export"], certRows));

  // --- manifest.json ---
  const manifest = {
    venue: venueName,
    exportedAt: new Date().toISOString(),
    exportedBy: staff.name,
    counts: {
      modules: (modules ?? []).length,
      staff: (staffList ?? []).length,
      completionRecords: (progress ?? []).length,
      certificates: (certs ?? []).length,
      certificateFilesIncluded: certRows.filter((r) => r[4]).length,
    },
    files: [
      "manifest.json",
      "staff-roster.csv",
      "completion-records.csv",
      "certificates.csv",
      ...(modules ?? []).map((m) => `modules/${sanitizeFilename(m.title)}.md`),
      ...certRows.filter((r) => r[4]).map((r) => r[4] as string),
    ],
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const zipBytes = await zip.generateAsync({ type: "uint8array" });
  // Uint8Array<ArrayBufferLike> vs BlobPart's Uint8Array<ArrayBuffer> is a
  // lib.dom.d.ts strictness mismatch, not a real type error -- the bytes
  // are a real, complete, in-memory ArrayBuffer either way.
  const zipBlob = new Blob([zipBytes as unknown as BlobPart], { type: "application/zip" });
  const dateStamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(zipBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${sanitizeFilename(venueName)}-larder-export-${dateStamp}.zip"`,
    },
  });
}
