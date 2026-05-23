import WidgetKit
import SwiftUI
import ActivityKit

@main
struct TrainAlarmWidgetBundle: WidgetBundle {
    var body: some Widget {
        TrainAlarmWidget()
    }
}

struct TrainAlarmWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TrainAlarmWidgetAttributes.self) { context in
            // Lock screen / Banner UI
            VStack {
                Text(context.attributes.stationName)
                    .font(.headline)
                ProgressView(value: max(0, 1000 - context.state.distance), total: 1000)
                    .tint(.orange)
                    .padding()
                Text("残り: \(String(format: "%.1f", context.state.distance))m")
            }
            .padding()
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded
                DynamicIslandExpandedRegion(.leading) {
                    Text("📍")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(String(format: "%.1f", context.state.distance))m")
                        .foregroundColor(.orange)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.stationName)
                        .font(.headline)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ProgressView(value: max(0, 1000 - context.state.distance), total: 1000)
                        .tint(.orange)
                }
            } compactLeading: {
                Text("📍")
            } compactTrailing: {
                Text("\(String(format: "%.0f", context.state.distance))m")
                    .foregroundColor(.orange)
            } minimal: {
                Text("📍")
            }
        }
    }
}
