import { requireNativeModule } from 'expo-modules-core';

const ExpoIosAlarm = requireNativeModule('ExpoIosAlarm');

export async function requestAlarmPermission(): Promise<boolean> {
  return await ExpoIosAlarm.requestAlarmPermission();
}

export async function triggerNativeAlarm(stationName: string): Promise<void> {
  return await ExpoIosAlarm.triggerNativeAlarm(stationName);
}

export async function stopNativeAlarm(): Promise<void> {
  return await ExpoIosAlarm.stopNativeAlarm();
}
