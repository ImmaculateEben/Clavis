'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function VerifyReceiptPage() {
    const [code, setCode] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await api.post('/voting/verify-receipt', { receipt_code: code });
            setResult(data);
        } catch {
            setResult({ valid: false, message: 'Error verifying receipt' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <div className="card animate-fade-in-up" style={{ maxWidth: '480px', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
                    <h1 style={{ fontSize: '1.5rem' }}>Verify Your Vote</h1>
                    <p style={{ color: 'rgb(var(--color-text-muted))', fontSize: '0.875rem' }}>Enter your receipt code to confirm your vote was recorded.</p>
                </div>

                <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input className="input" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Enter receipt code" required style={{ fontFamily: 'monospace', letterSpacing: '1px', textAlign: 'center' }} />
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center' }}>
                        {loading ? <div className="spinner" /> : 'Verify'}
                    </button>
                </form>

                {result && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-md)', background: result.valid ? 'rgba(0,212,170,0.08)' : 'rgba(255,107,107,0.08)' }}>
                        {result.valid ? (
                            <>
                                <div style={{ color: '#00D4AA', fontWeight: 600, marginBottom: '0.5rem' }}>✅ Vote Verified</div>
                                <div style={{ fontSize: '0.875rem' }}>
                                    <div><strong>Election:</strong> {result.election_title}</div>
                                    <div><strong>Cast at:</strong> {new Date(result.cast_at).toLocaleString()}</div>
                                    <div><strong>Status:</strong> {result.election_status}</div>
                                </div>
                            </>
                        ) : (
                            <div style={{ color: '#FF6B6B', fontWeight: 600 }}>❌ {result.message}</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
