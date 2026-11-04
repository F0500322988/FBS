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
    private let host: RuntimeHost, image = NSImageView(), state = NSTextField(wrappingLabelWithString: "انتظار شاشة المعلم...")
    private var timer: Timer?, busy = false, closed = false, lastAt = Date.distantPast, lastSession = "", lastSequence = 0
    init(_ host: RuntimeHost) {
        self.host = host; window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1000, height: 650), styleMask: [.titled, .closable, .resizable, .miniaturizable], backing: .buffered, defer: false)
        super.init(); window.title = "FBS Classroom — عرض شاشة المعلم"; window.delegate = self; window.isReleasedWhenClosed = false
        image.imageScaling = .scaleProportionallyUpOrDown
        let stack = NSStackView(views: [image, state]); stack.orientation = .vertical; stack.spacing = 10; MessagesWindow.install(stack, into: window)
        image.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true; image.heightAnchor.constraint(greaterThanOrEqualToConstant: 250).isActive = true
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in Task { @MainActor in self?.refresh() } }; refresh()
    }
    var isClosed: Bool { closed }
    func show() { if window.isMiniaturized { window.deminiaturize(nil) }; window.center(); window.makeKeyAndOrderFront(nil) }
    private func refresh() {
        if closed { return }; if Date().timeIntervalSince(lastAt) >= 4 { image.image = nil; state.stringValue = "لا توجد صورة حديثة" }
        if busy { return }; busy = true
        host.get("/broadcast/local") { [weak self] result in
            guard let self = self, !self.closed else { return }; self.busy = false
            guard case .success(let json) = result, let frame = json["broadcast"] as? [String: Any], let id = frame["sessionId"] as? String, let sequence = frame["sequence"] as? Int,
                  let jpeg = frame["jpeg"] as? String, jpeg.hasPrefix("data:image/jpeg;base64,"), jpeg.count <= 170000 else { self.image.image = nil; self.state.stringValue = "توقفت المشاركة أو لا توجد مشاركة موجهة لهذا الجهاز"; return }
            if id == self.lastSession && sequence <= self.lastSequence { return }
            guard let data = Data(base64Encoded: String(jpeg.dropFirst(23))), let decoded = NSImage(data: data), decoded.size.width <= 1280, decoded.size.height <= 720 else { self.image.image = nil; self.state.stringValue = "صورة غير صالحة"; return }
            self.image.image = decoded; self.lastAt = Date(); self.lastSession = id; self.lastSequence = sequence
            self.state.stringValue = "شاشة المعلم — لقطات متتابعة بلا صوت؛ يمكنك إغلاق العرض في أي وقت"
        }
    }
    func windowWillClose(_ notification: Notification) { closed = true; timer?.invalidate(); image.image = nil }
}
