import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, FlatList, SafeAreaView, Alert, TextInput, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { triggerNativeAlarm, stopNativeAlarm, startLiveActivity, updateLiveActivity, stopLiveActivity, requestAlarmPermission } from '../modules/ios-alarm';

const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

type Station = {
  id: string;
  name: string;
  line: string;
  prefecture: string;
  latitude: number;
  longitude: number;
};

// TODO: TaskManager will be implemented completely in Step 2/4 when native module is ready
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      const location = locations[0];
      
      try {
        const targetStr = await AsyncStorage.getItem('activeAlarmTarget');
        const triggeredStr = await AsyncStorage.getItem('hasTriggeredAlarm');
        
        if (targetStr && triggeredStr !== 'true') {
          const { station, radius } = JSON.parse(targetStr);
          
          // Haversine formula
          const R = 6371e3;
          const lat1 = location.coords.latitude;
          const lon1 = location.coords.longitude;
          const lat2 = station.latitude;
          const lon2 = station.longitude;
          
          const φ1 = (lat1 * Math.PI) / 180;
          const φ2 = (lat2 * Math.PI) / 180;
          const Δφ = ((lat2 - lat1) * Math.PI) / 180;
          const Δλ = ((lon2 - lon1) * Math.PI) / 180;

          const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const dist = R * c;

          // Note: updateLiveActivity can be called from headless JS!
          updateLiveActivity(dist);

          if (dist <= radius) {
            await AsyncStorage.setItem('hasTriggeredAlarm', 'true');
            await triggerNativeAlarm(station.name);
          }
        }
      } catch(e) {
        console.error("Background task error", e);
      }
    }
  }
});

const RADIUS_OPTIONS = [
  { label: '300m', value: 300 },
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
];

export default function Index() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#000000' : '#F2F2F7',
    text: isDark ? '#FFFFFF' : '#000000',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    cardBorder: isDark ? '#38383A' : '#E5E5EA',
    orange: isDark ? '#FF9F0A' : '#FF9500',
    secondaryText: isDark ? '#EBEBF599' : '#3C3C4399',
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Station[]>([]);
  const [favorites, setFavorites] = useState<Station[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [targetStation, setTargetStation] = useState<Station | null>(null);
  const [radius, setRadius] = useState(500);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const hasTriggeredAlarm = useRef<boolean>(false);

  // Load saved target station and favorites
  useEffect(() => {
    AsyncStorage.getItem('favoriteStations_v2').then(data => {
      if (data) {
        const favs = JSON.parse(data);
        setFavorites(favs);
      }
    });
    AsyncStorage.getItem('lastSelectedStation').then(data => {
      if (data) {
        setTargetStation(JSON.parse(data));
      }
    });
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const keyword = searchQuery.trim().replace(/駅$/, '');
    try {
      const res = await fetch(`https://express.heartrails.com/api/json?method=getStations&name=${encodeURIComponent(keyword)}`);
      const data = await res.json();
      if (data.response && data.response.station) {
        const stations: Station[] = data.response.station.map((s: any) => ({
          id: `${s.name}-${s.line}-${s.prefecture}`,
          name: s.name,
          line: s.line,
          prefecture: s.prefecture,
          latitude: s.y,
          longitude: s.x,
        }));
        setSearchResults(stations);
      } else {
        setSearchResults([]);
        Alert.alert("検索結果", "駅が見つかりませんでした。正式名称を入力してください（例：新宿）");
      }
    } catch (e) {
      Alert.alert("エラー", "検索に失敗しました");
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFavorite = async (station: Station) => {
    const isFav = favorites.some(f => f.id === station.id);
    let newFavs;
    if (isFav) {
      newFavs = favorites.filter(f => f.id !== station.id);
    } else {
      newFavs = [...favorites, station];
    }
    setFavorites(newFavs);
    await AsyncStorage.setItem('favoriteStations_v2', JSON.stringify(newFavs));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleStationSelect = async (item: Station) => {
    if (isAlarmActive) return;
    setTargetStation(item);
    await AsyncStorage.setItem('lastSelectedStation', JSON.stringify(item));
  };

  // Haversine formula to calculate distance in meters
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleLocationUpdate = async (lat: number, lon: number) => {
    if (!targetStation) return;
    const dist = getDistance(
      lat,
      lon,
      targetStation.latitude,
      targetStation.longitude
    );
    setDistance(dist);
    updateLiveActivity(dist);

    // If we are within radius, trigger alarm manually
    if (dist <= radius && !hasTriggeredAlarm.current) {
      hasTriggeredAlarm.current = true;
      AsyncStorage.setItem('hasTriggeredAlarm', 'true');
      await triggerNativeAlarm(targetStation.name);
      
      // フォアグラウンド動作時でも AlarmKit が全画面UIを表示するため
      // Alert.alertのフォールバックは使用しません（AlarmKitの表示をブロックしてしまうため）
    }
  };

  const toggleAlarm = async () => {
    if (isAlarmActive) {
      // Stop alarm
      setIsAlarmActive(false);
      setDistance(null);
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      try {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      } catch (e) {
        console.log("Failed to stop background updates (expected in Expo Go)", e);
      }
      await AsyncStorage.removeItem('activeAlarmTarget');
      await AsyncStorage.setItem('hasTriggeredAlarm', 'false');
      hasTriggeredAlarm.current = false;
      stopNativeAlarm();
      stopLiveActivity();
    } else {
      if (!targetStation) return;

      // Start alarm
      hasTriggeredAlarm.current = false;
      await AsyncStorage.setItem('hasTriggeredAlarm', 'false');
      await AsyncStorage.setItem('activeAlarmTarget', JSON.stringify({
        station: targetStation,
        radius: radius
      }));
      
      // Request AlarmKit permissions
      await requestAlarmPermission();

      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      
      let bgStatus = 'undetermined';
      try {
        const res = await Location.requestBackgroundPermissionsAsync();
        bgStatus = res.status;
      } catch (e) {
        console.warn("Background location permission is not available (e.g. in Expo Go). Falling back to foreground only.");
      }

      if (fgStatus !== 'granted') {
        alert('位置情報の権限が必要です。');
        return;
      }

      setIsAlarmActive(true);
      
      // Start location updates if background is available
      if (bgStatus === 'granted') {
        try {
          await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1,
            showsBackgroundLocationIndicator: true, // Crucial for iOS background execution
          });
        } catch (e) {
          console.warn("Background location is not available.", e);
        }
      }

      // Start Live Activity
      startLiveActivity(targetStation.name);

      // Start live watching for UI and Live Activity
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          handleLocationUpdate(location.coords.latitude, location.coords.longitude);
        }
      );
    }
  };

  const renderStationCard = ({ item }: { item: Station }) => {
    const isSelected = targetStation?.id === item.id;
    const isFav = favorites.some(f => f.id === item.id);
    return (
      <TouchableOpacity
        style={[
          styles.card,
          { 
            backgroundColor: theme.card, 
            borderColor: isSelected ? theme.orange : theme.cardBorder,
            borderWidth: isSelected ? 2 : 1
          }
        ]}
        onPress={() => handleStationSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>
              {item.name}
            </Text>
            <Text style={{ fontSize: 12, color: theme.secondaryText, marginTop: 4 }}>
              {item.line} ({item.prefecture})
            </Text>
          </View>
          <TouchableOpacity onPress={() => toggleFavorite(item)} style={{ padding: 8 }}>
            <Ionicons name={isFav ? "star" : "star-outline"} size={24} color={isFav ? theme.orange : theme.secondaryText} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {!isAlarmActive ? (
        <>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>トレアラ</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>寝過ごし防止アラーム</Text>
          </View>

          <View style={styles.content}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>目的駅を選択</Text>
            
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TextInput
                style={[styles.searchInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.cardBorder }]}
                placeholder="駅名を検索（例：品川）"
                placeholderTextColor={theme.secondaryText}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              <TouchableOpacity
                style={[styles.searchButton, { backgroundColor: theme.orange }]}
                onPress={handleSearch}
              >
                <Ionicons name="search" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
              {isSearching ? (
                <ActivityIndicator size="large" color={theme.orange} style={{ marginTop: 40 }} />
              ) : searchQuery.length > 0 && searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  renderItem={renderStationCard}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                />
              ) : searchQuery.length > 0 && searchResults.length === 0 ? (
                <Text style={{ color: theme.secondaryText, textAlign: 'center', marginTop: 40 }}>
                  検索結果がありません
                </Text>
              ) : favorites.length > 0 ? (
                <>
                  <Text style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 8, fontWeight: 'bold' }}>お気に入り</Text>
                  <FlatList
                    data={favorites}
                    keyExtractor={(item) => item.id}
                    renderItem={renderStationCard}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  />
                </>
              ) : (
                <Text style={{ color: theme.secondaryText, textAlign: 'center', marginTop: 40, lineHeight: 22 }}>
                  お気に入りがありません。{'\n'}上の検索バーから駅名を入力して探してください。
                </Text>
              )}
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>アラーム判定半径</Text>
            <View style={styles.segmentContainer}>
              {RADIUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.segmentButton,
                    { 
                      backgroundColor: radius === opt.value ? theme.orange : theme.card,
                      borderColor: theme.cardBorder
                    }
                  ]}
                  onPress={() => setRadius(opt.value)}
                >
                  <Text style={{ 
                    color: radius === opt.value ? '#FFFFFF' : theme.text,
                    fontWeight: radius === opt.value ? 'bold' : 'normal'
                  }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.mainButton, 
                { backgroundColor: targetStation ? theme.orange : theme.cardBorder }
              ]}
              onPress={toggleAlarm}
              disabled={!targetStation}
            >
              <Text style={styles.mainButtonText}>アラームをセット</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          {/* Debug Teleport Button */}
          <TouchableOpacity
            style={{ position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(150,150,150,0.2)', borderRadius: 8 }}
            onPress={() => {
              if (targetStation) handleLocationUpdate(targetStation.latitude, targetStation.longitude);
            }}
          >
            <Text style={{ fontSize: 12, color: theme.text }}>[Test] ﾃﾚﾎﾟｰﾄ</Text>
          </TouchableOpacity>

          <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="radio" size={80} color={theme.orange} style={{ marginBottom: 24 }} />
            <Text style={{ fontSize: 20, color: theme.secondaryText, fontWeight: '600' }}>
              モニタリング中
            </Text>
            <Text style={{ fontSize: 36, fontWeight: '900', color: theme.text, marginTop: 8 }}>
              {targetStation?.name}
            </Text>
            <Text style={{ fontSize: 16, color: theme.secondaryText, marginTop: 4 }}>
              {targetStation?.line}
            </Text>
            
            <View style={[styles.statusCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={{ fontSize: 16, color: theme.secondaryText }}>目的地まで あと</Text>
              <Text style={{ fontSize: 64, fontWeight: '900', color: theme.orange, marginVertical: 8 }}>
                {distance !== null ? `${Math.round(distance)}m` : '計測中...'}
              </Text>
              <Text style={{ fontSize: 14, color: theme.secondaryText }}>
                半径 {radius}m 以内でアラームが鳴ります
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.mainButton, { backgroundColor: '#FF3B30' }]}
              onPress={toggleAlarm}
            >
              <Text style={styles.mainButtonText}>アラームを停止</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 16,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flex: 1,
    minHeight: 180,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segmentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusCard: {
    marginTop: 40,
    width: '100%',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  mainButton: {
    paddingVertical: 20,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
