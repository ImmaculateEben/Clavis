import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
    title: {
        default: 'VoteSphere — Intelligent Voting Platform',
        template: '%s | VoteSphere',
    },
    description:
        'Secure, configurable multi-tenant voting infrastructure for student elections, corporate boards, associations, religious organizations, and events.',
    keywords: ['voting', 'election', 'ballot', 'multi-tenant', 'secure voting'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.variable} font-sans antialiased`}>
                {children}
                <Toaster position="top-right" />
            </body>
        </html>
    );
}
