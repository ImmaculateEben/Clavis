'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface AuditEntry {
    id: string;
    action: string;
    meta: any;
    created_at: string;
    actor_name: string;
    actor_email: string;
}

const ACTION_ICONS: Record<string, string> = {
    election_open: '🚀',
    election_closed: '🔒',
    election_scheduled: '📅',
    election_archived: '📦',
    election_auto_opened: '⏰',
    election_auto_closed: '⏰',
    vote_cast: '🗳️',
    results_released: '📊',
    proxy_assigned: '👥',
};

export default function AuditLogPage() {
    const params = useParams();
    const electionId = params.electionId as string;
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<AuditEntry[]>(`/audit/election/${electionId}`)
            .then(setLogs)
            .finally(() => setLoading(false));
    }, [electionId]);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>;

    return (
        <div className="animate-fade-in-up">
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Audit Log</h1>
            <div className="card" style={{ padding: 0 }}>
                {logs.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'rgb(var(--color-text-muted))' }}>No audit events</div>
                ) : logs.map(log => (
                    <div key={log.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(var(--color-border), 0.2)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>{ACTION_ICONS[log.action] || '📝'}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{log.action.replace(/_/g, ' ')}</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgb(var(--color-text-muted))' }}>
                                {log.actor_name} · {new Date(log.created_at).toLocaleString()}
                            </div>
                        </div>
                        {log.meta && Object.keys(log.meta).length > 0 && (
                            <code style={{ fontSize: '0.7rem', background: 'rgba(var(--color-surface), 0.5)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                {JSON.stringify(log.meta)}
                            </code>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
