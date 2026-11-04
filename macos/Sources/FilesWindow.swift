import AppKit
import CryptoKit
@MainActor final class FilesWindow: NSObject, NSWindowDelegate {
    let window: NSWindow
    private let host: RuntimeHost
    private let choices = NSPopUpButton(frame: .zero, pullsDown: false), save = NSButton(title: "حفظ الملف المحدد...", target: nil, action: nil)
    private let state = NSTextField(wrappingLabelWithString: "الملفات لا تُفتح تلقائيًا؛ اختر مكان الحفظ بنفسك")
    private var files = [[String: Any]](), timer: Timer?, busy = false, closed = false
    init(_ host: RuntimeHost) {
        self.host = host; window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 640, height: 240), styleMask: [.titled, .closable, .miniaturizable], backing: .buffered, defer: false)
        super.init(); window.title = "FBS Classroom — ملفات المعلم"; window.delegate = self; window.isReleasedWhenClosed = false
        save.target = self; save.action = #selector(saveFile)
        let stack = NSStackView(views: [choices, save, state]); stack.orientation = .vertical; stack.spacing = 15; MessagesWindow.install(stack, into: window)
        choices.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
        timer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in Task { @MainActor in self?.refresh() } }; refresh()
    }
    var isClosed: Bool { closed }
    func show() { if window.isMiniaturized { window.deminiaturize(nil) }; window.center(); window.makeKeyAndOrderFront(nil) }
    private func refresh() {
        if closed || busy { return }; busy = true
        let index = choices.indexOfSelectedItem, previous = files.indices.contains(choices.indexOfSelectedItem) ? files[index]["id"] as? String : nil
        host.get("/files/local") { [weak self] result in
            guard let self = self, !self.closed else { return }; self.busy = false
            if case .success(let json) = result { self.files = json["files"] as? [[String: Any]] ?? [] } else { self.files = []; self.state.stringValue = "تعذر تحديث الملفات؛ أُخفيت القائمة السابقة" }
            self.choices.removeAllItems()
            for (i, file) in self.files.enumerated() { self.choices.addItem(withTitle: String(i + 1) + " · " + (file["name"] as? String ?? "") + " — " + String((file["size"] as? Int ?? 0) / 1024) + " KB") }
            if let selected = self.files.firstIndex(where: { $0["id"] as? String == previous }) { self.choices.selectItem(at: selected) }; self.save.isEnabled = !self.files.isEmpty
        }
    }
    @objc private func saveFile() {
        let index = choices.indexOfSelectedItem
        guard !busy, files.indices.contains(index), let id = files[index]["id"] as? String, let name = files[index]["name"] as? String, let size = files[index]["size"] as? Int, let hash = files[index]["sha256"] as? String else { return }
        let panel = NSSavePanel(); panel.nameFieldStringValue = name; panel.title = "حفظ ملف المعلم — لا يتم فتحه تلقائيًا"
        guard panel.runModal() == .OK, let destination = panel.url else { return }; busy = true; save.isEnabled = false; state.stringValue = "جارٍ نقل الملف والتحقق من سلامته..."
        host.downloadFile(id) { [weak self] result in
            guard let self = self, !self.closed else { return }
            do {
                let data = try result.get()
                try ReceivedFileWriter.write(data, expectedSize: size, hash: hash, destination: destination)
                self.state.stringValue = "حُفظ الملف بعد التحقق؛ لم يُفتح تلقائيًا"
                self.host.get("/files/local/saved", body: ["id": id]) { [weak self] receipt in
                    guard let self = self, !self.closed else { return }; self.busy = false; self.save.isEnabled = !self.files.isEmpty
                    if case .failure = receipt { self.state.stringValue = "حُفظ الملف؛ تعذر التأكد من تسجيل الحفظ لدى المعلم" }
                }
            } catch { self.busy = false; self.save.isEnabled = !self.files.isEmpty; self.state.stringValue = "تعذر استلام الملف أو حفظه؛ تحقق من الاتصال ومكان الحفظ" }
        }
    }
    func windowWillClose(_ notification: Notification) { closed = true; timer?.invalidate(); files = [] }
}
