'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface PositionResult {
    position_id: string;
    position_title: string;
    candidates: CandidateResult[];
}

interface CandidateResult {
    id: string;
    display_name: string;
    votes: number;
    avg_rank?: string;
    avg_score?: string;
    total_score?: number;
    weighted_total?: number;
}

interface Results {
    positions: PositionResult[];
    total_votes: number;
    total_registered: number;
    turnout_percent: number;
    quorum_required: number;
    quorum_met: boolean;
    voting_method: string;
}

interface SegmentData {
    department: string;
    total: number;
    voted: number;
    turnout_percent: number;
}

export default function ResultsPage() {
    const params = useParams();
    const electionId = params.electionId as string;

    const [results, setResults] = useState<Results | null>(null);
    const [segments, setSegments] = useState<SegmentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const fetchResults = async () => {
        try {
            const [r, s] = await Promise.all([
                api.get<Results>(`/results/${electionId}`),
                api.get<SegmentData[]>(`/results/${electionId}/segments`),
            ]);
            setResults(r);
            setSegments(s);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Results not available yet');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchResults(); }, [electionId]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchResults, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh, electionId]);

    const handleExportCSV = () => {
        window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/results/${electionId}/csv`);
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>;
    if (error) return <div className="card" style={{ textAlign: 'center', padding: '3rem' }}><div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div><h2>Results Not Available</h2><p style={{ color: 'rgb(var(--color-text-muted))' }}>{error}</p></div>;
    if (!results) return null;

    const maxVotes = Math.max(...results.positions.flatMap(p => p.candidates.map(c => c.votes)), 1);

    return (
        <div className="animate-fade-in-up">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem' }}>Election Results</h1>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
                        Live Refresh
                    </label>
                    <button className="btn btn-secondary" style={{ fontSize: '0.8125rem' }} onClick={handleExportCSV}>📥 Export CSV</button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>{results.total_votes}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgb(var(--color-text-muted))', textTransform: 'uppercase' }}>Total Votes</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>{results.turnout_percent}%</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgb(var(--color-text-muted))', textTransform: 'uppercase' }}>Turnout</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>{results.total_registered}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgb(var(--color-text-muted))', textTransform: 'uppercase' }}>Registered</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: results.quorum_met ? '#00D4AA' : '#FF6B6B' }}>
                        {results.quorum_met ? '✓' : '✗'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgb(var(--color-text-muted))', textTransform: 'uppercase' }}>
                        Quorum {results.quorum_required > 0 ? `(${results.quorum_required}%)` : ''}
                    </div>
                </div>
            </div>

            {/* Results per position */}
            {results.positions.map(pos => (
                <div key={pos.position_id} className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>{pos.position_title}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {pos.candidates.map((cand, idx) => {
                            const pct = results.total_votes > 0 ? ((cand.votes / results.total_votes) * 100) : 0;
                            const barWidth = maxVotes > 0 ? (cand.votes / maxVotes) * 100 : 0;
                            const isWinner = idx === 0 && cand.votes > 0;

                            return (
                                <div key={cand.id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {isWinner && <span style={{ fontSize: '1rem' }}>👑</span>}
                                            <span style={{ fontWeight: isWinner ? 700 : 400 }}>{cand.display_name}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                                            <span>{cand.votes} vote{cand.votes !== 1 ? 's' : ''}</span>
                                            <span style={{ color: 'rgb(var(--color-text-muted))' }}>{pct.toFixed(1)}%</span>
                                            {cand.avg_score && <span style={{ color: '#FFB347' }}>★ {cand.avg_score}</span>}
                                            {cand.avg_rank && <span style={{ color: '#6C63FF' }}>Avg rank: {cand.avg_rank}</span>}
                                        </div>
                                    </div>
                                    <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(var(--color-border), 0.3)', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', width: `${barWidth}%`, borderRadius: '4px',
                                            background: isWinner ? 'linear-gradient(90deg, rgb(var(--color-primary)), #00D4AA)' : 'rgba(var(--color-primary), 0.4)',
                                            transition: 'width 0.5s ease',
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Turnout by Segment */}
            {segments.length > 0 && (
                <div className="card">
                    <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Turnout by Department</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(var(--color-border), 0.6)' }}>
                                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Department</th>
                                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Registered</th>
                                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Voted</th>
                                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Turnout</th>
                            </tr>
                        </thead>
                        <tbody>
                            {segments.map(s => (
                                <tr key={s.department} style={{ borderBottom: '1px solid rgba(var(--color-border), 0.2)' }}>
                                    <td style={{ padding: '0.5rem' }}>{s.department}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{s.total}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{s.voted}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{s.turnout_percent}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
