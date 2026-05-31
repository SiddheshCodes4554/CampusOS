'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signupAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const university = formData.get('university') as string
  const major = formData.get('major') as string
  const graduationYear = formData.get('graduationYear') as string

  if (!email || !password || !fullName || !university || !major || !graduationYear) {
    return { error: 'All fields are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        university,
        major,
        graduation_year: parseInt(graduationYear, 10),
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Account created! Please check your email to verify.' }
}

export async function resetPasswordAction(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email is required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Recovery email sent. Check your inbox.' }
}

export async function updatePasswordAction(formData: FormData) {
  const password = formData.get('password') as string

  if (!password) {
    return { error: 'Password is required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
