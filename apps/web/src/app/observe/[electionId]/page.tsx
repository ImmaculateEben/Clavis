'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface PositionResult {
    position_title: string;
    candidates: { id: string; display_name: string; votes: number; avg_score?: string; avg_rank?: string }[];
}

interface Results {
    positions: PositionResult[];
    total_votes: number;
    total_registered: number;
    turnout_percent: number;
    quorum_met: boolean;
    voting_method: string;
}

export default function ObserverPortal() {
    const params = useParams();
    const electionId = params.electionId as string;
    const [results, setResults] = useState<Results | null>(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchResults = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/results/${electionId}/public`);
            if (res.ok) setResults(await res.json());
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchResults(); }, [electionId]);
    useEffect(() => {
        if (!autoRefresh) return;
        const i = setInterval(fetchResults, 5000);
        return () => clearInterval(i);
    }, [autoRefresh, electionId]);

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;
    if (!results) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="card" style={{ padding: '3rem', textAlign: 'center' }}><h2>No Results Available</h2><p style={{ color: 'rgb(var(--color-text-muted))' }}>Results may not have been released yet.</p></div></div>;

    const maxVotes = Math.max(...results.positions.flatMap(p => p.candidates.map(c => c.votes)), 1);

    return (
        <div style={{ minHeight: '100vh', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div className="animate-fade-in-up">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgb(var(--color-text-muted))', marginBottom: '0.5rem' }}>Observer Portal</div>
                    <h1 style={{ fontSize: '2rem' }}>Election Results</h1>
                    <label style={{ fontSize: '0.8125rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem' }}>
                        <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
                        Auto-refresh every 5s
                    </label>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{results.total_votes}</div><div style={{ fontSize: '0.75rem', color: 'rgb(var(--color-text-muted))' }}>VOTES</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{results.turnout_percent}%</div><div style={{ fontSize: '0.75rem', color: 'rgb(var(--color-text-muted))' }}>TURNOUT</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2.5rem', fontWeight: 700, color: results.quorum_met ? '#00D4AA' : '#FF6B6B' }}>{results.quorum_met ? '✓' : '✗'}</div><div style={{ fontSize: '0.75rem', color: 'rgb(var(--color-text-muted))' }}>QUORUM</div></div>
                </div>

                {results.positions.map(pos => (
                    <div key={pos.position_title} className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>{pos.position_title}</h2>
                        {pos.candidates.map((c, i) => {
                            const pct = results.total_votes > 0 ? (c.votes / results.total_votes * 100) : 0;
                            const barW = maxVotes > 0 ? (c.votes / maxVotes * 100) : 0;
                            return (
                                <div key={c.id} style={{ marginBottom: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                        <span style={{ fontWeight: i === 0 ? 700 : 400 }}>{i === 0 && c.votes > 0 ? '👑 ' : ''}{c.display_name}</span>
                                        <span style={{ fontWeight: 600 }}>{c.votes} ({pct.toFixed(1)}%)</span>
                                    </div>
                                    <div style={{ height: 8, borderRadius: 4, background: 'rgba(var(--color-border), 0.3)' }}>
                                        <div style={{ height: '100%', width: `${barW}%`, borderRadius: 4, background: i === 0 ? 'linear-gradient(90deg, rgb(var(--color-primary)), #00D4AA)' : 'rgba(var(--color-primary), 0.4)', transition: 'width 0.5s' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}

                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgb(var(--color-text-muted))' }}>
                    Read-only observer view · VoteSphere
                </p>
            </div>
        </div>
    );
}
