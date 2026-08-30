"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const PERMISSION_ASKED_KEY = "larder-parallax-permission-asked";
const MAX_TILT_DEG = 20;

type RequestPermissionFn = () => Promise<"granted" | "denied">;

function getRequestPermission(): RequestPermissionFn | undefined {
  return (window.DeviceOrientationEvent as unknown as { requestPermission?: RequestPermissionFn })?.requestPermission;
}

function setParallaxVars(nx: number, ny: number) {
  const root = document.documentElement;
  root.style.setProperty("--viewport-parallax-x", String(Math.min(1, Math.max(-1, nx))));
  root.style.setProperty("--viewport-parallax-y", String(Math.min(1, Math.max(-1, ny))));
}

function onDeviceOrientation(e: DeviceOrientationEvent) {
  if (e.beta === null || e.gamma === null) return;
  setParallaxVars(e.gamma / MAX_TILT_DEG, (e.beta - 45) / MAX_TILT_DEG);
}

/**
 * Block L7 -- whole-viewport parallax, layered on top of J1's per-cell
 * tilt (which only reacts to pointer position *within* one card). Writes
 * normalized -1..1 offsets straight onto `document.documentElement` as CSS
 * custom properties -- same "update CSS vars directly, not React state"
 * pattern useTiltSpotlight already uses for high-frequency pointer
 * tracking, so this doesn't re-render the whole grid on every pointermove.
 * ElevatedCell reads `--viewport-parallax-x/y` directly via calc(), weighted
 * by its own depth tier (L3) -- hero cells (closer) travel further than
 * secondary (receded) ones, so parallax and depth read as one consistent
 * physical effect rather than two unrelated ones.
 *
 * Desktop (hover: hover, pointer: fine): a window-level pointermove
 * listener, no permission needed.
 *
 * Mobile: `deviceorientation`. iOS 13+ Safari gates this behind
 * `DeviceOrientationEvent.requestPermission()`, which must be called from a
 * real user gesture -- `needsIOSPermission`/`requestIOSPermission` let a
 * caller render a one-time tap affordance for that. Every other mobile
 * browser (Android Chrome, etc.) has no such gate and starts listening
 * immediately. Asked at most once per device (localStorage), same
 * one-shot-then-remember shape as the splash's own trigger logic.
 */
export function useViewportParallax() {
  const reducedMotion = usePrefersReducedMotion();
  const [needsIOSPermission, setNeedsIOSPermission] = useState(false);
  const listeningRef = useRef(false);

  useEffect(() => {
    if (reducedMotion) return;

    function onPointerMove(e: PointerEvent) {
      setParallaxVars((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    }

    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (mql.matches) {
      window.addEventListener("pointermove", onPointerMove);
      return () => window.removeEventListener("pointermove", onPointerMove);
    }

    const requestPermission = getRequestPermission();
    let raf = 0;
    if (typeof requestPermission === "function") {
      if (window.localStorage.getItem(PERMISSION_ASKED_KEY) === "granted") {
        listeningRef.current = true;
        window.addEventListener("deviceorientation", onDeviceOrientation);
      } else if (window.localStorage.getItem(PERMISSION_ASKED_KEY) !== "denied") {
        raf = requestAnimationFrame(() => setNeedsIOSPermission(true));
      }
    } else {
      listeningRef.current = true;
      window.addEventListener("deviceorientation", onDeviceOrientation);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (listeningRef.current) window.removeEventListener("deviceorientation", onDeviceOrientation);
    };
  }, [reducedMotion]);

  async function requestIOSPermission() {
    const requestPermission = getRequestPermission();
    if (typeof requestPermission !== "function") return;
    const result = await requestPermission();
    window.localStorage.setItem(PERMISSION_ASKED_KEY, result);
    setNeedsIOSPermission(false);
    if (result === "granted") {
      listeningRef.current = true;
      window.addEventListener("deviceorientation", onDeviceOrientation);
    }
  }

  return { needsIOSPermission, requestIOSPermission };
}
