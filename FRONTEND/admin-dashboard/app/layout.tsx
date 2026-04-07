import type { Metadata } from 'next';
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/lib/theme';

// Sans-serif cho body text — clean, modern, legible ở mọi size
const jakarta = Plus_Jakarta_Sans({
    subsets: ['latin'],
    variable: '--font-sans',
    weight: ['400', '500', '600', '700'],
});

// Monospace chỉ dùng cho data, code, numbers
const mono = IBM_Plex_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
    title: 'Admin — Music Social Network',
    description: 'Admin dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="vi" className={cn(jakarta.variable, mono.variable, 'dark')} suppressHydrationWarning>
            <body className="font-sans antialiased">
                <ThemeProvider>{children}</ThemeProvider>
            </body>
        </html>
    );
}