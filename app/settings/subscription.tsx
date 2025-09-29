import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Crown, Check, Star, Zap, Users, Bell, MessageSquareText, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { AuthService } from '@/services/AuthService';
import Purchases, { PurchasesPackage } from 'react-native-purchases';

export default function SubscriptionSettings() {
  const router = useRouter();
  const { user, checkProStatus } = useAuth();
  const { isDark } = useTheme();
  
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const theme = {
    text: '#f0f0f0',
    background: isDark ? '#0B0909' : '#003C24',
    primary: isDark ? '#8C8C8C' : '#f0f0f0',
    secondary: isDark ? '#4A5568' : '#012d1c',
    accent: isDark ? '#44444C' : '#002818',
    cardBackground: isDark ? '#1A1A1A' : '#002818',
    border: isDark ? '#333333' : '#012d1c',
    isDark,
  };

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      setLoading(true);
      const packages = await AuthService.getOfferings();
      setOfferings(packages);
    } catch (error) {
      console.error('Error loading offerings:', error);
      Alert.alert('Error', 'Failed to load subscription options. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageToPurchase: PurchasesPackage) => {
    setPurchasing(true);
    try {
      // Pin RC identity to the current app user BEFORE purchase/restore
      await AuthService.setRevenueCatUserId(user?.id || '');
      await Purchases.getCustomerInfo({ fetchPolicy: Purchases.FETCH_POLICY.FETCH_CURRENT });
      
      await AuthService.purchasePackage(packageToPurchase);
      
      // Force refresh pro status and update user state
      await checkProStatus(true);
      
      Alert.alert(
        'Welcome to Pro!',
        'Your subscription is now active. Enjoy unlimited profiles, reminders, and access to all lists!',
        [{ text: 'Awesome!', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Purchase error:', error);
      
      if (error.userCancelled) {
        // User cancelled, no need to show error
        return;
      }
      
      Alert.alert('Purchase Failed', error.message || 'Failed to complete purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    setRestoring(true);
    try {
      // Pin RC identity to the current app user BEFORE purchase/restore
      await AuthService.setRevenueCatUserId(user?.id || '');
      await Purchases.getCustomerInfo({ fetchPolicy: Purchases.FETCH_POLICY.FETCH_CURRENT });
      
      await AuthService.restorePurchases();
      
      // Force refresh pro status and update user state
      await checkProStatus(true);
      
      Alert.alert('Purchases Restored', 'Your previous purchases have been restored successfully.');
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Restore Failed', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const getPackagePrice = (pkg: PurchasesPackage) => {
    return pkg.product.priceString || '$4.99';
  };

  const getPackagePeriod = (pkg: PurchasesPackage) => {
    const identifier = pkg.identifier.toLowerCase();
    if (identifier.includes('monthly')) return 'month';
    if (identifier.includes('yearly')) return 'year';
    return 'month';
  };

  const proFeatures = [
    { icon: Users, text: 'Unlimited profiles', color: '#3B82F6' },
    { icon: Bell, text: 'Unlimited reminders', color: '#059669' },
    { icon: MessageSquareText, text: 'Unlimited scheduled texts', color: '#8B5CF6' },
    { icon: Sparkles, text: 'Access to all 3 lists', color: '#F59E0B' },
    { icon: Zap, text: 'Priority AI processing', color: '#EC4899' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Subscription</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Status */}
        <View style={[styles.statusCard, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.statusHeader}>
            <View style={[
              styles.statusIcon, 
              { backgroundColor: user?.isPro ? '#059669' : '#6B7280' }
            ]}>
              <Crown size={24} color="#FFFFFF" />
            </View>
            <View style={styles.statusText}>
              <Text style={[styles.statusTitle, { color: theme.text }]}>
                {user?.isPro ? 'ARMi Pro' : 'ARMi Free'}
              </Text>
              <Text style={[styles.statusSubtitle, { color: theme.primary }]}>
                {user?.isPro 
                  ? (user?.isProForLife ? 'Pro for Life' : 'Active Subscription')
                  : 'Limited Features'
                }
              </Text>
            </View>
          </View>
          
          {user?.isProForLife && (
            <View style={[styles.proForLifeBadge, { backgroundColor: '#F59E0B' }]}>
              <Star size={16} color="#FFFFFF" />
              <Text style={styles.proForLifeText}>Pro for Life</Text>
            </View>
          )}
        </View>

        {/* Pro Features */}
        <View style={[styles.featuresCard, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.featuresTitle, { color: theme.text }]}>Pro Features</Text>
          
          {proFeatures.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <View key={index} style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
                  <IconComponent size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.featureText, { color: theme.text }]}>
                  {feature.text}
                </Text>
                {user?.isPro && (
                  <Check size={16} color="#059669" />
                )}
              </View>
            );
          })}
        </View>

        {/* Subscription Options */}
        {!user?.isPro && (
          <View style={styles.subscriptionSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Upgrade to Pro</Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.primary }]}>
                  Loading subscription options...
                </Text>
              </View>
            ) : (
              <View style={styles.packagesContainer}>
                {offerings.map((pkg, index) => {
                  const period = getPackagePeriod(pkg);
                  const isYearly = period === 'year';
                  
                  return (
                    <TouchableOpacity
                      key={pkg.identifier}
                      style={[
                        styles.packageCard,
                        { 
                          backgroundColor: theme.cardBackground,
                          borderColor: isYearly ? '#F59E0B' : theme.border,
                          borderWidth: isYearly ? 2 : 1,
                        }
                      ]}
                      onPress={() => handlePurchase(pkg)}
                      disabled={purchasing}
                    >
                      {isYearly && (
                        <View style={[styles.popularBadge, { backgroundColor: '#F59E0B' }]}>
                          <Text style={styles.popularText}>BEST VALUE</Text>
                        </View>
                      )}
                      
                      <View style={styles.packageHeader}>
                        <Text style={[styles.packageTitle, { color: theme.text }]}>
                          {isYearly ? 'Yearly' : 'Monthly'}
                        </Text>
                        <Text style={[styles.packagePrice, { color: theme.text }]}>
                          {getPackagePrice(pkg)}
                        </Text>
                        <Text style={[styles.packagePeriod, { color: theme.primary }]}>
                          per {period}
                        </Text>
                      </View>
                      
                      {isYearly && (
                        <Text style={[styles.savingsText, { color: '#F59E0B' }]}>
                          Save 17% vs monthly
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Restore Purchases */}
        {!user?.isProForLife && (
          <View style={styles.restoreSection}>
            <TouchableOpacity
              style={[styles.restoreButton, { backgroundColor: theme.accent, borderColor: theme.border }]}
              onPress={handleRestorePurchases}
              disabled={restoring}
            >
              {restoring ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : (
                <Text style={[styles.restoreButtonText, { color: theme.text }]}>
                  Restore Purchases
                </Text>
              )}
            </TouchableOpacity>
            
            <Text style={[styles.restoreHelpText, { color: theme.primary }]}>
              Already purchased? Tap here to restore your subscription.
            </Text>
          </View>
        )}

        {/* Manage Subscription */}
        {user?.isPro && !user?.isProForLife && (
          <View style={styles.manageSubscriptionSection}>
            <TouchableOpacity
              style={[styles.manageButton, { backgroundColor: theme.accent, borderColor: theme.border }]}
              onPress={async () => {
                try {
                  await AuthService.showManageSubscriptions();
                } catch (error) {
                  Alert.alert('Error', 'Could not open subscription management. Please try again later.');
                }
              }}
            >
              <Text style={[styles.manageButtonText, { color: theme.text }]}>
                Manage Subscription
              </Text>
            </TouchableOpacity>
            <Text style={[styles.manageHelpText, { color: theme.primary }]}>
              Cancel anytime. You'll keep Pro features until your current period ends.
            </Text>
          </View>
        )}

        {/* Current Limits (Free Users) */}
        {!user?.isPro && (
          <View style={[styles.limitsCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.limitsTitle, { color: theme.text }]}>Current Limits</Text>
            
            <View style={styles.limitItem}>
              <Users size={16} color={theme.primary} />
              <Text style={[styles.limitText, { color: theme.text }]}>5 profiles maximum</Text>
            </View>
            
            <View style={styles.limitItem}>
              <Bell size={16} color={theme.primary} />
              <Text style={[styles.limitText, { color: theme.text }]}>5 reminders per month</Text>
            </View>
            
            <View style={styles.limitItem}>
              <MessageSquareText size={16} color={theme.primary} />
              <Text style={[styles.limitText, { color: theme.text }]}>5 scheduled texts per month</Text>
            </View>
            
            <View style={styles.limitItem}>
              <Sparkles size={16} color={theme.primary} />
              <Text style={[styles.limitText, { color: theme.text }]}>
                Access to {user?.selectedListType || 'one'} list only
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statusCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 16,
  },
  proForLifeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  proForLifeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  featuresCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  subscriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  packagesContainer: {
    gap: 16,
  },
  packageCard: {
    borderRadius: 16,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    alignItems: 'center',
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  packageHeader: {
    alignItems: 'center',
    marginTop: 16,
  },
  packageTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  packagePeriod: {
    fontSize: 16,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  restoreSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  restoreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  restoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  restoreHelpText: {
    fontSize: 14,
    textAlign: 'center',
  },
  limitsCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  limitsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  limitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  limitText: {
    fontSize: 16,
    marginLeft: 12,
  },
  manageSubscriptionSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  manageButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  manageHelpText: {
    fontSize: 14,
    textAlign: 'center',
  },
});