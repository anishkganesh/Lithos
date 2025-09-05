'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  company: string | null
  role: string | null
  mining_interests: string[] | null
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName?: string, company?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check if Supabase is configured
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase().auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase().auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    if (!supabase) return
    
    const { data, error } = await supabase()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data && !error) {
      setProfile(data)
    }
  }

  const signUp = async (email: string, password: string, fullName?: string, company?: string) => {
    if (!supabase) {
      toast.error('Authentication is not configured')
      return
    }

    const { data, error } = await supabase().auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company
        }
      }
    })

    if (error) {
      toast.error(error.message)
      throw error
    }

    if (data.user) {
      toast.success('Account created successfully! Please check your email to verify.')
      router.push('/onboarding')
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      toast.error('Authentication is not configured')
      return
    }

    const { data, error } = await supabase().auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      toast.error(error.message)
      throw error
    }

    if (data.user) {
      await fetchProfile(data.user.id)
      toast.success('Welcome back!')
      
      // Redirect to dashboard or requested page
      const redirectTo = pathname === '/login' || pathname === '/register' ? '/' : pathname
      router.push(redirectTo)
    }
  }

  const signOut = async () => {
    if (!supabase) return

    const { error } = await supabase().auth.signOut()
    if (error) {
      toast.error(error.message)
      throw error
    }

    setUser(null)
    setProfile(null)
    setSession(null)
    router.push('/login')
    toast.success('Signed out successfully')
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!supabase || !user) return

    const { data, error } = await supabase()
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      toast.error('Failed to update profile')
      throw error
    }

    if (data) {
      setProfile(data)
      toast.success('Profile updated successfully')
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
