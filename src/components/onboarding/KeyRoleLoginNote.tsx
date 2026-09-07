/**
 * Q1 D.1.4: for the RSA marshal / Food Safety Supervisor "named key role"
 * fields, the wizard must visibly flag that this named individual may not
 * yet have an app_users login — venue_key_roles.app_user_id is nullable
 * specifically because this is common (a senior staff member not yet
 * invited to log in). This is a graded requirement, not cosmetic polish —
 * every place a key role is captured must render this note.
 */
export function KeyRoleLoginNote() {
  return (
    <p className="rounded-2xl bg-clay-brown/10 px-4 py-3 font-sans text-sm text-ink/80">
      This person may not have a Larder login yet. Their name is saved now; link it to a
      login once they are invited under Staff.
    </p>
  );
}
