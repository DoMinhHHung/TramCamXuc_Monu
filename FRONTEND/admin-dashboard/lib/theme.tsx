'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';
interface ThemeCtx { theme: Theme; toggle: () => void }

const Ctx = createContext<ThemeCtx>({ theme: 'dark', toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark');

    useEffect(() => {
        const saved = (localStorage.getItem('theme') as Theme) ?? 'dark';
        setTheme(saved);
        document.documentElement.classList.toggle('dark', saved === 'dark');
    }, []);

    const toggle = () => {
        setTheme(prev => {
            const next: Theme = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', next);
            document.documentElement.classList.toggle('dark', next === 'dark');
            return next;
        });
    };

    return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);