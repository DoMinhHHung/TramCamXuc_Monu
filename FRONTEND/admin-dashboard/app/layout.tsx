import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/lib/theme';

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
    title: 'Admin — Music Social Network',
    description: 'Admin dashboard',
};

export default function RootLayout({children,}: { children: React.ReactNode; }) {
    return (
        <html lang="vi" className={cn(mono.variable, 'dark')} suppressHydrationWarning>
        <body className="font-mono antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        </body>
        </html>
    );
}