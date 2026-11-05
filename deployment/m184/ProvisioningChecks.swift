import Foundation
import Security
import Darwin

enum ProvisioningChecks {
    static func run() throws {
        var count=0
        func check(_ condition:Bool,_ name:String) throws { guard condition else { throw ConfigurationError.invalid("FAIL: "+name) };count+=1;print("PASS: "+name) }
        func reject(_ name:String,_ action:() throws -> Void) throws { var failed=false;do {try action()}catch {failed=true};try check(failed,name) }
        let root=FileManager.default.temporaryDirectory.resolvingSymlinksInPath().appendingPathComponent("fbs-kit-fixture-"+UUID().uuidString)
        try KitIO.privateDirectory(root)
        let store=StudentKeychain(service:"com.fbsclassroom.provisioning-test."+UUID().uuidString,consumerExecutable:CommandLine.arguments[0])
        defer { SecItemDelete(store.query as CFDictionary) }
        let profile=LabProfile(teacherHost:"192.168.50.2",fingerprint:String(repeating:"a",count:64),pairingKey:"fixture-only-pairing-key-184")
        let file=root.appendingPathComponent("lab-profile.json");try profile.writeNew(file)
        try check(LabProfile.read(file) == profile,"portable profile round trip")
        var attrs=stat();_ = lstat(file.path,&attrs);try check(attrs.st_mode & 0o777 == 0o600,"exported profile mode is 600")
        for host in ["127.0.0.1","127.1","localhost","x.localhost","0.0.0.0","169.254.2.3","224.0.0.1","255.255.255.255","999.2.3.4","teacher..local","https://teacher","teacher.local/","teacher.local\n"] {
            var invalid=profile;invalid.teacherHost=host;try reject("reject unusable teacher address") { try invalid.validate() }
        }
        for port in [0,65536] {var invalid=profile;invalid.teacherPort=port;try reject("reject port") {try invalid.validate()} }
        var invalid=profile;invalid.fingerprint="bad";try reject("reject fingerprint") {try invalid.validate()}
        invalid=profile;invalid.pairingKey="short";try reject("reject short key") {try invalid.validate()}
        invalid=profile;invalid.pairingKey=String(repeating:"a",count:257);try reject("cross-platform key bound") {try invalid.validate()}
        invalid=profile;invalid.pairingKey="fixture-key-with\nnewline";try reject("no control characters") {try invalid.validate()}
        let bad=root.appendingPathComponent("invalid.json");let raw=String(data:try Data(contentsOf:file),encoding:.utf8)!
        try KitIO.writePrivate(Data(raw.replacingOccurrences(of:"\"version\" : 1",with:"\"version\" : 1, \"deviceId\":\"CLONE\"").utf8),to:bad)
        // Use JSONSerialization here to guarantee a genuinely additional field regardless of encoder whitespace.
        var object=try JSONSerialization.jsonObject(with:Data(raw.utf8)) as! [String:Any];object["deviceId"]="CLONE";try JSONSerialization.data(withJSONObject:object).write(to:bad)
        try reject("identity field rejected") {_ = try LabProfile.read(bad)}
        let duplicate="{\"version\":1,\"version\":1,\"teacherHost\":\"192.168.50.2\",\"teacherPort\":4180,\"fingerprint\":\""+profile.fingerprint+"\",\"pairingKey\":\"fixture-only-pairing-key-184\"}"
        try Data(duplicate.utf8).write(to:bad);try reject("duplicate fields rejected") {_ = try LabProfile.read(bad)}
        try Data(repeating:65,count:8193).write(to:bad);try reject("oversized profile rejected") {_ = try LabProfile.read(bad)}
        let linked=root.appendingPathComponent("linked.json");try FileManager.default.createSymbolicLink(at:linked,withDestinationURL:file);try reject("symlink profile rejected") {_ = try LabProfile.read(linked)}
        try check(store.apply(profile) == "configured","real Keychain add for isolated fixture service")
        let restored=try store.load()!;try check(profile.matches(restored),"native student Codable configuration compatible")
        try check(restored.deviceName.hasPrefix("MAC-") && restored.deviceName.count>4,"fresh student name generated on target")
        try check(store.apply(profile) == "unchanged","same profile import idempotent")
        try check(store.load()!.deviceName == restored.deviceName,"repeat import preserves device identifier")
        invalid=profile;invalid.pairingKey="different-fixture-key-184";try reject("different key cannot replace current lab") {_ = try store.apply(invalid)}
        invalid=profile;invalid.teacherHost="192.168.60.2";try reject("different endpoint cannot replace current lab") {_ = try store.apply(invalid)}
        try check(store.load()!.deviceName == restored.deviceName && store.load()!.pairingKey == restored.pairingKey,"rejected import preserves student configuration")
        let other=profile.configuration();try check(other.deviceName != restored.deviceName,"two fresh targets do not clone identity")
        let env=try restored.studentEnvironment(state:root,token:String(repeating:"b",count:64));try check(env["FBS_TEACHER_FINGERPRINT"] == profile.fingerprint && env["FBS_TEACHER_HOST"] == profile.teacherHost,"native runtime receives pinned endpoint")
        try check(env["FBS_TEACHER_PASSWORD"] == nil,"no teacher password in student runtime")
        let templates=root.appendingPathComponent("templates");try KitIO.privateDirectory(templates)
        for name in KitIO.files { try KitIO.writePrivate(Data("owned fixture".utf8),to:templates.appendingPathComponent(name)) }
        let kit=root.appendingPathComponent("kit");try KitIO.export(profile,to:kit,templates:templates)
        try check(LabProfile.read(kit.appendingPathComponent("lab-profile.json")) == profile,"private kit export with required launchers")
        try reject("existing destination never replaced") {try KitIO.export(profile,to:kit,templates:templates)}
        try FileManager.default.removeItem(at:templates.appendingPathComponent(KitIO.files[0]));try reject("missing template fails before export") {try KitIO.export(profile,to:root.appendingPathComponent("missing"),templates:templates)}
        try check(!FileManager.default.fileExists(atPath:root.appendingPathComponent("missing").path),"incomplete export does not create output")
        for folder in [templates,kit] { for p in try FileManager.default.contentsOfDirectory(at:folder,includingPropertiesForKeys:nil) {try FileManager.default.removeItem(at:p)};try FileManager.default.removeItem(at:folder) }
        for p in [file,bad,linked] {try FileManager.default.removeItem(at:p)};try FileManager.default.removeItem(at:root)
        print("{\"stage\":\"M184\",\"macProvisioningChecks\":\(count),\"keychainRoundTripPassed\":true,\"nativeStudentCompatibilityPassed\":true,\"actualUserLabTested\":false,\"secretsPrinted\":false}")
    }
}
