import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'VoteSphere — Intelligent Multi-Tenant Voting Platform',
};

const segments = [
    { icon: '🎓', label: 'Student Elections', desc: 'Anonymous balloting, turnout dashboards, campaign profiles' },
    { icon: '🏢', label: 'Corporate Board', desc: 'Weighted voting, proxy support, legal audit trail' },
    { icon: '🏛️', label: 'Associations & Unions', desc: 'Membership validation, branch-level elections' },
    { icon: '⛪', label: 'Religious Orgs', desc: 'Identity-verified, council approval, transparency mode' },
    { icon: '🎉', label: 'Event Voting', desc: 'QR access, open voting, live rankings' },
];

const features = [
    { icon: '🔐', title: 'Three Anonymity Modes', desc: 'Fully anonymous, hybrid, or transparent — configured per election.' },
    { icon: '⚖️', title: '6 Voting Methods', desc: 'Single, multiple, ranked, weighted, referendum, and score-based.' },
    { icon: '🛡️', title: 'Row-Level Security', desc: 'Every org is isolated at the database layer via Postgres RLS.' },
    { icon: '📊', title: 'Real-Time Results', desc: 'Live turnout dashboards with configurable visibility rules.' },
    { icon: '📋', title: 'Full Audit Trail', desc: 'Immutable logs, receipt codes, and export-ready reports.' },
    { icon: '⚡', title: '10K Concurrent Voters', desc: 'Built for high-volume events with rate limiting and dedup.' },
];

export default function HomePage() {
    return (
        <main style={{ minHeight: '100vh' }}>
            {/* Nav */}
            <nav className="glass" style={{ position: 'sticky', top: 0, zIndex: 100, padding: '1rem 0' }}>
                <div className="container nav-container">
                    <div className="nav-logo">
                        <span className="logo-icon">🗳️</span>
                        <span className="logo-text">
                            Vote<span className="gradient-text">Sphere</span>
                        </span>
                    </div>
                    <div className="nav-buttons">
                        <Link href="/auth/login" className="btn btn-secondary nav-btn">Sign In</Link>
                        <Link href="/auth/register" className="btn btn-primary nav-btn">Get Started</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section style={{ padding: '7rem 0 5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                {/* Glow orbs */}
                <div style={{
                    position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)',
                    width: '800px', height: '600px',
                    background: 'radial-gradient(ellipse, rgba(108,99,255,0.15) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />
                <div className="container animate-fade-in-up">
                    <div className="badge badge-open" style={{ display: 'inline-flex', marginBottom: '1.5rem' }}>
                        ✨ Version 2.0 — Multi-Tenant Edition
                    </div>
                    <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', marginBottom: '1.5rem' }}>
                        Voting Infrastructure<br />
                        <span className="gradient-text">Built for Everyone</span>
                    </h1>
                    <p style={{
                        maxWidth: '640px', margin: '0 auto 2.5rem',
                        color: 'rgb(var(--color-text-muted))', fontSize: '1.125rem', lineHeight: 1.7
                    }}>
                        A configurable multi-tenant voting platform that adapts to student elections,
                        corporate boards, associations, religious organizations, and events —
                        without changing a single line of code.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link href="/auth/register" className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
                            Create Your Election →
                        </Link>
                        <Link href="/docs" className="btn btn-secondary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
                            View Docs
                        </Link>
                    </div>
                </div>
            </section>

            {/* Segments */}
            <section style={{ padding: '5rem 0' }}>
                <div className="container">
                    <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '0.75rem' }}>
                        One Platform, <span className="gradient-text">Every Segment</span>
                    </h2>
                    <p style={{ textAlign: 'center', color: 'rgb(var(--color-text-muted))', marginBottom: '3rem' }}>
                        Segment-specific feature sets with shared infrastructure.
                    </p>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                    }}>
                        {segments.map((s) => (
                            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{s.icon}</div>
                                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{s.label}</h3>
                                <p style={{ fontSize: '0.8125rem', color: 'rgb(var(--color-text-muted))' }}>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section style={{ padding: '5rem 0', background: 'rgba(var(--color-surface), 0.5)' }}>
                <div className="container">
                    <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '3rem' }}>
                        Platform <span className="gradient-text">Capabilities</span>
                    </h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '1.25rem',
                    }}>
                        {features.map((f) => (
                            <div key={f.title} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '2rem', flexShrink: 0 }}>{f.icon}</span>
                                <div>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '0.375rem' }}>{f.title}</h3>
                                    <p style={{ fontSize: '0.875rem', color: 'rgb(var(--color-text-muted))' }}>{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section style={{ padding: '6rem 0', textAlign: 'center' }}>
                <div className="container">
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                        Ready to run your first election?
                    </h2>
                    <p style={{ color: 'rgb(var(--color-text-muted))', marginBottom: '2rem', fontSize: '1.125rem' }}>
                        Set up an org, create an election, and go live in minutes.
                    </p>
                    <Link href="/auth/register" className="btn btn-primary animate-pulse-glow"
                        style={{ padding: '1rem 2.5rem', fontSize: '1.0625rem' }}>
                        Start for Free →
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ borderTop: '1px solid rgba(var(--color-border), 0.4)', padding: '2rem 0' }}>
                <div className="container" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    color: 'rgb(var(--color-text-muted))', fontSize: '0.875rem', flexWrap: 'wrap', gap: '1rem'
                }}>
                    <span>© 2025 VoteSphere. All rights reserved.</span>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <Link href="/privacy">Privacy</Link>
                        <Link href="/terms">Terms</Link>
                        <Link href="/docs">API Docs</Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}
