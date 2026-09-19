import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { ContactsManager } from "@/components/owner/ContactsManager";
import { logQueryError } from "@/lib/supabase/logQueryError";

export default async function OwnerContactsPage() {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: contacts, error } = await supabase
    .from("venue_contacts")
    .select("id, contact_type, name, phone, email, notes, check_first_step")
    .eq("venue_id", staff!.venue_id!)
    .order("name");
  logQueryError("owner contacts", error);

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Contacts</h1>
          <p className="font-sans text-sm text-clay-brown">
            Suppliers, tradies, and anyone else staff might need to reach. Add a check first step where one exists,
            staff see that before the number, never instead of it.
          </p>
        </div>
        <ContactsManager contacts={contacts ?? []} />
      </div>
    </main>
  );
}
