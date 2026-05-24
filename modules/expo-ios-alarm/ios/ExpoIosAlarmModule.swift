import ExpoModulesCore
import AlarmKit
import SwiftUI // Color等を使用するため

// メタデータ用の構造体
struct AlarmData: AlarmMetadata {}

public class ExpoIosAlarmModule: Module {
    private var activeAlarmID: UUID?

    public func definition() -> ModuleDefinition {
        Name("ExpoIosAlarm")

        // 1. アクセス許可のリクエスト
        AsyncFunction("requestAlarmPermission") { () -> Bool in
            do {
                _ = try await AlarmManager.shared.requestAuthorization()
                return AlarmManager.shared.authorizationState == .authorized
            } catch {
                return false
            }
        }

        // 2. カウントダウン型アラームのセット（即時発火用）
        AsyncFunction("triggerNativeAlarm") { (stationName: String) in
            let id = UUID()
            self.activeAlarmID = id
            
            // 1秒後に鳴らし、スヌーズは5分(300秒)に設定
            let duration = Alarm.CountdownDuration(preAlert: 1, postAlert: 300)
            
            // 停止ボタンのカスタマイズ
            let stopButton = AlarmButton(
                text: "停止",
                textColor: .white,
                systemImageName: "stop.circle"
            )
            
            // アラート画面のテキスト設定
            let alertPresentation = AlarmPresentation.Alert(
                title: "まもなく \(stationName) です！",
                stopButton: stopButton
            )
            
            // デザインの設定
            let attributes = AlarmAttributes<AlarmData>(
                presentation: AlarmPresentation(alert: alertPresentation),
                tintColor: .green
            )
            
            typealias AlarmConfiguration = AlarmManager.AlarmConfiguration<AlarmData>
            let alarmConfiguration = AlarmConfiguration(
                countdownDuration: duration,
                attributes: attributes
            )
            
            do {
                try await AlarmManager.shared.schedule(id: id, configuration: alarmConfiguration)
                print("アラームをセットしました")
            } catch {
                print("アラームのセットに失敗しました: \(error)")
            }
        }

        // 3. アラームの解除
        AsyncFunction("stopNativeAlarm") { () in
            if let id = self.activeAlarmID {
                do {
                    try await AlarmManager.shared.removeAlarm(id: id)
                    self.activeAlarmID = nil
                    print("アラームを解除しました")
                } catch {
                    print("アラームの解除に失敗しました: \(error)")
                }
            }
        }
    }
}

