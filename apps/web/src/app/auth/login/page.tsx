'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            toast.error(error.message);
            setLoading(false);
        } else {
            toast.success('Welcome back!');
            router.refresh(); // Middleware will redirect to /dashboard
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem', position: 'relative'
        }}>
            {/* Glow orb */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '500px', height: '500px', background: 'radial-gradient(ellipse, rgba(108,99,255,0.1) 0%, transparent 60%)',
                pointerEvents: 'none',
            }} />

            <div className="card animate-fade-in-up" style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🗳️</div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Welcome to VoteSphere</h1>
                    <p style={{ color: 'rgb(var(--color-text-muted))', fontSize: '0.875rem' }}>
                        Sign in to manage your organizations.
                    </p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label className="label" htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                        disabled={loading}
                    >
                        {loading ? <div className="spinner" /> : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'rgb(var(--color-text-muted))' }}>
                    Don't have an account?{' '}
                    <Link href="/auth/register" style={{ fontWeight: 600 }}>Create an org</Link>
                </div>
            </div>
        </div>
    );
}
