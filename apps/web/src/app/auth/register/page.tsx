'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function RegisterPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const supabase = createClient();
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (error) {
            toast.error(error.message);
            setLoading(false);
        } else {
            toast.success('Account created! Logging you in...');
            router.refresh();
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem', position: 'relative'
        }}>
            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '500px', height: '500px', background: 'radial-gradient(ellipse, rgba(0,212,170,0.1) 0%, transparent 60%)',
                pointerEvents: 'none',
            }} />

            <div className="card animate-fade-in-up" style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✨</div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Create an Account</h1>
                    <p style={{ color: 'rgb(var(--color-text-muted))', fontSize: '0.875rem' }}>
                        Get started with VoteSphere multi-tenant platform.
                    </p>
                </div>

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label className="label" htmlFor="fullName">Full Name</label>
                        <input
                            id="fullName"
                            type="text"
                            className="input"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Jane Doe"
                            required
                        />
                    </div>

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
                        <label className="label" htmlFor="password">Password (min 6 chars)</label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            minLength={6}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', background: 'rgb(var(--color-accent))' }}
                        disabled={loading}
                    >
                        {loading ? <div className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Create Account'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'rgb(var(--color-text-muted))' }}>
                    Already have an account?{' '}
                    <Link href="/auth/login" style={{ fontWeight: 600 }}>Sign in</Link>
                </div>
            </div>
        </div>
    );
}
