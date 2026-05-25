import ExpoModulesCore
import AlarmKit
import SwiftUI
import os
import UserNotifications

// アラームのメタデータ（Zenn記事の MyAlarmMetadata に相当）
@available(iOS 26.0, *)
nonisolated public struct AlarmData: AlarmMetadata {
    public let alarmID: String
    public let stationName: String
    public init(alarmID: String, stationName: String) {
        self.alarmID = alarmID
        self.stationName = stationName
    }
}

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
            typealias AlarmConfiguration = AlarmManager.AlarmConfiguration<AlarmData>

            let id = UUID()
            self.activeAlarmID = id
            let duration = Alarm.CountdownDuration(preAlert: 1, postAlert: 300)
            let customMetadata = AlarmData(alarmID: id.uuidString, stationName: stationName)

            // WWDC2025 Session 230 (5:43) のパターンに準拠
            // 停止ボタン1つだけ
            let stopButton = AlarmButton(
                text: "停止する",
                textColor: .white,
                systemImageName: "stop.circle"
            )

            let alertPresentation = AlarmPresentation.Alert(
                title: "まもなく \(stationName) です",
                stopButton: stopButton
            )

            let attributes = AlarmAttributes<AlarmData>(
                presentation: AlarmPresentation(alert: alertPresentation),
                metadata: customMetadata,
                tintColor: Color.orange
            )

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
            let soundName = UNNotificationSoundName("silent.wav")
            let silentSound = UNNotificationSound(named: soundName)
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
                    try AlarmManager.shared.cancel(id: id)
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
