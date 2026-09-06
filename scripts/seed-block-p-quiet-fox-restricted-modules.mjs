import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

// Block P item 4 (Tech Bible §15i, role-tiered fallback) -- adds the two
// restricted modules that let The Quiet Fox's Duty Manager and Bar
// Supervisor actually receive the safe combination / alarm code from Ask
// Larder, instead of the blanket fallback rule refusing them for a task
// their own module (Closing Procedures) assigns them. Idempotent: deletes
// any previously-seeded rows for these two module titles first.

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SLUG = "block-p-quiet-fox";

async function main() {
  const { data: venue, error: venueError } = await admin.from("venues").select("id").eq("slug", SLUG).single();
  if (venueError) throw venueError;
  const venueId = venue.id;

  const { data: roles, error: rolesError } = await admin
    .from("staff_roles")
    .select("id, name")
    .eq("venue_id", venueId);
  if (rolesError) throw rolesError;
  const roleId = Object.fromEntries(roles.map((r) => [r.name, r.id]));

  // Set fallback_tier: authorized for the two roles already treated as
  // closing-authorized by the venue's own existing content (Cash Handling
  // and Closing Procedures module_roles scoping). Bar Attendant and Glassie
  // stay at the default 'frontline' -- no change needed for them.
  const { error: tierError } = await admin
    .from("staff_roles")
    .update({ fallback_tier: "authorized" })
    .in("id", [roleId["Duty Manager"], roleId["Bar Supervisor"]]);
  if (tierError) throw tierError;
  console.log("Set fallback_tier=authorized for Duty Manager and Bar Supervisor.");

  const modulesToSeed = [
    {
      title: "Safe access procedures",
      roles: ["Duty Manager"],
      content:
        "The current combination is 14-32-08. Marcus resets it every quarter and gives it to you directly and verbally when you take on the Duty Manager role, and again at every reset.\n\nNever write it down anywhere, including in handover notes, and never pass it to anyone else, including another Duty Manager who hasn't been given it directly by Marcus yet. If you forget it, go straight to Marcus rather than guessing or trying an old reset.",
    },
    {
      title: "Alarm and premises access",
      roles: ["Duty Manager", "Bar Supervisor"],
      content:
        "The alarm panel is just inside the office door, to the left of the light switch. Code: 7734.\n\nTo arm it at close, enter the code then press the lock symbol. You have 45 seconds to get out through the front door before it activates. To disarm it on arrival, enter the code then press the unlock symbol within 30 seconds of opening the front door, or it triggers a call from the monitoring company.\n\nMarcus reviews this code every six months. If the panel ever shows a fault light, don't try to reset it yourself, call Merri Locksmiths' 24 hour line and let Marcus know.",
    },
  ];

  const seededModuleIds = [];

  for (const mod of modulesToSeed) {
    // Idempotent: remove any previous version of this module by title first.
    const { data: existing } = await admin
      .from("modules")
      .select("id")
      .eq("venue_id", venueId)
      .eq("title", mod.title);
    if (existing?.length) {
      await admin.from("modules").delete().in("id", existing.map((m) => m.id));
    }

    const { data: newModule, error: moduleError } = await admin
      .from("modules")
      .insert({ venue_id: venueId, title: mod.title, status: "live", version: 1 })
      .select("id")
      .single();
    if (moduleError) throw moduleError;

    const { error: sectionError } = await admin.from("module_sections").insert({
      module_id: newModule.id,
      section_order: 1,
      content: mod.content,
      is_restricted: true,
    });
    if (sectionError) throw sectionError;

    const { error: moduleRolesError } = await admin
      .from("module_roles")
      .insert(mod.roles.map((roleName) => ({ module_id: newModule.id, role_id: roleId[roleName] })));
    if (moduleRolesError) throw moduleRolesError;

    console.log(`Seeded "${mod.title}" (module ${newModule.id}), scoped to: ${mod.roles.join(", ")}`);
    seededModuleIds.push(newModule.id);
  }

  console.log("\nModule IDs to ingest:");
  for (const id of seededModuleIds) console.log(id);
}

main().catch((err) => {
  console.error("Seeding failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
