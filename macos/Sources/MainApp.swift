import AppKit

@MainActor final class ClassroomApp: NSObject, NSApplicationDelegate {
    private var settingsWindow: NSWindow?, dashboard: StudentDashboardView?
    private var window: NSWindow!, role = ClassroomRole.student
    private var config: ConnectionConfig!, host = RuntimeHost(), messages: MessagesWindow?, broadcast: BroadcastWindow?, filesWindow: FilesWindow?
    private let key = NSSecureTextField(), password = NSSecureTextField(), address = NSTextField(), port = NSTextField(), pin = NSTextField(), device = NSTextField()
    private let discovery = NSButton(checkboxWithTitle: "اكتشاف المعلم تلقائيًا داخل الشبكة", target: nil, action: nil)
    private let state = NSTextField(wrappingLabelWithString: "التحكم يحتاج موافقتك؛ يمكنك إيقافه في أي وقت")
    private let connection = NSTextField(wrappingLabelWithString: "")
    private let startButton = NSButton(title: "حفظ الإعداد وتشغيل البرنامج", target: nil, action: nil)
    private let filesButton = NSButton(title: "ملفات المعلم — حفظ بموافقتك", target: nil, action: nil)
    private let messageButton = NSButton(title: "رسائل المعلم", target: nil, action: nil), viewButton = NSButton(title: "عرض شاشة المعلم", target: nil, action: nil), shareButton = NSButton(title: "مشاركة شاشة الطالب بموافقته", target: nil, action: nil)
    private var power: PowerController?
    private var assistance: AssistanceController?
    private var screenPause: ScreenPauseController?
    private var loaded = false, pollTimer: Timer?
    func applicationDidFinishLaunching(_ notification: Notification) {
        guard let value = Bundle.main.object(forInfoDictionaryKey: "FBSRole") as? String, let parsed = ClassroomRole(rawValue: value) else { showError(ConfigurationError.invalid("دور التطبيق غير صالح")); NSApp.terminate(nil); return }; role = parsed
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 720, height: role == .teacher ? 580 : 820), styleMask: [.titled, .closable, .miniaturizable], backing: .buffered, defer: false)
        window.title = "FBS Classroom — " + (role == .teacher ? "المعلم" : "الطالب") + " — macOS Preview"
        window.isReleasedWhenClosed = false
        window.backgroundColor = NSColor(calibratedRed: 0.94, green: 0.96, blue: 1, alpha: 1)
        let stack = NSStackView(); stack.orientation = .vertical; stack.alignment = .trailing; stack.spacing = 8
        let title = NSTextField(labelWithString: "🎓 FBS Classroom — macOS / iMac"); title.font = .boldSystemFont(ofSize: 22); stack.addArrangedSubview(title)
        func field(_ label: String, _ input: NSTextField) { let text = NSTextField(labelWithString: label); text.alignment = .right; stack.addArrangedSubview(text); stack.addArrangedSubview(input); input.widthAnchor.constraint(equalToConstant: 670).isActive = true; input.font = .systemFont(ofSize: 15) }
        field("مفتاح المعمل المشترك — من 3 إلى 8 أرقام", key)
        if role == .teacher { field("كلمة مرور لوحة المعلم — من 3 إلى 8 أرقام", password) }
        else {
            field("اسم الجهاز بالإنجليزية", device); stack.addArrangedSubview(discovery)
            field("عنوان المعلم IP أو اسم الجهاز", address); field("منفذ المعلم", port); field("بصمة شهادة المعلم SHA-256 — 64 رمزًا", pin)
        }
        startButton.target = self; startButton.action = #selector(start); stack.addArrangedSubview(startButton)
        stack.addArrangedSubview(NSButton(title: "فتح أدوات تهيئة المعمل M184", target: self, action: #selector(openSetupTools)))
        let stop = NSButton(title: "إيقاف التطبيق محليًا", target: self, action: #selector(stopHost)); stack.addArrangedSubview(stop)
        if role == .teacher { stack.addArrangedSubview(NSButton(title: "فتح لوحة المعلم", target: self, action: #selector(openTeacher))) }
        else {
            filesButton.target = self; filesButton.action = #selector(openFiles); messageButton.target = self; messageButton.action = #selector(openMessages); viewButton.target = self; viewButton.action = #selector(openBroadcast); shareButton.target = self; shareButton.action = #selector(openShare)
            for button in [messageButton, viewButton, shareButton, filesButton] { button.isEnabled = false; stack.addArrangedSubview(button) }
        }
        connection.isSelectable = true; connection.alignment = .right; state.alignment = .right
        stack.addArrangedSubview(connection); stack.addArrangedSubview(state)
        stack.translatesAutoresizingMaskIntoConstraints = false; window.contentView!.addSubview(stack)
        NSLayoutConstraint.activate([stack.leadingAnchor.constraint(equalTo: window.contentView!.leadingAnchor, constant: 25), stack.trailingAnchor.constraint(equalTo: window.contentView!.trailingAnchor, constant: -25), stack.topAnchor.constraint(equalTo: window.contentView!.topAnchor, constant: 20)])
        host.status = { [weak self] message in self?.state.stringValue = message }
        host.ready = { [weak self] url in
            guard let self = self else { return }
            if self.role == .teacher { NSWorkspace.shared.open(url) } else { self.screenPause?.stop(); self.screenPause = ScreenPauseController(self.host); self.assistance?.stop(); self.assistance = AssistanceController(self.host); self.messageButton.isEnabled = true; self.viewButton.isEnabled = true; self.shareButton.isEnabled = true; self.filesButton.isEnabled = true; self.broadcast?.stop(); self.broadcast = BroadcastWindow(self.host); self.power?.stop(); self.power = PowerController(self.host) }
        }
        do { config = try PlatformServices.load(role) ?? ConnectionConfig(role: role, pairingKey: ""); loaded = true; key.stringValue = config.pairingKey; password.stringValue = config.teacherPassword; address.stringValue = config.teacherHost; port.stringValue = String(config.teacherPort); pin.stringValue = config.fingerprint; device.stringValue = config.deviceName; discovery.state = config.discovery ? .on : .off }
        catch { startButton.isEnabled = false; showError(error) }
        pollTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            Task { @MainActor in
            guard let self = self, self.role == .student, self.host.process?.isRunning == true else { return }
            self.host.get("/status/local") { [weak self] result in guard let self = self else { return };if case .success(let value) = result { self.dashboard?.update(value) } else { self.dashboard?.disconnect() } }
            self.host.get("/control/local") { [weak self] result in
                guard let self = self else { return }
                if case .success(let json) = result { self.messageButton.title = "رسائل المعلم (\(json["unreadMessages"] as? Int ?? 0) غير مقروءة)"; self.viewButton.title = json["broadcastAvailable"] as? Bool == true ? "● شاشة المعلم متاحة — فتح العرض" : "عرض شاشة المعلم" }
            }
            }
        }
        let menu = NSMenu(), item = NSMenuItem(); menu.addItem(item); let appMenu = NSMenu(); appMenu.addItem(withTitle: "إنهاء FBS Classroom", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"); item.submenu = appMenu
        let editItem = NSMenuItem(), editMenu = NSMenu(title: "تحرير")
        for (title, action, key) in [("قص", #selector(NSText.cut(_:)), "x"), ("نسخ", #selector(NSText.copy(_:)), "c"), ("لصق", #selector(NSText.paste(_:)), "v"), ("تحديد الكل", #selector(NSText.selectAll(_:)), "a")] {
            editMenu.addItem(withTitle: title, action: action, keyEquivalent: key)
        }
        editItem.submenu = editMenu; menu.addItem(editItem); NSApp.mainMenu = menu
        if role == .student {
            let configurationView = window.contentView!; window.contentView = NSView(frame:window.contentView!.bounds); let preferences = NSWindow(contentRect:NSRect(x:0,y:0,width:720,height:min(820,NSScreen.main?.visibleFrame.height ?? 900)-80),styleMask:[.titled,.closable,.miniaturizable],backing:.buffered,defer:false);preferences.isReleasedWhenClosed = false;preferences.title = "FBS Classroom — إعدادات الطالب";let scroll=NSScrollView();scroll.hasVerticalScroller=true;scroll.autohidesScrollers=true;configurationView.setFrameSize(NSSize(width:720,height:820));scroll.documentView=configurationView;preferences.contentView=scroll; settingsWindow = preferences
            window.setContentSize(NSSize(width:340,height:422)); let dashboard = StudentDashboardView(frame:NSRect(x:0,y:0,width:340,height:422));self.dashboard = dashboard;dashboard.settingsAction = { [weak self] in self?.settingsWindow?.center();self?.settingsWindow?.makeKeyAndOrderFront(nil) };dashboard.stopAction = { [weak self] in self?.assistance?.stopCurrent() };window.contentView = dashboard
            if loaded { do { try config.validate();start() } catch { DispatchQueue.main.async { preferences.center();preferences.makeKeyAndOrderFront(nil) } } }
        }
        window.center(); window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
    }
    @objc private func openSetupTools() {
        guard let folder = Bundle.main.resourceURL?.appendingPathComponent("SetupKit"), FileManager.default.fileExists(atPath:folder.path) else { showError(ConfigurationError.invalid("أدوات التهيئة غير موجودة في هذه الحزمة"));return }
        NSWorkspace.shared.open(folder)
    }
    @objc private func start() {
        guard loaded, host.process == nil else { return }
        do {
            let updated = ConnectionConfig(role: role, pairingKey: key.stringValue == config.pairingKey ? config.pairingKey : CredentialPolicy.normalize(key.stringValue), teacherPassword: password.stringValue == config.teacherPassword ? config.teacherPassword : CredentialPolicy.normalize(password.stringValue), teacherHost: address.stringValue, teacherPort: Int(port.stringValue) ?? 0, fingerprint: pin.stringValue, discovery: discovery.state == .on, deviceName: device.stringValue)
            if updated.pairingKey != config.pairingKey && !CredentialPolicy.isPin(updated.pairingKey) {
                throw ConfigurationError.invalid("مفتاح المعمل يجب أن يتكون من 3 إلى 8 أرقام")
            }
            if role == .teacher && updated.teacherPassword != config.teacherPassword && !CredentialPolicy.isPin(updated.teacherPassword) {
                throw ConfigurationError.invalid("كلمة المرور يجب أن تتكون من 3 إلى 8 أرقام")
            }
            try updated.validate(); try PlatformServices.save(updated); config = updated
            let fingerprint = try host.start(updated)
            if let fingerprint = fingerprint { connection.stringValue = "عنوان الشبكة: \(PlatformServices.ipv4())\nالمنفذ: 4180\nبصمة المعلم: \(fingerprint)" }
            else { connection.stringValue = "اسم الجهاز: \(updated.deviceName) — مشاركة الشاشة والرسائل تتطلب اعتماد المعلم" }
        } catch { showError(error) }
    }
    @objc private func stopHost() { power?.stop(); power = nil; screenPause?.stop(); screenPause = nil; assistance?.stop(); assistance = nil; host.stop(); dashboard?.disconnect(); messages?.window.close(); broadcast?.stop(); broadcast = nil; filesWindow?.window.close(); for button in [messageButton, viewButton, shareButton, filesButton] { button.isEnabled = false }; state.stringValue = "توقف التطبيق محليًا — التحكم غير مفعّل" }
    @objc private func openTeacher() { if let url = host.baseURL, host.process?.isRunning == true { NSWorkspace.shared.open(url) } }
    @objc private func openFiles() { if filesWindow == nil || filesWindow!.isClosed { filesWindow = FilesWindow(host) }; filesWindow?.show() }
    @objc private func openMessages() { if messages == nil || messages!.isClosed { messages = MessagesWindow(host) }; messages?.show() }
    @objc private func openBroadcast() { if broadcast == nil || broadcast!.isClosed { broadcast = BroadcastWindow(host) }; broadcast?.show() }
    @objc private func openShare() { if let url = host.baseURL { NSWorkspace.shared.open(url) } }
    private func showError(_ error: Error) { let alert = NSAlert(); alert.messageText = "FBS Classroom"; alert.informativeText = error.localizedDescription; alert.runModal() }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification: Notification) { pollTimer?.invalidate(); power?.stop(); broadcast?.stop(); screenPause?.stop(); assistance?.stop(); host.stop() }
}
@main @MainActor struct Main {
    static func main() {
        if CommandLine.arguments.contains("--self-check") {
            do { try RuntimeHost.selfCheck(); exit(0) } catch { fputs("Bundle self-check failed: \(error.localizedDescription)\n", stderr); exit(1) }
        }
        let app = NSApplication.shared; app.setActivationPolicy(.regular); let delegate = ClassroomApp(); app.delegate = delegate
        withExtendedLifetime(delegate) { app.run() }
    }
}
