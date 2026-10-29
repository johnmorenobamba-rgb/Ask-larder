"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A number field with its own on screen keypad. iPads do not show a compact number pad for number fields (they show
// the full keyboard on its numbers page), so the system keyboard is suppressed (inputMode none) and this keypad is shown
// instead. A hardware keyboard still types into the field. The value stays a plain string, exactly as before, so the
// existing parsing and the separate minus button keep working: this keypad only adds digits, one decimal point and
// backspace.
type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "inputMode"> & {
  value: string;
  onChange: (next: string) => void;
  /** Whether the keypad offers a decimal point. Default true. */
  allowDecimal?: boolean;
  maxLength?: number;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export function NumPadInput({ value, onChange, allowDecimal = true, maxLength = 8, onFocus, onBlur, ...rest }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  // Keep the field above the keypad while it is open.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  function press(key: string) {
    if (key === "back") return onChange(value.slice(0, -1));
    if (value.length >= maxLength) return;
    if (key === ".") {
      if (!allowDecimal || /[.,]/.test(value)) return;
      return onChange(value === "" || value === "-" || value === "−" ? `${value}0.` : `${value}.`);
    }
    onChange(value + key);
  }

  const keyClass =
    "min-h-16 rounded-2xl border-2 border-clay-brown bg-parchment font-display text-3xl font-bold text-ink active:bg-clay-brown/20";

  return (
    <>
      <input
        {...rest}
        ref={inputRef}
        type="text"
        inputMode="none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => {
          setOpen(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setOpen(false);
          onBlur?.(e);
        }}
      />
      {open &&
        createPortal(
          <>
            {/* Spacer so the page can scroll the field clear of the keypad. */}
            <div aria-hidden className="h-96" />
            <div
              role="group"
              aria-label="Number keypad"
              // Keeps focus in the field while a key is pressed, so the keypad does not close itself.
              onPointerDown={(e) => e.preventDefault()}
              className="fixed inset-x-0 bottom-0 z-[70] border-t-2 border-ink bg-parchment px-4 pb-6 pt-3 shadow-[0_-8px_24px_rgba(31,27,22,0.18)]"
            >
              <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2">
                {KEYS.map((k) => (
                  <button key={k} type="button" onClick={() => press(k)} className={keyClass}>
                    {k}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => press(".")}
                  disabled={!allowDecimal}
                  aria-label="Decimal point"
                  className={`${keyClass} disabled:opacity-30`}
                >
                  .
                </button>
                <button type="button" onClick={() => press("0")} className={keyClass}>
                  0
                </button>
                <button type="button" onClick={() => press("back")} aria-label="Delete" className={keyClass}>
                  {"⌫"}
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.blur()}
                  className="col-span-3 min-h-14 rounded-full bg-ink font-sans text-lg font-medium text-parchment"
                >
                  Done
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
