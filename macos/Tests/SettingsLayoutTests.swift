import AppKit

@main @MainActor struct SettingsLayoutTests {
    static func main() throws {
        let app = NSApplication.shared
        let output = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
        try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
        var count = 0
        func check(_ condition: @autoclosure () -> Bool, _ name: String) {
            precondition(condition(), name); count += 1; fputs("PASS: " + name + "\n", stderr)
        }
        for theme in [NSAppearance.Name.aqua, .darkAqua] {
            app.appearance = NSAppearance(named: theme)
            for role in [ClassroomRole.student, .teacher] {
                for height in [CGFloat(360), CGFloat(740)] {
                    let form = ConnectionSettingsForm(role: role)
                    let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 720, height: height),
                        styleMask: [.titled, .resizable], backing: .buffered, defer: false)
                    window.isReleasedWhenClosed = false
                    window.contentView = form
                    window.makeKeyAndOrderFront(nil)
                    for _ in 0..<3 {
                        form.layoutSubtreeIfNeeded()
                        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.02))
                    }
                    guard let document = form.documentView else { fatalError("Settings document missing") }
                    check(document.isFlipped, "settings starts at top of flipped document")
                    check(document.frame.height >= form.contentView.bounds.height - 1, "document fills viewport")
                    check(!document.hasAmbiguousLayout, "settings document has determined layout")
                    let keyRect = form.key.convert(form.key.bounds, to: document)
                    check(keyRect.width > 500 && keyRect.height > 15, "key field has usable dimensions")
                    check(form.documentVisibleRect.intersects(keyRect), "key field visible when settings opens")
                    check(form.key.isEditable && form.key.isEnabled, "key field editable")
                    check(window.makeFirstResponder(form.key), "key field accepts focus")
                    if let editor = form.key.currentEditor() {
                        editor.string = "012"
                        window.makeFirstResponder(nil)
                    } else { fatalError("No field editor in settings") }
                    check(form.key.stringValue == "012", "key field accepts three digits with leading zero")
                    check(form.effectiveAppearance.bestMatch(from: [.aqua, .darkAqua]) == .aqua, "settings controls retain readable light appearance")
                    if role == .student {
                        check(form.address.superview != nil && form.pin.superview != nil, "student endpoint fields remain in document")
                    } else {
                        check(form.password.superview != nil, "teacher password field remains in document")
                    }
                    let buttonRect = form.startButton.convert(form.startButton.bounds, to: document)
                    document.scrollToVisible(buttonRect)
                    form.reflectScrolledClipView(form.contentView)
                    check(form.documentVisibleRect.intersects(buttonRect), "save button reachable by scrolling")
                    // Reopen/resize must keep the same controls and restore the top explicitly.
                    document.scroll(NSPoint.zero)
                    form.reflectScrolledClipView(form.contentView)
                    check(form.documentVisibleRect.intersects(keyRect), "top fields reachable after scrolling back")
                    guard let bitmap = form.bitmapImageRepForCachingDisplay(in: form.bounds) else { fatalError("Settings bitmap missing") }
                    form.cacheDisplay(in: form.bounds, to: bitmap)
                    guard let data = bitmap.representation(using: .png, properties: [:]) else { fatalError("Settings PNG missing") }
                    try data.write(to: output.appendingPathComponent("Settings-\(role.rawValue)-\(theme.rawValue)-\(Int(height)).png"))
                    window.orderOut(nil)
                }
            }
        }
        // Real dashboard buttons must retain readable system text under both system themes.
        for theme in [NSAppearance.Name.aqua, .darkAqua] {
            app.appearance = NSAppearance(named: theme)
            let dashboard = StudentDashboardView(frame: NSRect(x: 0, y: 0, width: 340, height: 422))
            let window = NSWindow(contentRect: dashboard.bounds, styleMask: [.borderless], backing: .buffered, defer: false)
            window.isReleasedWhenClosed = false; window.contentView = dashboard
            dashboard.layoutSubtreeIfNeeded()
            let buttons = dashboard.subviews.compactMap { $0 as? NSButton }
            check(buttons.count == 2, "dashboard actions present")
            var opened = false; dashboard.settingsAction = { opened = true }
            for button in buttons {
                check(!button.title.isEmpty, "dashboard button has title")
                check(button.contentTintColor == NSColor.black, "dashboard title contrasts with light bezel")
                check(button.effectiveAppearance.bestMatch(from: [.aqua, .darkAqua]) == .aqua, "dashboard button appearance fixed to light bezel")
                if button.title.contains("الإعدادات") { button.performClick(nil) }
            }
            check(opened, "dashboard settings button opens settings action")
            guard let bitmap = dashboard.bitmapImageRepForCachingDisplay(in: dashboard.bounds) else { fatalError("Dashboard bitmap missing") }
            dashboard.cacheDisplay(in: dashboard.bounds, to: bitmap)
            try bitmap.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent("Dashboard-\(theme.rawValue).png"))
            window.orderOut(nil)
        }
        print("{\"settingsAndButtonLayoutChecksPassed\":\(count),\"nativeAppKitWindowsCreated\":true,\"lightAndDarkSystemThemesTested\":true,\"keychainAccessed\":false,\"actualLabDevicesTested\":false}")
    }
}
