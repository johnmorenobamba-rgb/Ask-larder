"use client";

import { useCallback, useState } from "react";
import { useMotionValue, animate } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const DRAG_SENSITIVITY = 0.35; // degrees of rotation per px of horizontal drag
const SPRING = { type: "spring" as const, stiffness: 220, damping: 28 };

function normalizeIndex(index: number, count: number) {
  return ((index % count) + count) % count;
}

/**
 * Block J5 redo — Personal Dashboard spec's stations gallery, rebuilt as a
 * true 3D rotating cylinder (drag-physics rotateY carousel) rather than a
 * flat scroll-snap row. `rotationY` is the whole cylinder's current
 * rotation in degrees; each card adds its own fixed per-card angle on top
 * (see StationsGallery.tsx) so the combined transform places it correctly
 * around the drum.
 *
 * Drag reads framer-motion's `onPan` gesture (unified mouse/touch, like
 * J1's Pointer-Events tilt) and adds each frame's horizontal delta
 * straight to the rotation motion value -- no React state involved in the
 * drag itself, so dragging doesn't re-render. On release, `animate()`
 * spring-settles to the nearest face-forward angle, seeded with the
 * release velocity so a fast flick keeps spinning further before landing
 * ("spring-damped drag-to-spin"), while a slow drag just eases to the
 * nearest card.
 *
 * `activeIndex` (which card is currently front-facing) IS real React
 * state, but -- same as the old coverflow hook's dot indicator -- it only
 * updates when the nearest card actually changes, not continuously during
 * drag, and drives the dot indicator / focus-overlay default.
 */
export function useCylinderCarousel(count: number) {
  const rotationY = useMotionValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const anglePerCard = count > 0 ? 360 / count : 0;

  const snapToNearest = useCallback(
    (velocityX = 0) => {
      if (count === 0) return;
      const raw = rotationY.get();
      const nearestSteps = Math.round(-raw / anglePerCard);
      const target = -nearestSteps * anglePerCard;
      setActiveIndex(normalizeIndex(nearestSteps, count));
      if (reducedMotion) {
        rotationY.set(target);
      } else {
        animate(rotationY, target, { ...SPRING, velocity: velocityX * DRAG_SENSITIVITY });
      }
    },
    [rotationY, anglePerCard, count, reducedMotion],
  );

  const onPan = useCallback(
    (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
      rotationY.set(rotationY.get() + info.delta.x * DRAG_SENSITIVITY);
    },
    [rotationY],
  );

  const onPanEnd = useCallback(
    (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
      snapToNearest(info.velocity.x);
    },
    [snapToNearest],
  );

  const goToIndex = useCallback(
    (index: number) => {
      const target = -index * anglePerCard;
      setActiveIndex(normalizeIndex(index, count));
      if (reducedMotion) {
        rotationY.set(target);
      } else {
        animate(rotationY, target, SPRING);
      }
    },
    [rotationY, anglePerCard, count, reducedMotion],
  );

  return { rotationY, onPan, onPanEnd, activeIndex, goToIndex, anglePerCard };
}
