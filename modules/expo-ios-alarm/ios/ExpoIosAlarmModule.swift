import ExpoModulesCore
import AlarmKit
import SwiftUI
import os
import UserNotifications

@available(iOS 26.0, *)
struct AlarmData: AlarmMetadata {}

@available(iOS 26.0, *)
public class ExpoIosAlarmModule: Module {
    private var activeAlarmID: UUID?
    private let logger = Logger(subsystem: "com.ui.applab.alarm", category: "AlarmKit")

    public func definition() -> ModuleDefinition {
        Name("ExpoIosAlarm")

        AsyncFunction("requestAlarmPermission") { () -> Bool in
            do {
                _ = try await AlarmManager.shared.requestAuthorization()
                return AlarmManager.shared.authorizationState == .authorized
            } catch {
                self.logger.error("Failed to request alarm authorization: \(error.localizedDescription)")
                return false
            }
        }

        AsyncFunction("triggerNativeAlarm") { (stationName: String) in
            let id = UUID()
            self.activeAlarmID = id
            
            let duration = Alarm.CountdownDuration(preAlert: 1, postAlert: 300)
            
            let stopButton = AlarmButton(
                text: "停止",
                textColor: .white,
                systemImageName: "stop.circle"
            )
            
            let alertPresentation = AlarmPresentation.Alert(
                title: "まもなく \(stationName) です！",
                stopButton: stopButton
            )
            
            let attributes = AlarmAttributes<AlarmData>(
                presentation: AlarmPresentation(alert: alertPresentation),
                tintColor: Color.green
            )
            
            typealias AlarmConfiguration = AlarmManager.AlarmConfiguration<AlarmData>
            let soundName = UNNotificationSoundName("silent.wav")
            let silentSound = UNNotificationSound(named: soundName)
            
            let alarmConfiguration = AlarmConfiguration(
                countdownDuration: duration,
                attributes: attributes,
                sound: .named("silent.wav")
            )
            
            do {
                try await AlarmManager.shared.schedule(id: id, configuration: alarmConfiguration)
                self.logger.info("アラームをセットしました: \(stationName, privacy: .public)")
            } catch {
                self.logger.error("アラームのセットに失敗しました: \(error.localizedDescription)")
            }
            
            // フォアグラウンド向けのフォールバックとしてローカル通知も併用
            let content = UNMutableNotificationContent()
            content.title = "まもなく \(stationName) です！"
            content.sound = silentSound
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
            let request = UNNotificationRequest(identifier: id.uuidString + "_notification", content: content, trigger: trigger)
            
            do {
                try await UNUserNotificationCenter.current().add(request)
                self.logger.info("フォアグラウンド用通知をセットしました")
            } catch {
                self.logger.error("フォアグラウンド用通知のセットに失敗しました: \(error.localizedDescription)")
            }
        }

        AsyncFunction("stopNativeAlarm") { () in
            if let id = self.activeAlarmID {
                do {
                    try await AlarmManager.shared.cancel(id: id)
                    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id.uuidString + "_notification"])
                    self.activeAlarmID = nil
                    self.logger.info("アラームを解除しました")
                } catch {
                    self.logger.error("アラームの解除に失敗しました: \(error.localizedDescription)")
                }
            }
        }
    }
}
