"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useRouter } from "next/navigation";

type AuditLog = {
  id: number;
  user_id?: number | null;
  action: string;
  entity?: string | null;
  entity_id?: string | null;
  details?: any;
  channel?: string | null;
  created_at: string;
};

export default function AuditPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    apiGet<AuditLog[]>("/api/audit")
      .then(setItems)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-4">Audit & Compliance</h1>
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
      <div className="rounded-md border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">When</th>
              <th className="p-2 text-left">User</th>
              <th className="p-2 text-left">Action</th>
              <th className="p-2 text-left">Entity</th>
              <th className="p-2 text-left">Entity ID</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-border">
                <td className="p-2">{it.id}</td>
                <td className="p-2">{new Date(it.created_at).toLocaleString()}</td>
                <td className="p-2">{it.user_id ?? '-'}</td>
                <td className="p-2">{it.action}</td>
                <td className="p-2">{it.entity ?? '-'}</td>
                <td className="p-2">{it.entity_id ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}