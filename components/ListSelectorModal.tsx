import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { X, Check, Users, Briefcase, Heart, Globe } from 'lucide-react-native';
import { ArmiList } from '@/types/armi-intents';
import { useAuth } from '@/context/AuthContext';

type ArmiListFilter = 'All' | ArmiList;

interface ListSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  currentSelection: ArmiListFilter;
  onSelect: (listType: ArmiListFilter) => void;
  theme: any;
}

const LIST_OPTIONS = [
  { 
    key: 'All' as ArmiListFilter, 
    label: 'All Contacts', 
    description: 'Show everyone',
    icon: Globe,
    color: '#6B7280' 
  },
  { 
    key: 'Roster' as ArmiListFilter, 
    label: 'Roster', 
    description: 'Casual Connections',
    icon: Heart,
    color: '#EC4899' 
  },
  { 
    key: 'Network' as ArmiListFilter, 
    label: 'Network', 
    description: 'Professional Contacts',
    icon: Briefcase,
    color: '#059669' 
  },
  { 
    key: 'People' as ArmiListFilter, 
    label: 'People', 
    description: 'Friends and Family',
    icon: Users,
    color: '#3B82F6' 
  },
];

export function ListSelectorModal({ 
  visible, 
  onClose, 
  currentSelection, 
  onSelect, 
  theme 
}: ListSelectorModalProps) {
  const { user } = useAuth();

  const handleSelect = (listType: ArmiListFilter) => {
    // Check if free user is trying to access a restricted list
    if (!user?.isPro && listType !== 'All' && listType !== user?.selectedListType) {
      return; // Don't allow selection
    }
    
    onSelect(listType);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.modal, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>Select List</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {LIST_OPTIONS.map((option) => {
              const IconComponent = option.icon;
              const isSelected = currentSelection === option.key;
              const isDisabled = !user?.isPro && option.key !== 'All' && option.key !== user?.selectedListType;
              
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.listOption,
                    { borderBottomColor: theme.border },
                    isSelected && { backgroundColor: theme.accent },
                    isDisabled && { opacity: 0.5 }
                  ]}
                  onPress={() => handleSelect(option.key)}
                  disabled={isDisabled}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: option.color }]}>
                      <IconComponent size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.optionText}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.optionTitle, { color: theme.text }]}>
                          {option.label}
                        </Text>
                        {isDisabled && (
                          <View style={[styles.proBadge, { backgroundColor: '#F59E0B' }]}>
                            <Text style={styles.proText}>PRO</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.optionDescription, { color: theme.primary }]}>
                        {option.description}
                      </Text>
                    </View>
                  </View>
                  
                  {isSelected && (
                    <View style={[styles.checkContainer, { backgroundColor: option.color }]}>
                      <Check size={14} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    maxWidth: 350,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingVertical: 8,
  },
  listOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  proText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 16,
  },
  checkContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});