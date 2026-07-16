import WidgetKit
import SwiftUI

// 필타임 홈화면 위젯 — 오늘 채운 시간 + 이번 주 누적 + 연속일.
// 데이터: App Group shared UserDefaults (앱의 src/lib/widget.ts가 기록).
// 브랜드: 다크 캔버스(#000214) + 블루(#007AFF) — 앱 잔디/카드와 동일 톤.

private let appGroup = "group.kr.codeatlas.worktimer"

struct FilltimeEntry: TimelineEntry {
    let date: Date
    let todayText: String
    let weekText: String
    let streakText: String
}

private func loadEntry() -> FilltimeEntry {
    let d = UserDefaults(suiteName: appGroup)
    return FilltimeEntry(
        date: Date(),
        todayText: d?.string(forKey: "todayText") ?? "0분",
        weekText: d?.string(forKey: "weekText") ?? "",
        streakText: d?.string(forKey: "streakText") ?? ""
    )
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> FilltimeEntry {
        FilltimeEntry(date: Date(), todayText: "2시간 41분", weekText: "이번 주 12시간", streakText: "191일 연속")
    }

    func getSnapshot(in context: Context, completion: @escaping (FilltimeEntry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : loadEntry())
    }

    // 앱이 reloadWidget으로 즉시 갱신 + 백스톱으로 30분마다 재요청
    func getTimeline(in context: Context, completion: @escaping (Timeline<FilltimeEntry>) -> Void) {
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
        completion(Timeline(entries: [loadEntry()], policy: .after(next)))
    }
}

private let brandBlue = Color(red: 0.0, green: 0.478, blue: 1.0)
private let canvas = Color(red: 0.0, green: 0.008, blue: 0.078) // #000214
private let subText = Color(red: 0.557, green: 0.608, blue: 0.710) // #8E9BB5

struct FilltimeWidgetView: View {
    var entry: FilltimeEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("필타임")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(brandBlue)
                Spacer()
                if !entry.streakText.isEmpty {
                    Text(entry.streakText)
                        .font(.system(size: 11))
                        .foregroundColor(subText)
                }
            }
            Spacer()
            Text(entry.todayText)
                .font(.system(size: 28, weight: .heavy, design: .rounded))
                .foregroundColor(.white)
                .minimumScaleFactor(0.5)
                .lineLimit(1)
            if !entry.weekText.isEmpty {
                Text(entry.weekText)
                    .font(.system(size: 12))
                    .foregroundColor(subText)
                    .padding(.top, 2)
            }
        }
        .containerBackground(for: .widget) { canvas }
    }
}

struct FilltimeWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "FilltimeWidget", provider: Provider()) { entry in
            FilltimeWidgetView(entry: entry)
        }
        .configurationDisplayName("오늘의 몰입")
        .description("오늘 채운 시간과 이번 주 누적을 보여줍니다.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct FilltimeWidgetBundle: WidgetBundle {
    var body: some Widget {
        FilltimeWidget()
    }
}
