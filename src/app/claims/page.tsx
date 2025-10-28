'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Claim {
  claim: {
    id: number;
    claimNumber: string;
    claimantName: string;
    lossDate: string;
    reportedDate: string;
    claimAmount: number;
    estimatedLoss: number | null;
    approvedAmount: number | null;
    settlementAmount: number | null;
    status: string;
    priority: string;
    currency: string;
    lossDescription: string;
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
  adjuster: {
    id: number;
    fullName: string;
  } | null;
}

interface Statistics {
  totalClaims: number;
  openClaimsCount: number;
  totalClaimAmount: number;
  totalSettledAmount: number;
  avgSettlementDays: number;
  settlementRatio: number;
  claimsByStatus: Record<string, number>;
  claimsByPriority: Record<string, number>;
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Build query params
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const [claimsRes, statsRes] = await Promise.all([
        fetch(`/api/claims?${params.toString()}`),
        fetch('/api/claims/statistics'),
      ]);

      if (claimsRes.ok) {
        const data = await claimsRes.json();
        setClaims(data);
      }
      
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Failed to load claims:', error);
      alert('Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
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

  const getPriorityBadgeColor = (priority: string) => {
    const colors: Record<string, string> = {
      Low: '#10b981',
      Medium: '#3b82f6',
      High: '#f59e0b',
      Critical: '#ef4444',
    };
    return colors[priority] || '#6b7280';
  };

  const formatCurrency = (amount: number, currency = 'NGN') => {
    const symbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Claims Management</h1>
          <button
            onClick={() => router.push('/claims/new')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
            }}
          >
            ➕ Register New Claim
          </button>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Claims</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>
                {statistics.totalClaims}
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Open Claims</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
                {statistics.openClaimsCount}
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Settlement Ratio</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                {statistics.settlementRatio}%
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Avg Settlement Time</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                {statistics.avgSettlementDays} days
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Claimed</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
                {formatCurrency(statistics.totalClaimAmount)}
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Settled</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                {formatCurrency(statistics.totalSettledAmount)}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}>
          <input
            type="text"
            placeholder="🔍 Search claims..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '250px',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '1rem',
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '1rem',
            }}
          >
            <option value="">All Statuses</option>
            <option value="Registered">Registered</option>
            <option value="UnderInvestigation">Under Investigation</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Settled">Settled</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '1rem',
            }}
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>

          <button
            onClick={loadData}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Claims Table */}
        {loading ? (
          <p>Loading claims...</p>
        ) : claims.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '0.5rem',
          }}>
            <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>
              No claims found. Register your first claim to get started.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderRadius: '0.5rem',
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Claim Number</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Policy</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Client</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Claimant</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Loss Date</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>Claim Amount</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Priority</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Adjuster</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((item) => (
                  <tr key={item.claim.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{item.claim.claimNumber}</td>
                    <td style={{ padding: '1rem' }}>{item.policy?.policyNumber || '—'}</td>
                    <td style={{ padding: '1rem' }}>{item.client?.companyName || '—'}</td>
                    <td style={{ padding: '1rem' }}>{item.claim.claimantName}</td>
                    <td style={{ padding: '1rem' }}>{item.claim.lossDate}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '500' }}>
                      {formatCurrency(item.claim.claimAmount, item.claim.currency)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        backgroundColor: `${getPriorityBadgeColor(item.claim.priority)}20`,
                        color: getPriorityBadgeColor(item.claim.priority),
                      }}>
                        {item.claim.priority}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        backgroundColor: `${getStatusBadgeColor(item.claim.status)}20`,
                        color: getStatusBadgeColor(item.claim.status),
                      }}>
                        {item.claim.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>{item.adjuster?.fullName || 'Unassigned'}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => router.push(`/claims/${item.claim.id}`)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
  );
}
