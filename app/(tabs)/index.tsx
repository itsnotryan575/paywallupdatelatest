import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Search, Filter, Plus } from 'lucide-react-native';
import { DatabaseService } from '@/services/DatabaseService';
import { ProfileCard } from '@/components/ProfileCard';
import { SearchHeader } from '@/components/SearchHeader';
import { FilterModal } from '@/components/FilterModal';
import { ListSelectorModal } from '@/components/ListSelectorModal';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

import { useAuth } from '@/context/AuthContext';
export default function RosterScreen() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showListSelector, setShowListSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isDark, currentListType, setCurrentListType } = useTheme();

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
    loadProfiles();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadProfiles();
    }, [])
  );

  useEffect(() => {
    filterProfiles();
  }, [profiles, searchQuery, selectedFilter, selectedTagFilter]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.getAllProfiles(currentListType);
      setProfiles(data);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUniqueRelationshipTypes = () => {
    const relationships = [...new Set(profiles.map(p => p.relationship))];
    return [
      { key: 'all', label: 'All Contacts', count: profiles.length },
      ...relationships.map(rel => ({
        key: rel,
        label: rel.charAt(0).toUpperCase() + rel.slice(1),
        count: profiles.filter(p => p.relationship === rel).length
      }))
    ];
  };

  const getUniqueTags = () => {
    const allTags = profiles.flatMap(p => p.tags || []);
    const uniqueTags = [...new Set(allTags.map(tag => typeof tag === 'string' ? tag : tag.text))];
    return [
      { key: 'all', label: 'All Tags', count: profiles.length },
      ...uniqueTags.map(tag => ({
        key: tag,
        label: tag.charAt(0).toUpperCase() + tag.slice(1),
        count: profiles.filter(p => 
          (p.tags || []).some(t => (typeof t === 'string' ? t : t.text) === tag)
        ).length
      }))
    ];
  };

  const relationshipTypes = getUniqueRelationshipTypes();
  const tagTypes = getUniqueTags();

  const filterProfiles = () => {
    let filtered = profiles;

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(profile => profile.relationship === selectedFilter);
    }

    if (selectedTagFilter !== 'all') {
      filtered = filtered.filter(profile => 
        (profile.tags || []).some(tag => 
          (typeof tag === 'string' ? tag : tag.text) === selectedTagFilter
        )
      );
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(profile =>
        profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (profile.notes && profile.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredProfiles(filtered);
  };

  const handleProfileSelect = (profile) => {
    router.push(`/profile/${profile.id}`);
  };

  const handleProfileDelete = async (profileId: number) => {
    try {
      await DatabaseService.deleteProfile(profileId);
      await loadProfiles(); // Refresh the list
    } catch (error) {
      console.error('Error deleting profile:', error);
      Alert.alert('Error', 'Failed to delete profile. Please try again.');
    }
  };

  const handleAddPress = () => {
    // Check profile limit for free users
    if (!user?.isPro && profiles.length >= 5) {
      Alert.alert(
        'Profile Limit Reached',
        'Free users can manage up to 5 profiles. Upgrade to Pro for unlimited profiles and access to all lists.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: () => router.push('/settings/subscription') }
        ]
      );
      return;
    }
    
    router.push('/profile/create');
  };

  const handleListSelect = (listType: 'All' | 'Roster' | 'Network' | 'People') => {
    // Check if free user is trying to access a different list
    if (!user?.isPro && listType !== 'All' && listType !== user?.selectedListType) {
      Alert.alert(
        'Pro Feature',
        'Free users have access to one list. Upgrade to Pro to access all lists and unlimited profiles.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: () => router.push('/settings/subscription') }
        ]
      );
      return;
    }
    
    setCurrentListType(listType);
    // Profiles will reload automatically due to the useEffect dependency on currentListType
  };

  // Add effect to reload profiles when currentListType changes
  useEffect(() => {
    loadProfiles();
  }, [currentListType]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterPress={() => setShowFilterModal(true)}
        onAddPress={handleAddPress}
        onTitlePress={() => setShowListSelector(true)}
        profileCount={filteredProfiles.length}
        theme={theme}
      />

      {loading ? (
        <View style={styles.centerContent}>
          <Text style={[styles.loadingText, { color: theme.primary }]}>Loading your roster...</Text>
        </View>
      ) : filteredProfiles.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No profiles found</Text>
          <Text style={[styles.emptySubtitle, { color: theme.primary }]}>
            {profiles.length === 0 
              ? "Start building by adding your first profile"
              : "Try adjusting your search or filter"
            }
          </Text>
          <TouchableOpacity 
            style={[
              styles.addButton, 
              { backgroundColor: theme.secondary },
              (!user?.isPro && profiles.length >= 5) && { opacity: 0.5 }
            ]} 
            onPress={handleAddPress}
            disabled={!user?.isPro && profiles.length >= 5}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>
              {!user?.isPro && profiles.length >= 5 ? 'Upgrade for More' : 'Add Profile'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProfiles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ProfileCard
              profile={item}
              onPress={() => handleProfileSelect(item)}
              onDelete={handleProfileDelete}
              theme={theme}
            />
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedFilter={selectedFilter}
        selectedTagFilter={selectedTagFilter}
        onFilterSelect={setSelectedFilter}
        onTagFilterSelect={setSelectedTagFilter}
        relationshipTypes={relationshipTypes}
        tagTypes={tagTypes}
        theme={theme}
      />

      <ListSelectorModal
        visible={showListSelector}
        onClose={() => setShowListSelector(false)}
        currentSelection={currentListType}
        onSelect={handleListSelect}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  listContainer: {
    paddingTop: 12,
    paddingBottom: 20,
  },
});