import Foundation

enum CredentialPolicy {
    static func normalize(_ value: String) -> String {
        String(String.UnicodeScalarView(value.unicodeScalars.map { scalar in
            let v = scalar.value
            if (0x660...0x669).contains(v) { return UnicodeScalar(48 + v - 0x660)! }
            if (0x6f0...0x6f9).contains(v) { return UnicodeScalar(48 + v - 0x6f0)! }
            return scalar
        }))
    }
    static func isPin(_ value: String) -> Bool { value.range(of: "^[0-9]{8}$", options: .regularExpression) != nil && value.utf8.count == 8 }
    static func storedKey(_ value: String) -> Bool { isPin(value) || value.count >= 16 }
    static func storedPassword(_ value: String) -> Bool { isPin(value) || value.count >= 12 }
}

enum ClassroomRole: String, Codable { case teacher, student }
struct ConnectionConfig: Codable {
    var role: ClassroomRole
    var pairingKey: String
    var teacherPassword: String = ""
    var teacherHost: String = "127.0.0.1"
    var teacherPort: Int = 4180
    var fingerprint: String = ""
    var discovery: Bool = false
    var deviceName: String = "MAC-" + String(UUID().uuidString.prefix(8))
    func validate() throws {
        func require(_ condition: Bool, _ message: String) throws { if !condition { throw ConfigurationError.invalid(message) } }
        try require(CredentialPolicy.storedKey(pairingKey) && pairingKey.count <= 1024, "مفتاح المعمل يجب أن يكون 8 أرقام")
        if role == .teacher { try require(CredentialPolicy.storedPassword(teacherPassword) && teacherPassword.count <= 1024, "كلمة مرور المعلم يجب أن تكون 8 أرقام") }
        else {
            try require(deviceName.range(of: "^[A-Za-z0-9_.-]{1,64}$", options: .regularExpression) != nil, "اسم الجهاز يجب أن يستخدم أحرفًا إنجليزية وأرقامًا وشرطة فقط")
            if !discovery {
                try require(teacherHost.count <= 253 && teacherHost.range(of: "^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$", options: .regularExpression) != nil, "عنوان المعلم غير صالح")
                try require(teacherHost.split(separator: ".", omittingEmptySubsequences: false).allSatisfy { !$0.isEmpty && $0.count <= 63 && !$0.hasPrefix("-") && !$0.hasSuffix("-") }, "عنوان المعلم غير صالح")
                try require((1...65535).contains(teacherPort), "منفذ المعلم غير صالح")
                try require(fingerprint.range(of: "^[A-Fa-f0-9]{64}$", options: .regularExpression) != nil, "أدخل بصمة شهادة المعلم SHA-256 كاملة")
            }
        }
    }
    func studentEnvironment(state: URL, token: String) throws -> [String: String] {
        try validate()
        guard role == .student, token.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil else { throw ConfigurationError.invalid("Invalid role or local token") }
        var result = ["FBS_PAIRING_KEY": pairingKey, "FBS_LOCAL_CONTROL_TOKEN": token, "FBS_LOCAL_PORT": "0", "FBS_DEVICE_ID": deviceName, "FBS_IDENTITY_FILE": state.appendingPathComponent("device-identity.json").path]
        if !discovery { result["FBS_TEACHER_HOST"] = teacherHost; result["FBS_TEACHER_PORT"] = String(teacherPort); result["FBS_TEACHER_FINGERPRINT"] = fingerprint.lowercased() }
        return result
    }
}
enum ConfigurationError: LocalizedError {
    case invalid(String)
    var errorDescription: String? { if case .invalid(let message) = self { return message }; return "Configuration error" }
}
