'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Organization } from '@votesphere/shared';

export default function DashboardOrgsPage() {
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchOrgs();
    }, []);

    const fetchOrgs = async () => {
        try {
            const data = await api.get<Organization[]>('/orgs');
            setOrgs(data);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load organizations');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/orgs', { name, slug });
            toast.success('Organization created!');
            setIsCreating(false);
            setName('');
            setSlug('');
            fetchOrgs();
        } catch (err: any) {
            toast.error(err.message || 'Failed to create org');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>My Organizations</h1>
                    <p style={{ color: 'rgb(var(--color-text-muted))' }}>Manage the organizations you belong to.</p>
                </div>
                {!isCreating && (
                    <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
                        + New Organization
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="card" style={{ marginBottom: '2rem', background: 'rgba(var(--color-primary), 0.05)' }}>
                    <h3 style={{ marginBottom: '1.25rem' }}>Create New Organization</h3>
                    <form onSubmit={handleCreateOrg} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                        <div>
                            <label className="label" htmlFor="orgName">Organization Name</label>
                            <input
                                id="orgName"
                                className="input"
                                placeholder="Student Union"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    // Auto-generate slug
                                    if (!slug || slug === name.slice(0, -1).toLowerCase().replace(/[^a-z0-9]/g, '-')) {
                                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                                    }
                                }}
                                required
                            />
                        </div>
                        <div>
                            <label className="label" htmlFor="orgSlug">URL Slug (unique)</label>
                            <input
                                id="orgSlug"
                                className="input"
                                placeholder="student-union"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                pattern="^[a-z0-9-]+$"
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {orgs.length === 0 && !isCreating ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
                    <h3 style={{ marginBottom: '0.5rem' }}>No Organizations Found</h3>
                    <p style={{ color: 'rgb(var(--color-text-muted))', marginBottom: '1.5rem' }}>
                        You haven't joined or created any organizations yet.
                    </p>
                    <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
                        Create Your First Org
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '1.5rem',
                }}>
                    {orgs.map((org: any) => (
                        <Link key={org.id} href={`/dashboard/orgs/${org.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="card" style={{ height: '100%', cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                    {org.logo_path ? (
                                        <img src={org.logo_path} alt={org.name} style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)' }} />
                                    ) : (
                                        <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: org.primary_color || 'rgb(var(--color-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.25rem' }}>
                                            {org.name.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <h3 style={{ fontSize: '1.125rem' }}>{org.name}</h3>
                                        <div style={{ fontSize: '0.75rem', color: 'rgb(var(--color-text-muted))' }}>
                                            {org.slug}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <div style={{ fontSize: '0.875rem', color: 'rgb(var(--color-primary))', fontWeight: 600 }}>
                                        Manage Org →
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
