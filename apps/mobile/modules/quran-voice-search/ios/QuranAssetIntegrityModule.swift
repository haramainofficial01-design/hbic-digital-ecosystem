import ExpoModulesCore
import Foundation
import CryptoKit

/// Stream model verification off the JS/UI thread, with bounded memory.
public class QuranAssetIntegrityModule: Module {
    public func definition() -> ModuleDefinition {
        Name("QuranAssetIntegrity")
        AsyncFunction("sha256File") { (uri: String) -> String in
            guard let file = URL(string: uri), file.isFileURL,
                  let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first,
                  file.resolvingSymlinksInPath().path.hasPrefix(documents.resolvingSymlinksInPath().appendingPathComponent("recite-assist").path + "/")
            else { throw NSError(domain: "HBICQuranIntegrity", code: 1) }
            let size = try file.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
            guard size > 0 && size <= 128_000_000 else { throw NSError(domain: "HBICQuranIntegrity", code: 2) }
            let handle = try FileHandle(forReadingFrom: file)
            defer { try? handle.close() }
            var hash = SHA256(), bytes = 0
            while let data = try handle.read(upToCount: 65_536), !data.isEmpty {
                bytes += data.count
                guard bytes <= 128_000_000 else { throw NSError(domain: "HBICQuranIntegrity", code: 3) }
                hash.update(data: data)
            }
            guard bytes == size else { throw NSError(domain: "HBICQuranIntegrity", code: 4) }
            return hash.finalize().map { String(format: "%02x", $0) }.joined()
        }.runOnQueue(.global(qos: .utility))
    }
}
