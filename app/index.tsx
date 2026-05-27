import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, DotGothic16_400Regular } from '@expo-google-fonts/dotgothic16';
import { DelaGothicOne_400Regular } from '@expo-google-fonts/dela-gothic-one';
import Slider from '@react-native-community/slider';

import { requestAlarmPermission, triggerNativeAlarm, stopNativeAlarm } from '../modules/expo-ios-alarm';
import { useColorScheme } from '@/hooks/use-color-scheme';

const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

type Station = {
  id: string;
  name: string;
  line: string;
  prefecture: string;
  latitude: number;
  longitude: number;
};



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

          // 駅に到着
          if (dist <= radius) {
            await AsyncStorage.setItem('hasTriggeredAlarm', 'true');
            try {
              await triggerNativeAlarm(station.name);
            } catch (err) {
              console.error("Failed to trigger background alarm:", err);
            }
          }
        }
      } catch(e) {
        console.error("Background task error", e);
      }
    }
  }
});

const SquareHamburgerIcon = ({ color }: { color: string }) => {
  return (
    <View style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: 26, height: 18, justifyContent: 'space-between' }}>
        <View style={{ width: '100%', height: 3, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: '100%', height: 3, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: '100%', height: 3, backgroundColor: color, borderRadius: 1 }} />
      </View>
    </View>
  );
};

export default function Index() {
  const [fontsLoaded] = useFonts({
    DotGothic16_400Regular,
    DelaGothicOne_400Regular,
  });
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#000000' : '#F2F2F7',
    text: isDark ? '#FFFFFF' : '#000000',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    cardBorder: isDark ? '#38383A' : '#E5E5EA',
    cyanBlue: '#6BC0D5', // 明るいシアンブルー
    secondaryText: isDark ? '#EBEBF599' : '#3C3C4399',
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Station[]>([]);
  const [favorites, setFavorites] = useState<Station[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [targetStation, setTargetStation] = useState<Station | null>(null);
  const [radius, setRadius] = useState(500);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  
  // Secret command state
  const secretTapCount = useRef(0);
  const secretTapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved target station, radius and favorites
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
    AsyncStorage.getItem('savedRadius').then(data => {
      if (data) {
        setRadius(parseInt(data, 10));
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
    } catch {
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
    if (isMonitoring) return;
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

    // 駅に到着
    if (dist <= radius) {
      try {
        const triggered = await AsyncStorage.getItem('hasTriggeredAlarm');
        if (triggered !== 'true') {
          await AsyncStorage.setItem('hasTriggeredAlarm', 'true');
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await triggerNativeAlarm(targetStation.name);
        }
      } catch (error) {
        console.error("Failed to trigger foreground alarm:", error);
      }
    }
  };

  const toggleMonitoring = async () => {
    if (isMonitoring) {
      // Stop monitoring
      setIsMonitoring(false);
      setDistance(null);
      if (locationSubscription.current) {
        try {
          locationSubscription.current.remove();
        } catch (e) {
          console.log("Failed to remove location subscription safely:", e);
        }
        locationSubscription.current = null;
      }
      try {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      } catch (e) {
        console.log("Failed to stop background updates (expected in Expo Go)", e);
      }
      await AsyncStorage.removeItem('activeAlarmTarget');
      await AsyncStorage.setItem('hasTriggeredAlarm', 'false');
      try {
        await stopNativeAlarm();
      } catch (error) {
        console.error("Failed to stop native alarm:", error);
      }
    } else {
      if (!targetStation) return;

      // Request Alarm permission
      try {
        const hasAlarmPermission = await requestAlarmPermission();
        if (!hasAlarmPermission) {
          Alert.alert("エラー", "アラームの権限がありません！設定から許可してください。");
          return;
        }
      } catch (e) {
        console.error("Failed to request alarm permission:", e);
        Alert.alert("エラー", "アラームの権限リクエストに失敗しました。");
        return;
      }

      await AsyncStorage.setItem('hasTriggeredAlarm', 'false');
      await AsyncStorage.setItem('activeAlarmTarget', JSON.stringify({
        station: targetStation,
        radius: radius
      }));

      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();

      let bgStatus = 'undetermined';
      try {
        const res = await Location.requestBackgroundPermissionsAsync();
        bgStatus = res.status;
      } catch {
        console.warn("Background location permission is not available (e.g. in Expo Go).");
      }

      if (fgStatus !== 'granted') {
        alert('位置情報の権限が必要です。');
        return;
      }

      setIsMonitoring(true);

      if (bgStatus === 'granted') {
        try {
          await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1,
            showsBackgroundLocationIndicator: true,
          });
        } catch (e) {
          console.warn("Background location is not available.", e);
        }
      }

      // Start live watching for UI
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
            borderColor: isSelected ? theme.cyanBlue : theme.cardBorder,
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
            <Ionicons name={isFav ? "star" : "star-outline"} size={24} color={isFav ? theme.cyanBlue : theme.secondaryText} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {!isMonitoring ? (
        <>
          <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View>
              {fontsLoaded ? (
                <MaskedView
                  maskElement={
                    <Text style={{ fontSize: 48, fontFamily: 'DelaGothicOne_400Regular', backgroundColor: 'transparent' }}>
                      トレアラ
                    </Text>
                  }
                >
                  <LinearGradient
                    colors={['#6BC0D5', '#4AA5BD']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={{ fontSize: 48, fontFamily: 'DelaGothicOne_400Regular', opacity: 0 }}>
                      トレアラ
                    </Text>
                  </LinearGradient>
                </MaskedView>
              ) : (
                <Text style={[styles.title, { color: theme.text, fontSize: 48, fontWeight: '900' }]}>トレアラ</Text>
              )}
            </View>
            <Link href="/settings" asChild>
              <TouchableOpacity style={{ padding: 8 }}>
                <SquareHamburgerIcon color={theme.text} />
              </TouchableOpacity>
            </Link>
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
                style={[styles.searchButton, { backgroundColor: theme.cyanBlue }]}
                onPress={handleSearch}
              >
                <Ionicons name="search" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
              {isSearching ? (
                <ActivityIndicator size="large" color={theme.cyanBlue} style={{ marginTop: 40 }} />
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

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24, marginBottom: 0 }]}>判定半径</Text>
              <Text style={{ color: theme.cyanBlue, fontSize: 18, fontWeight: 'bold', marginTop: 24 }}>
                {radius >= 1000 ? `${(radius / 1000).toFixed(1)}km` : `${radius}m`}
              </Text>
            </View>
            <View style={{ marginVertical: 16 }}>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={100}
                maximumValue={3000}
                step={100}
                value={radius}
                onValueChange={(val) => setRadius(val)}
                onSlidingComplete={(val) => {
                  setRadius(val);
                  AsyncStorage.setItem('savedRadius', val.toString());
                }}
                minimumTrackTintColor={theme.cyanBlue}
                maximumTrackTintColor={theme.cardBorder}
                thumbTintColor={theme.cyanBlue}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 12, color: theme.secondaryText }}>100m</Text>
                <Text style={{ fontSize: 12, color: theme.secondaryText }}>3km</Text>
              </View>
              <Text style={{ fontSize: 11, color: theme.secondaryText, marginTop: 12, paddingHorizontal: 4, lineHeight: 16 }}>
                ※地下鉄などでは位置情報が取得できずアラームが発動しないことがあります。(β)
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.mainButton, 
                { backgroundColor: targetStation ? theme.cyanBlue : theme.cardBorder }
              ]}
              onPress={toggleMonitoring}
              disabled={!targetStation}
            >
              <Text style={styles.mainButtonText}>アラームをセット</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          {/* Secret Teleport Trigger */}
          <TouchableOpacity
            style={{ position: 'absolute', top: 40, left: 16, width: 60, height: 60, zIndex: 10 }}
            activeOpacity={1}
            onPress={() => {
              if (!targetStation) return;
              secretTapCount.current += 1;
              if (secretTapTimeout.current) clearTimeout(secretTapTimeout.current);
              
              if (secretTapCount.current >= 10) {
                secretTapCount.current = 0;
                Alert.alert("裏コマンド発動", "目的地にテレポートします", [
                  { 
                    text: "OK", 
                    onPress: () => handleLocationUpdate(targetStation.latitude, targetStation.longitude) 
                  }
                ]);
              } else {
                secretTapTimeout.current = setTimeout(() => {
                  secretTapCount.current = 0;
                }, 1000);
              }
            }}
          />

          <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="radio" size={80} color={theme.cyanBlue} style={{ marginBottom: 24 }} />
            <Text style={{ fontSize: 20, color: theme.secondaryText, fontWeight: '600' }}>
              アラーム待機中
            </Text>
            <Text style={{ fontSize: 36, fontWeight: '900', color: theme.text, marginTop: 8 }}>
              {targetStation?.name}
            </Text>
            <Text style={{ fontSize: 16, color: theme.secondaryText, marginTop: 4 }}>
              {targetStation?.line}
            </Text>
            
            <View style={[styles.statusCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={{ fontSize: 16, color: theme.secondaryText }}>目的地まで あと</Text>
              <Text style={{ fontSize: 64, fontWeight: '900', color: theme.cyanBlue, marginVertical: 8 }}>
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
              onPress={toggleMonitoring}
            >
              <Text style={styles.mainButtonText}>アラームを解除</Text>
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
