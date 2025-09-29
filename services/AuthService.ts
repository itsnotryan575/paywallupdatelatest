import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';
import { ArmiList } from '@/types/armi-intents';

// RevenueCat Configuration
const REVENUECAT_IOS_PUBLIC_KEY = 'appl_hojAymPIuDWMsoZMLmFuRwkgakC';
const REVENUECAT_ANDROID_PUBLIC_KEY = 'goog_YOUR_ANDROID_KEY_HERE'; // Replace with actual Android key
const ENTITLEMENT_ID = 'ARMi Pro';
const OFFERING_ID = 'default';

interface ProStatus {
  isPro: boolean;
  selectedListType: ArmiList | null;
  isProForLife: boolean;
  hasRevenueCatEntitlement: boolean;
}

class AuthServiceClass {
  private supabase: any = null;
  private isInitialized = false;
  private revenueCatInitialized = false;

  async init() {
    if (this.isInitialized) return;

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase environment variables not found');
      }

      this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      });

      this.isInitialized = true;
      console.log('Auth service initialized successfully');
      
      // Initialize RevenueCat
      await this.initRevenueCat();
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
      throw error;
    }
  }

  private async initRevenueCat() {
    try {
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_PUBLIC_KEY : REVENUECAT_ANDROID_PUBLIC_KEY;
      
      await Purchases.configure({
        apiKey,
        appUserID: undefined, // Will be set when user signs in
      });
      
      // Set log level for debugging
      await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      
      this.revenueCatInitialized = true;
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      // Don't throw error - app should still work without RevenueCat
    }
  }

  async setRevenueCatUserId(userId: string) {
    try {
      if (this.revenueCatInitialized) {
        await Purchases.logIn(userId);
        console.log('RevenueCat user ID set:', userId);
      }
    } catch (error) {
      console.error('Failed to set RevenueCat user ID:', error);
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  async signUp(email: string, password: string) {
    await this.ensureInitialized();
    
    console.log('Starting signup process for:', email);
    
    // Check if we have proper Supabase configuration
    console.log('Supabase URL configured:', !!process.env.EXPO_PUBLIC_SUPABASE_URL);
    console.log('Supabase Anon Key configured:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
    
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Signup error:', error);
      console.error('Full signup error details:', JSON.stringify(error, null, 2));
      throw new Error(error.message);
    }

    console.log('Signup result:', {
      user: data.user ? { id: data.user.id, email: data.user.email, confirmed: data.user.email_confirmed_at } : null,
      session: data.session ? 'exists' : 'null'
    });
    console.log('Full signup response:', JSON.stringify(data, null, 2));

    return data;
  }

  async signIn(email: string, password: string) {
    await this.ensureInitialized();
    
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    // Set RevenueCat user ID after successful sign in
    if (data.user?.id) {
      await this.setRevenueCatUserId(data.user.id);
    }

    return data;
  }

  async sendEmailOtp(email: string) {
    await this.ensureInitialized();
    
    const { data, error } = await this.supabase.auth.resend({
      'type': 'signup',
      email,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async verifyEmailOtp(email: string, token: string) {
    await this.ensureInitialized();
    
    const { data, error } = await this.supabase.auth.verifyOtp({
      email,
      token,
      'type': 'signup',
    });

    if (error) {
      throw new Error(error.message);
    }

    // Set RevenueCat user ID after successful verification
    const session = await this.getSession();
    if (session?.user?.id) {
      await this.setRevenueCatUserId(session.user.id);
    }
    
    return data;
  }

  async signOut() {
    await this.ensureInitialized();
    
    // Log out from RevenueCat
    try {
      if (this.revenueCatInitialized) {
        await new Promise(resolve => setTimeout(resolve, 100));
        await Purchases.logOut();
      }
    } catch (error) {
      console.error('Failed to log out from RevenueCat:', error);
    }
    
    const { error } = await this.supabase.auth.signOut();
    
    if (error) {
      throw new Error(error.message);
    }
  }

  async resetPassword(email: string) {
    await this.ensureInitialized();
    
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);

    if (error) {
      throw new Error(error.message);
    }
  }

  async updatePassword(newPassword: string) {
    await this.ensureInitialized();
    
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async updateEmail(newEmail: string) {
    await this.ensureInitialized();
    
    const { error } = await this.supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async getCurrentUser() {
    await this.ensureInitialized();
    
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  async getSession() {
    await this.ensureInitialized();
    
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!this.supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    
    return this.supabase.auth.onAuthStateChange(callback);
  }

  async ensureUserProfileExists(userId: string) {
    await this.ensureInitialized();
    
    try {
      console.log('🔍 DEBUG: Ensuring user profile exists for userId:', userId);
      
      // Check if a profile already exists for this user
      const { data: existingProfile, error: selectError } = await this.supabase
        .from('user_profiles')
        .select('id, is_pro_for_life, selected_list_type')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (selectError) {
        console.error('Error checking existing user profile:', selectError);
        // If we can't check for existing profile, return null and let app continue
        console.log('🔍 DEBUG: Could not check existing profile, returning null');
        return null;
      }
      
      if (existingProfile) {
        console.log('🔍 DEBUG: User profile already exists:', existingProfile);
        return existingProfile;
      }
      
      // Create default user profile if it doesn't exist
      console.log('🔍 DEBUG: Creating default user profile for userId:', userId);
      const now = new Date().toISOString();
      
      const { data: newProfile, error: insertError } = await this.supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          is_pro_for_life: false,
          selected_list_type: null,
          created_at: now,
          updated_at: now,
        })
        .select('id, is_pro_for_life, selected_list_type')
        .single();
      
      if (insertError) {
        console.error('Error creating user profile:', insertError);
        // Return null instead of throwing to let app continue
        console.log('🔍 DEBUG: Profile creation failed, returning null');
        return null;
      }
      
      console.log('🔍 DEBUG: Successfully created user profile:', newProfile);
      return newProfile;
    } catch (error) {
      console.error('Error ensuring user profile exists:', error);
      console.log('🔍 DEBUG: Exception in profile creation, returning null');
      return null;
    }
  }

  async checkProStatus(forceRefresh: boolean = false): Promise<ProStatus> {
    await this.ensureInitialized();
    
    const defaultStatus: ProStatus = {
      isPro: false,
      selectedListType: null,
      isProForLife: false,
      hasRevenueCatEntitlement: false,
    };
    
    try {
      const session = await this.getSession();
      if (!session?.user?.id) {
        return defaultStatus;
      }
      
      // Check Supabase user profile for pro for life status and selected list type
      const { data: userProfile, error } = await this.supabase
        .from('user_profiles')
        .select('is_pro_for_life, selected_list_type')
        .eq('user_id', session.user.id)
        .single();
      
      const isProForLife = userProfile?.is_pro_for_life || false;
      const selectedListType = userProfile?.selected_list_type || null;
      
      // Check RevenueCat entitlement
      let hasRevenueCatEntitlement = false;
      if (this.revenueCatInitialized) {
        try {
          const customerInfo = await Purchases.getCustomerInfo({
            fetchPolicy: forceRefresh ? Purchases.FETCH_POLICY.FETCH_CURRENT : Purchases.FETCH_POLICY.CACHED_OR_NETWORK,
          });
            
            // Log detailed entitlement info for debugging
            console.log('RevenueCat Customer Info:', {
              originalAppUserId: customerInfo.originalAppUserId,
              activeEntitlements: Object.keys(customerInfo.entitlements.active),
              allEntitlements: Object.keys(customerInfo.entitlements.all),
              entitlementId: ENTITLEMENT_ID,
            });
            
            // Check for entitlement with multiple possible IDs
            const possibleEntitlementIds = [
              ENTITLEMENT_ID, // 'ARMi Pro'
              'ARMi_Pro',
              'default',
              'pro',
              'Pro',
            ];
            
            hasRevenueCatEntitlement = possibleEntitlementIds.some(id => 
              customerInfo.entitlements.active[id] !== undefined
            );
            
            console.log('RevenueCat entitlement check result:', {
              hasRevenueCatEntitlement,
              checkedIds: possibleEntitlementIds,
              foundActiveEntitlements: Object.keys(customerInfo.entitlements.active),
            });
        } catch (revenueCatError) {
          console.error('Failed to check RevenueCat entitlement:', revenueCatError);
        }
      }
      
      const isPro = isProForLife || hasRevenueCatEntitlement;
      
      console.log('Final pro status calculation:', {
        isPro,
        isProForLife,
        hasRevenueCatEntitlement,
        selectedListType,
      });
      
      return {
        isPro,
        selectedListType,
        isProForLife,
        hasRevenueCatEntitlement,
      };
    } catch (error) {
      console.error('Error checking pro status:', error);
      return defaultStatus;
    }
  }

  async updateSelectedListType(listType: ArmiList) {
    await this.ensureInitialized();
    
    try {
      const session = await this.getSession();
      if (!session?.user?.id) {
        throw new Error('No authenticated user');
      }
      
      // Check if a profile already exists for this user
      const { data: existingProfile, error: selectError } = await this.supabase
        .from('user_profiles')
        .select('id, selected_list_type')
        .eq('user_id', session.user.id)
        .maybeSingle(); // Use maybeSingle to avoid error when no record exists
      
      if (selectError) {
        console.error('Error checking existing profile:', selectError);
        throw new Error(selectError.message);
      }
      
      const now = new Date().toISOString();
      
      if (existingProfile) {
        console.log('Updating existing user profile with list type:', listType);
        const { error: updateError } = await this.supabase
          .from('user_profiles')
          .update({
            selected_list_type: listType,
            updated_at: now,
          })
          .eq('user_id', session.user.id);
        
        if (updateError) {
          console.error('Error updating user profile:', updateError);
          throw new Error(updateError.message);
        }
        console.log('Successfully updated user profile');
      } else {
        console.log('Creating new user profile with list type:', listType);
        const { error: insertError } = await this.supabase
          .from('user_profiles')
          .insert({
            user_id: session.user.id,
            selected_list_type: listType,
            created_at: now,
            updated_at: now,
          });
        
        if (insertError) {
          console.error('Error creating user profile:', insertError);
          throw new Error(insertError.message);
        }
        console.log('Successfully created user profile');
      }
    } catch (error) {
      console.error('Error updating selected list type:', error);
      throw error;
    }
  }

  async showManageSubscriptions() {
    await this.ensureInitialized();
    
    if (!this.revenueCatInitialized) {
      throw new Error('RevenueCat not initialized');
    }
    
    try {
      await Purchases.showManageSubscriptions();
    } catch (error) {
      console.error('Error showing manage subscriptions:', error);
      throw error;
    }
  }

  async getOfferings(): Promise<PurchasesOffering[]> {
    await this.ensureInitialized();
    
    if (!this.revenueCatInitialized) {
      throw new Error('RevenueCat not initialized');
    }
    
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.all[OFFERING_ID]?.availablePackages || [];
    } catch (error) {
      console.error('Error fetching offerings:', error);
      throw error;
    }
  }

  async purchasePackage(packageToPurchase: any) {
    await this.ensureInitialized();
    
    if (!this.revenueCatInitialized) {
      throw new Error('RevenueCat not initialized');
    }
    
    try {
      // Ensure RevenueCat user ID is set before purchase
      const session = await this.getSession();
      if (session?.user?.id) {
        await this.setRevenueCatUserId(session.user.id);
      }
      
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      
      // Log the purchase result for debugging
      console.log('Purchase successful! Customer info:', {
        originalAppUserId: customerInfo.originalAppUserId,
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
        allEntitlements: Object.keys(customerInfo.entitlements.all),
      });
      
      return customerInfo;
    } catch (error) {
      console.error('Error purchasing package:', error);
      throw error;
    }
  }

  async restorePurchases() {
    await this.ensureInitialized();
    
    if (!this.revenueCatInitialized) {
      throw new Error('RevenueCat not initialized');
    }
    
    try {
      // Ensure RevenueCat user ID is set before restore
      const session = await this.getSession();
      if (session?.user?.id) {
        await this.setRevenueCatUserId(session.user.id);
      }
      
      const customerInfo = await Purchases.restorePurchases();
      
      // Log the restore result for debugging
      console.log('Restore successful! Customer info:', {
        originalAppUserId: customerInfo.originalAppUserId,
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
        allEntitlements: Object.keys(customerInfo.entitlements.all),
      });
      
      return customerInfo;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      throw error;
    }
  }

  async showManageSubscriptions() {
    await this.ensureInitialized();
    
    if (!this.revenueCatInitialized) {
      throw new Error('RevenueCat not initialized');
    }
    
    try {
      await Purchases.showManageSubscriptions();
    } catch (error) {
      console.error('Error showing manage subscriptions:', error);
      throw error;
    }
  }
}

export const AuthService = new AuthServiceClass();