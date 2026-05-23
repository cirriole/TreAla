import ExpoModulesCore
import AlarmKit
import ActivityKit

public class IosAlarmModule: Module {
  private var currentActivity: Any?

  public func definition() -> ModuleDefinition {
    Name("IosAlarm")

    AsyncFunction("requestAlarmPermission") { () -> Bool in
      do {
        try await AlarmManager.shared.requestAuthorization()
        return true
      } catch {
        print("AlarmKit authorization failed: \(error)")
        return false
      }
    }

    Function("triggerNativeAlarm") { (stationName: String) in
      Task {
        do {
          let countdown = Alarm.CountdownDuration(preAlert: 1)
          let attributes = AlarmPresentation.Alert(title: "まもなく \(stationName) です！", primaryButtonTitle: "停止")
          let config = AlarmConfiguration(countdownDuration: countdown, attributes: attributes)
          try await AlarmManager.shared.schedule(id: UUID().uuidString, configuration: config)
        } catch {
          print("Failed to schedule AlarmKit alarm: \(error)")
        }
      }
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
