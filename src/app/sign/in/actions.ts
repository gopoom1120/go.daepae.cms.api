'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function signInAction(email: string, password: string): Promise<{ error: string } | void> {
  const validEmail = process.env.MOCK_EMAIL ?? '';
  const validPassword = process.env.MOCK_PASSWORD ?? '';

  if (!email || !password || email !== validEmail || password !== validPassword) {
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  }

  const cookieStore = await cookies();
  cookieStore.set('mock-auth', 'true', {
    path: '/',
    maxAge: 86400,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  redirect('/users');
}
