import Foundation
@main struct ConfigTests {
    static func main() throws {
        var count = 0
        func check(_ condition: @autoclosure () -> Bool) { precondition(condition()); count += 1 }
        func rejected(_ config: ConnectionConfig) { do { try config.validate(); fatalError("Invalid configuration accepted") } catch { count += 1 } }
        var config = ConnectionConfig(role: .student, pairingKey: "test-only-lab-key-123", teacherHost: "teacher.local", fingerprint: String(repeating: "a", count: 64), deviceName: "MAC-01")
        try config.validate(); count += 1
        let restored = try JSONDecoder().decode(ConnectionConfig.self, from: JSONEncoder().encode(config)); check(restored.deviceName == config.deviceName)
        let env = try config.studentEnvironment(state: URL(fileURLWithPath: "/tmp/fbs-config-test-only"), token: String(repeating: "b", count: 64))
        check(env["FBS_TEACHER_HOST"] == "teacher.local"); check(env["FBS_LOCAL_PORT"] == "0"); check(env["FBS_DEVICE_ID"] == "MAC-01"); check(env["FBS_TEACHER_PASSWORD"] == nil)
        var invalid = config; invalid.pairingKey = "short"; rejected(invalid)
        invalid = config; invalid.deviceName = "../bad"; rejected(invalid)
        for host in ["https://teacher", "teacher..local", "-teacher.local", "teacher.local/", "", "teacher.local "] { invalid = config; invalid.teacherHost = host; rejected(invalid) }
        for port in [0, -1, 65536] { invalid = config; invalid.teacherPort = port; rejected(invalid) }
        invalid = config; invalid.fingerprint = "wrong"; rejected(invalid)
        config.discovery = true; config.teacherHost = ""; config.fingerprint = ""; try config.validate(); count += 1
        let discovered = try config.studentEnvironment(state: URL(fileURLWithPath: "/tmp/fbs-config-test-only"), token: String(repeating: "b", count: 64)); check(discovered["FBS_TEACHER_FINGERPRINT"] == nil)
        let teacher = ConnectionConfig(role: .teacher, pairingKey: "test-only-lab-key-123", teacherPassword: "test-only-password")
        try teacher.validate(); count += 1
        invalid = teacher; invalid.teacherPassword = "short"; rejected(invalid)
        do { _ = try teacher.studentEnvironment(state: URL(fileURLWithPath: "/tmp/fbs-config-test-only"), token: String(repeating: "b", count: 64)); fatalError("Teacher used student environment") } catch { count += 1 }
        print("{\"swiftConfigurationChecksPassed\":\(count),\"keychainTested\":false,\"guiTested\":false}")
    }
}
