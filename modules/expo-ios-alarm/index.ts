import { requireNativeModule } from 'expo';

const ExpoIosAlarm = requireNativeModule('ExpoIosAlarm');

export async function requestAlarmPermission(): Promise<boolean> {
  return await ExpoIosAlarm.requestAlarmPermission();
}

export async function triggerNativeAlarm(stationName: string): Promise<void> {
  await ExpoIosAlarm.triggerNativeAlarm(stationName);
}

export async function stopNativeAlarm(): Promise<void> {
  await ExpoIosAlarm.stopNativeAlarm();
}
