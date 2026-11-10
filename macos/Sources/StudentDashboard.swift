import AppKit

@MainActor final class DashboardTextCell: NSTextFieldCell {
    override func drawingRect(forBounds rect:NSRect)->NSRect { var r=super.drawingRect(forBounds:rect);let h=cellSize(forBounds:rect).height;if r.height>h { r.origin.y += (r.height-h)/2;r.size.height=h };return r }
}
@MainActor final class StudentDashboardView: NSView {
    private let banner = NSTextField(labelWithString:"بانتظار الاتصال بالمعلم"), device = NSTextField(labelWithString:"اسم الجهاز: —"), lab = NSTextField(labelWithString:"المعمل: —"), state = NSTextField(labelWithString:"الحالة: انتظار الاتصال")
    var settingsAction: (() -> Void)?, stopAction: (() -> Void)?
    override init(frame: NSRect) {
        super.init(frame:frame); wantsLayer = true
        for label in [banner,device,lab,state] { label.alignment = .center; label.isSelectable = false; label.font = .boldSystemFont(ofSize:12); label.textColor = NSColor(calibratedRed:0.06,green:0.13,blue:0.24,alpha:1); label.translatesAutoresizingMaskIntoConstraints = false; addSubview(label) }
        banner.cell = DashboardTextCell(textCell:banner.stringValue);banner.isEditable = false;banner.isSelectable = false;banner.isBordered = false;banner.drawsBackground = false;banner.alignment = .center;
        banner.wantsLayer = true; banner.layer?.backgroundColor = NSColor(calibratedWhite:0.91,alpha:1).cgColor; banner.layer?.cornerRadius = 6; banner.font = .boldSystemFont(ofSize:15)
        let settings = NSButton(title:"⚙ الإعدادات",target:self,action:#selector(openSettings)), stop = NSButton(title:"إيقاف التحكم",target:self,action:#selector(stopControl)); for button in [settings,stop] { button.bezelStyle = .rounded; button.appearance = NSAppearance(named: .aqua); button.contentTintColor = .black; button.font = .systemFont(ofSize:12); button.translatesAutoresizingMaskIntoConstraints = false; addSubview(button) }
        NSLayoutConstraint.activate([banner.leadingAnchor.constraint(equalTo:leadingAnchor,constant:28),banner.trailingAnchor.constraint(equalTo:trailingAnchor,constant:-28),banner.topAnchor.constraint(equalTo:topAnchor,constant:166),banner.heightAnchor.constraint(equalToConstant:39), device.centerXAnchor.constraint(equalTo:centerXAnchor),device.topAnchor.constraint(equalTo:topAnchor,constant:226), lab.centerXAnchor.constraint(equalTo:centerXAnchor),lab.topAnchor.constraint(equalTo:topAnchor,constant:258),state.centerXAnchor.constraint(equalTo:centerXAnchor),state.topAnchor.constraint(equalTo:topAnchor,constant:290),settings.trailingAnchor.constraint(equalTo:trailingAnchor,constant:-20),settings.bottomAnchor.constraint(equalTo:bottomAnchor,constant:-34),stop.leadingAnchor.constraint(equalTo:leadingAnchor,constant:20),stop.bottomAnchor.constraint(equalTo:bottomAnchor,constant:-34)])
    }
    required init?(coder:NSCoder){nil}
    @objc private func openSettings(){settingsAction?()}
    @objc private func stopControl(){stopAction?()}
    func update(_ value:[String:Any]) { let connected = value["connected"] as? Bool == true, approved = connected && value["approved"] as? Bool == true
        banner.stringValue = approved ? "✓ متصل بالمعلم" : connected ? "بانتظار اعتماد المعلم" : "غير متصل بالمعلم"; banner.layer?.backgroundColor = (approved ? NSColor(calibratedRed:0.79,green:0.95,blue:0.84,alpha:1) : connected ? NSColor(calibratedRed:1,green:0.92,blue:0.73,alpha:1) : NSColor(calibratedWhite:0.91,alpha:1)).cgColor
        device.stringValue = "اسم الجهاز: " + (value["deviceId"] as? String ?? "—"); lab.stringValue = "المعمل: " + (value["labName"] as? String ?? "—");state.stringValue = "الحالة: " + (approved ? "جاهز" : connected ? "بانتظار الاعتماد" : "غير متصل")
    }
    func disconnect(){banner.stringValue = "غير متصل بالمعلم";banner.layer?.backgroundColor = NSColor(calibratedWhite:0.91,alpha:1).cgColor;state.stringValue = "الحالة: غير متصل"}
    override var isFlipped: Bool { true }
    override func draw(_ dirtyRect:NSRect){super.draw(dirtyRect);NSGradient(starting:NSColor(calibratedRed:0.04,green:0.25,blue:0.54,alpha:1),ending:NSColor(calibratedRed:0.025,green:0.10,blue:0.23,alpha:1))?.draw(in:bounds,angle:45)
        let cx=bounds.midX;NSColor.white.setFill();let cap=NSBezierPath();cap.move(to:NSPoint(x:cx-35,y:43));cap.line(to:NSPoint(x:cx,y:30));cap.line(to:NSPoint(x:cx+35,y:43));cap.line(to:NSPoint(x:cx,y:57));cap.close();cap.fill();let base=NSBezierPath();base.move(to:NSPoint(x:cx-23,y:54));base.line(to:NSPoint(x:cx-23,y:69));base.line(to:NSPoint(x:cx,y:78));base.line(to:NSPoint(x:cx+23,y:69));base.line(to:NSPoint(x:cx+23,y:54));base.line(to:NSPoint(x:cx,y:64));base.close();base.fill();let tassel=NSBezierPath();tassel.move(to:NSPoint(x:cx+31,y:45));tassel.line(to:NSPoint(x:cx+31,y:70));tassel.lineWidth=3;NSColor.white.setStroke();tassel.stroke()
        func text(_ value:String,_ y:CGFloat,_ size:CGFloat,_ bold:Bool=true){let attrs:[NSAttributedString.Key:Any]=[.font:bold ? NSFont.boldSystemFont(ofSize:size):NSFont.systemFont(ofSize:size),.foregroundColor:NSColor.white];let width=(value as NSString).size(withAttributes:attrs).width;(value as NSString).draw(at:NSPoint(x:(bounds.width-width)/2,y:y),withAttributes:attrs)}
        text("FBS Classroom",94,26);text("جهاز الطالب",135,11,false);NSColor.white.setFill();NSBezierPath(roundedRect:NSRect(x:14,y:153,width:bounds.width-28,height:195),xRadius:12,yRadius:12).fill();text("جهاز الطالب",bounds.height-22,10,false)
    }
}
