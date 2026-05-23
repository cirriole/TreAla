import { requireOptionalNativeModule } from 'expo-modules-core';

export const IosAlarm = requireOptionalNativeModule('IosAlarm');

export async function requestAlarmPermission(): Promise<boolean> {
  if (IosAlarm && IosAlarm.requestAlarmPermission) {
    return await IosAlarm.requestAlarmPermission();
  }
  throw new Error("IosAlarm.requestAlarmPermission is not available");
}

export async function triggerNativeAlarm(stationName: string) {
  if (IosAlarm) {
    await IosAlarm.triggerNativeAlarm(stationName);
  } else {
    throw new Error("IosAlarm.triggerNativeAlarm is not available (requires custom iOS dev build)");
  }
}

export function stopNativeAlarm() {
  if (IosAlarm) {
    IosAlarm.stopNativeAlarm();
  }
}

export function startLiveActivity(stationName: string) {
  if (IosAlarm) {
    IosAlarm.startLiveActivity(stationName);
  } else {
    console.warn("IosAlarm.startLiveActivity is not available");
  }
}

export function updateLiveActivity(distance: number) {
  if (IosAlarm) {
    IosAlarm.updateLiveActivity(distance);
  }
}

export function stopLiveActivity() {
  if (IosAlarm) {
    IosAlarm.stopLiveActivity();
  }
}
