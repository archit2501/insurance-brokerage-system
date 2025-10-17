"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type User = {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  role: 'Admin'|'Underwriter'|'Accounts'|'Claims'|'Marketer'|'Viewer';
  approvalLevel?: 'L1'|'L2'|'L3'|null;
  tfaEnabled?: boolean;
  status: 'Active'|'Inactive';
  maxOverrideLimit?: number;
};

// Input sanitization helper
function sanitizeInput(value: string): string {
  return value.trim().replace(/[<>]/g, '');
}

export default function UsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<any>({ fullName: '', email: '', role: 'Admin', approvalLevel: 'L1', password: '', status: 'Active', maxOverrideLimit: 0 });

  async function load() {
    try { const list = await apiGet<User[]>("/api/users"); setItems(list); } catch(e:any) { setError(e.message); }
  }

  useEffect(() => { load(); }, []);

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    
    if (!form.fullName.trim()) errors.fullName = 'Full name is required';
    if (!form.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Invalid email format';
    }
    if (!form.password.trim()) {
      errors.password = 'Password is required';
    } else if (form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function create() {
    if (!validateForm()) return;
    
    setError(""); setSuccess(""); setCreating(true);
    try {
      const sanitizedForm = {
        ...form,
        fullName: sanitizeInput(form.fullName),
        email: sanitizeInput(form.email),
        phone: form.phone ? sanitizeInput(form.phone) : undefined
      };
      
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
      const res = await fetch("/api/users", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(sanitizedForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setForm({ fullName: '', email: '', role: 'Admin', approvalLevel: 'L1', password: '', status: 'Active', maxOverrideLimit: 0 });
      setFieldErrors({});
      setSuccess("✓ User created successfully");
      setTimeout(() => setSuccess(""), 3000);
      await load().catch(() => {});
    } catch(e:any) { setError(e.message || 'Error'); }
    finally { setCreating(false); }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-4">User Master</h1>
      {error && <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}
      {success && <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-600">{success}</div>}

      <div className="rounded-md border border-border p-4 mb-8">
        <h2 className="font-medium mb-3">Create User</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">Full Name *
            <input 
              className={`w-full border rounded px-2 py-1 ${fieldErrors.fullName ? 'border-red-500' : 'border-border'}`}
              value={form.fullName} 
              onChange={(e)=>{
                setForm({...form, fullName: e.target.value});
                if (fieldErrors.fullName) setFieldErrors({...fieldErrors, fullName: ''});
              }} 
            />
            {fieldErrors.fullName && <span className="text-xs text-red-600 mt-1">{fieldErrors.fullName}</span>}
          </label>
          <label className="text-sm">Email *
            <input 
              type="email" 
              className={`w-full border rounded px-2 py-1 ${fieldErrors.email ? 'border-red-500' : 'border-border'}`}
              value={form.email} 
              onChange={(e)=>{
                setForm({...form, email: e.target.value});
                if (fieldErrors.email) setFieldErrors({...fieldErrors, email: ''});
              }} 
            />
            {fieldErrors.email && <span className="text-xs text-red-600 mt-1">{fieldErrors.email}</span>}
          </label>
          <label className="text-sm">Phone
            <input className="w-full border border-border rounded px-2 py-1" value={form.phone||''} onChange={(e)=>setForm({...form, phone: e.target.value})} />
          </label>
          <label className="text-sm">Role
            <select className="w-full border border-border rounded px-2 py-1" value={form.role} onChange={(e)=>setForm({...form, role: e.target.value})}>
              <option value="Admin">Admin</option>
              <option value="Underwriter">Underwriter</option>
              <option value="Accounts">Accounts</option>
              <option value="Claims">Claims</option>
              <option value="Marketer">Marketer</option>
              <option value="Viewer">Viewer</option>
            </select>
          </label>
          <label className="text-sm">Approval Level
            <select className="w-full border border-border rounded px-2 py-1" value={form.approvalLevel} onChange={(e)=>setForm({...form, approvalLevel: e.target.value})}>
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="L3">L3</option>
            </select>
          </label>
          <label className="text-sm">Password *
            <input 
              type="password" 
              autoComplete="off" 
              className={`w-full border rounded px-2 py-1 ${fieldErrors.password ? 'border-red-500' : 'border-border'}`}
              value={form.password} 
              onChange={(e)=>{
                setForm({...form, password: e.target.value});
                if (fieldErrors.password) setFieldErrors({...fieldErrors, password: ''});
              }} 
            />
            {fieldErrors.password && <span className="text-xs text-red-600 mt-1">{fieldErrors.password}</span>}
          </label>
          <label className="text-sm">Status
            <select className="w-full border border-border rounded px-2 py-1" value={form.status} onChange={(e)=>setForm({...form, status: e.target.value})}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
          <label className="text-sm">Max Override Limit
            <input type="number" className="w-full border border-border rounded px-2 py-1" value={form.maxOverrideLimit||0} onChange={(e)=>setForm({...form, maxOverrideLimit: Number(e.target.value)})} />
          </label>
        </div>
        <button disabled={creating} onClick={create} className="mt-3 inline-flex items-center px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50">{creating? 'Saving...' : 'Save User'}</button>
      </div>

      <div className="rounded-md border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Role</th>
              <th className="p-2 text-left">Approval</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(u => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-2">{u.id}</td>
                <td className="p-2">{u.fullName}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{u.approvalLevel ?? '-'}</td>
                <td className="p-2">{u.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}