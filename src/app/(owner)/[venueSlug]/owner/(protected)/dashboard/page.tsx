import Link from "next/link";

// Landing page for the owner dashboard -- links out to each section as it's
// built (staff, completions, certs, modules, escalations, near-misses,
// stations). Kept as a plain hub, not a "Stamp" trust moment.
export default async function OwnerDashboardPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;

  const sections = [
    { href: `/${venueSlug}/owner/staff`, label: "Staff" },
    { href: `/${venueSlug}/owner/completions`, label: "Completion tracking" },
    { href: `/${venueSlug}/owner/certs`, label: "Certificates" },
    { href: `/${venueSlug}/owner/modules`, label: "Modules" },
    { href: `/${venueSlug}/owner/escalations`, label: "Escalations" },
    { href: `/${venueSlug}/owner/near-misses`, label: "Near-miss reports" },
    { href: `/${venueSlug}/owner/stations`, label: "Stations & QR codes" },
  ];

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <h1 className="font-display text-3xl font-bold text-ink">Dashboard</h1>
        <div className="grid grid-cols-2 gap-3">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-2xl border-2 border-clay-brown/40 px-4 py-4 font-display text-ink transition-transform duration-150 hover:scale-[1.03] hover:border-preserve-red"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
