import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PassSlide } from "@/components/staff/PassSlide";

export default async function WelcomePage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);

  const supabase = await createClient();
  const { data: venue } = await supabase
    .from("venues")
    .select("name")
    .eq("id", staff.venue_id!)
    .single();

  return (
    <main className="min-h-screen bg-parchment flex items-center justify-center px-6">
      <PassSlide>
        <div className="max-w-md text-center space-y-6">
          <h1 className="font-display text-4xl font-bold text-ink">
            Welcome to {venue?.name ?? "the team"}.
          </h1>
          <p className="font-sans text-ink">Let&apos;s get you set up before your first shift.</p>
          <Link
            href={`/${venueSlug}/roles`}
            className="inline-block rounded-full bg-preserve-red px-8 py-3 font-sans font-medium text-parchment"
          >
            Get started
          </Link>
        </div>
      </PassSlide>
    </main>
  );
}
