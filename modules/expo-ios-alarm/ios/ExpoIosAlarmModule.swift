import ExpoModulesCore
import AlarmKit

public class ExpoIosAlarmModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ExpoIosAlarm")

        AsyncFunction("requestAlarmPermission") { () -> Bool in
            guard #available(iOS 26.0, *) else { return false }
            
            let state = AlarmManager.shared.authorizationState
            switch state {
            case .authorized:
                return true
            case .notDetermined:
                do {
                    let result = try await AlarmManager.shared.requestAuthorization()
                    return result == .authorized
                } catch {
                    return false
                }
            default:
                return false
            }
        }

        AsyncFunction("triggerNativeAlarm") { (stationName: String) in
            guard #available(iOS 26.0, *) else {
                print("AlarmKitはiOS 26以上で利用可能です")
                return
            }
            
            let alarmManager = AlarmManager()
            let alarmID = "treala-arrival-alarm"
            
            let secondaryButton = AlarmPresentation.Alert.SecondaryButton(
                title: "あと5分",
                behavior: .countdown
            )
            
            let alert = AlarmPresentation.Alert(
                title: "まもなく \(stationName) です！",
                secondaryButton: secondaryButton,
                secondaryButtonBehavior: .countdown
            )
            
            let presentation = AlarmPresentation(alert: alert)
            let attributes = AlarmAttributes(
                presentation: presentation,
                tintColor: .systemBlue
            )
            
            let configuration = AlarmManager.AlarmConfiguration.timer(
                duration: 1,
                attributes: attributes
            )
            
            do {
                _ = try await alarmManager.schedule(
                    id: alarmID,
                    configuration: configuration
                )
            } catch {
                print("アラームのスケジュールに失敗しました: \(error)")
            }
        }
        
        AsyncFunction("stopNativeAlarm") { () in
            guard #available(iOS 26.0, *) else { return }
            let alarmManager = AlarmManager()
            do {
                try await alarmManager.removeAlarm(id: "treala-arrival-alarm")
            } catch {
                print("アラームのキャンセルに失敗しました: \(error)")
            }
        }
    }
}
