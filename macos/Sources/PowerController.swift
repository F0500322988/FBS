import AppKit

@MainActor final class PowerController {
    private let host: RuntimeHost
    private var timer: Timer?, busy = false, stopped = false, seen: [String] = []
    init(_ host: RuntimeHost) { self.host = host; timer = Timer.scheduledTimer(withTimeInterval: 0.7, repeats: true) { [weak self] _ in Task { @MainActor in self?.poll() } } }
    func stop() { stopped = true; timer?.invalidate(); timer = nil }
    private func receipt(_ id: String, _ state: String, completion: @escaping (Bool) -> Void = { _ in }) { host.get("/power/local", body: ["requestId":id,"state":state]) { result in if case .success = result { completion(true) } else { completion(false) } } }
    private func poll() {
        guard !stopped, !busy else { return }; busy = true
        host.get("/power/local") { [weak self] result in
            guard let self = self else { return }
            guard !self.stopped, case .success(let data) = result, data["supported"] as? Bool == true, let p = data["power"] as? [String: Any], let id = p["id"] as? String, UUID(uuidString:id) != nil, !self.seen.contains(id), let action = p["action"] as? String, ["shutdown","restart","sleep"].contains(action), let remaining = p["remainingMs"] as? Int, (3000...30000).contains(remaining) else { self.busy = false; return }
            self.seen.append(id); if self.seen.count > 100 { self.seen.removeFirst() }; let deadline = ProcessInfo.processInfo.systemUptime + Double(remaining)/1000
            self.receipt(id,"received") { [weak self] ok in
                guard let self = self else { return }; guard ok, !self.stopped, ProcessInfo.processInfo.systemUptime < deadline else { self.busy = false; return }
                let process = Process(); process.executableURL = URL(fileURLWithPath:"/usr/bin/osascript")
                let script = action == "shutdown" ? "tell application \"System Events\" to shut down" : action == "restart" ? "tell application \"System Events\" to restart" : "tell application \"System Events\" to sleep"
                process.arguments = ["-e",script]; process.standardOutput = FileHandle.nullDevice; process.standardError = FileHandle.nullDevice
                process.terminationHandler = { [weak self] p in Task { @MainActor in guard let self = self else { return }; self.busy = false; if !self.stopped { self.receipt(id,p.terminationStatus == 0 ? "submitted":"rejected") } } }
                do { try process.run(); DispatchQueue.main.asyncAfter(deadline:.now()+8) { if process.isRunning { process.terminate() } } }
                catch { self.busy = false; self.receipt(id,"rejected") }
            }
        }
    }
}
