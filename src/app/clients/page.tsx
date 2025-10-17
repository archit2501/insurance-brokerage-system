"use client";

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Client = {
  id: number;
  clientCode?: string;
  companyName: string;
  clientType?: string;
  cacRcNumber?: string | null;
  tin?: string | null;
  industry?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  website?: string | null;
  kycStatus?: string;
  status: string;
};

// Input sanitization helper
function sanitizeInput(value: string): string {
  return value.trim().replace(/[<>]/g, '');
}

export default function ClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>({ 
    companyName: '', 
    clientType: 'Company',
    cacRcNumber: '', 
    tin: '', 
    industry: '', 
    address: '', 
    city: '', 
    state: '', 
    country: 'Nigeria',
    website: ''
  });
  const [error, setError] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [kyc, setKyc] = useState<{ client_id: number | '' , doc_type: string, file: File | null }>({ client_id: '', doc_type: 'Passport/ID', file: null });
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    apiGet<Client[]>('/api/clients')
      .then(setItems)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const validateForm = (): boolean => {
    // Required fields for all clients
    if (!form.companyName?.trim()) {
      toast.error("Company/Individual Name is required");
      return false;
    }
    
    if (!form.industry?.trim()) {
      toast.error("Industry is required");
      return false;
    }
    
    if (!form.address?.trim()) {
      toast.error("Address is required");
      return false;
    }
    
    if (!form.city?.trim()) {
      toast.error("City is required");
      return false;
    }
    
    if (!form.state?.trim()) {
      toast.error("State is required");
      return false;
    }

    // Additional validation for Company type
    if (form.clientType === 'Company') {
      if (!form.cacRcNumber?.trim()) {
        toast.error("CAC/RC Number is required for companies");
        return false;
      }
      if (!form.tin?.trim()) {
        toast.error("TIN is required for companies");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setCreating(true);
    try {
      // Auto-prepend https:// to website if not present
      let websiteValue = form.website ? form.website.trim() : '';
      if (websiteValue && !/^https?:\/\//i.test(websiteValue)) {
        websiteValue = `https://${websiteValue}`;
      }
      
      const sanitizedForm = {
        ...form,
        companyName: sanitizeInput(form.companyName),
        clientType: form.clientType,
        cacRcNumber: form.cacRcNumber ? sanitizeInput(form.cacRcNumber) : '',
        tin: form.tin ? sanitizeInput(form.tin) : '',
        industry: sanitizeInput(form.industry),
        address: sanitizeInput(form.address),
        city: sanitizeInput(form.city),
        state: sanitizeInput(form.state),
        country: sanitizeInput(form.country),
        website: websiteValue
      };
      
      const c = await apiPost<Client>('/api/clients', sanitizedForm);
      setItems([c, ...items]);
      setForm({ 
        companyName: '', 
        clientType: 'Company',
        cacRcNumber: '', 
        tin: '', 
        industry: '', 
        address: '', 
        city: '', 
        state: '', 
        country: 'Nigeria',
        website: ''
      });
      setFieldErrors({});
      setSuccess('✓ Client created successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e:any) { setError(e.message || 'Error'); }
    finally { setCreating(false); }
  };

  async function uploadKYC() {
    try {
      setError(''); setSuccess(''); setUploading(true);
      if (!kyc.client_id || !kyc.file) { setError('Select client and file'); setUploading(false); return; }
      const fd = new FormData();
      fd.append('doc_type', kyc.doc_type);
      fd.append('file', kyc.file);
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
      const res = await fetch(`/api/clients/${kyc.client_id}/kyc`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      await res.json();
      setKyc({ client_id: '', doc_type: 'Passport/ID', file: null });
      setSuccess('✓ KYC uploaded successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e:any) { setError(e.message || 'Error'); }
    finally { setUploading(false); }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-4">Client Master</h1>
      {error && <div className="mb-2 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}
      {success && <div className="mb-2 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-600">{success}</div>}

      <div className="rounded-md border border-border p-4 mb-8">
        <h2 className="font-medium mb-3">Create Client</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Client Type <span className="text-red-500">*</span>
            </label>
            <select 
              className="w-full border border-border rounded px-3 py-2 bg-background"
              value={form.clientType} 
              onChange={(e)=>{
                setForm({...form, clientType: e.target.value});
                // Clear CAC/TIN errors when switching types
                if (e.target.value === 'Individual') {
                  const newErrors = {...fieldErrors};
                  delete newErrors.cacRcNumber;
                  delete newErrors.tin;
                  setFieldErrors(newErrors);
                }
              }}
            >
              <option value="Company">Company</option>
              <option value="Individual">Individual</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Company/Individual Name <span className="text-red-500">*</span>
            </label>
            <input 
              className="w-full border rounded px-3 py-2 bg-background"
              value={form.companyName} 
              onChange={(e)=>{
                setForm({...form, companyName: e.target.value});
                if (fieldErrors.companyName) setFieldErrors({...fieldErrors, companyName: ''});
              }} 
              placeholder={form.clientType === 'Company' ? 'Enter company name' : 'Enter full name'}
            />
            {fieldErrors.companyName && <span className="text-xs text-red-600 mt-1 block">{fieldErrors.companyName}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Industry <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 bg-background"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              required
              placeholder="e.g., Technology, Finance, Healthcare"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Address <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full border rounded px-3 py-2 bg-background"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
              rows={3}
              placeholder="Registered address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2 bg-background"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2 bg-background"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Country
            </label>
            <input className="w-full border border-border rounded px-3 py-2 bg-background" value={form.country} onChange={(e)=>setForm({...form, country: e.target.value})} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Website
            </label>
            <input 
              className="w-full border border-border rounded px-3 py-2 bg-background"
              value={form.website} 
              onChange={(e)=>setForm({...form, website: e.target.value})}
              placeholder="example.com or https://example.com"
            />
            <span className="text-xs text-muted-foreground mt-1 block">https:// will be added automatically if not present</span>
          </div>

          <button disabled={creating} type="submit" className="mt-3 inline-flex items-center px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50">{creating? 'Saving...' : 'Save Client'}</button>
        </form>
      </div>

      <div className="rounded-md border border-border p-4 mb-8">
        <h2 className="font-medium mb-3">Upload KYC for Client</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <label className="text-sm">Client
            <select className="w-full border border-border rounded px-2 py-1.5" value={kyc.client_id} onChange={(e)=>setKyc({...kyc, client_id: e.target.value ? Number(e.target.value) : ''})}>
              <option value="">-- choose client --</option>
              {items.map(c => (<option key={c.id} value={c.id}>{c.companyName} (#{c.id})</option>))}
            </select>
          </label>
          <label className="text-sm">Doc Type
            <select className="w-full border border-border rounded px-2 py-1.5" value={kyc.doc_type} onChange={(e)=>setKyc({...kyc, doc_type: e.target.value})}>
              <option value="Passport/ID">Passport/ID</option>
              <option value="CAC docs">CAC docs</option>
              <option value="TIN certificate">TIN certificate</option>
            </select>
          </label>
          <label className="text-sm">File
            <input type="file" accept=".pdf,image/png,image/jpeg" className="w-full" onChange={(e)=>setKyc({...kyc, file: e.target.files?.[0] || null})} />
          </label>
        </div>
        <button disabled={uploading || !kyc.client_id || !kyc.file} onClick={uploadKYC} className="mt-3 inline-flex items-center px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50">{uploading ? 'Uploading...' : 'Upload'}</button>
      </div>

      <div className="rounded-md border border-border">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading clients...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Client Code</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">CAC/RC</th>
                <th className="p-2 text-left">TIN</th>
                <th className="p-2 text-left">KYC Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} className="border-t border-border">
                  <td className="p-2">{it.id}</td>
                  <td className="p-2 font-mono text-xs">{it.clientCode || '-'}</td>
                  <td className="p-2">{it.companyName}</td>
                  <td className="p-2">{it.clientType || 'Company'}</td>
                  <td className="p-2">{it.cacRcNumber || '-'}</td>
                  <td className="p-2">{it.tin || '-'}</td>
                  <td className="p-2">{it.kycStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}