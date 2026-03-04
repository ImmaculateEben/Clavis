'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Election {
    id: string;
    title: string;
    status: string;
    voting_method: string;
    anonymity_level: string;
    start_at: string | null;
    end_at: string | null;
    created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
    draft: '#FFB347',
    scheduled: '#6C63FF',
    open: '#00D4AA',
    closed: '#FF6B6B',
    archived: '#888',
};

export default function ElectionsPage() {
    const params = useParams();
    const router = useRouter();
    const orgId = params.id as string;

    const [elections, setElections] = useState<Election[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    // Wizard state
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        title: '',
        description: '',
        voting_method: 'single_choice',
        anonymity_level: 'anonymous',
        result_visibility: 'after_close',
        start_at: '',
        end_at: '',
        quorum_percent: 0,
        allow_proxy_voting: false,
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { fetchElections(); }, [orgId]);

    const fetchElections = async () => {
        try {
            const data = await api.get<Election[]>(`/elections/org/${orgId}`);
            setElections(data);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        setSubmitting(true);
        try {
            const election = await api.post<Election>('/elections', {
                ...form,
                org_id: orgId,
                start_at: form.start_at || undefined,
                end_at: form.end_at || undefined,
                quorum_percent: form.quorum_percent || undefined,
            });
            toast.success('Election created!');
            setShowCreate(false);
            setStep(1);
            router.push(`/dashboard/orgs/${orgId}/elections/${election.id}`);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>;

    return (
        <div className="animate-fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem' }}>Elections</h1>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Election</button>
            </div>

            {/* ── Election List ── */}
            {elections.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗳️</div>
                    <h3>No elections yet</h3>
                    <p style={{ color: 'rgb(var(--color-text-muted))', marginBottom: '1rem' }}>Create your first election to get started.</p>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Election</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {elections.map(e => (
                        <Link href={`/dashboard/orgs/${orgId}/elections/${e.id}`} key={e.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                onMouseEnter={ev => (ev.currentTarget.style.transform = 'translateY(-2px)')}
                                onMouseLeave={ev => (ev.currentTarget.style.transform = 'none')}>
                                <div>
                                    <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{e.title}</h3>
                                    <div style={{ fontSize: '0.8125rem', color: 'rgb(var(--color-text-muted))' }}>
                                        {e.voting_method.replace('_', ' ')} · {e.anonymity_level}
                                        {e.start_at && ` · Starts ${new Date(e.start_at).toLocaleDateString()}`}
                                    </div>
                                </div>
                                <span className="badge" style={{ background: `${STATUS_COLORS[e.status]}22`, color: STATUS_COLORS[e.status], textTransform: 'uppercase', fontSize: '0.7rem' }}>
                                    {e.status}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* ── Creation Wizard Modal ── */}
            {showCreate && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '640px', maxHeight: '85vh', overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem' }}>Create Election — Step {step}/3</h2>
                            <button onClick={() => { setShowCreate(false); setStep(1); }} style={{ background: 'none', border: 'none', color: 'rgb(var(--color-text-muted))', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
                        </div>

                        {/* Step indicators */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                            {['Basics', 'Rules', 'Schedule'].map((label, i) => (
                                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                                    <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: i + 1 <= step ? 'rgb(var(--color-primary))' : 'rgba(var(--color-border), 0.4)', marginBottom: '0.25rem', transition: 'background 0.3s' }} />
                                    <span style={{ fontSize: '0.75rem', color: i + 1 <= step ? 'rgb(var(--color-primary))' : 'rgb(var(--color-text-muted))' }}>{label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Step 1: Basics */}
                        {step === 1 && (
                            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                <div>
                                    <label className="label">Election Title *</label>
                                    <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Student Union President 2026" />
                                </div>
                                <div>
                                    <label className="label">Description</label>
                                    <textarea className="input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this election..." style={{ resize: 'vertical' }} />
                                </div>
                                <div>
                                    <label className="label">Voting Method</label>
                                    <select className="input" value={form.voting_method} onChange={e => setForm({ ...form, voting_method: e.target.value })}>
                                        <option value="single_choice">Single Choice (pick one)</option>
                                        <option value="multiple_choice">Multiple Choice (pick many)</option>
                                        <option value="ranked_choice">Ranked Choice (order preference)</option>
                                        <option value="weighted">Weighted (share-based voting)</option>
                                        <option value="referendum">Referendum (yes/no/abstain)</option>
                                        <option value="score">Score (rate 1–5)</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Rules */}
                        {step === 2 && (
                            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="label">Anonymity Level</label>
                                    <select className="input" value={form.anonymity_level} onChange={e => setForm({ ...form, anonymity_level: e.target.value })}>
                                        <option value="anonymous">Anonymous — no vote-to-voter mapping</option>
                                        <option value="hybrid">Hybrid — voter recorded, ballot encrypted</option>
                                        <option value="transparent">Transparent — full roll-call vote</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Result Visibility</label>
                                    <select className="input" value={form.result_visibility} onChange={e => setForm({ ...form, result_visibility: e.target.value })}>
                                        <option value="realtime">Real-time (live updates)</option>
                                        <option value="after_close">After Close (revealed when voting ends)</option>
                                        <option value="manual_release">Manual Release (admin publishes)</option>
                                        <option value="admin_only">Admin Only (private results)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Quorum Requirement (%)</label>
                                    <input type="number" className="input" min={0} max={100} value={form.quorum_percent} onChange={e => setForm({ ...form, quorum_percent: Number(e.target.value) })} placeholder="e.g. 50 = at least 50% must vote" />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" id="proxy" checked={form.allow_proxy_voting} onChange={e => setForm({ ...form, allow_proxy_voting: e.target.checked })} />
                                    <label htmlFor="proxy" style={{ fontSize: '0.875rem' }}>Allow proxy voting</label>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Schedule */}
                        {step === 3 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label className="label">Start Date (optional — can set later)</label>
                                    <input type="datetime-local" className="input" value={form.start_at} onChange={e => setForm({ ...form, start_at: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">End Date (optional)</label>
                                    <input type="datetime-local" className="input" value={form.end_at} onChange={e => setForm({ ...form, end_at: e.target.value })} />
                                </div>
                                <div className="card" style={{ background: 'rgba(var(--color-primary), 0.05)', fontSize: '0.875rem' }}>
                                    <strong>Summary:</strong>
                                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                                        <li><strong>Title:</strong> {form.title || '—'}</li>
                                        <li><strong>Method:</strong> {form.voting_method.replace('_', ' ')}</li>
                                        <li><strong>Anonymity:</strong> {form.anonymity_level}</li>
                                        <li><strong>Results:</strong> {form.result_visibility.replace('_', ' ')}</li>
                                        {form.quorum_percent > 0 && <li><strong>Quorum:</strong> {form.quorum_percent}%</li>}
                                        {form.allow_proxy_voting && <li><strong>Proxy voting:</strong> enabled</li>}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Navigation */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                            <button className="btn btn-secondary" onClick={() => step > 1 ? setStep(step - 1) : setShowCreate(false)}>
                                {step === 1 ? 'Cancel' : '← Back'}
                            </button>
                            {step < 3 ? (
                                <button className="btn btn-primary" onClick={() => setStep(step + 1)} disabled={step === 1 && !form.title.trim()}>
                                    Next →
                                </button>
                            ) : (
                                <button className="btn btn-primary" onClick={handleCreate} disabled={submitting || !form.title.trim()}>
                                    {submitting ? 'Creating…' : '🗳️ Create Election'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
