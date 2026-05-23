import { requireNativeModule } from 'expo-modules-core';

export const ExpoIosAlarm = requireNativeModule('ExpoIosAlarm');

export async function requestAlarmPermission(): Promise<boolean> {
  if (ExpoIosAlarm && ExpoIosAlarm.requestAlarmPermission) {
    return await ExpoIosAlarm.requestAlarmPermission();
  }
  return false;
}

export async function triggerNativeAlarm(stationName: string) {
  if (ExpoIosAlarm && ExpoIosAlarm.triggerNativeAlarm) {
    await ExpoIosAlarm.triggerNativeAlarm(stationName);
  }
}

export function stopNativeAlarm() {
  if (ExpoIosAlarm && ExpoIosAlarm.stopNativeAlarm) {
    ExpoIosAlarm.stopNativeAlarm();
  }
}

export function startLiveActivity(stationName: string) {
  if (ExpoIosAlarm && ExpoIosAlarm.startLiveActivity) {
    ExpoIosAlarm.startLiveActivity(stationName);
  }
}

export function updateLiveActivity(distance: number) {
  if (ExpoIosAlarm && ExpoIosAlarm.updateLiveActivity) {
    ExpoIosAlarm.updateLiveActivity(distance);
  }
}

export function stopLiveActivity() {
  if (ExpoIosAlarm && ExpoIosAlarm.stopLiveActivity) {
    ExpoIosAlarm.stopLiveActivity();
  }
}
