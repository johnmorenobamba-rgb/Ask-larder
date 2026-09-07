"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COMMON_ALLERGENS, MENU_CATEGORIES } from "@/lib/onboarding/constants";
import { getNextStep, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { MenuUploadStep, type ParsedMenuItem } from "./MenuUploadStep";
import { inputClass, selectClass, labelClass, cardClass, primaryButtonClass, secondaryButtonClass, errorClass, rowClass } from "./fieldStyles";

type ExistingModifier = { id: string; name: string; allergens_added: string[] | null; allergens_removed: string[] | null };
type ExistingModifierGroup = { id: string; name: string; modifiers: ExistingModifier[] };
type ExistingItem = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  base_allergens: string[] | null;
  modifierGroups: ExistingModifierGroup[];
};


/**
 * Q2 Page 8a (+8b nested) — the single write path into menu_items, used by
 * both the manual grid and the parse-menu review flow. Low-confidence
 * parsed rows are visually flagged and every row requires an explicit human
 * confirm before it's actually written — nothing from the parser lands in
 * the database on its own.
 */
export function MenuReviewTable({
  venueSlug,
  venueId,
  existingItems,
}: {
  venueSlug: string;
  venueId: string;
  existingItems: ExistingItem[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<ParsedMenuItem[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualCategory, setManualCategory] = useState("food");
  const [manualDescription, setManualDescription] = useState("");
  const [manualAllergens, setManualAllergens] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [modifierEditorFor, setModifierEditorFor] = useState<string | null>(null);
  const [modifierGroupName, setModifierGroupName] = useState("");
  const [modifierName, setModifierName] = useState("");
  const [modifierAllergensAdded, setModifierAllergensAdded] = useState<string[]>([]);
  const [modifierAllergensRemoved, setModifierAllergensRemoved] = useState<string[]>([]);
  const [modifierSaving, setModifierSaving] = useState(false);

  async function saveItem(item: { name: string; category: string; description: string; base_allergens: string[] }) {
    const res = await fetch("/api/owner/onboarding/menu-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "Couldn't save that item.");
    }
  }

  async function addManual() {
    if (!manualName.trim()) return;
    setError(null);
    try {
      await saveItem({ name: manualName, category: manualCategory, description: manualDescription, base_allergens: manualAllergens });
      setManualName("");
      setManualDescription("");
      setManualAllergens([]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that item.");
    }
  }

  function updatePending(index: number, patch: Partial<ParsedMenuItem>) {
    setPending((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  async function confirmPending(index: number) {
    const item = pending[index];
    setSavingIndex(index);
    setError(null);
    try {
      await saveItem({ name: item.name, category: item.category || "food", description: item.description, base_allergens: item.base_allergens });
      setPending((prev) => prev.filter((_, i) => i !== index));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that item.");
    } finally {
      setSavingIndex(null);
    }
  }

  function discardPending(index: number) {
    setPending((prev) => prev.filter((_, i) => i !== index));
  }

  async function deleteExisting(id: string) {
    await fetch(`/api/owner/onboarding/menu-items?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function addModifier(menuItemId: string) {
    if (!modifierGroupName.trim() || !modifierName.trim()) return;
    setModifierSaving(true);
    setError(null);
    const res = await fetch("/api/owner/onboarding/menu-item-modifiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menuItemId,
        groupName: modifierGroupName,
        modifierName,
        allergensAdded: modifierAllergensAdded,
        allergensRemoved: modifierAllergensRemoved,
      }),
    });
    setModifierSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't save that modifier.");
      return;
    }
    setModifierGroupName("");
    setModifierName("");
    setModifierAllergensAdded([]);
    setModifierAllergensRemoved([]);
    router.refresh();
  }

  function toggleAllergen(allergen: string) {
    setManualAllergens((prev) => (prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen]));
  }

  function continueWizard() {
    // Menu items are optional (a venue may have none yet), so Continue
    // never blocks on having at least one row.
    const flags: VenueTypeFlags = {};
    router.push(stepHref(venueSlug, getNextStep("menu", flags)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Menu</h2>
        <p className="font-sans text-sm text-ink/70">Upload a menu to have Larder propose items, or add them one at a time.</p>
      </div>

      <MenuUploadStep venueId={venueId} onParsed={(items) => setPending((prev) => [...prev, ...items])} />

      {pending.length > 0 && (
        <div className="space-y-3">
          <p className={labelClass}>Review parsed items</p>
          {pending.map((item, i) => {
            const lowConfidence = item.confidence === "low";
            return (
              <div
                key={i}
                className={`space-y-2 rounded-2xl border-2 px-4 py-4 ${lowConfidence ? "border-saffron bg-saffron/10" : "border-clay-brown/40"}`}
              >
                {lowConfidence && (
                  <p className="font-mono text-[10px] uppercase tracking-wide text-preserve-red">Low confidence, check this one</p>
                )}
                <input value={item.name} onChange={(e) => updatePending(i, { name: e.target.value })} className={inputClass} />
                <select value={item.category} onChange={(e) => updatePending(i, { category: e.target.value })} className={selectClass}>
                  {MENU_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  value={item.description}
                  onChange={(e) => updatePending(i, { description: e.target.value })}
                  placeholder="Description"
                  className={inputClass}
                />
                <div className="flex flex-wrap gap-2">
                  {COMMON_ALLERGENS.map((a) => (
                    <label key={a} className="flex items-center gap-1 font-mono text-xs text-ink">
                      <input
                        type="checkbox"
                        checked={item.base_allergens.includes(a)}
                        onChange={() =>
                          updatePending(i, {
                            base_allergens: item.base_allergens.includes(a)
                              ? item.base_allergens.filter((x) => x !== a)
                              : [...item.base_allergens, a],
                          })
                        }
                      />
                      {a}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => confirmPending(i)} disabled={savingIndex === i} className={primaryButtonClass}>
                    {savingIndex === i ? "Saving…" : "Confirm and add"}
                  </button>
                  <button type="button" onClick={() => discardPending(i)} className={secondaryButtonClass}>
                    Discard
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={cardClass}>
        <p className={labelClass}>Add an item manually</p>
        <input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Item name" className={inputClass} />
        <select aria-label="Category" value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} className={selectClass}>
          {MENU_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          value={manualDescription}
          onChange={(e) => setManualDescription(e.target.value)}
          placeholder="Description"
          className={inputClass}
        />
        <div className="flex flex-wrap gap-2">
          {COMMON_ALLERGENS.map((a) => (
            <label key={a} className="flex items-center gap-1 font-mono text-xs text-ink">
              <input type="checkbox" checked={manualAllergens.includes(a)} onChange={() => toggleAllergen(a)} />
              {a}
            </label>
          ))}
        </div>
        {error && <p className={errorClass}>{error}</p>}
        <button type="button" onClick={addManual} disabled={!manualName.trim()} className={primaryButtonClass}>
          Add item
        </button>
      </div>

      <div className="space-y-2">
        <p className={labelClass}>Menu items so far ({existingItems.length})</p>
        {existingItems.map((item) => (
          <div key={item.id} className="space-y-2 rounded-2xl border-2 border-clay-brown/20 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-sans text-ink">{item.name}</p>
                <p className="font-mono text-xs text-clay-brown">
                  {item.category ?? "uncategorised"}
                  {item.base_allergens && item.base_allergens.length > 0 ? ` · ${item.base_allergens.join(", ")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModifierEditorFor(modifierEditorFor === item.id ? null : item.id)}
                  className="font-mono text-xs text-clay-brown underline"
                >
                  {modifierEditorFor === item.id ? "Close" : "Add a swap or modifier"}
                </button>
                <button type="button" onClick={() => deleteExisting(item.id)} className="font-mono text-xs text-preserve-red underline">
                  Delete
                </button>
              </div>
            </div>

            {item.modifierGroups.length > 0 && (
              <div className="space-y-1 pl-2">
                {item.modifierGroups.map((group) => (
                  <div key={group.id}>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-clay-brown">{group.name}</p>
                    {group.modifiers.map((m) => (
                      <p key={m.id} className="font-sans text-sm text-ink">
                        {m.name}
                        {m.allergens_added && m.allergens_added.length > 0 ? ` · adds ${m.allergens_added.join(", ")}` : ""}
                        {m.allergens_removed && m.allergens_removed.length > 0 ? ` · removes ${m.allergens_removed.join(", ")}` : ""}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {modifierEditorFor === item.id && (
              <div className="space-y-2 rounded-xl bg-clay-brown/10 px-3 py-3">
                <input
                  value={modifierGroupName}
                  onChange={(e) => setModifierGroupName(e.target.value)}
                  placeholder="Modifier group, e.g. Milk choice"
                  className={inputClass}
                />
                <input
                  value={modifierName}
                  onChange={(e) => setModifierName(e.target.value)}
                  placeholder="Option, e.g. Oat milk"
                  className={inputClass}
                />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-clay-brown">Adds allergens</p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_ALLERGENS.map((a) => (
                      <label key={a} className="flex items-center gap-1 font-mono text-xs text-ink">
                        <input
                          type="checkbox"
                          checked={modifierAllergensAdded.includes(a)}
                          onChange={() =>
                            setModifierAllergensAdded((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))
                          }
                        />
                        {a}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-clay-brown">Removes allergens</p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_ALLERGENS.map((a) => (
                      <label key={a} className="flex items-center gap-1 font-mono text-xs text-ink">
                        <input
                          type="checkbox"
                          checked={modifierAllergensRemoved.includes(a)}
                          onChange={() =>
                            setModifierAllergensRemoved((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))
                          }
                        />
                        {a}
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addModifier(item.id)}
                  disabled={modifierSaving || !modifierGroupName.trim() || !modifierName.trim()}
                  className={primaryButtonClass}
                >
                  {modifierSaving ? "Saving…" : "Add modifier"}
                </button>
              </div>
            )}
          </div>
        ))}
        {existingItems.length === 0 && <p className="font-sans text-sm text-clay-brown">No menu items yet.</p>}
      </div>

      <button type="button" onClick={continueWizard} className={primaryButtonClass}>
        Continue
      </button>
    </div>
  );
}
