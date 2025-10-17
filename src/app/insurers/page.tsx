"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Insurer = {
  id: number;
  companyName: string;
  shortName: string;
  licenseNumber: string;
  licenseExpiry?: string;
  address: string;
  city: string;
  state: string;
  country?: string | null;
  website?: string | null;
  acceptedLobs?: string[] | null;
  specialLobs?: string[] | null;
  status: string;
};

export default function InsurersPage() {
  const [items, setItems] = useState<Insurer[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [form, setForm] = useState<any>({ companyName: "", shortName: "", licenseNumber: "", licenseExpiry: "", address: "", city: "", state: "", country: "Nigeria", website: "", acceptedLobs: [], specialLobs: [], status: "active" });
  const [lobInput, setLobInput] = useState("");
  const [specialLobInput, setSpecialLobInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loadingList, setLoadingList] = useState(false);
  const router = useRouter();

  async function fetchList() {
    setLoadingList(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      if (statusFilter) params.set("status", statusFilter);
      const token = typeof window !== 'undefined' ? (window.localStorage.getItem('bearer_token') || window.localStorage.getItem('token')) : null;
      const res = await fetch(`/api/insurers?${params.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to load insurers');
      }
      const list: Insurer[] = await res.json();
      setItems(list);
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoadingList(false);
    }
  }

  async function create() {
    setError(""); 
    setSuccess("");
    setCreating(true);
    try {
      const payload = { 
        ...form,
        acceptedLobs: lobInput ? lobInput.split(",").map((s)=>s.trim()).filter(Boolean) : [],
        specialLobs: specialLobInput ? specialLobInput.split(",").map((s)=>s.trim()).filter(Boolean) : [],
      };
      const token = typeof window !== 'undefined' ? (window.localStorage.getItem('bearer_token') || window.localStorage.getItem('token')) : null;
      const res = await fetch('/api/insurers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to create insurer');
      }
      const created: Insurer = await res.json();
      setItems([created, ...items]);
      setForm({ companyName: "", shortName: "", licenseNumber: "", licenseExpiry: "", address: "", city: "", state: "", country: "Nigeria", website: "", acceptedLobs: [], specialLobs: [], status: "active" });
      setLobInput("");
      setSpecialLobInput("");
      setSuccess("Insurer created successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e:any) { setError(e.message || 'Error'); }
    finally { setCreating(false); }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-4">Insurer Master</h1>
      {error && <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}
      {success && <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-600">{success}</div>}

      <div className="mb-6 flex flex-col md:flex-row items-start md:items-end gap-3">
        <div className="flex-1">
          <label className="text-sm block">Search
            <input className="w-full border border-border rounded px-2 py-1" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search name, license, city, LOBs" />
          </label>
        </div>
        <div>
          <label className="text-sm block">Status
            <select className="w-full border border-border rounded px-2 py-1" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
        <button onClick={fetchList} disabled={loadingList} className="inline-flex h-9 px-3 rounded bg-secondary text-secondary-foreground border border-border disabled:opacity-50">{loadingList? 'Searching...' : 'Search'}</button>
      </div>

      <div className="rounded-md border border-border p-4 mb-8">
        <h2 className="font-medium mb-3">Create Insurer</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">Company Name
            <input className="w-full border border-border rounded px-2 py-1" value={form.companyName} onChange={(e)=>setForm({...form, companyName: e.target.value})} />
          </label>
          <label className="text-sm">Short Name
            <input className="w-full border border-border rounded px-2 py-1" value={form.shortName||""} onChange={(e)=>setForm({...form, shortName: e.target.value})} />
          </label>
          <label className="text-sm">License Number
            <input className="w-full border border-border rounded px-2 py-1" value={form.licenseNumber||""} onChange={(e)=>setForm({...form, licenseNumber: e.target.value})} />
          </label>
          <label className="text-sm">License Expiry
            <input type="date" className="w-full border border-border rounded px-2 py-1" value={form.licenseExpiry||""} onChange={(e)=>setForm({...form, licenseExpiry: e.target.value})} />
          </label>
          <label className="text-sm">Address
            <input className="w-full border border-border rounded px-2 py-1" value={form.address||""} onChange={(e)=>setForm({...form, address: e.target.value})} />
          </label>
          <label className="text-sm">City
            <input className="w-full border border-border rounded px-2 py-1" value={form.city||""} onChange={(e)=>setForm({...form, city: e.target.value})} />
          </label>
          <label className="text-sm">State
            <input className="w-full border border-border rounded px-2 py-1" value={form.state||""} onChange={(e)=>setForm({...form, state: e.target.value})} />
          </label>
          <label className="text-sm">Country
            <input className="w-full border border-border rounded px-2 py-1" value={form.country||""} onChange={(e)=>setForm({...form, country: e.target.value})} />
          </label>
          <label className="text-sm">Website
            <input className="w-full border border-border rounded px-2 py-1" value={form.website||""} onChange={(e)=>setForm({...form, website: e.target.value})} />
          </label>
          <label className="text-sm">Accepted LOBs (comma-separated)
            <input className="w-full border border-border rounded px-2 py-1" value={lobInput} onChange={(e)=>setLobInput(e.target.value)} />
          </label>
          <label className="text-sm">Special LOBs (comma-separated)
            <input className="w-full border border-border rounded px-2 py-1" value={specialLobInput} onChange={(e)=>setSpecialLobInput(e.target.value)} />
          </label>
        </div>
        <button disabled={creating} onClick={create} className="mt-3 inline-flex items-center px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50">{creating? 'Saving...' : 'Save Insurer'}</button>
      </div>

      <div className="rounded-md border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Company Name</th>
              <th className="p-2 text-left">License Number</th>
              <th className="p-2 text-left">License Expiry</th>
              <th className="p-2 text-left">City</th>
              <th className="p-2 text-left">State</th>
              <th className="p-2 text-left">Accepted LOBs</th>
              <th className="p-2 text-left">Special LOBs</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-border align-top">
                <td className="p-2">{it.id}</td>
                <td className="p-2">{it.companyName}</td>
                <td className="p-2">{it.licenseNumber}</td>
                <td className="p-2">{it.licenseExpiry || '-'}</td>
                <td className="p-2">{it.city}</td>
                <td className="p-2">{it.state}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1">
                    {(it.acceptedLobs || []).map((lob, idx) => (
                      <span key={idx} className="inline-block rounded border border-border bg-accent text-accent-foreground px-2 py-0.5 text-xs">{lob}</span>
                    ))}
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1">
                    {(it.specialLobs || []).map((lob, idx) => (
                      <span key={idx} className="inline-block rounded border border-border bg-secondary text-secondary-foreground px-2 py-0.5 text-xs">{lob}</span>
                    ))}
                  </div>
                </td>
                <td className="p-2">{it.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}