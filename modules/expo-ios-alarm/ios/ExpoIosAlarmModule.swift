import ExpoModulesCore
import AlarmKit

public class ExpoIosAlarmModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ExpoIosAlarm")

        AsyncFunction("requestAlarmPermission") { () -> Bool in
            guard #available(iOS 17.1, *) else { return false }
            
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
            guard #available(iOS 17.1, *) else {
                print("AlarmKitはiOS 17.1以上で利用可能です")
                return
            }
            
            let alarmID = "treala-arrival-alarm"
            
            // シンプルなアラート設定
            let alert = AlarmPresentation.Alert(
                title: "到着しました",
                subtitle: stationName
            )
            
            let presentation = AlarmPresentation(alert: alert)
            
            let attributes = AlarmAttributes(
                presentation: presentation,
                tintColor: .systemGreen
            )
            
            // アラームスケジュール：全画面表示で駅到着を通知
            let configuration = AlarmManager.AlarmConfiguration.timer(
                duration: 60, // 60秒間のアラーム
                attributes: attributes
            )
            
            do {
                // 既存のアラームがあれば削除
                try await AlarmManager.shared.removeAlarm(id: alarmID)
            } catch {
                // 削除できなくても続行
            }
            
            do {
                _ = try await AlarmManager.shared.schedule(
                    id: alarmID,
                    configuration: configuration
                )
                print("駅到着アラームを発動しました: \(stationName)")
            } catch {
                print("アラームのスケジュールに失敗しました: \(error)")
            }
        }
        
        AsyncFunction("stopNativeAlarm") { () in
            guard #available(iOS 17.1, *) else { return }
            do {
                try await AlarmManager.shared.removeAlarm(id: "treala-arrival-alarm")
            } catch {
                print("アラームのキャンセルに失敗しました: \(error)")
            }
        }
    }
}
