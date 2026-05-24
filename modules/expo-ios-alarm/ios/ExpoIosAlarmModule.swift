import ExpoModulesCore
import AlarmKit
import SwiftUI

struct AlarmData: AlarmMetadata {}

public class ExpoIosAlarmModule: Module {
    private var activeAlarmID: UUID?

    public func definition() -> ModuleDefinition {
        Name("ExpoIosAlarm")

        AsyncFunction("requestAlarmPermission") { () -> Bool in
            do {
                _ = try await AlarmManager.shared.requestAuthorization()
                return AlarmManager.shared.authorizationState == .authorized
            } catch {
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

        AsyncFunction("stopNativeAlarm") { () in
            if let id = self.activeAlarmID {
                do {
                    try await AlarmManager.shared.remove(id: id)
                    self.activeAlarmID = nil
                    print("アラームを解除しました")
                } catch {
                    print("アラームの解除に失敗しました: \(error)")
                }
            }
        }
    }
}
