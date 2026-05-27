import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents
import AlarmKit
import UserNotifications

@available(iOS 26.1, *)
nonisolated public struct AlarmData: AlarmMetadata {
    public let alarmID: String
    public let stationName: String
    public init(alarmID: String, stationName: String) {
        self.alarmID = alarmID
        self.stationName = stationName
    }
}

@available(iOS 26.1, *)
public struct StopIntent: LiveActivityIntent {
    public static var title: LocalizedStringResource = "Stop Alarm"
    public static var description = IntentDescription("Stops the active alarm.")
    public static var openAppWhenRun = false
    
    @Parameter(title: "alarmID")
    public var alarmID: String
    
    public init(alarmID: String) {
        self.alarmID = alarmID
    }
    
    public init() {
        self.alarmID = ""
    }
    
    public func perform() async throws -> some IntentResult {
        if let uuid = UUID(uuidString: alarmID) {
            try? AlarmManager.shared.cancel(id: uuid)
            
            #if canImport(UserNotifications)
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [alarmID + "_notification"])
            #endif
        }
        return .result()
    }
}

@available(iOS 26.1, *)
struct WidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: AlarmAttributes<AlarmData>.self) { context in
            switch context.state.mode {
            case .countdown:
                countdownView(context)
            case .paused:
                pausedView(context)
            case .alert:
                alertView(context)
            @unknown default:
                Text("Unknown state")
            }
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text("🔔")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("到着")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.attributes.metadata?.stationName ?? "")
                }
            } compactLeading: {
                Text("🔔")
            } compactTrailing: {
                Text("着")
            } minimal: {
                Text("🔔")
            }
        }
    }
    
    func countdownView(_ context: ActivityViewContext<AlarmAttributes<AlarmData>>) -> some View {
        VStack {
            Text("まもなく \(context.attributes.metadata?.stationName ?? "") です！")
                .font(.custom("Dela Gothic One", size: 18))
        }
    }
    
    func pausedView(_ context: ActivityViewContext<AlarmAttributes<AlarmData>>) -> some View {
        Text("Paused")
    }
    
    func alertView(_ context: ActivityViewContext<AlarmAttributes<AlarmData>>) -> some View {
        VStack(spacing: 12) {
            Text("🔔 まもなく \(context.attributes.metadata?.stationName ?? "") です！")
                .font(.headline)
                .foregroundColor(.black)
            
            if let id = context.attributes.metadata?.alarmID {
                Button(intent: StopIntent(alarmID: id)) {
                    HStack {
                        Image(systemName: "xmark.square.fill")
                        Text("停止する")
                            .fontWeight(.bold)
                    }
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding()
                    // インダストリアルな四角化
                    .background(Color(red: 0.42, green: 0.75, blue: 0.84))
                    .border(Color.black, width: 2)
                    .cornerRadius(0)
                }
                .buttonStyle(.plain)
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(0)
        .border(Color.black, width: 4)
    }
}
