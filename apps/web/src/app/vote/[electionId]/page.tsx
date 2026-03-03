'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Position {
    id: string;
    title: string;
    description: string;
    max_selections: number;
    candidates: Candidate[];
}

interface Candidate {
    id: string;
    display_name: string;
    manifesto: string;
    photo_url: string;
    is_approved: boolean;
}

interface Election {
    id: string;
    title: string;
    description: string;
    voting_method: string;
    anonymity_level: string;
    organizations: { name: string };
}

export default function BallotPage() {
    const params = useParams();
    const router = useRouter();
    const electionId = params.electionId as string;

    const [election, setElection] = useState<Election | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [receiptCode, setReceiptCode] = useState<string | null>(null);

    // Selections: position_id -> candidate_id(s)
    const [selections, setSelections] = useState<Map<string, Set<string>>>(new Map());
    // Ranked: position_id -> ordered candidate_id[]
    const [ranked, setRanked] = useState<Map<string, string[]>>(new Map());
    // Score: position_id:candidate_id -> score
    const [scores, setScores] = useState<Map<string, number>>(new Map());

    useEffect(() => { fetchBallot(); }, [electionId]);

    const fetchBallot = async () => {
        try {
            const [e, p] = await Promise.all([
                api.get<Election>(`/elections/${electionId}`),
                api.get<Position[]>(`/elections/${electionId}/positions`),
            ]);
            setElection(e);
            setPositions(p.map(pos => ({ ...pos, candidates: (pos.candidates || []).filter(c => c.is_approved) })));
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (posId: string, candId: string, maxSel: number) => {
        setSelections(prev => {
            const next = new Map(prev);
            const current = new Set(next.get(posId) || []);
            if (current.has(candId)) {
                current.delete(candId);
            } else {
                if (maxSel === 1) current.clear(); // single choice
                if (current.size < maxSel) current.add(candId);
                else toast.error(`Max ${maxSel} selection(s) allowed`);
            }
            next.set(posId, current);
            return next;
        });
    };

    const handleSubmit = async () => {
        if (!election) return;
        setSubmitting(true);

        try {
            // Build selections array based on voting method
            const voteSelections: any[] = [];

            if (election.voting_method === 'ranked_choice') {
                for (const [posId, order] of ranked.entries()) {
                    order.forEach((candId, idx) => {
                        voteSelections.push({ position_id: posId, candidate_id: candId, rank: idx + 1 });
                    });
                }
            } else if (election.voting_method === 'score') {
                for (const [key, score] of scores.entries()) {
                    const [posId, candId] = key.split(':');
                    voteSelections.push({ position_id: posId, candidate_id: candId, score });
                }
            } else {
                for (const [posId, candIds] of selections.entries()) {
                    for (const candId of candIds) {
                        voteSelections.push({ position_id: posId, candidate_id: candId });
                    }
                }
            }

            if (voteSelections.length === 0) {
                toast.error('Please make at least one selection');
                setSubmitting(false);
                return;
            }

            const result = await api.post<{ success: boolean; receipt_code: string; message: string }>('/voting/cast', {
                election_id: electionId,
                selections: voteSelections,
                device_hash: navigator.userAgent,
            });

            setReceiptCode(result.receipt_code);
            toast.success(result.message);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;
    if (!election) return <div style={{ padding: '2rem', textAlign: 'center' }}>Election not found</div>;

    // ── Receipt shown after voting ──
    if (receiptCode) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                <div className="card animate-fade-in-up" style={{ maxWidth: '480px', textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Vote Recorded!</h1>
                    <p style={{ color: 'rgb(var(--color-text-muted))', marginBottom: '1.5rem' }}>Your vote has been securely encrypted and stored.</p>
                    <div style={{ background: 'rgba(var(--color-primary), 0.08)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgb(var(--color-text-muted))', marginBottom: '0.5rem' }}>Receipt Code</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '2px', wordBreak: 'break-all' }}>{receiptCode}</div>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'rgb(var(--color-text-muted))' }}>Save this code to verify your vote was counted.</p>
                </div>
            </div>
        );
    }

    // ── Ballot Rendering ──
    return (
        <div style={{ minHeight: '100vh', padding: '2rem 1rem', maxWidth: '720px', margin: '0 auto' }}>
            <div className="animate-fade-in-up">
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '0.8125rem', color: 'rgb(var(--color-text-muted))', marginBottom: '0.25rem' }}>{election.organizations?.name}</div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{election.title}</h1>
                    {election.description && <p style={{ color: 'rgb(var(--color-text-muted))', fontSize: '0.875rem' }}>{election.description}</p>}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <span className="badge" style={{ background: 'rgba(var(--color-primary), 0.15)', color: 'rgb(var(--color-primary))', fontSize: '0.7rem' }}>
                            {election.voting_method.replace('_', ' ')}
                        </span>
                        <span className="badge" style={{ background: 'rgba(0,212,170,0.15)', color: '#00D4AA', fontSize: '0.7rem' }}>
                            🔒 {election.anonymity_level}
                        </span>
                    </div>
                </div>

                {/* Positions & Candidates */}
                {positions.map(pos => (
                    <div key={pos.id} className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{pos.title}</h2>
                        <p style={{ fontSize: '0.8125rem', color: 'rgb(var(--color-text-muted))', marginBottom: '1rem' }}>
                            {election.voting_method === 'single_choice' ? 'Select one' :
                                election.voting_method === 'referendum' ? 'Choose your stance' :
                                    election.voting_method === 'ranked_choice' ? 'Drag to rank or click in preference order' :
                                        election.voting_method === 'score' ? 'Rate each candidate 1–5' :
                                            `Select up to ${pos.max_selections}`}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {pos.candidates.map(cand => {
                                const isSelected = selections.get(pos.id)?.has(cand.id) || false;
                                const scoreKey = `${pos.id}:${cand.id}`;
                                const currentScore = scores.get(scoreKey) || 0;

                                return (
                                    <div key={cand.id}
                                        onClick={() => election.voting_method !== 'score' && toggleSelection(pos.id, cand.id, pos.max_selections)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                                            borderRadius: 'var(--radius-md)', cursor: election.voting_method === 'score' ? 'default' : 'pointer',
                                            border: isSelected ? '2px solid rgb(var(--color-primary))' : '2px solid rgba(var(--color-border), 0.3)',
                                            background: isSelected ? 'rgba(var(--color-primary), 0.06)' : 'transparent',
                                            transition: 'all 0.2s',
                                        }}>
                                        {/* Avatar */}
                                        <div style={{
                                            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                                            background: isSelected ? 'rgb(var(--color-primary))' : 'rgba(var(--color-primary), 0.12)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: isSelected ? '#fff' : 'rgb(var(--color-primary))', fontWeight: 700,
                                            transition: 'all 0.2s',
                                        }}>
                                            {isSelected ? '✓' : cand.display_name.charAt(0)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600 }}>{cand.display_name}</div>
                                            {cand.manifesto && <div style={{ fontSize: '0.8125rem', color: 'rgb(var(--color-text-muted))', marginTop: '0.125rem' }}>{cand.manifesto.slice(0, 100)}{cand.manifesto.length > 100 ? '…' : ''}</div>}
                                        </div>

                                        {/* Score input */}
                                        {election.voting_method === 'score' && (
                                            <div style={{ display: 'flex', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <button key={s} onClick={() => setScores(prev => new Map(prev).set(scoreKey, s))}
                                                        style={{
                                                            width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                                            background: currentScore >= s ? 'rgb(var(--color-primary))' : 'rgba(var(--color-border), 0.3)',
                                                            color: currentScore >= s ? '#fff' : 'rgb(var(--color-text-muted))',
                                                            fontWeight: 600, fontSize: '0.75rem', transition: 'all 0.15s',
                                                        }}>
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Submit */}
                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}
                    style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1.125rem', marginTop: '1rem' }}>
                    {submitting ? <div className="spinner" /> : '🗳️ Submit My Vote'}
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgb(var(--color-text-muted))', marginTop: '1rem' }}>
                    Your vote is encrypted and cannot be changed after submission.
                </p>
            </div>
        </div>
    );
}
