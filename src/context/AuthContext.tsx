import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { User as AppUser, Organization, OrganizationMember } from '@/types'

interface AuthContextType {
  user: User | null
  appUser: AppUser | null
  session: Session | null
  organization: Organization | null
  organizationMember: OrganizationMember | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any; data: any }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  session: null,
  organization: null,
  organizationMember: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null, data: null }),
  signOut: async () => {},
  refreshUser: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [organizationMember, setOrganizationMember] = useState<OrganizationMember | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) {
        console.error('Error fetching user:', userError)
        // Don't set appUser to null if it's just a missing user record
        // The user might not have a profile yet
        if (userError.code !== 'PGRST116') {
          setAppUser(null)
          setOrganization(null)
          setOrganizationMember(null)
        }
        return
      }
      
      if (userData) {
        setAppUser(userData)

        // Fetch organization membership - query separately to avoid RLS recursion issues
        const { data: memberData, error: memberError } = await supabase
          .from('organization_members')
          .select('*')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle()

        if (!memberError && memberData) {
          // Fetch organization separately
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', memberData.organization_id)
            .single()

          if (!orgError && orgData) {
            setOrganizationMember(memberData)
            setOrganization(orgData)
          } else {
            setOrganizationMember(memberData)
            setOrganization(null)
            if (orgError) {
              console.error('Error fetching organization:', orgError)
            }
          }
        } else {
          // User might not be in an organization yet - this is OK
          setOrganizationMember(null)
          setOrganization(null)
          if (memberError && memberError.code !== 'PGRST116') {
            console.error('Error fetching organization membership:', memberError)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      // Don't clear appUser on error - might be a temporary network issue
    }
  }

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout | null = null

    // Set a timeout to stop loading after 5 seconds (fallback)
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Auth initialization timeout - setting loading to false')
        setLoading(false)
      }
    }, 5000)

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return
      if (timeoutId) clearTimeout(timeoutId)
      
      if (error) {
        console.error('Error getting session:', error)
        setLoading(false)
        return
      }
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    }).catch((error) => {
      console.error('Error in getSession:', error)
      if (timeoutId) clearTimeout(timeoutId)
      if (mounted) setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      if (timeoutId) clearTimeout(timeoutId)
      
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setAppUser(null)
        setOrganization(null)
        setOrganizationMember(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      
      // If signup is successful but email confirmation is required
      if (!error && data.user) {
        // The trigger should create the user profile automatically
        // But we can also check if it was created
        console.log('User created:', data.user.id)
      }
      
      return { error, data }
    } catch (err: any) {
      console.error('Signup error:', err)
      return { error: err, data: null }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setAppUser(null)
    setOrganization(null)
    setOrganizationMember(null)
  }

  const refreshUser = async () => {
    if (user) {
      await fetchUserData(user.id)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        session,
        organization,
        organizationMember,
        loading,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

