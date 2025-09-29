import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from '@/services/AuthService';
import { ArmiList } from '@/types/armi-intents';
import * as Purchases from "react-native-purchases";

interface ProStatus {
  isPro: boolean;
  selectedListType: ArmiList | null;
  isProForLife: boolean;
  hasRevenueCatEntitlement: boolean;
}

interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
  created_at: string;
  isPro: boolean;
  selectedListType: ArmiList | null;
  isProForLife: boolean;
  hasRevenueCatEntitlement: boolean;
}

interface AuthContextType {
  user: User | null;
  session: any;
  loading: boolean;
  isUserDataLoaded: boolean;
  signUp: (email: string, password: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  sendEmailOtp: (email: string) => Promise<any>;
  verifyEmailOtp: (email: string, token: string) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
  updateSelectedListType: (listType: ArmiList) => Promise<void>;
  checkProStatus: (forceRefresh?: boolean) => Promise<ProStatus>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      await AuthService.init();
      
      // Get initial session
      const initialSession = await AuthService.getSession();
      console.log('🔍 DEBUG: AuthContext - Initial session retrieved:', {
        hasSession: !!initialSession,
        hasUser: !!initialSession?.user,
        userEmail: initialSession?.user?.email || 'none',
        emailConfirmed: !!initialSession?.user?.email_confirmed_at,
        emailConfirmedAt: initialSession?.user?.email_confirmed_at || 'none'
      });
      setSession(initialSession);
      
      if (initialSession?.user?.id) {
        if (initialSession.user.email_confirmed_at) {
          console.log('🔍 DEBUG: Initial session found with confirmed email, ensuring user profile exists');
          try {
            await AuthService.ensureUserProfileExists(initialSession.user.id);
          } catch (error) {
            console.error('Failed to ensure user profile exists during auth state change:', error);
            // Continue without throwing - app should still work
            console.error('Failed to ensure user profile exists during init:', error);
            // Continue without throwing - app should still work
          }
          
          // Check pro status and update user object
          const proStatus = await AuthService.checkProStatus(true); // Force refresh on initial load
          console.log('🔍 DEBUG: AuthContext - Pro status check result:', proStatus);
          const enhancedUser = {
            ...initialSession.user,
            isPro: proStatus.isPro,
            selectedListType: proStatus.selectedListType,
            isProForLife: proStatus.isProForLife,
            hasRevenueCatEntitlement: proStatus.hasRevenueCatEntitlement,
          };
          setUser(enhancedUser);
          console.log('🔍 DEBUG: AuthContext - Enhanced user set:', {
            email: enhancedUser.email,
            isPro: enhancedUser.isPro,
            selectedListType: enhancedUser.selectedListType,
            emailConfirmed: !!enhancedUser.email_confirmed_at
          });
        } else {
          console.log('🔍 DEBUG: Initial session found but email not confirmed, setting basic user data');
          // Email not confirmed yet, set basic user data without profile operations
          setUser(initialSession.user);
          setIsUserDataLoaded(true);
        }
      } else {
        console.log('🔍 DEBUG: AuthContext - No initial session found, setting user to null');
        setUser(null);
      }
      
      // Set isUserDataLoaded based on whether we have a confirmed user or no user at all
      setIsUserDataLoaded(!initialSession?.user || !!initialSession.user.email_confirmed_at);
      
      console.log('🔍 DEBUG: AuthContext - Initial auth setup complete:', {
        hasUser: !!user,
        loading: false,
        isUserDataLoaded: !initialSession?.user || !!initialSession.user.email_confirmed_at
      });
      setLoading(false);

      // Listen for auth changes
      const { data: { subscription } } = AuthService.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.email);
          console.log('User email_confirmed_at:', session?.user?.email_confirmed_at);
          
          if (session?.user) {
            if (session.user.email_confirmed_at) {
              console.log('🔍 DEBUG: Auth state change - user confirmed, ensuring user profile exists');
              // Try to ensure user profile exists before checking pro status.
              // This is crucial for isPro and selectedListType to be available.
              // This is crucial for isPro and selectedListType to be available.
              try {
                await AuthService.ensureUserProfileExists(session.user.id);
              } catch (error) {
                console.error('Failed to ensure user profile exists during auth state change:', error);
                // Continue without throwing - app should still work
              }
              
              // Check pro status and update user object, force refresh
              const proStatus = await AuthService.checkProStatus(true);
              console.log('🔍 DEBUG: AuthContext - Auth state change pro status:', proStatus);
              const enhancedUser = {
                ...session.user,
                isPro: proStatus.isPro,
                selectedListType: proStatus.selectedListType,
                isProForLife: proStatus.isProForLife,
                hasRevenueCatEntitlement: proStatus.hasRevenueCatEntitlement,
              };
              setUser(enhancedUser);
              setIsUserDataLoaded(true);
              console.log('🔍 DEBUG: AuthContext - Auth state change user set:', {
                email: enhancedUser.email,
                isPro: enhancedUser.isPro,
                selectedListType: enhancedUser.selectedListType,
                emailConfirmed: !!enhancedUser.email_confirmed_at
              });
              console.log('🔍 DEBUG: AuthContext - Auth state change confirmed, user data loaded.');
              console.log('🔍 DEBUG: AuthContext - Initial session confirmed, user data loaded.');
            } else {
              console.log('🔍 DEBUG: Auth state change - user not confirmed, setting basic user data');
              // Email not confirmed yet, set basic user data without profile operations
              setUser(session.user);
            }
          } else {
            console.log('🔍 DEBUG: AuthContext - Auth state change no user, setting null');
            setUser(null);
            setIsUserDataLoaded(true);
          }
          
          setSession(session);
          console.log('🔍 DEBUG: AuthContext - Auth state change complete:', {
            event,
            hasUser: !!session?.user,
            loading: false,
            isUserDataLoaded: true
          });
          setLoading(false);
        }
      );

      return () => {
        subscription?.unsubscribe();
      };
    } catch (error) {
      console.error('Error initializing auth:', error);
      setLoading(false);
      setIsUserDataLoaded(true);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Subscribe to RC CustomerInfo updates if available
    const setupRevenueCatListener = async () => {
      try {
        if (typeof Purchases.addCustomerInfoUpdateListener !== 'function') {
          console.log('[RC Listener] addCustomerInfoUpdateListener not available');
          return null;
        }
        
        const sub = Purchases.addCustomerInfoUpdateListener(async () => {
          const ci = await (async () => { 
            try { 
              await Purchases.invalidateCustomerInfoCache(); 
              return await Purchases.getCustomerInfo(); 
            } catch { 
              return null; 
            } 
          })();
          
          if (!ci) return;
          
          try {
            // Check entitlement directly and update consolidated pro status
            const hasEntitlement = !!ci?.entitlements?.active?.["ARMi Pro"];
            const proStatus = await AuthService.checkProStatus(true);
            if (!isMounted) return;

            setUser((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                isPro: proStatus.isPro,
                selectedListType: proStatus.selectedListType,
                isProForLife: proStatus.isProForLife,
                hasRevenueCatEntitlement: hasEntitlement,
              };
            });

            console.log(
              "[RC Listener] isPro:",
              proStatus.isPro,
              "hasEntitlement:",
              hasEntitlement
            );
          } catch (e) {
            console.log("[RC Listener] pro refresh failed:", e);
          }
        });
        
        return sub;
      } catch (error) {
        console.log('[RC Listener] Failed to setup listener:', error);
        return null;
      }
    };
    
    let subscription: any = null;
    setupRevenueCatListener().then(sub => {
      subscription = sub;
    });

    return () => {
      if (subscription) {
        try {
          if (subscription?.remove) {
            subscription.remove();
          }
        } catch (error) {
          console.log('[RC Listener] Error removing listener:', error);
        }
      }
      isMounted = false;
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await AuthService.signUp(email, password);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await AuthService.signIn(email, password);
      
      // Set RevenueCat user ID after successful sign in
      if (result.user?.id && result.session) { // Ensure session is also present
        await AuthService.setRevenueCatUserId(result.user.id);
      }
      
      // Force refresh pro status after sign-in
      const proStatus = await checkProStatus(true);
      if (user) { // Update user state if it exists
        setUser({
          ...user,
          isPro: proStatus.isPro,
          selectedListType: proStatus.selectedListType,
          isProForLife: proStatus.isProForLife,
          hasRevenueCatEntitlement: proStatus.hasRevenueCatEntitlement,
        });
      }

      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendEmailOtp = async (email: string) => {
    try {
      const result = await AuthService.sendEmailOtp(email);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const verifyEmailOtp = async (email: string, token: string) => {
    try {
      const result = await AuthService.verifyEmailOtp(email, token);
      
      // Force refresh the current session to get updated user data
      const refreshedSession = await AuthService.getSession(); // This should already be updated by Supabase
      
      if (refreshedSession?.user) {
        console.log('🔍 DEBUG: Email verified and session refreshed - ensuring user profile exists');
        // Try to ensure user profile exists before checking pro status
        try {
          await AuthService.ensureUserProfileExists(refreshedSession.user.id);
        } catch (error: any) {
          console.error('Failed to ensure user profile exists during email verification:', error);
          // If profile creation fails, we still want to set the user and isUserDataLoaded
          // The app can handle missing profile data gracefully.
        }
        
        // Check pro status and update user object
        const proStatus = await AuthService.checkProStatus(true); // Force refresh after verification
        const enhancedUser = {
          ...refreshedSession.user,
          isPro: proStatus.isPro,
          selectedListType: proStatus.selectedListType,
          isProForLife: proStatus.isProForLife,
          hasRevenueCatEntitlement: proStatus.hasRevenueCatEntitlement,
        };
        setUser(enhancedUser);
        console.log('🔍 DEBUG: AuthContext - Email verified, user data loaded.');
        setIsUserDataLoaded(true);
      } else {
        setUser(null);
      }
      
      setSession(refreshedSession);
      
      return result;
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      // Clean up RevenueCat identity on sign out
      try {
        await Purchases.logOut();
        await Purchases.invalidateCustomerInfoCache();
        await Purchases.invalidateCustomerInfoCache();
      } catch (rcError) {
        console.error('Failed to clean up RevenueCat on sign out:', rcError);
      }
      
      await AuthService.signOut();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await AuthService.resetPassword(email);
    } catch (error) {
      throw error;
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      await AuthService.updatePassword(newPassword);
    } catch (error) {
      throw error;
    }
  };

  const updateEmail = async (newEmail: string) => {
    try {
      await AuthService.updateEmail(newEmail);
    } catch (error) {
      throw error;
    }
  };

  const updateSelectedListType = async (listType: ArmiList) => {
    try {
      await AuthService.updateSelectedListType(listType);
      
      // Update user state
      if (user) {
        setUser({
          ...user,
          selectedListType: listType,
        });
      }
    } catch (error) {
      throw error;
    }
  };

  const checkProStatus = async (forceRefresh: boolean = false): Promise<ProStatus> => {
    try {
      const proStatus = await AuthService.checkProStatus(forceRefresh);
      
      // Always update user state with the latest pro status
      if (user) {
        setUser({
          ...user,
          isPro: proStatus.isPro,
          selectedListType: proStatus.selectedListType,
          isProForLife: proStatus.isProForLife,
          hasRevenueCatEntitlement: proStatus.hasRevenueCatEntitlement,
        });
      }
      
      return proStatus;
    } catch (error) {
      console.error('Error checking pro status:', error);
      throw error; // Re-throw to indicate failure
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isUserDataLoaded,
      signUp,
      signIn,
      sendEmailOtp,
      verifyEmailOtp,
      signOut,
      resetPassword,
      updatePassword,
      updateEmail,
      updateSelectedListType,
      checkProStatus,
    }}>
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