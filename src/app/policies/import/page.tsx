'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportBatch {
  id: number;
  batchNumber: string;
  importType: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
  successRows: number;
  failedRows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  validationErrors: any[];
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  importedBy: string;
  importedByEmail: string;
  duration: number | null;
}

export default function PolicyImportPage() {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [expandedBatch, setExpandedBatch] = useState<number | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/policies/import/history');
      if (!res.ok) throw new Error('Failed to load history');
      const data = await res.json();
      setBatches(data.batches || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        alert('Please select a CSV file');
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/policies/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setImportResult(data);

      // Reload history
      await loadHistory();

      // Clear file selection if successful
      if (res.ok && data.status === 'success') {
        setSelectedFile(null);
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error: any) {
      setImportResult({
        status: 'error',
        message: error.message || 'Upload failed'
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    window.location.href = '/api/policies/import/template';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      processing: 'outline',
      completed: 'default',
      failed: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status.toUpperCase()}</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const toggleBatchDetails = (batchId: number) => {
    setExpandedBatch(expandedBatch === batchId ? null : batchId);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">📥 Batch Policy Import</h1>
        <p className="text-gray-600">Upload CSV files to import multiple policies at once</p>
      </div>

      {/* Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Select File</label>
                <Input
                  id="file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="px-6"
              >
                {uploading ? '⏳ Uploading...' : '📤 Upload & Import'}
              </Button>
              <Button
                onClick={downloadTemplate}
                variant="outline"
                disabled={uploading}
              >
                ⬇️ Download Template
              </Button>
            </div>

            {selectedFile && (
              <div className="text-sm text-gray-600">
                Selected: <strong>{selectedFile.name}</strong> ({formatFileSize(selectedFile.size)})
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <Alert variant={importResult.status === 'failed' || importResult.status === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-semibold">{importResult.message}</div>
                    {importResult.batchNumber && (
                      <div className="text-sm">Batch Number: <strong>{importResult.batchNumber}</strong></div>
                    )}
                    {importResult.totalRows > 0 && (
                      <div className="grid grid-cols-3 gap-2 text-sm mt-2">
                        <div>Total: {importResult.totalRows}</div>
                        <div className="text-green-600">Success: {importResult.successRows || 0}</div>
                        <div className="text-red-600">Failed: {importResult.failedRows || 0}</div>
                      </div>
                    )}

                    {/* Validation Errors */}
                    {importResult.validationErrors && importResult.validationErrors.length > 0 && (
                      <div className="mt-3 p-3 bg-red-50 rounded border border-red-200 max-h-60 overflow-y-auto">
                        <div className="font-semibold text-sm mb-2">Validation Errors ({importResult.validationErrors.length}):</div>
                        <div className="space-y-1 text-xs font-mono">
                          {importResult.validationErrors.slice(0, 20).map((err: any, idx: number) => (
                            <div key={idx}>
                              Row {err.row}, {err.field}: {err.error}
                              {err.value && <span className="text-gray-600"> (value: "{err.value}")</span>}
                            </div>
                          ))}
                          {importResult.validationErrors.length > 20 && (
                            <div className="text-gray-600 italic">
                              ... and {importResult.validationErrors.length - 20} more errors
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Import Errors */}
                    {importResult.importErrors && importResult.importErrors.length > 0 && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200 max-h-60 overflow-y-auto">
                        <div className="font-semibold text-sm mb-2">Import Errors ({importResult.importErrors.length}):</div>
                        <div className="space-y-1 text-xs font-mono">
                          {importResult.importErrors.slice(0, 20).map((err: any, idx: number) => (
                            <div key={idx}>
                              Row {err.row}: {err.error}
                            </div>
                          ))}
                          {importResult.importErrors.length > 20 && (
                            <div className="text-gray-600 italic">
                              ... and {importResult.importErrors.length - 20} more errors
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>CSV Format Requirements:</strong></div>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Required columns: clientCode, insurerCode, lobCode, sumInsured, grossPremium, policyStartDate, policyEndDate</li>
                <li>Optional columns: policyNumber, currency (defaults to NGN)</li>
                <li>Date format: YYYY-MM-DD (e.g., 2024-01-01)</li>
                <li>Numeric values: No currency symbols or commas</li>
                <li>Codes must match existing records in the system</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Import History ({batches.length})</CardTitle>
            <Button onClick={loadHistory} variant="outline" size="sm" disabled={loading}>
              🔄 Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading history...</div>
          ) : batches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No import history yet</div>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => (
                <div key={batch.id} className="border rounded-lg">
                  <div
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleBatchDetails(batch.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono font-semibold text-blue-600">{batch.batchNumber}</span>
                          {getStatusBadge(batch.status)}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>📄 {batch.fileName} ({formatFileSize(batch.fileSize)})</div>
                          <div className="flex gap-4">
                            <span>Total: {batch.totalRows}</span>
                            <span className="text-green-600">✓ {batch.successRows}</span>
                            <span className="text-red-600">✗ {batch.failedRows}</span>
                            {batch.duration && <span>⏱️ {formatDuration(batch.duration)}</span>}
                          </div>
                          <div>👤 Imported by {batch.importedBy} on {new Date(batch.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="text-gray-400">
                        {expandedBatch === batch.id ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedBatch === batch.id && batch.validationErrors && batch.validationErrors.length > 0 && (
                    <div className="border-t p-4 bg-gray-50">
                      <div className="font-semibold mb-2 text-sm">Errors ({batch.validationErrors.length}):</div>
                      <div className="max-h-60 overflow-y-auto bg-white p-3 rounded border text-xs font-mono space-y-1">
                        {batch.validationErrors.slice(0, 50).map((err: any, idx: number) => (
                          <div key={idx}>
                            {err.row ? `Row ${err.row}` : 'General'}: {err.error || err.message}
                          </div>
                        ))}
                        {batch.validationErrors.length > 50 && (
                          <div className="text-gray-600 italic">
                            ... and {batch.validationErrors.length - 50} more errors
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
