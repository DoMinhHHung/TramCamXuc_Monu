'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    const t = localStorage.getItem('access_token');
    router.replace(t ? '/dashboard' : '/login');
  }, [router]);
  return null;
}