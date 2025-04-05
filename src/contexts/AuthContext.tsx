import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = 'patient' | 'therapist';

export interface UserProfile {
  id: string;
  updated_at?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
  user_role: UserRole;
  specialization?: string;
  experience_years?: number;
  status?: string;
}

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  user: SupabaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { email: string; full_name?: string; }, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  isAuthenticated: boolean;
}

// Keys for localStorage
const SESSION_STORAGE_KEY = 'calm_construction_session';
const USER_ID_STORAGE_KEY = 'calm_construction_user_id';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize state from localStorage if available
  const [session, setSession] = useState<Session | null>(() => {
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    return storedSession ? JSON.parse(storedSession) : null;
  });
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Update localStorage when session changes
  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      // Store only the user ID, not the entire user object
      if (session.user) {
        localStorage.setItem(USER_ID_STORAGE_KEY, session.user.id);
      }
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(USER_ID_STORAGE_KEY);
    }
  }, [session]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // First check if we have a session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // We have a valid session
          console.log('Valid session found');
          setSession(session);
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          // No valid session, check if we have a stored session
          console.log('No valid session, checking localStorage');
          const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
          const storedUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
          
          if (storedSession && storedUserId) {
            console.log('Found stored session, attempting to restore');
            try {
              // Try to refresh the session
              const { data, error } = await supabase.auth.refreshSession();
              
              if (error) {
                console.error('Session refresh error:', error.message);
                // Clear invalid session data
                localStorage.removeItem(SESSION_STORAGE_KEY);
                localStorage.removeItem(USER_ID_STORAGE_KEY);
                setLoading(false);
              } else if (data.session) {
                console.log('Session refresh successful');
                setSession(data.session);
                setUser(data.user);
                await fetchProfile(data.user.id);
              }
            } catch (error) {
              console.error('Session refresh exception:', error);
              setLoading(false);
            }
          } else {
            console.log('No stored session found');
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };
  
    // Set a timeout to ensure loading state is reset even if auth fails
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('Auth initialization timeout - forcing loading to false');
        setLoading(false);
      }
    }, 5000); // 5 second timeout as a safety measure

    initializeAuth();

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && status !== 406) {
        console.error('Error fetching profile:', error);
        toast.error("Error loading user profile.");
        setProfile(null);
      } else if (data) {
        setProfile(data as UserProfile);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      toast.error('An unexpected error occurred while fetching your profile.');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Login error:', error.message);
        toast.error(error.message || 'Invalid email or password');
        setLoading(false);
      } else if (data.user) {
        // Store session in localStorage (not credentials)
        setSession(data.session);
        setUser(data.user);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data.session));
        localStorage.setItem(USER_ID_STORAGE_KEY, data.user.id);
        
        toast.success("Login successful! Redirecting...");
        
        // Fetch user profile to determine where to navigate
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData as UserProfile);
          
          // Navigate to the appropriate dashboard based on user role
          const dashboardPath = profileData.user_role === 'patient' ? '/patient' : '/therapist';
          
          // Navigate first, then reload the page after a short delay
          navigate(dashboardPath);
          setTimeout(() => {
            window.location.reload();
          }, 100);
        } else {
          // If profile not found, navigate to a default route
          navigate('/patient');
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      }
    } catch (error) {
      console.error('Login exception:', error);
      toast.error('Login failed. Please try again.');
      setLoading(false);
    }
  };

  const register = async (userData: { email: string; full_name?: string; }, password: string, role: UserRole) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: password,
        options: {
          data: {
            user_role: role,
            full_name: userData.full_name || '',
          },
        },
      });

      if (error) {
        console.error('Registration error:', error.message);
        toast.error(error.message || 'Registration failed');
      } else if (data.user) {
        toast.success('Registration successful! Please check your email for verification.');
        navigate('/login');
      } else {
        toast.error('Registration failed. No user data returned.');
      }
    } catch (error) {
      console.error('Registration exception:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Remove session data on logout
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(USER_ID_STORAGE_KEY);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error.message);
        toast.error(error.message || 'Logout failed');
        throw error;
      }
      
      setProfile(null);
      setSession(null);
      setUser(null);
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout exception:', error);
      toast.error('Logout failed. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) {
      toast.error("You must be logged in to update your profile.");
      return;
    }
    setLoading(true);
    try {
      // Ensure profile data always includes user_role if it exists in current profile
      const profileUpdate = {
        ...data,
        id: user.id,
        updated_at: new Date().toISOString(),
        // If user_role is not provided in data, use the one from existing profile
        user_role: data.user_role || profile?.user_role,
      };

      // Log the profile update data to help with debugging
      console.log("Updating profile with data:", profileUpdate);

      const { error } = await supabase.from('profiles').upsert(profileUpdate);

      if (error) {
        console.error('Update profile error:', error.message, error.details);
        toast.error(error.message || 'Failed to update profile');
      } else {
        setProfile((prev) => ({ ...prev, ...profileUpdate } as UserProfile));
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      console.error('Update profile exception:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        isAuthenticated: !!session && !!profile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper functions for direct access to auth state
export function getSessionFromStorage(): Session | null {
  try {
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    return storedSession ? JSON.parse(storedSession) : null;
  } catch (error) {
    console.error('Error retrieving session from localStorage:', error);
    return null;
  }
}

export function getUserIdFromStorage(): string | null {
  return localStorage.getItem(USER_ID_STORAGE_KEY);
}

export function isUserAuthenticated(): boolean {
  return !!getSessionFromStorage();
}
