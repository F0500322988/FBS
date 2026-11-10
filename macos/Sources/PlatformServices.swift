import Foundation
import Security
import CryptoKit
import Darwin

enum PlatformServices {
    static func randomToken() throws -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else { throw ConfigurationError.invalid("تعذر إنشاء رمز آمن") }
        return bytes.map { String(format: "%02x", $0) }.joined()
    }
    static func keychain(_ role: ClassroomRole) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "com.fbsclassroom.macos.preview", kSecAttrAccount as String: role.rawValue]
    }
    static func load(_ role: ClassroomRole, allowInteraction: Bool = true) throws -> ConnectionConfig? {
        var query = keychain(role); query[kSecReturnData as String] = true; query[kSecMatchLimit as String] = kSecMatchLimitOne
        if !allowInteraction { query[kSecUseAuthenticationUI as String] = kSecUseAuthenticationUIFail }
        var item: CFTypeRef?; let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = item as? Data else { throw ConfigurationError.invalid("تعذر فتح إعدادات Keychain؛ لم يتم حذفها أو استبدالها") }
        let config = try JSONDecoder().decode(ConnectionConfig.self, from: data)
        guard config.role == role else { throw ConfigurationError.invalid("إعدادات الدور غير متطابقة") }
        try config.validate(); return config
    }
    static func save(_ config: ConnectionConfig) throws {
        try config.validate(); let data = try JSONEncoder().encode(config); let query = keychain(config.role)
        var status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if status == errSecItemNotFound { var item = query; item[kSecValueData as String] = data; status = SecItemAdd(item as CFDictionary, nil) }
        guard status == errSecSuccess else { throw ConfigurationError.invalid("تعذر حفظ إعدادات Keychain") }
    }
    static func privateState(_ role: ClassroomRole) throws -> URL {
        let base = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        let state = base.appendingPathComponent("FBSClassroomMac", isDirectory: true).appendingPathComponent(role.rawValue, isDirectory: true)
        try FileManager.default.createDirectory(at: state, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
        let attributes = try FileManager.default.attributesOfItem(atPath: state.path)
        guard attributes[.type] as? FileAttributeType == .typeDirectory, (attributes[.ownerAccountID] as? NSNumber)?.uint32Value == getuid() else { throw ConfigurationError.invalid("مجلد الإعدادات غير موثوق") }
        try FileManager.default.setAttributes([.posixPermissions: 0o700], ofItemAtPath: state.path); return state
    }
    static func run(_ executable: String, _ arguments: [String]) throws -> Data {
        let task = Process(), pipe = Pipe(); task.executableURL = URL(fileURLWithPath: executable); task.arguments = arguments
        task.standardOutput = pipe; task.standardError = FileHandle.nullDevice
        try task.run(); let output = pipe.fileHandleForReading.readDataToEndOfFile(); task.waitUntilExit()
        guard task.terminationStatus == 0 else { throw ConfigurationError.invalid("فشلت أداة النظام المطلوبة") }; return output
    }
    static func certificate(_ state: URL) throws -> (URL, URL, String) {
        let cert = state.appendingPathComponent("teacher-cert.pem"), key = state.appendingPathComponent("teacher-key.pem"), fm = FileManager.default
        let hasCert = fm.fileExists(atPath: cert.path), hasKey = fm.fileExists(atPath: key.path)
        guard hasCert == hasKey else { throw ConfigurationError.invalid("ملفات شهادة المعلم غير مكتملة؛ لن تُستبدل تلقائيًا") }
        if !hasCert {
            guard fm.createFile(atPath: key.path, contents: Data(), attributes: [.posixPermissions: 0o600]) else { throw ConfigurationError.invalid("تعذر إنشاء ملف مفتاح الشهادة") }
            do { _ = try run("/usr/bin/openssl", ["req", "-x509", "-newkey", "rsa:2048", "-sha256", "-nodes", "-keyout", key.path, "-out", cert.path, "-days", "365", "-subj", "/CN=FBS Classroom Local Teacher"]) }
            catch { throw ConfigurationError.invalid("تعذر إنشاء الشهادة؛ قد توجد ملفات غير مكتملة في مجلد الإعدادات") }
        }
        for file in [cert, key] {
            let attrs = try fm.attributesOfItem(atPath: file.path)
            guard attrs[.type] as? FileAttributeType == .typeRegular, (attrs[.ownerAccountID] as? NSNumber)?.uint32Value == getuid() else { throw ConfigurationError.invalid("ملف شهادة غير موثوق") }
            try fm.setAttributes([.posixPermissions: 0o600], ofItemAtPath: file.path)
        }
        let der = try run("/usr/bin/openssl", ["x509", "-in", cert.path, "-outform", "DER"])
        return (cert, key, SHA256.hash(data: der).map { String(format: "%02x", $0) }.joined())
    }
    static func ipv4() -> String {
        var pointer: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&pointer) == 0, let first = pointer else { return "غير متاح" }; defer { freeifaddrs(pointer) }
        var result = [String](), current: UnsafeMutablePointer<ifaddrs>? = first
        while let item = current {
            defer { current = item.pointee.ifa_next }
            guard let address = item.pointee.ifa_addr, address.pointee.sa_family == UInt8(AF_INET), item.pointee.ifa_flags & UInt32(IFF_LOOPBACK) == 0 else { continue }
            var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            if getnameinfo(address, socklen_t(address.pointee.sa_len), &host, socklen_t(host.count), nil, 0, NI_NUMERICHOST) == 0 { result.append(String(cString: host)) }
        }
        return result.isEmpty ? "لا يوجد عنوان IPv4 للشبكة" : result.joined(separator: "، ")
    }
}
