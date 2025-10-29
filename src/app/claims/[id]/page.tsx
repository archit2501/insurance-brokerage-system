'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Claim {
  claim: {
    id: number;
    claimNumber: string;
    claimantName: string;
    claimantPhone: string | null;
    claimantEmail: string | null;
    lossDate: string;
    reportedDate: string;
    lossLocation: string | null;
    lossDescription: string;
    claimAmount: number;
    estimatedLoss: number | null;
    approvedAmount: number | null;
    settlementAmount: number | null;
    status: string;
    priority: string;
    currency: string;
    createdAt: string;
  };
  policy: {
    id: number;
    policyNumber: string;
    sumInsured: number;
  } | null;
  client: {
    id: number;
    companyName: string;
  } | null;
}

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadClaim();
    }
  }, [params.id]);

  const loadClaim = async () => {
    try {
      const res = await fetch(`/api/claims?id=${params.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setClaim(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load claim:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading claim...</div>;
  }

  if (!claim) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Claim not found</p>
        <button onClick={() => router.push('/claims')} style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: 'pointer',
        }}>
          Back to Claims
        </button>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency = 'NGN') => {
    const symbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Registered: '#3b82f6',
      UnderInvestigation: '#f59e0b',
      Approved: '#10b981',
      Rejected: '#ef4444',
      Settled: '#8b5cf6',
      Closed: '#6b7280',
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => router.push('/claims')}
          style={{
            marginBottom: '1rem',
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          ← Back to Claims
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {claim.claim.claimNumber}
            </h1>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: '500',
                backgroundColor: `${getStatusColor(claim.claim.status)}20`,
                color: getStatusColor(claim.claim.status),
              }}>
                {claim.claim.status}
              </span>
              <span style={{ color: '#6b7280' }}>
                {claim.claim.priority} Priority
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
              {formatCurrency(claim.claim.claimAmount, claim.claim.currency)}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Claim Amount
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Claimant Information */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            Claimant Information
          </h2>
          <div style={{ space: 'y-0.5rem' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Name</div>
              <div style={{ fontWeight: '500' }}>{claim.claim.claimantName}</div>
            </div>
            {claim.claim.claimantPhone && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Phone</div>
                <div style={{ fontWeight: '500' }}>{claim.claim.claimantPhone}</div>
              </div>
            )}
            {claim.claim.claimantEmail && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Email</div>
                <div style={{ fontWeight: '500' }}>{claim.claim.claimantEmail}</div>
              </div>
            )}
          </div>
        </div>

        {/* Policy & Client Information */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            Policy & Client
          </h2>
          <div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Policy Number</div>
              <div style={{ fontWeight: '500' }}>{claim.policy?.policyNumber || 'N/A'}</div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Sum Insured</div>
              <div style={{ fontWeight: '500' }}>
                {claim.policy ? formatCurrency(claim.policy.sumInsured) : 'N/A'}
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Client</div>
              <div style={{ fontWeight: '500' }}>{claim.client?.companyName || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Loss Information */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            Loss Information
          </h2>
          <div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Loss Date</div>
              <div style={{ fontWeight: '500' }}>{claim.claim.lossDate}</div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Reported Date</div>
              <div style={{ fontWeight: '500' }}>{claim.claim.reportedDate}</div>
            </div>
            {claim.claim.lossLocation && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Location</div>
                <div style={{ fontWeight: '500' }}>{claim.claim.lossLocation}</div>
              </div>
            )}
          </div>
        </div>

        {/* Financial Information */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            Financial Information
          </h2>
          <div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Claim Amount</div>
              <div style={{ fontWeight: '600', fontSize: '1.125rem' }}>
                {formatCurrency(claim.claim.claimAmount, claim.claim.currency)}
              </div>
            </div>
            {claim.claim.estimatedLoss !== null && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Estimated Loss</div>
                <div style={{ fontWeight: '500' }}>
                  {formatCurrency(claim.claim.estimatedLoss, claim.claim.currency)}
                </div>
              </div>
            )}
            {claim.claim.approvedAmount !== null && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Approved Amount</div>
                <div style={{ fontWeight: '500', color: '#10b981' }}>
                  {formatCurrency(claim.claim.approvedAmount, claim.claim.currency)}
                </div>
              </div>
            )}
            {claim.claim.settlementAmount !== null && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Settlement Amount</div>
                <div style={{ fontWeight: '600', color: '#8b5cf6' }}>
                  {formatCurrency(claim.claim.settlementAmount, claim.claim.currency)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loss Description */}
      <div style={{
        marginTop: '1.5rem',
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Loss Description
        </h2>
        <p style={{ color: '#4b5563', lineHeight: '1.6' }}>
          {claim.claim.lossDescription}
        </p>
      </div>
    </div>
  );
}
