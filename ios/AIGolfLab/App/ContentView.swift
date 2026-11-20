import SwiftUI

struct ContentView: View {
    @StateObject private var bridge = WebBridge()

    var body: some View {
        WebContainer(bridge: bridge)
            .ignoresSafeArea(edges: .bottom)
            .background(Color(red: 0.055, green: 0.353, blue: 0.247).ignoresSafeArea(edges: .top))
            .fullScreenCover(item: $bridge.liveRequest) { req in
                LiveMeasureView(request: req) { shots in
                    bridge.finishLive(shots: shots)
                }
            }
    }
}
