import Foundation
import Security
import Darwin

// Separate signed executable used only by CI to verify the configured consumer ACL.
// It can only query a randomized fixture namespace and never prints credential values.
@main enum KeychainConsumerCheck {
    static func main() {
        do {
            guard CommandLine.arguments.count == 2,CommandLine.arguments[1].hasPrefix("com.fbsclassroom.provisioning-test.") else { exit(2) }
            let query:[String:Any]=[kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:CommandLine.arguments[1],kSecAttrAccount as String:"student",kSecReturnData as String:true,kSecMatchLimit as String:kSecMatchLimitOne,kSecUseAuthenticationUI as String:kSecUseAuthenticationUIFail]
            var item:CFTypeRef?
            guard SecItemCopyMatching(query as CFDictionary,&item) == errSecSuccess,let data=item as? Data else { exit(1) }
            let config=try JSONDecoder().decode(ConnectionConfig.self,from:data);try config.validate()
            guard config.role == .student,config.teacherHost == "192.168.50.2",config.pairingKey == "012",config.fingerprint == String(repeating:"a",count:64) else { exit(1) }
            print("{\"fixtureCredentialReadWithoutUI\":true}")
        } catch { exit(1) }
    }
}
