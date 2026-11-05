import Foundation
import CryptoKit
enum ReceivedFileWriter {
    static func write(_ data: Data, expectedSize: Int, hash: String, destination: URL) throws {
        guard !data.isEmpty, data.count <= 5 * 1024 * 1024, data.count == expectedSize, SHA256.hash(data: data).map({ String(format: "%02x", $0) }).joined() == hash, destination.isFileURL, destination.path.hasPrefix("/") else { throw ConfigurationError.invalid("فشل فحص الملف أو عنوان الحفظ") }
        try data.write(to: destination, options: .atomic)
    }
}
