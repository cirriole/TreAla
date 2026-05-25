import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppTheme, ThemePreference } from '@/contexts/ThemeContext';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#000000' : '#F2F2F7',
    text: isDark ? '#FFFFFF' : '#000000',
    cardBackground: isDark ? '#1C1C1E' : '#FFFFFF',
    border: isDark ? '#38383A' : '#E5E5EA',
    tint: '#5492A3',
    textSecondary: isDark ? '#EBEBF599' : '#3C3C4399',
  };

  const { themePreference, setThemePreference } = useAppTheme();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const themeOptions: { label: string; value: ThemePreference }[] = [
    { label: 'システムに従う', value: 'system' },
    { label: 'ライトモード', value: 'light' },
    { label: 'ダークモード', value: 'dark' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Theme Settings */}
      <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>テーマ設定</Text>
        <View style={styles.optionsContainer}>
          {themeOptions.map((option) => {
            const isSelected = themePreference === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  isSelected && { backgroundColor: theme.tint }
                ]}
                onPress={() => setThemePreference(option.value)}
              >
                <Text style={[
                  styles.optionText,
                  { color: isSelected ? '#fff' : theme.text }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Version Info */}
      <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>アプリ情報</Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.text }]}>バージョン</Text>
          <Text style={[styles.infoValue, { color: theme.textSecondary }]}>{appVersion} (Test)</Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  optionText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
  },
  infoValue: {
    fontSize: 16,
  },
});
