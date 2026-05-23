import ExpoModulesCore
import AlarmKit
import ActivityKit
import UserNotifications

public class IosAlarmModule: Module {
  private var currentActivity: Any?

  public func definition() -> ModuleDefinition {
    Name("IosAlarm")

    AsyncFunction("requestAlarmPermission") { () -> Bool in
      do {
        try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
        try await AlarmManager.shared.requestAuthorization()
        return true
      } catch {
        print("AlarmKit or Notification authorization failed: \(error)")
        return false
      }
    }

    AsyncFunction("triggerNativeAlarm") { (stationName: String) in
      do {
        let countdown = Alarm.CountdownDuration(preAlert: 1)
        let attributes = AlarmPresentation.FullScreen(title: "まもなく \(stationName) です！")
        let config = AlarmConfiguration(countdownDuration: countdown, attributes: attributes)
        try await AlarmManager.shared.schedule(id: UUID().uuidString, configuration: config)
      } catch {
        print("Failed to schedule AlarmKit alarm: \(error)")
      }

      if #available(iOS 16.1, *) {
        if let activity = self.currentActivity as? Activity<TrainAlarmWidgetAttributes> {
          let state = TrainAlarmWidgetAttributes.ContentState(distance: 0)
          let alertConfig = AlertConfiguration(title: "アラーム", body: "まもなく \(stationName) です！", sound: .default)
          await activity.update(using: state, alertConfiguration: alertConfig)
        }
      }

      // Fallback standard notification to ensure it rings/vibrates even if AlarmKit fails or is restricted
      let content = UNMutableNotificationContent()
      content.title = "まもなく \(stationName) です！"
      content.body = "目的地に接近しました"
      content.sound = .default
      let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
      try? await UNUserNotificationCenter.current().add(request)
    }

    Function("stopNativeAlarm") {
      // System alarm handles stopping via the "停止" button on the UI, but this stub remains for JS compatibility.
    }

    Function("startLiveActivity") { (stationName: String) in
      if #available(iOS 16.1, *) {
        self.startLiveActivity(stationName: stationName)
      }
    }

    Function("updateLiveActivity") { (distance: Double) in
      if #available(iOS 16.1, *) {
        self.updateLiveActivity(distance: distance)
      }
    }

    Function("stopLiveActivity") {
      if #available(iOS 16.1, *) {
        self.stopLiveActivity()
      }
    }
  }

  @available(iOS 16.1, *)
  private func startLiveActivity(stationName: String) {
    let attributes = TrainAlarmWidgetAttributes(stationName: stationName)
    let state = TrainAlarmWidgetAttributes.ContentState(distance: 9999) // Initial far distance
    
    do {
      let activity = try Activity<TrainAlarmWidgetAttributes>.request(
        attributes: attributes,
        contentState: state,
        pushType: nil
      )
      self.currentActivity = activity
    } catch {
      print("Failed to start Live Activity: \(error)")
    }
  }

  @available(iOS 16.1, *)
  private func updateLiveActivity(distance: Double) {
    guard let activity = self.currentActivity as? Activity<TrainAlarmWidgetAttributes> else { return }
    let state = TrainAlarmWidgetAttributes.ContentState(distance: distance)
    Task {
      await activity.update(using: state)
    }
  }

  @available(iOS 16.1, *)
  private func stopLiveActivity() {
    guard let activity = self.currentActivity as? Activity<TrainAlarmWidgetAttributes> else { return }
    let state = activity.contentState
    Task {
      await activity.end(using: state, dismissalPolicy: .immediate)
      self.currentActivity = nil
    }
  }
}
