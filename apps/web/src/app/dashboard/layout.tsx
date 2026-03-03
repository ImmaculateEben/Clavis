import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/auth/login');

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'rgb(var(--color-bg))' }}>
            {/* Sidebar */}
            <aside style={{
                width: '260px',
                borderRight: '1px solid rgba(var(--color-border), 0.6)',
                backgroundColor: 'rgb(var(--color-surface))',
                display: 'flex',
                flexDirection: 'column',
            }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(var(--color-border), 0.6)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>🗳️</span>
                        <span style={{ fontWeight: 800, fontSize: '1.125rem' }}>VoteSphere</span>
                    </div>

                    <div style={{
                        background: 'rgba(var(--color-primary), 0.1)',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.8125rem',
                    }}>
                        <div style={{ color: 'rgb(var(--color-text-muted))', marginBottom: '0.25rem' }}>Logged in as</div>
                        <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{user.email}</div>
                    </div>
                </div>

                <nav style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Link href="/dashboard" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent' }}>
                        🏢 My Organizations
                    </Link>
                    <Link href="/dashboard/elections" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent' }}>
                        🗳️ All Elections
                    </Link>
                    <Link href="/dashboard/settings" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent' }}>
                        ⚙️ Account Settings
                    </Link>
                </nav>

                <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(var(--color-border), 0.6)' }}>
                    <form action="/auth/logout" method="POST">
                        <button type="submit" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                            Sign Out
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <header style={{
                    height: '70px',
                    borderBottom: '1px solid rgba(var(--color-border), 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 2rem',
                    backgroundColor: 'rgb(var(--color-surface))',
                }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Dashboard</h2>
                </header>
                <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                    {children}
                </div>
            </main>
        </div>
    );
}
