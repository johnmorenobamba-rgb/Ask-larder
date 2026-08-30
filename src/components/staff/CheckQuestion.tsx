"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SPRING_PRESS } from "@/lib/motion/springPress";

export function CheckQuestion({
  question,
  options,
  correctOptionIndex,
  correctiveText,
  onAnswered,
}: {
  question: string;
  options: string[];
  correctOptionIndex: number;
  correctiveText: string | null;
  onAnswered: (wasCorrect: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  function selectOption(index: number) {
    if (selected !== null) return;
    setSelected(index);
    onAnswered(index === correctOptionIndex);
  }

  return (
    <div className="space-y-3">
      <p className="font-display text-lg text-ink">{question}</p>
      <div className="space-y-2">
        {options.map((option, index) => {
          const isSelected = selected === index;
          const isCorrectOption = index === correctOptionIndex;
          const showState = selected !== null && (isSelected || isCorrectOption);

          let borderClass = "border-clay-brown/40";
          if (showState) {
            borderClass = isCorrectOption ? "border-bay-green" : "border-preserve-red";
          }

          return (
            <motion.button
              key={index}
              type="button"
              onClick={() => selectOption(index)}
              disabled={selected !== null}
              whileHover={selected === null ? { scale: 1.01 } : undefined}
              whileTap={selected === null ? { scale: 0.97 } : undefined}
              transition={SPRING_PRESS}
              className={`w-full text-left px-4 py-3 rounded-2xl border-2 font-sans text-ink ${borderClass}`}
            >
              {option}
              {showState && isCorrectOption && (
                <span className="block mt-1 h-0.5 w-10 bg-bay-green" />
              )}
              {showState && isSelected && !isCorrectOption && (
                <span className="block mt-1 h-0.5 w-10 bg-preserve-red" />
              )}
            </motion.button>
          );
        })}
      </div>
      {selected !== null && selected !== correctOptionIndex && (
        <p className="text-preserve-red font-sans text-sm">
          Not quite — here&apos;s the actual step: {correctiveText}
        </p>
      )}
    </div>
  );
}
