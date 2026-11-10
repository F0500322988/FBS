import AppKit
import Darwin

@MainActor final class ClassroomApp: NSObject, NSApplicationDelegate {
    private var teacherDesktop: TeacherDesktopView?
    private var settingsWindow: NSWindow?, dashboard: StudentDashboardView?
    private var window: NSWindow!, role = ClassroomRole.student
    private var config: ConnectionConfig!, host = RuntimeHost(), messages: MessagesWindow?, broadcast: BroadcastWindow?, filesWindow: FilesWindow?
    private var form: ConnectionSettingsForm!
    private var key: NSSecureTextField { form.key }
    private var password: NSSecureTextField { form.password }
    private var address: NSTextField { form.address }
    private var port: NSTextField { form.port }
    private var pin: NSTextField { form.pin }
    private var device: NSTextField { form.device }
    private var discovery: NSButton { form.discovery }
    private var state: NSTextField { form.state }
    private var connection: NSTextField { form.connection }
    private var startButton: NSButton { form.startButton }
    private var filesButton: NSButton { form.filesButton }
    private var messageButton: NSButton { form.messageButton }
    private var viewButton: NSButton { form.viewButton }
    private var shareButton: NSButton { form.shareButton }
    private var power: PowerController?
    private var assistance: AssistanceController?
    private var screenPause: ScreenPauseController?
    private var lastUnreadMessages = 0
    private var notifiedFiles = Set<String>()
    private var loaded = false, pollTimer: Timer?
    private var backgroundStudent: Bool { role == .student && !CommandLine.arguments.contains("--configure") }
    private var agentSmokeCheck: Bool { CommandLine.arguments.contains("--agent-smoke-check") }
    func applicationDidFinishLaunching(_ notification: Notification) {
        guard let value = Bundle.main.object(forInfoDictionaryKey: "FBSRole") as? String, let parsed = ClassroomRole(rawValue: value) else { showError(ConfigurationError.invalid("دور التطبيق غير صالح")); NSApp.terminate(nil); return }; role = parsed
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 720, height: role == .teacher ? 580 : 820), styleMask: [.titled, .closable, .miniaturizable], backing: .buffered, defer: false)
        window.title = "FBS Classroom — " + (role == .teacher ? "المعلم" : "الطالب") + " — macOS Preview"
        window.isReleasedWhenClosed = false
        window.backgroundColor = NSColor(calibratedRed: 0.94, green: 0.96, blue: 1, alpha: 1)
        form = ConnectionSettingsForm(role: role)
        startButton.target = self; startButton.action = #selector(start)
        form.setupButton.target = self; form.setupButton.action = #selector(openSetupTools)
        form.stopButton.target = self; form.stopButton.action = #selector(stopHost)
        form.teacherButton.target = self; form.teacherButton.action = #selector(openTeacher)
        filesButton.target = self; filesButton.action = #selector(openFiles)
        messageButton.target = self; messageButton.action = #selector(openMessages)
        viewButton.target = self; viewButton.action = #selector(openBroadcast)
        shareButton.target = self; shareButton.action = #selector(openShare)
        if role == .teacher {
            let desktop = TeacherDesktopView(); teacherDesktop = desktop
            window.styleMask.insert(.resizable); window.setContentSize(NSSize(width: 1200, height: 800))
            window.contentView = desktop.view
        }
        host.status = { [weak self] message in self?.state.stringValue = message }
        host.ready = { [weak self] url in
            guard let self = self else { return }
            if self.role == .teacher { self.teacherDesktop?.connect(url: url, token: self.host.token) } else { self.screenPause?.stop(); self.screenPause = ScreenPauseController(self.host); self.assistance?.stop(); self.assistance = AssistanceController(self.host); self.messageButton.isEnabled = true; self.viewButton.isEnabled = true; self.shareButton.isEnabled = true; self.filesButton.isEnabled = true; self.broadcast?.stop(); self.broadcast = BroadcastWindow(self.host); self.power?.stop(); self.power = PowerController(self.host) }
        }
        do {
            if let saved = try ((agentSmokeCheck || CommandLine.arguments.contains("--desktop-smoke-check")) ? nil : PlatformServices.load(role, allowInteraction: !backgroundStudent)) { config = saved }
            else if role == .teacher {
                config = ConnectionConfig(role: .teacher, pairingKey: try PlatformServices.randomToken(), teacherPassword: try PlatformServices.randomToken())
                if !CommandLine.arguments.contains("--desktop-smoke-check") { try PlatformServices.save(config) }
            } else { config = ConnectionConfig(role: role, pairingKey: "") }
            loaded = true
            key.stringValue = config.pairingKey; password.stringValue = config.teacherPassword
            address.stringValue = config.teacherHost; port.stringValue = String(config.teacherPort)
            pin.stringValue = config.fingerprint; device.stringValue = config.deviceName; discovery.state = config.discovery ? .on : .off
        }
        catch { startButton.isEnabled = false; showError(error) }
        pollTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            Task { @MainActor in
            guard let self = self, self.role == .student else { return }
            if self.backgroundStudent && self.host.process == nil {
                if !self.agentSmokeCheck, let saved = try? PlatformServices.load(.student, allowInteraction: false) {
                    self.config = saved; self.loaded = true
                    self.key.stringValue = saved.pairingKey; self.device.stringValue = saved.deviceName
                    self.address.stringValue = saved.teacherHost; self.port.stringValue = String(saved.teacherPort)
                    self.pin.stringValue = saved.fingerprint; self.discovery.state = saved.discovery ? .on : .off
                    self.start()
                }
                return
            }
            guard self.host.process?.isRunning == true else { return }
            self.host.get("/status/local") { [weak self] result in guard let self = self else { return };if case .success(let value) = result { self.dashboard?.update(value) } else { self.dashboard?.disconnect() } }
            if self.backgroundStudent {
                self.host.get("/files/local") { [weak self] result in
                    guard let self = self, case .success(let json) = result else { return }
                    let ids = Set((json["files"] as? [[String: Any]] ?? []).compactMap { $0["id"] as? String })
                    if !ids.subtracting(self.notifiedFiles).isEmpty { self.openFiles() }
                    self.notifiedFiles = ids
                }
            }
            self.host.get("/control/local") { [weak self] result in
                guard let self = self else { return }
                if self.backgroundStudent, case .success(let json) = result {
                    let unread = json["unreadMessages"] as? Int ?? 0
                    if unread > self.lastUnreadMessages { self.openMessages() }
                    self.lastUnreadMessages = unread
                }
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
            let preferences = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 720,
                height: max(400, min(740, (NSScreen.main?.visibleFrame.height ?? 900) - 100))),
                styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
            preferences.isReleasedWhenClosed = false
            preferences.title = "FBS Classroom — إعدادات الطالب"
            preferences.contentMinSize = NSSize(width: 620, height: 360)
            preferences.contentView = form
            settingsWindow = preferences
            window.setContentSize(NSSize(width:340,height:422)); let dashboard = StudentDashboardView(frame:NSRect(x:0,y:0,width:340,height:422));self.dashboard = dashboard;dashboard.settingsAction = { [weak self] in self?.settingsWindow?.center();self?.settingsWindow?.makeKeyAndOrderFront(nil) };dashboard.stopAction = { [weak self] in self?.assistance?.stopCurrent() };window.contentView = dashboard
            if loaded && backgroundStudent { do { try config.validate();start() } catch { /* Wait for administrator provisioning without a student dialog. */ } }
            if !backgroundStudent { preferences.center(); preferences.makeKeyAndOrderFront(nil) }
        }
        if loaded && role == .teacher { start() }
        if !backgroundStudent && role == .teacher { window.center(); window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true) }
        if agentSmokeCheck {
            Timer.scheduledTimer(withTimeInterval: 3, repeats: false) { [weak self] _ in
                Task { @MainActor in
                    guard let self = self else { exit(2) }
                    let visible = NSApp.windows.filter { $0.isVisible }.count
                    guard self.backgroundStudent, visible == 0, NSApp.activationPolicy() == .accessory else { fputs("Agent unexpectedly displayed a window or Dock application\n", stderr); exit(2) }
                    print("{\"backgroundAgentSmokePassed\":true,\"visibleWindows\":0,\"unconfiguredAgentWaitsWithoutSetup\":true,\"keychainAccessed\":false}")
                    NSApp.terminate(nil)
                }
            }
        }
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
            try updated.validate(); if !CommandLine.arguments.contains("--desktop-smoke-check") { try PlatformServices.save(updated) }; config = updated
            if role == .student && !backgroundStudent { connection.stringValue = "حُفظ الإعداد. أعد تشغيل وكيل الطالب لتطبيق تغييرات الاتصال."; return }
            let fingerprint = try host.start(updated)
            if let fingerprint = fingerprint { connection.stringValue = "عنوان الشبكة: \(PlatformServices.ipv4())\nالمنفذ: 4180\nبصمة المعلم: \(fingerprint)" }
            else { connection.stringValue = "اسم الجهاز: \(updated.deviceName) — مشاركة الشاشة والرسائل تتطلب اعتماد المعلم" }
        } catch { showError(error) }
    }
    @objc private func stopHost() { power?.stop(); power = nil; screenPause?.stop(); screenPause = nil; assistance?.stop(); assistance = nil; host.stop(); dashboard?.disconnect(); messages?.window.close(); broadcast?.stop(); broadcast = nil; filesWindow?.window.close(); for button in [messageButton, viewButton, shareButton, filesButton] { button.isEnabled = false }; state.stringValue = "توقف التطبيق محليًا — التحكم غير مفعّل" }
    @objc private func openTeacher() { if role == .teacher { window.makeKeyAndOrderFront(nil) } }
    @objc private func openFiles() { if filesWindow == nil || filesWindow!.isClosed { filesWindow = FilesWindow(host) }; filesWindow?.show() }
    @objc private func openMessages() { if messages == nil || messages!.isClosed { messages = MessagesWindow(host) }; messages?.show() }
    @objc private func openBroadcast() { if broadcast == nil || broadcast!.isClosed { broadcast = BroadcastWindow(host) }; broadcast?.show() }
    @objc private func openShare() { if let url = host.baseURL { NSWorkspace.shared.open(url) } }
    private func showError(_ error: Error) { if backgroundStudent { fputs("FBS Classroom agent: configuration or runtime unavailable; contact lab administrator.\n", stderr); return }; let alert = NSAlert(); alert.messageText = "FBS Classroom"; alert.informativeText = error.localizedDescription; alert.runModal() }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool { !backgroundStudent }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { !backgroundStudent }
    func applicationWillTerminate(_ notification: Notification) { pollTimer?.invalidate(); power?.stop(); broadcast?.stop(); screenPause?.stop(); assistance?.stop(); host.stop() }
}
@main @MainActor struct Main {
    static func main() {
        if CommandLine.arguments.contains("--self-check") {
            do { try RuntimeHost.selfCheck(); exit(0) } catch { fputs("Bundle self-check failed: \(error.localizedDescription)\n", stderr); exit(1) }
        }
        let app = NSApplication.shared
        let student = Bundle.main.object(forInfoDictionaryKey: "FBSRole") as? String == "student"
        let configure = CommandLine.arguments.contains("--configure")
        if student && configure && !ManagedSettingsAuthorization.authorize() { exit(1) }
        app.setActivationPolicy(student && !configure ? .accessory : .regular)
        let delegate = ClassroomApp(); app.delegate = delegate
        signal(SIGTERM, SIG_IGN)
        let termination = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
        termination.setEventHandler { app.terminate(nil) }; termination.resume()
        withExtendedLifetime((delegate, termination)) { app.run() }
    }
}
