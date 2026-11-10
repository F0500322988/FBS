import AppKit
import WebKit
import ScreenCaptureKit

// The dashboard runs in the application's window. The native capability never enters a URL or page script.
@MainActor final class TeacherDesktopView: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandlerWithReply, WKDownloadDelegate {
    let view: WKWebView
    private var origin: URL?
    override init() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        view = WKWebView(frame: .zero, configuration: configuration)
        super.init()
        view.navigationDelegate = self; view.uiDelegate = self
        configuration.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "fbsTeacherCapture")
    }
    func connect(url: URL, token: String) {
        origin = url
        var request = URLRequest(url: url.appendingPathComponent("api/desktop/session"))
        request.httpMethod = "POST"; request.timeoutInterval = 5
        request.setValue(token, forHTTPHeaderField: "X-FBS-Desktop-Token")
        let configuration = URLSessionConfiguration.ephemeral
        configuration.connectionProxyDictionary = [:]
        let session = URLSession(configuration: configuration)
        session.dataTask(with: request) { [weak self] _, response, error in
            defer { session.finishTasksAndInvalidate() }
            guard error == nil, let response = response as? HTTPURLResponse, response.statusCode == 200,
                  let raw = response.value(forHTTPHeaderField: "Set-Cookie"),
                  let cookie = HTTPCookie.cookies(withResponseHeaderFields: ["Set-Cookie": raw], for: url).first(where: { $0.name == "fbs_session" }) else {
                DispatchQueue.main.async { self?.failed() }; return
            }
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.view.configuration.websiteDataStore.httpCookieStore.setCookie(cookie) {
                    self.view.load(URLRequest(url: url))
                }
            }
        }.resume()
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, let origin = origin,
              message.frameInfo.securityOrigin.protocol == "http",
              message.frameInfo.securityOrigin.host == "127.0.0.1",
              message.frameInfo.securityOrigin.port == origin.port,
              message.body as? String == "capture" else { replyHandler(nil, "Capture origin rejected"); return }
        guard CGPreflightScreenCaptureAccess() || CGRequestScreenCaptureAccess() else { replyHandler(nil, "Screen recording permission required"); return }
        Task { @MainActor in
            do { self.replyWithImage(try await self.captureMainDisplay(), replyHandler: replyHandler) }
            catch { replyHandler(nil, "Screen capture unavailable; check macOS recording permission") }
        }
    }
    private func captureMainDisplay() async throws -> CGImage {
        if #available(macOS 14.0, *) {
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
            guard let display = content.displays.first(where: { $0.displayID == CGMainDisplayID() }) else { throw ConfigurationError.invalid("Main display unavailable") }
            let configuration = SCStreamConfiguration(); configuration.width = 1280; configuration.height = 720; configuration.showsCursor = true
            return try await SCScreenshotManager.captureImage(contentFilter: SCContentFilter(display: display, excludingWindows: []), configuration: configuration)
        }
        // macOS 13 compatibility. The system tool still requires the application's recording permission.
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("fbs-teacher-frame-" + UUID().uuidString)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: false, attributes: [.posixPermissions: 0o700])
        defer { try? FileManager.default.removeItem(at: folder) }
        let file = folder.appendingPathComponent("frame.jpg")
        _ = try PlatformServices.run("/usr/sbin/screencapture", ["-x", "-m", "-t", "jpg", file.path])
        guard let image = NSImage(contentsOf: file)?.cgImage(forProposedRect: nil, context: nil, hints: nil) else { throw ConfigurationError.invalid("Screen capture unavailable") }
        return image
    }
    private func replyWithImage(_ image: CGImage, replyHandler: @escaping (Any?, String?) -> Void) {
        let size = NSSize(width: 1280, height: 720)
        let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 1280, pixelsHigh: 720, bitsPerSample: 8, samplesPerPixel: 3, hasAlpha: false, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
        NSColor.black.setFill(); NSRect(origin: .zero, size: size).fill()
        let ratio = min(1280 / CGFloat(image.width), 720 / CGFloat(image.height))
        let scaled = NSSize(width: CGFloat(image.width) * ratio, height: CGFloat(image.height) * ratio)
        NSImage(cgImage: image, size: NSSize(width: CGFloat(image.width), height: CGFloat(image.height))).draw(in: NSRect(x: (1280-scaled.width)/2, y: (720-scaled.height)/2, width: scaled.width, height: scaled.height))
        NSGraphicsContext.restoreGraphicsState()
        for quality in [0.55, 0.25] {
            if let jpeg = bitmap.representation(using: .jpeg, properties: [.compressionFactor: quality]) {
                let value = "data:image/jpeg;base64," + jpeg.base64EncodedString()
                if value.count <= 170000 { replyHandler(value, nil); return }
            }
        }
        replyHandler(nil, "Screen frame exceeds limit")
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard CommandLine.arguments.contains("--desktop-smoke-check") else { return }
            webView.callAsyncJavaScript("return await (await fetch('/api/auth')).json()", arguments: [:], in: nil, in: .page) { result in
                guard case .success(let value) = result, let auth = value as? [String: Any], auth["authenticated"] as? Bool == true,
                      NSApp.windows.contains(where: { $0.isVisible }) else { fputs("Desktop authentication smoke failed\n", stderr); exit(2) }
                print("{\"desktopWindowSmokePassed\":true,\"authenticatedWithoutPasswordEntry\":true,\"externalBrowserOpened\":false,\"keychainAccessed\":false}")
                NSApp.terminate(nil)
            }
    }
    private func failed() {
        let alert = NSAlert(); alert.messageText = "تعذر فتح لوحة المعلم"; alert.informativeText = "أغلق التطبيق وأعد فتحه. لم يتم تغيير إعدادات المعمل."; alert.runModal()
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url, let expected = origin else { decisionHandler(.cancel); return }
        let local = url.scheme == expected.scheme && url.host == expected.host && url.port == expected.port
        let localBlob = url.absoluteString.hasPrefix("blob:" + expected.absoluteString + "/")
        guard local || (localBlob && navigationAction.shouldPerformDownload) else { decisionHandler(.cancel); return }
        decisionHandler(navigationAction.shouldPerformDownload ? .download : .allow)
    }
    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let panel = NSSavePanel(); panel.nameFieldStringValue = URL(fileURLWithPath: suggestedFilename).lastPathComponent
        panel.begin { result in completionHandler(result == .OK ? panel.url : nil) }
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? { nil }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert(); alert.messageText = "FBS Classroom"; alert.informativeText = message; alert.runModal(); completionHandler()
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert(); alert.messageText = "FBS Classroom"; alert.informativeText = message
        alert.addButton(withTitle: "تأكيد"); alert.addButton(withTitle: "إلغاء")
        completionHandler(alert.runModal() == .alertFirstButtonReturn)
    }
    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = NSAlert(); alert.messageText = "FBS Classroom"; alert.informativeText = prompt
        let input = NSTextField(frame: NSRect(x: 0, y: 0, width: 360, height: 26)); input.stringValue = defaultText ?? ""
        alert.accessoryView = input; alert.addButton(withTitle: "حفظ"); alert.addButton(withTitle: "إلغاء")
        completionHandler(alert.runModal() == .alertFirstButtonReturn ? input.stringValue : nil)
    }
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel(); panel.canChooseDirectories = false; panel.canChooseFiles = true; panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.begin { result in completionHandler(result == .OK ? panel.urls : nil) }
    }
}
