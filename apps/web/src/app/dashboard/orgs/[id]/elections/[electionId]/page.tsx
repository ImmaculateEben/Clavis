'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Election {
    id: string;
    org_id: string;
    title: string;
    description: string;
    status: string;
    voting_method: string;
    anonymity_level: string;
    result_visibility: string;
    start_at: string | null;
    end_at: string | null;
    quorum_percent: number;
    allow_proxy_voting: boolean;
    organizations: { name: string; slug: string };
}

interface Position {
    id: string;
    title: string;
    description: string;
    max_selections: number;
    sort_order: number;
    candidates: Candidate[];
}

interface Candidate {
    id: string;
    display_name: string;
    manifesto: string;
    photo_url: string;
    is_approved: boolean;
}

const STATUS_COLORS: Record<string, string> = { draft: '#FFB347', scheduled: '#6C63FF', open: '#00D4AA', closed: '#FF6B6B', archived: '#888' };
const NEXT_STATES: Record<string, { label: string; target: string; color: string }[]> = {
    draft: [{ label: '📅 Schedule', target: 'scheduled', color: '#6C63FF' }, { label: '🚀 Open Now', target: 'open', color: '#00D4AA' }],
    scheduled: [{ label: '🚀 Open Voting', target: 'open', color: '#00D4AA' }, { label: '↩ Back to Draft', target: 'draft', color: '#FFB347' }],
    open: [{ label: '🔒 Close Voting', target: 'closed', color: '#FF6B6B' }],
    closed: [{ label: '📦 Archive', target: 'archived', color: '#888' }],
    archived: [],
};

export default function ElectionDetailPage() {
    const params = useParams();
    const orgId = params.id as string;
    const electionId = params.electionId as string;

    const [election, setElection] = useState<Election | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);

    // Position form
    const [showAddPosition, setShowAddPosition] = useState(false);
    const [posTitle, setPosTitle] = useState('');
    const [posMax, setPosMax] = useState(1);

    // Candidate form
    const [addingTo, setAddingTo] = useState<string | null>(null);
    const [candName, setCandName] = useState('');
    const [candManifesto, setCandManifesto] = useState('');

    // Registry
    const [registryCount, setRegistryCount] = useState(0);

    useEffect(() => { fetchAll(); }, [electionId]);

    const fetchAll = async () => {
        try {
            const [e, p, r] = await Promise.all([
                api.get<Election>(`/elections/${electionId}`),
                api.get<Position[]>(`/elections/${electionId}/positions`),
                api.get<any[]>(`/elections/${electionId}/registry`),
            ]);
            setElection(e);
            setPositions(p);
            setRegistryCount(r.length);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTransition = async (target: string) => {
        if (!confirm(`Transition election to "${target}"?`)) return;
        try {
            const updated = await api.post<Election>(`/elections/${electionId}/transition`, { target_state: target });
            setElection(updated);
            toast.success(`Election is now ${target}`);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleAddPosition = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/elections/${electionId}/positions`, { title: posTitle, max_selections: posMax });
            toast.success('Position added');
            setPosTitle(''); setPosMax(1); setShowAddPosition(false);
            fetchAll();
        } catch (err: any) { toast.error(err.message); }
    };

    const handleAddCandidate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/elections/${electionId}/candidates`, { position_id: addingTo, display_name: candName, manifesto: candManifesto });
            toast.success('Candidate added');
            setCandName(''); setCandManifesto(''); setAddingTo(null);
            fetchAll();
        } catch (err: any) { toast.error(err.message); }
    };

    const handleAutoRegister = async () => {
        try {
            const result = await api.post<any[]>(`/elections/${electionId}/registry/auto`, {});
            toast.success(`${result.length} voters registered`);
            setRegistryCount(result.length);
        } catch (err: any) { toast.error(err.message); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>;
    if (!election) return <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Election not found</div>;

    const isDraft = election.status === 'draft';
    const totalCandidates = positions.reduce((acc, p) => acc + (p.candidates?.length || 0), 0);

    return (
        <div className="animate-fade-in-up">
            {/* Breadcrumb */}
            <div style={{ fontSize: '0.8125rem', color: 'rgb(var(--color-text-muted))', marginBottom: '1rem' }}>
                <Link href={`/dashboard/orgs/${orgId}`} style={{ color: 'inherit' }}>{election.organizations?.name}</Link>
                {' / '}
                <Link href={`/dashboard/orgs/${orgId}/elections`} style={{ color: 'inherit' }}>Elections</Link>
                {' / '}{election.title}
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <h1 style={{ fontSize: '1.75rem', margin: 0 }}>{election.title}</h1>
                        <span className="badge" style={{ background: `${STATUS_COLORS[election.status]}22`, color: STATUS_COLORS[election.status], textTransform: 'uppercase', fontSize: '0.7rem' }}>
                            {election.status}
                        </span>
                    </div>
                    {election.description && <p style={{ color: 'rgb(var(--color-text-muted))', fontSize: '0.875rem', margin: 0 }}>{election.description}</p>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(NEXT_STATES[election.status] || []).map(s => (
                        <button key={s.target} className="btn" onClick={() => handleTransition(s.target)} style={{ background: `${s.color}22`, color: s.color, border: `1px solid ${s.color}44`, fontSize: '0.8125rem' }}>
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Method', value: election.voting_method.replace('_', ' ') },
                    { label: 'Anonymity', value: election.anonymity_level },
                    { label: 'Positions', value: positions.length.toString() },
                    { label: 'Candidates', value: totalCandidates.toString() },
                    { label: 'Voters', value: registryCount.toString() },
                    { label: 'Quorum', value: election.quorum_percent ? `${election.quorum_percent}%` : 'None' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'rgb(var(--color-text-muted))', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{s.label}</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{s.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* ── Positions & Candidates ── */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.125rem' }}>Positions & Candidates</h2>
                        {isDraft && <button className="btn btn-secondary" style={{ fontSize: '0.8125rem' }} onClick={() => setShowAddPosition(true)}>+ Add Position</button>}
                    </div>

                    {showAddPosition && (
                        <form onSubmit={handleAddPosition} className="card" style={{ marginBottom: '1rem', background: 'rgba(var(--color-primary), 0.04)' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="label">Position Title</label>
                                    <input className="input" value={posTitle} onChange={e => setPosTitle(e.target.value)} placeholder="e.g. President" required />
                                </div>
                                <div style={{ width: '80px' }}>
                                    <label className="label">Max</label>
                                    <input type="number" className="input" min={1} value={posMax} onChange={e => setPosMax(Number(e.target.value))} />
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>Add</button>
                                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8125rem' }} onClick={() => setShowAddPosition(false)}>✕</button>
                            </div>
                        </form>
                    )}

                    {positions.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'rgb(var(--color-text-muted))' }}>
                            No positions yet. Add positions before opening the election.
                        </div>
                    ) : positions.map(pos => (
                        <div key={pos.id} className="card" style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <h3 style={{ fontSize: '1rem', margin: 0 }}>{pos.title}</h3>
                                <span style={{ fontSize: '0.75rem', color: 'rgb(var(--color-text-muted))' }}>max {pos.max_selections} selection(s)</span>
                            </div>
                            {(pos.candidates || []).length === 0 ? (
                                <p style={{ fontSize: '0.8125rem', color: 'rgb(var(--color-text-muted))' }}>No candidates yet</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    {pos.candidates.map(c => (
                                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-surface), 0.5)' }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(var(--color-primary), 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.75rem' }}>
                                                {c.display_name.charAt(0)}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{c.display_name}</div>
                                                {c.manifesto && <div style={{ fontSize: '0.75rem', color: 'rgb(var(--color-text-muted))' }}>{c.manifesto.slice(0, 60)}…</div>}
                                            </div>
                                            <span className="badge" style={{ background: c.is_approved ? '#00D4AA22' : '#FFB34722', color: c.is_approved ? '#00D4AA' : '#FFB347', fontSize: '0.65rem' }}>
                                                {c.is_approved ? 'Approved' : 'Pending'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {isDraft && addingTo !== pos.id && (
                                <button className="btn btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => setAddingTo(pos.id)}>+ Add Candidate</button>
                            )}
                            {addingTo === pos.id && (
                                <form onSubmit={handleAddCandidate} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-primary), 0.04)' }}>
                                    <input className="input" placeholder="Candidate name" value={candName} onChange={e => setCandName(e.target.value)} required />
                                    <textarea className="input" placeholder="Manifesto (optional)" value={candManifesto} onChange={e => setCandManifesto(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button type="submit" className="btn btn-primary" style={{ fontSize: '0.75rem' }}>Save</button>
                                        <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => { setAddingTo(null); setCandName(''); setCandManifesto(''); }}>Cancel</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    ))}
                </div>

                {/* ── Right sidebar ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Voter Registry */}
                    <div className="card">
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Voter Registry</h3>
                        <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{registryCount}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'rgb(var(--color-text-muted))', marginBottom: '1rem' }}>registered voters</div>
                        {isDraft && (
                            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8125rem' }} onClick={handleAutoRegister}>
                                Auto-Register All Org Members
                            </button>
                        )}
                    </div>

                    {/* Schedule */}
                    <div className="card">
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Schedule</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                            <div><span style={{ color: 'rgb(var(--color-text-muted))' }}>Opens:</span> {election.start_at ? new Date(election.start_at).toLocaleString() : 'Not set'}</div>
                            <div><span style={{ color: 'rgb(var(--color-text-muted))' }}>Closes:</span> {election.end_at ? new Date(election.end_at).toLocaleString() : 'Not set'}</div>
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="card" style={{ background: 'rgba(var(--color-surface), 0.5)' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Election Settings</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem' }}>
                            <div>🗳️ {election.voting_method.replace('_', ' ')}</div>
                            <div>🔒 {election.anonymity_level}</div>
                            <div>📊 Results: {election.result_visibility.replace('_', ' ')}</div>
                            {election.quorum_percent > 0 && <div>📋 Quorum: {election.quorum_percent}%</div>}
                            {election.allow_proxy_voting && <div>👥 Proxy voting enabled</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
