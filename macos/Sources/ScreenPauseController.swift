import AppKit

@MainActor final class PausePanel: NSWindow {
    var releaseAction: (() -> Void)?
    override var canBecomeKey: Bool { true }
    override func keyDown(with event: NSEvent) { if event.keyCode == 53 { releaseAction?() } else { super.keyDown(with: event) } }
}
@MainActor final class ScreenPauseController: NSObject {
    private let host: RuntimeHost
    private var timer: Timer?, windows: [PausePanel] = [], current: String?, deadline: TimeInterval = 0, busy = false, stopped = false
    private var dismissed: [String] = []
    init(_ host: RuntimeHost) {
        self.host = host; super.init()
        timer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in Task { @MainActor in self?.tick() } }
    }
    private func hideAll() { current = nil; deadline = 0; windows.forEach { $0.close() }; windows.removeAll() }
    func stop() { stopped = true; timer?.invalidate(); timer = nil; hideAll() }
    private func receipt(_ id: String, _ state: String) { host.get("/pause/local", body: ["sessionId": id, "state": state]) { _ in } }
    @objc private func releaseLocal(_ sender: NSButton) { if sender.identifier?.rawValue == current { releaseCurrent() } }
    private func releaseCurrent() { guard let id = current else { return }; dismissed.append(id); if dismissed.count > 100 { dismissed.removeFirst() }; hideAll(); receipt(id, "released") }
    private func tick() {
        if ProcessInfo.processInfo.systemUptime >= deadline { hideAll() }
        guard !busy, !stopped else { return }; busy = true
        host.get("/pause/local") { [weak self] result in
            guard let self = self else { return }; self.busy = false; guard !self.stopped else { return }
            guard case .success(let data) = result, let pause = data["pause"] as? [String: Any], let id = pause["sessionId"] as? String, UUID(uuidString: id) != nil, let remaining = pause["remainingMs"] as? Int, (1...10000).contains(remaining), !self.dismissed.contains(id) else { self.hideAll(); return }
            let changed = self.current != id
            if changed { self.hideAll() }; self.current = id; self.deadline = ProcessInfo.processInfo.systemUptime + Double(remaining) / 1000
            guard changed else { return }
            for screen in NSScreen.screens.prefix(16) {
                let window = PausePanel(contentRect: screen.frame, styleMask: [.borderless], backing: .buffered, defer: false)
                window.isReleasedWhenClosed = false; window.level = .floating; window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]; window.backgroundColor = NSColor(calibratedRed: 0.06, green: 0.15, blue: 0.33, alpha: 1)
                window.releaseAction = { [weak self] in if self?.current == id { self?.releaseCurrent() } }
                let content = NSStackView(); content.orientation = .vertical; content.spacing = 30; content.alignment = .centerX
                let text = NSTextField(wrappingLabelWithString: "🎓 FBS Classroom\n\nيرجى الانتباه إلى المعلم\nحجب عرض مؤقت ينتهي عند إيقاف المعلم أو انقطاع الاتصال\nEsc أو الزر أدناه لإنهائه محليًا\nهذا ليس قفلًا لحساب macOS")
                text.font = .systemFont(ofSize: 25); text.textColor = .white; text.alignment = .center; text.widthAnchor.constraint(equalToConstant: max(200, min(750, screen.frame.width - 60))).isActive = true
                let button = NSButton(title: "إنهاء حجب العرض محليًا", target: self, action: #selector(releaseLocal(_:))); button.identifier = NSUserInterfaceItemIdentifier(id); button.keyEquivalent = "\u{1b}"
                content.addArrangedSubview(text); content.addArrangedSubview(button); content.translatesAutoresizingMaskIntoConstraints = false; window.contentView!.addSubview(content)
                NSLayoutConstraint.activate([content.centerXAnchor.constraint(equalTo: window.contentView!.centerXAnchor), content.centerYAnchor.constraint(equalTo: window.contentView!.centerYAnchor)])
                self.windows.append(window); window.makeKeyAndOrderFront(nil)
            }
            if !self.windows.isEmpty { NSApp.activate(ignoringOtherApps: true); self.receipt(id, "displayed") }
        }
    }
}
