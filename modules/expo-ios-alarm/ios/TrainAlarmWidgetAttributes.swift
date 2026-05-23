import ActivityKit
import Foundation

public struct TrainAlarmWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var distance: Double
    }
    
    public var stationName: String
    
    public init(stationName: String) {
        self.stationName = stationName
    }
}
