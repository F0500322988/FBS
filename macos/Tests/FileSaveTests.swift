import Foundation
import CryptoKit
@main struct FileSaveTests {
    static func main() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("fbs-file-save-" + UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true); defer { try? FileManager.default.removeItem(at: root) }
        let destination = root.appendingPathComponent("lesson.txt"), data = Data("FBS worksheet — نشاط".utf8), original = Data("original".utf8)
        let hash = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined(); var count = 0
        try original.write(to: destination)
        func rejected(_ data: Data, _ size: Int, _ digest: String) throws { do { try ReceivedFileWriter.write(data, expectedSize: size, hash: digest, destination: destination); fatalError("Invalid file accepted") } catch { count += 1 }; guard try Data(contentsOf: destination) == original else { fatalError("Existing file changed") }; count += 1 }
        try rejected(data,data.count,"bad"); try rejected(data,data.count+1,hash); try rejected(Data(),0,hash)
        try ReceivedFileWriter.write(data, expectedSize: data.count, hash: hash, destination: destination)
        guard try Data(contentsOf: destination) == data else { fatalError("Saved bytes mismatch") }; count += 1
        guard try FileManager.default.contentsOfDirectory(atPath: root.path).count == 1 else { fatalError("Temporary file leaked") }; count += 1
        print("{\"atomicFileSaveChecksPassed\":\(count),\"savePanelTested\":false}")
    }
}
