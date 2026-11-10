import AppKit

private final class SettingsDocumentView: NSView {
    override var isFlipped: Bool { true }
}

/// Owns the settings controls from creation; it is never a former window content view.
@MainActor final class ConnectionSettingsForm: NSScrollView {
    let key = NSSecureTextField(), password = NSSecureTextField()
    let address = NSTextField(), port = NSTextField(), pin = NSTextField(), device = NSTextField()
    let discovery = NSButton(checkboxWithTitle: "اكتشاف المعلم تلقائيًا داخل الشبكة", target: nil, action: nil)
    let state = NSTextField(wrappingLabelWithString: "التحكم يحتاج موافقتك؛ يمكنك إيقافه في أي وقت")
    let connection = NSTextField(wrappingLabelWithString: "")
    let startButton = NSButton(title: "حفظ الإعداد وتشغيل البرنامج", target: nil, action: nil)
    let setupButton = NSButton(title: "فتح أدوات تهيئة المعمل", target: nil, action: nil)
    let stopButton = NSButton(title: "إيقاف التطبيق محليًا", target: nil, action: nil)
    let teacherButton = NSButton(title: "فتح لوحة المعلم", target: nil, action: nil)
    let filesButton = NSButton(title: "ملفات المعلم — حفظ بموافقتك", target: nil, action: nil)
    let messageButton = NSButton(title: "رسائل المعلم", target: nil, action: nil)
    let viewButton = NSButton(title: "عرض شاشة المعلم", target: nil, action: nil)
    let shareButton = NSButton(title: "مشاركة شاشة الطالب بموافقته", target: nil, action: nil)
    private let stack = NSStackView()
    private let document = SettingsDocumentView(frame: NSRect(x: 0, y: 0, width: 720, height: 640))

    init(role: ClassroomRole) {
        super.init(frame: NSRect(x: 0, y: 0, width: 720, height: 640))
        appearance = NSAppearance(named: .aqua)
        drawsBackground = true
        backgroundColor = .windowBackgroundColor
        hasVerticalScroller = true
        autohidesScrollers = true
        scrollerStyle = .overlay
        documentView = document
        stack.orientation = .vertical
        stack.alignment = .trailing
        stack.spacing = 8
        document.addSubview(stack)
        let title = NSTextField(labelWithString: "🎓 FBS Classroom — macOS / iMac")
        title.font = .boldSystemFont(ofSize: 22)
        stack.addArrangedSubview(title)
        func field(_ label: String, _ input: NSTextField) {
            let text = NSTextField(labelWithString: label)
            text.alignment = .right
            stack.addArrangedSubview(text)
            stack.addArrangedSubview(input)
            input.translatesAutoresizingMaskIntoConstraints = false
            input.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
            input.font = .systemFont(ofSize: 15)
            input.textColor = .textColor
            input.backgroundColor = .textBackgroundColor
        }
        field("مفتاح المعمل المشترك — من 3 إلى 8 أرقام", key)
        if role == .teacher {
            field("كلمة مرور لوحة المعلم — من 3 إلى 8 أرقام", password)
        } else {
            field("اسم الجهاز بالإنجليزية", device)
            stack.addArrangedSubview(discovery)
            field("عنوان المعلم IP أو اسم الجهاز", address)
            field("منفذ المعلم", port)
            field("بصمة شهادة المعلم SHA-256 — 64 رمزًا", pin)
        }
        for button in [startButton, setupButton, stopButton] { stack.addArrangedSubview(button) }
        if role == .teacher { stack.addArrangedSubview(teacherButton) }
        else {
            for button in [messageButton, viewButton, shareButton, filesButton] {
                button.isEnabled = false
                stack.addArrangedSubview(button)
            }
        }
        connection.isSelectable = true
        for label in [connection, state] {
            label.alignment = .right
            label.textColor = .labelColor
            stack.addArrangedSubview(label)
            label.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
        }
    }
    override func layout() {
        super.layout()
        // The clip view manages document coordinates. Size its document explicitly
        // instead of leaving its origin/height underdetermined by Auto Layout.
        let width = max(1, contentView.bounds.width)
        let stackWidth = max(1, width - 50)
        stack.setFrameSize(NSSize(width: stackWidth, height: max(1, stack.frame.height)))
        stack.layoutSubtreeIfNeeded()
        let height = max(1, stack.fittingSize.height)
        let frame = NSRect(x: 25, y: 20, width: stackWidth, height: height)
        if stack.frame != frame { stack.frame = frame }
        let size = NSSize(width: width, height: max(contentView.bounds.height, height + 40))
        if document.frame.size != size { document.setFrameSize(size) }
    }
    required init?(coder: NSCoder) { nil }
}
