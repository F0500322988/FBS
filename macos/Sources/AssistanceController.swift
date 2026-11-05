import AppKit
import ApplicationServices
import Carbon

@MainActor final class AssistanceController: NSObject {
    private let host: RuntimeHost
    private var timer: Timer?, window: NSWindow?, label = NSTextField(wrappingLabelWithString: ""), approveButton: NSButton!, stopButton: NSButton!
    private var id: String?, approved = false, activeMode = false, busy = false, stopped = false, sequence = 0, closed: [String] = []
    private var deadline: TimeInterval = 0, hardEnd: TimeInterval = 0
    private var now: TimeInterval { ProcessInfo.processInfo.systemUptime }
    init(_ host: RuntimeHost) { self.host = host; super.init(); timer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: true) { [weak self] _ in Task { @MainActor in self?.tick() } } }
    private var indicatorVisible: Bool {
        guard activeMode, let w = window, w.isVisible, !w.isMiniaturized, !NSApp.isHidden, w.occlusionState.contains(.visible), let button = stopButton, !button.isHidden else { return false }
        let rect = w.convertToScreen(button.convert(button.bounds, to: nil)); return NSScreen.screens.contains { $0.visibleFrame.contains(rect) }
    }
    private func available() -> Bool {
        guard AXIsProcessTrusted(), !IsSecureEventInputEnabled(), let app = NSWorkspace.shared.frontmostApplication, app.bundleIdentifier != "com.apple.loginwindow" else { return false }
        return true
    }
    private func neutralInput() -> Bool {
        let flags = CGEventSource.flagsState(.combinedSessionState)
        return flags.intersection([.maskShift, .maskControl, .maskAlternate, .maskCommand]).isEmpty && !CGEventSource.buttonState(.combinedSessionState, button: .left) && !CGEventSource.buttonState(.combinedSessionState, button: .right)
    }
    private func post(_ body: [String: Any], completion: @escaping (Bool) -> Void = { _ in }) { host.get("/assist/local", body: body) { result in if case .success = result { completion(true) } else { completion(false) } } }
    @objc private func localStop() { let old = id; if let id = old { closed.append(id); if closed.count > 100 { closed.removeFirst() } }; id = nil; approved = false; activeMode = false; sequence = 0; deadline = 0; window?.close(); window = nil; if let old = old { post(["action":"stop", "sessionId":old]) } }
    func stopCurrent() { localStop() }
    func stop() { stopped = true; timer?.invalidate(); timer = nil; localStop() }
    @objc private func approve() {
        guard !busy, let current = id, now < deadline else { return }
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
        guard AXIsProcessTrustedWithOptions(options) else { label.stringValue = "امنح التطبيق إذن تسهيلات الاستخدام في إعدادات النظام، ثم شارك الشاشة واضغط موافقة مجددًا. لم تُمنح الموافقة للمعلم."; return }
        guard available() else { return }; busy = true; approved = true
        post(["action":"approve", "sessionId":current]) { [weak self] ok in guard let self = self else { return }; self.busy = false; guard self.id == current else { return }; if !ok { self.localStop() } }
    }
    private func show(_ teacher: [String: Any]) {
        let w = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 570, height: 310), styleMask: [.titled], backing: .buffered, defer: false); w.isReleasedWhenClosed = false; w.title = "FBS Classroom — طلب تحكم بموافقتك"; w.level = .floating; w.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        let stack = NSStackView(); stack.orientation = .vertical; stack.spacing = 15; stack.alignment = .centerX
        label = NSTextField(wrappingLabelWithString: "المعلم يطلب تحريك المؤشر والنقر والتمرير وكتابة النص والمفاتيح والاختصارات.\nشارك الشاشة كاملة من تطبيق الطالب، ثم وافق واختر البرنامج الذي سيستقبل النص. يمكنك الإيقاف دائمًا.\n" + (teacher["host"] as? String ?? "") + "\nSHA256: " + (teacher["fingerprint"] as? String ?? "")); label.alignment = .center; label.widthAnchor.constraint(equalToConstant: 530).isActive = true
        approveButton = NSButton(title: "أوافق على التحكم", target: self, action: #selector(approve)); let end = NSButton(title: "رفض / إيقاف المساعدة", target: self, action: #selector(localStop)); stopButton = end
        stack.addArrangedSubview(label); stack.addArrangedSubview(approveButton); stack.addArrangedSubview(end); stack.translatesAutoresizingMaskIntoConstraints = false; w.contentView!.addSubview(stack)
        NSLayoutConstraint.activate([stack.centerXAnchor.constraint(equalTo: w.contentView!.centerXAnchor), stack.centerYAnchor.constraint(equalTo: w.contentView!.centerYAnchor)]); window = w; w.center(); w.makeKeyAndOrderFront(nil)
    }
    private static let keyCodes: [String: CGKeyCode] = ["A":0,"S":1,"D":2,"F":3,"H":4,"G":5,"Z":6,"X":7,"C":8,"V":9,"B":11,"Q":12,"W":13,"E":14,"R":15,"Y":16,"T":17,"1":18,"2":19,"3":20,"4":21,"6":22,"5":23,"9":25,"7":26,"8":28,"0":29,"O":31,"U":32,"I":34,"P":35,"Enter":36,"L":37,"J":38,"K":40,"N":45,"M":46,"Tab":48,"Space":49,"Backspace":51,"Escape":53,"F1":122,"F2":120,"F3":99,"F4":118,"F5":96,"F6":97,"F7":98,"F8":100,"F9":101,"F10":109,"F11":103,"F12":111,"Home":115,"PageUp":116,"Delete":117,"End":119,"PageDown":121,"ArrowLeft":123,"ArrowRight":124,"ArrowDown":125,"ArrowUp":126]
    private func sendKey(_ code: CGKeyCode, _ flags: CGEventFlags) -> Bool {
        guard let down = CGEvent(keyboardEventSource: nil, virtualKey: code, keyDown: true), let up = CGEvent(keyboardEventSource: nil, virtualKey: code, keyDown: false) else { return false }
        down.flags = flags; up.flags = []; down.post(tap: .cghidEventTap); up.post(tap: .cghidEventTap); return true
    }
    private func requestLock() {
        localStop()
        let alert = NSAlert(); alert.messageText = "تأكيد قفل حساب macOS"; alert.informativeText = "يطلب المعلم قفل الحساب. يتوقف التحكم؛ فتح القفل يحتاج كلمة مرور حسابك. هل تريد قفله الآن؟"; alert.addButton(withTitle: "إلغاء"); alert.addButton(withTitle: "قفل الحساب")
        guard alert.runModal() == .alertSecondButtonReturn, available(), neutralInput() else { return }
        // Apple's Lock Screen shortcut. Submission is not proof that the OS completed the lock.
        _ = sendKey(12, [.maskControl, .maskCommand])
    }
    private func execute(_ c: [String: Any]) -> Bool {
        guard available(), neutralInput(), NSWorkspace.shared.frontmostApplication?.processIdentifier != getpid(), let type = c["type"] as? String else { return false }
        if type == "click" {
            guard let button = c["button"] as? String, ["left","right","double"].contains(button), let point = CGEvent(source: nil)?.location else { return false }
            let right = button == "right"
            for index in 1...(button == "double" ? 2 : 1) {
                guard let down = CGEvent(mouseEventSource: nil, mouseType: right ? .rightMouseDown : .leftMouseDown, mouseCursorPosition: point, mouseButton: right ? .right : .left), let up = CGEvent(mouseEventSource: nil, mouseType: right ? .rightMouseUp : .leftMouseUp, mouseCursorPosition: point, mouseButton: right ? .right : .left) else { return false }
                down.setIntegerValueField(.mouseEventClickState, value: Int64(index)); up.setIntegerValueField(.mouseEventClickState, value: Int64(index)); down.flags = []; up.flags = []; down.post(tap: .cghidEventTap); up.post(tap: .cghidEventTap)
            }; return true
        }
        if type == "drag" {
            guard let dx = c["dx"] as? Int, let dy = c["dy"] as? Int, (-500...500).contains(dx), (-500...500).contains(dy), dx != 0 || dy != 0, let point = CGEvent(source: nil)?.location,
                let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: point, mouseButton: .left),
                let move = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDragged, mouseCursorPosition: CGPoint(x: point.x + CGFloat(dx), y: point.y + CGFloat(dy)), mouseButton: .left),
                let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: CGPoint(x: point.x + CGFloat(dx), y: point.y + CGFloat(dy)), mouseButton: .left) else { return false }
            for event in [down, move, up] { event.flags = []; event.post(tap: .cghidEventTap) }; return true
        }
        if type == "scroll" {
            guard let steps = c["steps"] as? Int, (-5...5).contains(steps), steps != 0, let event = CGEvent(scrollWheelEvent2Source: nil, units: .line, wheelCount: 1, wheel1: Int32(steps), wheel2: 0, wheel3: 0) else { return false }; event.flags = []; event.post(tap: .cghidEventTap); return true
        }
        if type == "key" {
            guard let key = c["key"] as? String, let code = Self.keyCodes[key], let mods = c["modifiers"] as? [String], mods.count <= 2, Set(mods).count == mods.count, mods.allSatisfy({ ["primary","shift","alt"].contains($0) }) else { return false }
            var flags = CGEventFlags(); for m in mods { flags.insert(m == "primary" ? .maskCommand : m == "shift" ? .maskShift : .maskAlternate) }; return sendKey(code, flags)
        }
        if type == "move" {
            guard let dx = c["dx"] as? Int, let dy = c["dy"] as? Int, (-100...100).contains(dx), (-100...100).contains(dy), dx != 0 || dy != 0, let current = CGEvent(source: nil)?.location else { return false }
            var displays = [CGDirectDisplayID](repeating: 0, count: 16), count: UInt32 = 0
            guard CGGetActiveDisplayList(16, &displays, &count) == .success, count > 0 else { return false }
            let bounds = displays.prefix(Int(count)).map { CGDisplayBounds($0) }.reduce(CGRect.null) { $0.union($1) }
            let point = CGPoint(x: max(bounds.minX, min(bounds.maxX - 1, current.x + CGFloat(dx))), y: max(bounds.minY, min(bounds.maxY - 1, current.y + CGFloat(dy))))
            guard let event = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: point, mouseButton: .left) else { return false }; event.flags = []; event.post(tap: .cghidEventTap); return true
        }
        guard type == "text", let text = c["text"] as? String, !text.isEmpty, text.utf16.count <= 80, !text.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) || (0x200b...0x200f).contains($0.value) || (0x2028...0x202e).contains($0.value) || (0x2066...0x2069).contains($0.value) }) else { return false }
        for scalar in text.unicodeScalars {
            guard available(), neutralInput(), let down = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: true), let up = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: false) else { return false }
            let chars = Array(String(scalar).utf16); down.keyboardSetUnicodeString(stringLength: chars.count, unicodeString: chars); up.keyboardSetUnicodeString(stringLength: chars.count, unicodeString: chars); down.flags = []; up.flags = []; down.post(tap: .cghidEventTap); up.post(tap: .cghidEventTap)
        }; return true
    }
    private func tick() {
        if id != nil && (now >= deadline || now >= hardEnd || activeMode && !indicatorVisible) { localStop() }
        guard !stopped, !busy else { return }; busy = true
        host.get("/assist/local") { [weak self] result in
            guard let self = self else { return }; self.busy = false; guard !self.stopped else { return }
            guard case .success(let data) = result, data["supported"] as? Bool == true, let s = data["session"] as? [String: Any], let current = s["sessionId"] as? String, UUID(uuidString: current) != nil, !self.closed.contains(current), let remaining = s["remainingMs"] as? Int, (1...6000).contains(remaining), let status = s["status"] as? String, ["requested","active"].contains(status) else { self.localStop(); return }
            if self.id != current { self.localStop(); self.id = current; self.hardEnd = self.now + 120; self.show(data["teacher"] as? [String: Any] ?? [:]) }
            self.deadline = min(self.now + Double(remaining)/1000, self.hardEnd)
            let sharing = data["sharingFresh"] as? Bool == true
            self.approveButton.isEnabled = sharing && !self.approved
            if self.approved && (!sharing || s["locallyApproved"] as? Bool != true || !self.available()) { self.localStop(); return }
            guard status == "active", self.approved else { return }
            if !self.activeMode { self.activeMode = true; self.approveButton.isHidden = true; self.label.stringValue = "تحكم نشط بموافقتك — المؤشر والنقر ولوحة المفاتيح\nاختر البرنامج الذي سيستقبل النص وشارك الشاشة باستمرار.\nيمكنك الإيقاف بالزر أدناه. تنتهي بعد دقيقتين أو انقطاع الاتصال." }
            guard self.indicatorVisible else { self.localStop(); return }
            for c in s["commands"] as? [[String: Any]] ?? [] {
                guard let n = c["sequence"] as? Int, n > self.sequence, self.now < self.deadline else { continue }; self.sequence = n
                if c["type"] as? String == "lock", s["desktopControl"] as? Bool == true { self.requestLock(); return }
                let legacy = ["move","text"].contains(c["type"] as? String ?? "")
                let submitted = (legacy || s["desktopControl"] as? Bool == true) && self.execute(c); self.post(["action":"receipt","sessionId":current,"sequence":n,"state":submitted ? "submitted":"rejected"])
                if !submitted { self.localStop(); break }
            }
        }
    }
}
