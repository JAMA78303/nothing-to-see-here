"use client";

import { useEffect } from "react";
import { backend } from "@/game/backend";
import { startGame } from "@/game/engine";
import { MARKUP } from "@/game/markup";

export function Game() {
  useEffect(() => startGame(backend, { devTools: process.env.NEXT_PUBLIC_DEV_TOOLS === "1" }), []);

  // The SVG stage is static markup; the engine animates it by id.
  return <div className="game-root" dangerouslySetInnerHTML={{ __html: MARKUP }} />;
}
