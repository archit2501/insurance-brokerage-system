'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Policy {
  id: number;
  policyNumber: string;
  clientId: number;
  sumInsured: number;
  policyStartDate: string;
  policyEndDate: string;
}

export default function NewClaimPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    policyId: '',
    claimantName: '',
    claimantPhone: '',
    claimantEmail: '',
    lossDate: '',
    reportedDate: new Date().toISOString().split('T')[0],
    lossLocation: '',
    lossDescription: '',
    claimAmount: '',
    priority: 'Medium',
    currency: 'NGN',
    exchangeRate: '1.0',
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      const res = await fetch('/api/policies?limit=500');
      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
      }
    } catch (error) {
      console.error('Failed to load policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyId: parseInt(form.policyId),
          claimantName: form.claimantName,
          claimantPhone: form.claimantPhone || undefined,
          claimantEmail: form.claimantEmail || undefined,
          lossDate: form.lossDate,
          reportedDate: form.reportedDate,
          lossLocation: form.lossLocation || undefined,
          lossDescription: form.lossDescription,
          claimAmount: parseFloat(form.claimAmount),
          priority: form.priority,
          currency: form.currency,
          exchangeRate: parseFloat(form.exchangeRate),
        }),
      });

      if (res.ok) {
        const claim = await res.json();
        alert('✅ Claim registered successfully!');
        router.push(`/claims/${claim.id}`);
      } else {
        const error = await res.json();
        alert(`❌ Error: ${error.error || 'Failed to register claim'}`);
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Register New Claim
        </h1>
        <p style={{ color: '#6b7280' }}>
          Register a new insurance claim for an existing policy
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        {/* Policy Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
            Policy *
          </label>
          <select
            required
            value={form.policyId}
            onChange={(e) => setForm({ ...form, policyId: e.target.value })}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '1rem',
            }}
          >
            <option value="">Select a policy</option>
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.policyNumber} (Sum Insured: ₦{p.sumInsured?.toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        {/* Claimant Information */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
              Claimant Name *
            </label>
            <input
              type="text"
              required
              value={form.claimantName}
              onChange={(e) => setForm({ ...form, claimantName: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
              Claimant Phone
            </label>
            <input
              type="tel"
              value={form.claimantPhone}
              onChange={(e) => setForm({ ...form, claimantPhone: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
              Claimant Email
            </label>
            <input
              type="email"
              value={form.claimantEmail}
              onChange={(e) => setForm({ ...form, claimantEmail: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
              }}
            />
          </div>
        </div>

        {/* Loss Details */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
              Loss Date *
            </label>
            <input
              type="date"
              required
              value={form.lossDate}
              onChange={(e) => setForm({ ...form, lossDate: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
              Reported Date *
            </label>
            <input
              type="date"
              required
              value={form.reportedDate}
              onChange={(e) => setForm({ ...form, reportedDate: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
              Priority *
            </label>
            <select
              required
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
              }}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Loss Location */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
            Loss Location
          </label>
          <input
            type="text"
            value={form.lossLocation}
            onChange={(e) => setForm({ ...form, lossLocation: e.target.value })}
            placeholder="Address or location where the loss occurred"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
            }}
          />
        </div>

        {/* Loss Description */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
            Loss Description *
          </label>
          <textarea
            required
            rows={4}
            value={form.lossDescription}
            onChange={(e) => setForm({ ...form, lossDescription: e.target.value })}
            placeholder="Describe the incident and damages in detail..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Claim Amount and Currency */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
              Claim Amount *
            </label>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              value={form.claimAmount}
              onChange={(e) => setForm({ ...form, claimAmount: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
              Currency
            </label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
              }}
            >
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
              Exchange Rate
            </label>
            <input
              type="number"
              step="0.01"
              value={form.exchangeRate}
              onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => router.push('/claims')}
            style={{
              padding: '0.75rem 1.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Registering...' : 'Register Claim'}
          </button>
        </div>
      </form>
    </div>
  );
}
