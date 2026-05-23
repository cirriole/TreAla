import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, FlatList, SafeAreaView } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { triggerNativeAlarm, stopNativeAlarm, startLiveActivity, updateLiveActivity, stopLiveActivity, requestAlarmPermission } from '../modules/ios-alarm';

const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

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
            triggerNativeAlarm(station.name);
          }
        }
      } catch(e) {
        console.error("Background task error", e);
      }
    }
  }
});

const STATIONS = [
  { id: '1', name: '横浜駅', latitude: 35.4658, longitude: 139.6223 },
  { id: '2', name: '菊名駅', latitude: 35.5094, longitude: 139.6309 },
  { id: '3', name: '妙蓮寺駅', latitude: 35.4988, longitude: 139.6322 },
  { id: '4', name: '岸根公園駅', latitude: 35.4957, longitude: 139.6046 },
];

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

  const [targetStation, setTargetStation] = useState(STATIONS[0]);
  const [radius, setRadius] = useState(500);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const hasTriggeredAlarm = useRef<boolean>(false);

  // Load saved target station
  useEffect(() => {
    AsyncStorage.getItem('favoriteStationId').then(id => {
      if (id) {
        const saved = STATIONS.find(s => s.id === id);
        if (saved) setTargetStation(saved);
      }
    });
  }, []);

  const handleStationSelect = async (item: typeof STATIONS[0]) => {
    if (isAlarmActive) return;
    setTargetStation(item);
    await AsyncStorage.setItem('favoriteStationId', item.id);
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

  const handleLocationUpdate = (lat: number, lon: number) => {
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
      triggerNativeAlarm(targetStation.name);
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

  const renderStationCard = ({ item }: { item: typeof STATIONS[0] }) => {
    const isSelected = item.id === targetStation.id;
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
          <Text style={{ fontSize: 24 }}>📍</Text>
          <View style={{ marginLeft: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>
              {item.name}
            </Text>
            <Text style={{ fontSize: 12, color: theme.secondaryText, marginTop: 4 }}>
              Lat: {item.latitude.toFixed(4)}, Lon: {item.longitude.toFixed(4)}
            </Text>
          </View>
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
            <View style={styles.listContainer}>
              <FlatList
                data={STATIONS}
                keyExtractor={(item) => item.id}
                renderItem={renderStationCard}
                showsVerticalScrollIndicator={false}
              />
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
              style={[styles.mainButton, { backgroundColor: theme.orange }]}
              onPress={toggleAlarm}
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
            onPress={() => handleLocationUpdate(targetStation.latitude, targetStation.longitude)}
          >
            <Text style={{ fontSize: 12, color: theme.text }}>[Test] ﾃﾚﾎﾟｰﾄ</Text>
          </TouchableOpacity>

          <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 80, marginBottom: 24 }}>📡</Text>
            <Text style={{ fontSize: 20, color: theme.secondaryText, fontWeight: '600' }}>
              モニタリング中
            </Text>
            <Text style={{ fontSize: 36, fontWeight: '900', color: theme.text, marginTop: 8 }}>
              {targetStation.name}
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
  listContainer: {
    height: 300, // Fixed height for items
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
