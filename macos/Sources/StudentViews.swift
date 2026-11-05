import AppKit

@MainActor final class MessagesWindow: NSObject, NSWindowDelegate {
    let window: NSWindow
    private let host: RuntimeHost
    private let choices = NSPopUpButton(frame: .zero, pullsDown: false)
    private let text = NSTextView()
    private let state = NSTextField(wrappingLabelWithString: "انتظار الرسائل...")
    private var messages = [[String: Any]](), timer: Timer?, busy = false, closed = false
    private let readButton = NSButton(title: "تأكيد قراءة الرسالة", target: nil, action: nil)
    init(_ host: RuntimeHost) {
        self.host = host; window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 640, height: 430), styleMask: [.titled, .closable, .resizable, .miniaturizable], backing: .buffered, defer: false)
        super.init(); window.title = "FBS Classroom — رسائل المعلم"; window.delegate = self; window.isReleasedWhenClosed = false
        let scroll = NSScrollView(); scroll.documentView = text; scroll.hasVerticalScroller = true; text.isEditable = false; text.isSelectable = true; text.isRichText = false; text.isAutomaticLinkDetectionEnabled = false; text.font = .systemFont(ofSize: 16)
        choices.target = self; choices.action = #selector(selectMessage); readButton.target = self; readButton.action = #selector(markRead)
        let stack = NSStackView(views: [choices, scroll, readButton, state]); stack.orientation = .vertical; stack.spacing = 12
        Self.install(stack, into: window); scroll.heightAnchor.constraint(greaterThanOrEqualToConstant: 230).isActive = true
        choices.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true; scroll.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
        timer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in Task { @MainActor in self?.refresh() } }; refresh()
    }
    var isClosed: Bool { closed }
    func show() { if window.isMiniaturized { window.deminiaturize(nil) }; window.center(); window.makeKeyAndOrderFront(nil) }
    private func refresh() {
        if busy || closed { return }; busy = true
        let selected = choices.indexOfSelectedItem; let previous = messages.indices.contains(selected) ? messages[selected]["id"] as? String : nil
        host.get("/messages/local") { [weak self] result in
            guard let self = self, !self.closed else { return }; self.busy = false
            switch result {
            case .success(let json):
                self.messages = json["messages"] as? [[String: Any]] ?? []; self.choices.removeAllItems()
                for (index, item) in self.messages.enumerated() { let title = String((item["text"] as? String ?? "").replacingOccurrences(of: "\n", with: " ").prefix(60)); self.choices.addItem(withTitle: String(index + 1) + " · " + (item["read"] as? Bool == true ? "✓ " : "● ") + title) }
                if let index = self.messages.firstIndex(where: { $0["id"] as? String == previous }) { self.choices.selectItem(at: index) }
                self.state.stringValue = self.messages.isEmpty ? "لا توجد رسائل نشطة؛ تنتهي الصلاحية بعد خمس دقائق" : "لا يُرسل تأكيد القراءة إلا عند الضغط على زر التأكيد"
            case .failure: self.messages = []; self.choices.removeAllItems(); self.state.stringValue = "تعذر الاتصال بالوكيل؛ أُخفيت الرسائل السابقة"
            }
            self.selectMessage()
        }
    }
    @objc private func selectMessage() {
        let index = choices.indexOfSelectedItem; guard messages.indices.contains(index) else { text.string = ""; readButton.isEnabled = false; return }
        text.string = messages[index]["text"] as? String ?? ""; readButton.isEnabled = !busy && messages[index]["read"] as? Bool != true
    }
    @objc private func markRead() {
        let index = choices.indexOfSelectedItem; guard !busy, messages.indices.contains(index), let id = messages[index]["id"] as? String else { return }
        busy = true; readButton.isEnabled = false
        host.get("/messages/local/read", body: ["id": id]) { [weak self] result in
            guard let self = self, !self.closed else { return }; self.busy = false
            if case .failure = result { self.state.stringValue = "تعذر تسجيل القراءة" }; self.refresh()
        }
    }
    func windowWillClose(_ notification: Notification) { closed = true; timer?.invalidate(); text.string = ""; messages = [] }
    static func install(_ stack: NSStackView, into window: NSWindow) {
        let view = window.contentView!; stack.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(stack)
        NSLayoutConstraint.activate([stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20), stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20), stack.topAnchor.constraint(equalTo: view.topAnchor, constant: 20), stack.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -20)])
    }
}
@MainActor final class BroadcastWindow: NSObject, NSWindowDelegate {
    let window: NSWindow
    private let host: RuntimeHost
    private var displays: [(NSWindow, NSImageView)] = []
    private var timer: Timer?, busy = false, closed = false, lastAt: TimeInterval = 0, lastSession = "", lastSequence = 0
    init(_ host: RuntimeHost) {
        self.host = host; window = NSWindow(contentRect: .zero, styleMask: [.borderless], backing: .buffered, defer: false)
        super.init()
        for (index, screen) in NSScreen.screens.prefix(16).enumerated() {
            let w = index == 0 ? window : NSWindow(contentRect: screen.frame, styleMask: [.borderless], backing: .buffered, defer: false)
            w.setFrame(screen.frame, display: false); w.isReleasedWhenClosed = false; w.delegate = self; w.title = "FBS Classroom — شاشة المعلم"; w.level = .screenSaver; w.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]; w.backgroundColor = .black
            let image = NSImageView(); image.imageScaling = .scaleProportionallyUpOrDown; image.translatesAutoresizingMaskIntoConstraints = false; w.contentView!.addSubview(image)
            NSLayoutConstraint.activate([image.leadingAnchor.constraint(equalTo: w.contentView!.leadingAnchor), image.trailingAnchor.constraint(equalTo: w.contentView!.trailingAnchor), image.topAnchor.constraint(equalTo: w.contentView!.topAnchor), image.bottomAnchor.constraint(equalTo: w.contentView!.bottomAnchor)])
            displays.append((w,image))
        }
        timer = Timer.scheduledTimer(withTimeInterval: 0.7, repeats: true) { [weak self] _ in Task { @MainActor in self?.refresh() } }; refresh()
    }
    var isClosed: Bool { closed }
    func show() { refresh() }
    private func hide() { displays.forEach { $0.1.image = nil; $0.0.orderOut(nil) } }
    func stop() { closed = true; timer?.invalidate(); timer = nil; hide(); displays.forEach { $0.0.close() }; displays.removeAll() }
    func windowShouldClose(_ sender: NSWindow) -> Bool { closed }
    private func refresh() {
        if closed { return }
        if ProcessInfo.processInfo.systemUptime - lastAt >= 4 { hide() }
        if busy { return }; busy = true
        host.get("/broadcast/local") { [weak self] result in
            guard let self = self, !self.closed else { return }; self.busy = false
            guard case .success(let json) = result, let frame = json["broadcast"] as? [String: Any], let id = frame["sessionId"] as? String, let sequence = frame["sequence"] as? Int,
                let jpeg = frame["jpeg"] as? String, jpeg.hasPrefix("data:image/jpeg;base64,"), jpeg.count <= 170000 else { self.hide(); return }
            if id == self.lastSession && sequence <= self.lastSequence { return }
            guard let data = Data(base64Encoded: String(jpeg.dropFirst(23))), let decoded = NSImage(data: data), decoded.size.width <= 1280, decoded.size.height <= 720 else { self.hide(); return }
            self.lastAt = ProcessInfo.processInfo.systemUptime; self.lastSession = id; self.lastSequence = sequence
            for (w,image) in self.displays { image.image = decoded; if w.isMiniaturized { w.deminiaturize(nil) }; w.orderFrontRegardless() }
        }
    }
}
