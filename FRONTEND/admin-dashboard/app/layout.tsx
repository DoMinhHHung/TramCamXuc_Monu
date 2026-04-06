import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/lib/theme';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
    title: 'Admin — Music Social Network',
    description: 'Admin dashboard',
};

export default function RootLayout({children,}: { children: React.ReactNode; }) {
    return (
        <html lang="vi" className={cn(inter.variable, 'dark')} suppressHydrationWarning>
        <body className="font-sans antialiased text-base">
        <ThemeProvider>{children}</ThemeProvider>
        </body>
        </html>
    );
}