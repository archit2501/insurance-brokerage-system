"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DispatchPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-4">Dispatch</h1>
      <div className="rounded-md border border-border p-4">
        <p className="text-sm text-muted-foreground">
          This module will send CN/DN via Email and WhatsApp Business API, log audit entries, and handle retries/fallbacks.
        </p>
      </div>
    </div>
  );
}