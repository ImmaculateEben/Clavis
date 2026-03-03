'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Organization } from '@votesphere/shared';

interface MemberRow {
    id: string;
    user_id: string;
    role: string;
    department: string | null;
    membership_id: string | null;
    shareholder_weight: number;
    is_active: boolean;
    created_at: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
}

const ROLE_OPTIONS = [
    { value: 'org_admin', label: 'Admin', color: '#6C63FF' },
    { value: 'election_officer', label: 'Officer', color: '#00D4AA' },
    { value: 'observer', label: 'Observer', color: '#FFB347' },
    { value: 'voter', label: 'Voter', color: '#888' },
];

export default function OrgDetailsPage() {
    const params = useParams();
    const orgId = params.id as string;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [org, setOrg] = useState<(Organization & { role: string }) | null>(null);
    const [members, setMembers] = useState<MemberRow[]>([]);
    const [loading, setLoading] = useState(true);

    // Invite state
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('voter');
    const [submitting, setSubmitting] = useState(false);

    // CSV import state
    const [showCsvModal, setShowCsvModal] = useState(false);
    const [csvData, setCsvData] = useState<{ email: string; role: string }[]>([]);
    const [importing, setImporting] = useState(false);

    // Search / filter
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    useEffect(() => {
        fetchAll();
    }, [orgId]);

    const fetchAll = async () => {
        try {
            const [orgData, membersData] = await Promise.all([
                api.get<Organization & { role: string }>(`/orgs/${orgId}`),
                api.get<MemberRow[]>(`/orgs/${orgId}/members`),
            ]);
            setOrg(orgData);
            setMembers(membersData);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post(`/orgs/${orgId}/members`, { email: inviteEmail, role: inviteRole });
            toast.success(`Invited ${inviteEmail}`);
            setShowInvite(false);
            setInviteEmail('');
            fetchAll();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRoleChange = async (memberId: string, newRole: string) => {
        try {
            await api.patch(`/orgs/${orgId}/members/${memberId}/role`, { role: newRole });
            toast.success('Role updated');
            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleRemove = async (member: MemberRow) => {
        if (!confirm(`Remove ${member.full_name} (${member.email})?`)) return;
        try {
            await api.delete(`/orgs/${orgId}/members/${member.id}`);
            toast.success('Member removed');
            setMembers(prev => prev.filter(m => m.id !== member.id));
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            // Skip header if first line contains "email"
            const start = lines[0]?.toLowerCase().includes('email') ? 1 : 0;
            const rows = lines.slice(start).map(line => {
                const [email, role] = line.split(',').map(s => s.trim().replace(/"/g, ''));
                return { email, role: role || 'voter' };
            }).filter(r => r.email.includes('@'));
            setCsvData(rows);
            setShowCsvModal(true);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleBulkImport = async () => {
        setImporting(true);
        try {
            const result = await api.post<{ success: number; failed: { email: string; reason: string }[] }>(
                `/orgs/${orgId}/members/bulk`,
                { rows: csvData },
            );
            toast.success(`${result.success} imported, ${result.failed.length} failed`);
            if (result.failed.length > 0) {
                result.failed.forEach(f => toast.error(`${f.email}: ${f.reason}`, { duration: 5000 }));
            }
            setShowCsvModal(false);
            setCsvData([]);
            fetchAll();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setImporting(false);
        }
    };

    const filtered = members.filter(m => {
        const matchSearch = m.full_name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === 'all' || m.role === roleFilter;
        return matchSearch && matchRole && m.is_active;
    });

    const isAdmin = org?.role === 'org_admin';

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>;
    if (!org) return <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Organization not found</div>;

    return (
        <div className="animate-fade-in-up">
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(var(--color-border), 0.6)' }}>
                <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: org.primary_color || 'rgb(var(--color-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.5rem', color: '#fff', flexShrink: 0 }}>
                    {org.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: '1.75rem', margin: 0 }}>{org.name}</h1>
                        <span className="badge" style={{ background: 'rgba(var(--color-primary), 0.15)', color: 'rgb(var(--color-primary))', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                            {org.role.replace('_', ' ')}
                        </span>
                    </div>
                    <div style={{ color: 'rgb(var(--color-text-muted))', fontSize: '0.875rem' }}>/{org.slug} · {members.filter(m => m.is_active).length} members</div>
                </div>
            </div>

            {/* ── Toolbar ── */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
                <input className="input" placeholder="🔍 Search members..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: '200px', maxWidth: '320px' }} />
                <select className="input" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width: '160px' }}>
                    <option value="all">All Roles</option>
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                    {isAdmin && (
                        <>
                            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvFile} style={{ display: 'none' }} />
                            <button className="btn btn-secondary" style={{ fontSize: '0.8125rem' }} onClick={() => fileInputRef.current?.click()}>
                                📄 Import CSV
                            </button>
                            <button className="btn btn-primary" style={{ fontSize: '0.8125rem' }} onClick={() => setShowInvite(!showInvite)}>
                                + Invite Member
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Invite Form ── */}
            {showInvite && (
                <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(var(--color-primary), 0.04)' }}>
                    <form onSubmit={handleInvite} style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label className="label">Email</label>
                            <input type="email" className="input" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" required />
                        </div>
                        <div style={{ width: '180px' }}>
                            <label className="label">Role</label>
                            <select className="input" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Sending…' : 'Send Invite'}</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
                    </form>
                </div>
            )}

            {/* ── Members Table ── */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(var(--color-border), 0.6)', background: 'rgba(var(--color-surface), 0.5)' }}>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Member</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Role</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Department</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Joined</th>
                            {isAdmin && <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'rgb(var(--color-text-muted))' }}>No members found</td></tr>
                        ) : filtered.map(m => (
                            <tr key={m.id} style={{ borderBottom: '1px solid rgba(var(--color-border), 0.3)' }}>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(var(--color-primary), 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                                            {m.full_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{m.full_name}</div>
                                            <div style={{ color: 'rgb(var(--color-text-muted))', fontSize: '0.75rem' }}>{m.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                    {isAdmin ? (
                                        <select className="input" value={m.role} onChange={e => handleRoleChange(m.id, e.target.value)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem', width: '130px' }}>
                                            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                        </select>
                                    ) : (
                                        <span className="badge" style={{ background: `${ROLE_OPTIONS.find(r => r.value === m.role)?.color}22`, color: ROLE_OPTIONS.find(r => r.value === m.role)?.color, fontSize: '0.75rem' }}>
                                            {ROLE_OPTIONS.find(r => r.value === m.role)?.label || m.role}
                                        </span>
                                    )}
                                </td>
                                <td style={{ padding: '0.75rem 1rem', color: 'rgb(var(--color-text-muted))' }}>{m.department || '—'}</td>
                                <td style={{ padding: '0.75rem 1rem', color: 'rgb(var(--color-text-muted))' }}>{new Date(m.created_at).toLocaleDateString()}</td>
                                {isAdmin && (
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                        <button onClick={() => handleRemove(m)} style={{ background: 'none', border: 'none', color: 'rgb(var(--color-danger))', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>Remove</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── CSV Preview Modal ── */}
            {showCsvModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>CSV Import Preview</h2>
                        <p style={{ color: 'rgb(var(--color-text-muted))', marginBottom: '1rem', fontSize: '0.875rem' }}>
                            {csvData.length} row(s) parsed. Review before importing.
                        </p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(var(--color-border), 0.6)' }}>
                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>#</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Email</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {csvData.slice(0, 50).map((row, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid rgba(var(--color-border), 0.2)' }}>
                                        <td style={{ padding: '0.375rem 0.5rem', color: 'rgb(var(--color-text-muted))' }}>{i + 1}</td>
                                        <td style={{ padding: '0.375rem 0.5rem' }}>{row.email}</td>
                                        <td style={{ padding: '0.375rem 0.5rem' }}>{row.role}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {csvData.length > 50 && <p style={{ color: 'rgb(var(--color-text-muted))', fontSize: '0.8125rem' }}>…and {csvData.length - 50} more</p>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button className="btn btn-secondary" onClick={() => { setShowCsvModal(false); setCsvData([]); }}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleBulkImport} disabled={importing}>
                                {importing ? 'Importing…' : `Import ${csvData.length} Members`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
