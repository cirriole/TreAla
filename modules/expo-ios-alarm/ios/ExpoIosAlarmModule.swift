import ExpoModulesCore
#if canImport(AlarmKit)
import AlarmKit
import SwiftUI

@available(iOS 26.0, *)
struct AlarmData: AlarmMetadata {}
#endif

public class ExpoIosAlarmModule: Module {
    private var activeAlarmID: UUID?

    public func definition() -> ModuleDefinition {
        Name("ExpoIosAlarm")

        AsyncFunction("requestAlarmPermission") { () -> Bool in
            #if canImport(AlarmKit)
            guard #available(iOS 26.0, *) else { return false }
            do {
                _ = try await AlarmManager.shared.requestAuthorization()
                return AlarmManager.shared.authorizationState == .authorized
            } catch {
                return false
            }
            #else
            return false
            #endif
        }

        AsyncFunction("triggerNativeAlarm") { (stationName: String) in
            #if canImport(AlarmKit)
            guard #available(iOS 26.0, *) else {
                print("AlarmKit requires iOS 26.0 or newer.")
                return
            }
            
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
            #else
            print("AlarmKit is not available in this build environment.")
            #endif
        }

        AsyncFunction("stopNativeAlarm") { () in
            #if canImport(AlarmKit)
            guard #available(iOS 26.0, *) else { return }
            if let id = self.activeAlarmID {
                do {
                    try await AlarmManager.shared.removeAlarm(id: id)
                    self.activeAlarmID = nil
                    print("アラームを解除しました")
                } catch {
                    print("アラームの解除に失敗しました: \(error)")
                }
            }
            #else
            print("AlarmKit is not available in this build environment.")
            #endif
        }
    }
}
