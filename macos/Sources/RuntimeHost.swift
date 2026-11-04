import Foundation

final class RuntimeHost {
    private(set) var process: Process?
    private(set) var token = ""
    private(set) var baseURL: URL?
    private var startupID = "", teacher = false, stdoutBuffer = "", generation = 0
    private var timer: Timer?
    var status: ((String) -> Void)?
    var ready: ((URL) -> Void)?
    static var runtime: URL { Bundle.main.resourceURL!.appendingPathComponent("Runtime", isDirectory: true) }
    static var node: URL {
        #if arch(arm64)
        return runtime.appendingPathComponent("node-arm64")
        #else
        return runtime.appendingPathComponent("node-x64")
        #endif
    }
    static func selfCheck() throws {
        let fm = FileManager.default, files = ["server.js", "student-agent.js", "classroom-messages.js", "classroom-broadcast.js", "classroom-files.js", "lab-settings.js", "classroom-pause.js", "pinned-https.js", "public/index.html", "node-x64", "node-arm64"]
        for file in files where !fm.fileExists(atPath: runtime.appendingPathComponent(file).path) { throw ConfigurationError.invalid("Missing bundled runtime: " + file) }
        let version = try PlatformServices.run(node.path, ["--version"])
        guard String(data: version, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) == "v22.23.4" else { throw ConfigurationError.invalid("Unexpected Node runtime version") }
        try loopbackSelfCheck()
        print("{\"nativeBundleSelfCheck\":true,\"guiExecuted\":false,\"keychainAccessed\":false,\"nodeVersion\":\"22.23.4\",\"loopbackHTTPTested\":true}")
    }
    private final class ProbeResult: @unchecked Sendable { let lock = NSLock(); var passed = false }
    private static func loopbackSelfCheck() throws {
        let task = Process(), pipe = Pipe(), token = try PlatformServices.randomToken()
        task.executableURL = node
        task.arguments = ["-e", "const h=require('node:http');const s=h.createServer((q,r)=>{r.writeHead(q.headers['x-fbs-probe']===process.env.FBS_PROBE_TOKEN?200:403);r.end('fbs-loopback-probe')});s.listen(0,'127.0.0.1',()=>console.log(s.address().port));setTimeout(()=>process.exit(1),10000).unref()"]
        var env = ProcessInfo.processInfo.environment; env["FBS_PROBE_TOKEN"] = token; task.environment = env; task.standardOutput = pipe; task.standardError = FileHandle.nullDevice
        try task.run(); defer { if task.isRunning { task.terminate() } }
        let raw = pipe.fileHandleForReading.availableData
        guard let text = String(data: raw, encoding: .utf8), let port = Int(text.trimmingCharacters(in: .whitespacesAndNewlines)), let url = URL(string: "http://127.0.0.1:\(port)/") else { throw ConfigurationError.invalid("Loopback probe startup failed") }
        let configuration = URLSessionConfiguration.ephemeral; configuration.connectionProxyDictionary = [:]
        let session = URLSession(configuration: configuration), semaphore = DispatchSemaphore(value: 0), result = ProbeResult()
        var request = URLRequest(url: url); request.timeoutInterval = 3; request.setValue(token, forHTTPHeaderField: "X-FBS-Probe")
        session.dataTask(with: request) { data, response, error in
            result.lock.lock(); result.passed = error == nil && (response as? HTTPURLResponse)?.statusCode == 200 && data == Data("fbs-loopback-probe".utf8); result.lock.unlock(); semaphore.signal()
        }.resume()
        let completed = semaphore.wait(timeout: .now() + 5) == .success
        session.invalidateAndCancel(); result.lock.lock(); let passed = result.passed; result.lock.unlock()
        guard completed && passed else { throw ConfigurationError.invalid("Native loopback HTTP probe failed") }
    }
    func start(_ config: ConnectionConfig) throws -> String? {
        guard process == nil else { throw ConfigurationError.invalid("التطبيق يعمل بالفعل؛ أوقفه قبل تغيير الاتصال") }
        try config.validate(); let state = try PlatformServices.privateState(config.role)
        token = try PlatformServices.randomToken(); startupID = try PlatformServices.randomToken(); teacher = config.role == .teacher
        var env = ProcessInfo.processInfo.environment
        for name in ["FBS_PAIRING_KEY", "FBS_TEACHER_PASSWORD", "FBS_TLS_CERT", "FBS_TLS_KEY", "FBS_TEACHER_HOST", "FBS_TEACHER_PORT", "FBS_TEACHER_FINGERPRINT", "FBS_IDENTITY_FILE", "FBS_LOCAL_CONTROL_TOKEN", "FBS_DEVICE_ID", "FBS_DISCOVERY_PORT", "FBS_DISCOVERY_ENABLED"] { env.removeValue(forKey: name) }
        var fingerprint: String?
        if teacher {
            let (cert, key, pin) = try PlatformServices.certificate(state); fingerprint = pin
            env.merge(["FBS_PAIRING_KEY": config.pairingKey, "FBS_TEACHER_PASSWORD": config.teacherPassword, "FBS_TLS_CERT": cert.path, "FBS_TLS_KEY": key.path, "FBS_ENROLLMENT_FILE": state.appendingPathComponent("enrollment.json").path, "FBS_LAB_SETTINGS_FILE": state.appendingPathComponent("lab-settings.json").path, "FBS_STARTUP_ID": startupID, "FBS_DEMO": "0", "PORT": "4177", "FBS_AGENT_PORT": "4180"], uniquingKeysWith: { _, new in new })
            baseURL = URL(string: "http://127.0.0.1:4177")
        } else { env.merge(try config.studentEnvironment(state: state, token: token), uniquingKeysWith: { _, new in new }); baseURL = nil }
        let task = Process(), pipe = Pipe(); task.executableURL = Self.node; task.arguments = [Self.runtime.appendingPathComponent(teacher ? "server.js" : "student-agent.js").path]
        task.environment = env; task.currentDirectoryURL = Self.runtime; task.standardOutput = pipe; task.standardError = FileHandle.nullDevice
        generation += 1; let revision = generation; stdoutBuffer = ""
        pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData; if data.isEmpty { handle.readabilityHandler = nil; return }
            guard let output = String(data: data, encoding: .utf8) else { return }
            DispatchQueue.main.async { guard let self = self, self.generation == revision else { return }; self.stdoutBuffer = String((self.stdoutBuffer + output).suffix(8192)); self.parsePort() }
        }
        task.terminationHandler = { [weak self] _ in DispatchQueue.main.async { guard let self = self, self.generation == revision else { return }; self.generation += 1; self.timer?.invalidate(); self.process = nil; self.baseURL = nil; self.status?("توقفت العملية؛ تحقق من الاتصال والشهادة وتوفر منافذ المعلم") } }
        try task.run(); process = task; status?("جارٍ التحقق من جاهزية التطبيق محليًا")
        let deadline = Date().addingTimeInterval(15)
        timer = Timer.scheduledTimer(withTimeInterval: 0.4, repeats: true) { [weak self] _ in
            guard let self = self, self.generation == revision else { return }
            if Date() > deadline { self.stop(); self.status?("لم تكتمل جاهزية التطبيق خلال المهلة"); return }
            guard let url = self.baseURL else { return }
            self.get(self.teacher ? "/api/auth" : "/control/local") { [weak self] result in
                guard let self = self, self.generation == revision, self.timer?.isValid == true else { return }
                guard case .success(let json) = result else { return }
                let valid = self.teacher ? (json["startupId"] as? String == self.startupID && json["required"] as? Bool == true) : (json["inputEnabled"] as? Bool == false && json.keys.contains("session"))
                if valid { self.timer?.invalidate(); self.status?(self.teacher ? "خادم المعلم جاهز؛ سجّل الدخول في المتصفح" : "وكيل الطالب جاهز محليًا؛ انتظار الاتصال بالمعلم واعتماد الجهاز"); self.ready?(url) }
            }
        }
        return fingerprint
    }
    private func parsePort() {
        guard !teacher, baseURL == nil, let range = stdoutBuffer.range(of: "Optional screen share: http://127.0.0.1:") else { return }
        let remaining = stdoutBuffer[range.upperBound...]
        guard let newline = remaining.firstIndex(of: "\n") else { return }
        let digits = remaining[..<newline]
        if let port = Int(digits), (1...65535).contains(port) { baseURL = URL(string: "http://127.0.0.1:\(port)") }
    }
    func get(_ path: String, body: [String: Any]? = nil, completion: @escaping (Result<[String: Any], Error>) -> Void) {
        guard let base = baseURL else { completion(.failure(ConfigurationError.invalid("التطبيق غير جاهز"))); return }
        let requestGeneration = generation
        var request = URLRequest(url: base.appendingPathComponent(String(path.dropFirst()))); request.timeoutInterval = 2
        request.setValue(token, forHTTPHeaderField: "X-FBS-Local-Token")
        if let body = body { request.httpMethod = "POST"; request.setValue("application/json", forHTTPHeaderField: "Content-Type"); request.httpBody = try? JSONSerialization.data(withJSONObject: body) }
        let configuration = URLSessionConfiguration.ephemeral; configuration.connectionProxyDictionary = [:]
        let session = URLSession(configuration: configuration)
        session.dataTask(with: request) { data, response, error in
            defer { session.finishTasksAndInvalidate() }
            let result: Result<[String: Any], Error>
            if let error = error { result = .failure(error) }
            else if let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode), let data = data, data.count <= 250000, let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] { result = .success(json) }
            else { result = .failure(ConfigurationError.invalid("تعذر تحديث البيانات المحلية")) }
            DispatchQueue.main.async { [weak self] in
                guard self?.generation == requestGeneration else { completion(.failure(ConfigurationError.invalid("تغير الاتصال؛ أُهملت استجابة قديمة"))); return }; completion(result)
            }
        }.resume()
    }
    func downloadFile(_ id: String, completion: @escaping (Result<Data, Error>) -> Void) {
        guard let base = baseURL else { completion(.failure(ConfigurationError.invalid("التطبيق غير جاهز"))); return }
        let revision = generation
        var request = URLRequest(url: base.appendingPathComponent("files/local/download")); request.httpMethod = "POST"; request.timeoutInterval = 15
        request.setValue(token, forHTTPHeaderField: "X-FBS-Local-Token"); request.setValue("application/json", forHTTPHeaderField: "Content-Type"); request.httpBody = try? JSONSerialization.data(withJSONObject: ["id": id])
        let configuration = URLSessionConfiguration.ephemeral; configuration.connectionProxyDictionary = [:]; let session = URLSession(configuration: configuration)
        session.dataTask(with: request) { [weak self] data, response, error in
            defer { session.finishTasksAndInvalidate() }
            let result: Result<Data, Error>
            if let error = error { result = .failure(error) }
            else if let http = response as? HTTPURLResponse, http.statusCode == 200, let data = data, !data.isEmpty, data.count <= 5 * 1024 * 1024 { result = .success(data) }
            else { result = .failure(ConfigurationError.invalid("الملف غير متاح أو لم يكتمل النقل")) }
            DispatchQueue.main.async { guard self?.generation == revision else { completion(.failure(ConfigurationError.invalid("تغير الاتصال"))); return }; completion(result) }
        }.resume()
    }
    func stop() { generation += 1; timer?.invalidate(); timer = nil; let owned = process; process = nil; baseURL = nil; if owned?.isRunning == true { owned?.terminate() } }
    deinit { timer?.invalidate(); if process?.isRunning == true { process?.terminate() } }
}
