import Foundation
import Security
import AppKit
import Darwin

struct LabProfile: Codable, Equatable {
    var version: Int = 1
    var teacherHost: String
    var teacherPort: Int = 4180
    var fingerprint: String
    var pairingKey: String
    func validate() throws {
        guard version == 1, pairingKey.count >= 16, pairingKey.utf16.count <= 256,
              !pairingKey.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty,
              !pairingKey.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }) else { throw ConfigurationError.invalid("Invalid lab profile/key") }
        guard teacherHost == teacherHost.trimmingCharacters(in:.whitespacesAndNewlines), fingerprint.utf16.count == 64 else { throw ConfigurationError.invalid("Invalid endpoint") }
        try configuration().validate()
        guard teacherHost.lowercased() != "localhost", !teacherHost.lowercased().hasSuffix(".localhost") else { throw ConfigurationError.invalid("Use the teacher LAN address") }
        if teacherHost.range(of:"^[0-9.]+$",options:.regularExpression) != nil {
            var address = in_addr()
            guard inet_pton(AF_INET,teacherHost,&address) == 1 else { throw ConfigurationError.invalid("Invalid IPv4") }
            let b = teacherHost.split(separator:".").compactMap { Int($0) }
            guard b.count == 4, b[0] > 0, b[0] != 127, b[0] < 224, !(b[0] == 169 && b[1] == 254) else { throw ConfigurationError.invalid("Unusable teacher address") }
        }
    }
    func configuration(device:String = "MAC-" + String(UUID().uuidString.prefix(8))) -> ConnectionConfig {
        ConnectionConfig(role:.student,pairingKey:pairingKey,teacherHost:teacherHost,teacherPort:teacherPort,fingerprint:fingerprint.lowercased(),discovery:false,deviceName:device)
    }
    func matches(_ current:ConnectionConfig) -> Bool {
        current.role == .student && !current.discovery && current.teacherHost.lowercased() == teacherHost.lowercased() && current.teacherPort == teacherPort && current.fingerprint.lowercased() == fingerprint.lowercased() && current.pairingKey == pairingKey
    }
    static func read(_ url:URL) throws -> LabProfile {
        try KitIO.regular(url,maximum:8192)
        let data = try Data(contentsOf:url)
        guard let object = try JSONSerialization.jsonObject(with:data) as? [String:Any], Set(object.keys) == Set(["version","teacherHost","teacherPort","fingerprint","pairingKey"]) else { throw ConfigurationError.invalid("Unknown profile fields") }
        // Foundation accepts duplicate JSON keys. Count only top-level, unquoted colons so
        // duplicates cannot silently change the endpoint or key across platform decoders.
        var quoted = false, escaped = false, depth = 0, members = 0
        for b in data {
            if quoted { if escaped { escaped = false } else if b == 92 { escaped = true } else if b == 34 { quoted = false }; continue }
            if b == 34 { quoted = true } else if b == 123 || b == 91 { depth += 1 } else if b == 125 || b == 93 { depth -= 1 } else if b == 58 && depth == 1 { members += 1 }
        }
        guard members == 5 else { throw ConfigurationError.invalid("Duplicate profile fields") }
        let result = try JSONDecoder().decode(LabProfile.self,from:data);try result.validate();return result
    }
    func writeNew(_ url:URL) throws {
        try validate();let encoder=JSONEncoder();encoder.outputFormatting=[.prettyPrinted,.sortedKeys]
        try KitIO.writePrivate(try encoder.encode(self),to:url)
    }
}

enum KitIO {
    static let files = ["FBS-LabSetup-Windows.exe","FBS-LabSetup-Mac","Prepare-Teacher-Windows.cmd","Prepare-Teacher-Mac.command","Setup-Student-Windows.cmd","Setup-Student-Mac.command","README-AR.md"]
    static func regular(_ url:URL,maximum:Int) throws {
        var attributes=stat()
        guard lstat(url.path,&attributes) == 0, attributes.st_mode & S_IFMT == S_IFREG, attributes.st_size > 0, attributes.st_size <= maximum else { throw ConfigurationError.invalid("Missing, linked, empty or oversized file") }
    }
    static func privateDirectory(_ url:URL) throws {
        guard mkdir(url.path,0o700) == 0 else { throw ConfigurationError.invalid("Output directory exists or cannot be created") }
    }
    static func writePrivate(_ data:Data,to url:URL) throws {
        let fd = open(url.path,O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW,0o600)
        guard fd >= 0 else { throw ConfigurationError.invalid("Output profile exists or cannot be created") };defer { close(fd) }
        try data.withUnsafeBytes { buffer in
            var offset=0
            while offset<buffer.count { let amount=Darwin.write(fd,buffer.baseAddress!.advanced(by:offset),buffer.count-offset);guard amount>0 else { throw ConfigurationError.invalid("Profile write failed") };offset+=amount }
        }
        guard fsync(fd) == 0 else { throw ConfigurationError.invalid("Profile sync failed") }
    }
    static func export(_ profile:LabProfile,to destination:URL,templates:URL) throws {
        try profile.validate()
        for file in files { try regular(templates.appendingPathComponent(file),maximum:250_000_000) }
        try privateDirectory(destination)
        for file in files {
            let target=destination.appendingPathComponent(file);try FileManager.default.copyItem(at:templates.appendingPathComponent(file),to:target)
            try FileManager.default.setAttributes([.posixPermissions:file.hasSuffix(".command") || file == "FBS-LabSetup-Mac" ? 0o700 : 0o600],ofItemAtPath:target.path)
        }
        try profile.writeNew(destination.appendingPathComponent("lab-profile.json"))
    }
}

struct StudentKeychain {
    let service:String
    init(service:String = "com.fbsclassroom.macos.preview") { self.service=service }
    var query:[String:Any] { [kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:service,kSecAttrAccount as String:"student"] }
    func load() throws -> ConnectionConfig? {
        var q=query;q[kSecReturnData as String]=true;q[kSecMatchLimit as String]=kSecMatchLimitOne
        var item:CFTypeRef?;let status=SecItemCopyMatching(q as CFDictionary,&item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess,let data=item as? Data else { throw ConfigurationError.invalid("Student Keychain unavailable; nothing replaced") }
        let config=try JSONDecoder().decode(ConnectionConfig.self,from:data);guard config.role == .student else { throw ConfigurationError.invalid("Wrong Keychain role") };try config.validate();return config
    }
    func apply(_ profile:LabProfile) throws -> String {
        try profile.validate()
        if let old=try load() { guard profile.matches(old) else { throw ConfigurationError.invalid("Existing student settings differ; nothing replaced") };return "unchanged" }
        let config=profile.configuration();var q=query;q[kSecValueData as String]=try JSONEncoder().encode(config);q[kSecAttrAccessible as String]=kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        // Add-only: a concurrent importer cannot replace an existing identity/configuration.
        guard SecItemAdd(q as CFDictionary,nil) == errSecSuccess else { throw ConfigurationError.invalid("Student configuration already exists or Keychain refused the import") }
        return "configured"
    }
}

@main enum LabSetup {
    static func main() {
        do {
            let args=Array(CommandLine.arguments.dropFirst())
            if args == ["self-test"] { try ProvisioningChecks.run();return }
            guard getuid() != 0 else { throw ConfigurationError.invalid("Run under the student/teacher account, not sudo/root") }
            if (1...3).contains(args.count),args[0] == "export" {
                guard let saved=try PlatformServices.load(.teacher) else { throw ConfigurationError.invalid("Configure and run teacher M183 first") }
                let host:String
                if args.count>=2 { host=args[1] } else {
                    let addresses=PlatformServices.ipv4().components(separatedBy:"، ")
                    if addresses.count == 1 { host=addresses[0] } else {
                        print("اختر رقم عنوان المعلم المتصل بشبكة المعمل:");for (i,a) in addresses.enumerated(){print("\(i+1): \(a)")}
                        guard let line=readLine(),let choice=Int(line),choice>0,choice<=addresses.count else { throw ConfigurationError.invalid("Select one LAN interface") };host=addresses[choice-1]
                    }
                }
                let state=try PlatformServices.privateState(.teacher)
                // Export must never create/rotate a teacher certificate.
                try KitIO.regular(state.appendingPathComponent("teacher-cert.pem"),maximum:65536)
                try KitIO.regular(state.appendingPathComponent("teacher-key.pem"),maximum:65536)
                let (_,_,pin)=try PlatformServices.certificate(state)
                let profile=LabProfile(teacherHost:host,fingerprint:pin,pairingKey:saved.pairingKey)
                let parent=FileManager.default.urls(for:.desktopDirectory,in:.userDomainMask).first!
                let destination=args.count == 3 ? URL(fileURLWithPath:args[2]) : parent.appendingPathComponent("FBS-Student-Kit-"+String(UUID().uuidString.prefix(8)))
                let executable=URL(fileURLWithPath:CommandLine.arguments[0]).standardizedFileURL.resolvingSymlinksInPath()
                try KitIO.export(profile,to:destination,templates:executable.deletingLastPathComponent())
                print("تم إنشاء حزمة الطلاب الخاصة في: \(destination.path)")
                print("ملف lab-profile.json يحتوي مفتاح المعمل؛ انقله عبر وسيط موثوق ولا تنشره.");return
            }
            if args.count == 2,args[0] == "import" {
                let profile=try LabProfile.read(URL(fileURLWithPath:args[1]))
                let app=URL(fileURLWithPath:"/Applications/FBS Classroom Student.app")
                guard let bundle=Bundle(url:app),bundle.object(forInfoDictionaryKey:"CFBundleShortVersionString") as? String == "0.183.0",bundle.bundleIdentifier == "com.fbsclassroom.student.preview" else { throw ConfigurationError.invalid("Install Student M183 first") }
                guard NSRunningApplication.runningApplications(withBundleIdentifier:"com.fbsclassroom.student.preview").isEmpty else { throw ConfigurationError.invalid("Close student app first") }
                let outcome=try StudentKeychain().apply(profile)
                print("إعداد الطالب: \(outcome) | المعلم: \(profile.teacherHost):\(profile.teacherPort)")
                print("اعتمد هوية الجهاز من لوحة المعلم. أذونات macOS المطلوبة تُمنح محليًا؛ لم يُمنح التحكم تلقائيًا.")
                _ = try PlatformServices.run("/usr/bin/open",[app.path]);return
            }
            throw ConfigurationError.invalid("Use export [teacher-LAN-IP] [new-folder] or import lab-profile.json")
        } catch {
            // No decoded JSON, lab key, teacher password or private key in terminal/log errors.
            if let safe = error as? ConfigurationError { fputs((safe.errorDescription ?? "Setup validation failed")+"\n",stderr) }
            fputs("تعذر إكمال الإعداد. أغلق تطبيق الطالب وتحقق من تثبيت M183 وحساب المستخدم وإعداد المعلم وملف الحزمة. الإعدادات الموجودة لا تُستبدل تلقائيًا. راجع README-AR.md.\n",stderr);exit(1)
        }
    }
}
