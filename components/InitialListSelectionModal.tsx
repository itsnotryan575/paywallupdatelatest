import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { Users, Briefcase, Heart, Zap } from 'lucide-react-native';
import { ArmiList } from '@/types/armi-intents';
import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface InitialListSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  theme: any;
}

const LIST_OPTIONS = [
  { 
    key: 'Roster' as ArmiList, 
    label: 'Roster', 
    description: 'Close friends, family, and personal connections',
    icon: Heart,
    color: '#EC4899' 
  },
  { 
    key: 'Network' as ArmiList, 
    label: 'Network', 
    description: 'Professional contacts, colleagues, and business connections',
    icon: Briefcase,
    color: '#059669' 
  },
  { 
    key: 'People' as ArmiList, 
    label: 'People', 
    description: 'Acquaintances, casual contacts, and social connections',
    icon: Users,
    color: '#3B82F6' 
  },
];

export function InitialListSelectionModal({ visible, onClose, theme }: InitialListSelectionModalProps) {
  const { updateSelectedListType } = useAuth();
  const [selectedList, setSelectedList] = useState<ArmiList | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = async (listType: ArmiList) => {
    setSelectedList(listType);
    setLoading(true);
    
    try {
      await updateSelectedListType(listType);
      
      // Mark initial setup as completed
      await AsyncStorage.setItem('has_made_initial_list_selection', 'true');
      
      Alert.alert(
        'List Selected!',
        `You've chosen ${listType} as your primary list. You can upgrade to Pro anytime to access all lists.`,
        [{ text: 'Got it!', onPress: onClose }]
      );
    } catch (error) {
      console.error('Error selecting list:', error);
      Alert.alert('Error', 'Failed to save your selection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}} // Prevent closing without selection
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.cardBackground }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={[styles.logoContainer, { backgroundColor: theme.secondary }]}>
              <Zap size={24} color="#FFFFFF" />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Choose Your List</Text>
            <Text style={[styles.subtitle, { color: theme.primary }]}>
              Free users get access to one list. Choose the one that best fits your needs.
            </Text>
          </View>

          {/* List Options */}
          <View style={styles.content}>
            {LIST_OPTIONS.map((option) => {
              const IconComponent = option.icon;
              const isSelected = selectedList === option.key;
              
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.listOption,
                    { 
                      backgroundColor: isSelected ? option.color : theme.accent,
                      borderColor: theme.border 
                    }
                  ]}
                  onPress={() => handleSelect(option.key)}
                  disabled={loading}
                >
                  <View style={styles.optionContent}>
                    <View style={[styles.iconContainer, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : option.color }]}>
                      <IconComponent size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.optionDescription, { color: isSelected ? 'rgba(255,255,255,0.9)' : theme.primary }]}>
                        {option.description}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Text style={[styles.footerText, { color: theme.primary }]}>
              Want access to all lists? Upgrade to Pro anytime in Settings.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderBottomWidth: 1,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  listOption: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
});