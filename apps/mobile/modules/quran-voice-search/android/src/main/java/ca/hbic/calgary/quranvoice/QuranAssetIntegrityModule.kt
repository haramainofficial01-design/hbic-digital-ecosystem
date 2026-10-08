package ca.hbic.calgary.quranvoice

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Queues
import java.io.File
import java.net.URI
import java.security.MessageDigest

class QuranAssetIntegrityModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("QuranAssetIntegrity")
    AsyncFunction("sha256File") { uri: String ->
      val context = appContext.reactContext ?: throw CodedException("File verification is unavailable.")
      val parsed = URI(uri)
      if (parsed.scheme != "file") throw CodedException("Only local model files may be verified.")
      val file = File(parsed).canonicalFile
      val root = File(context.filesDir, "recite-assist").canonicalPath + File.separator
      val size = file.length()
      if (!file.path.startsWith(root) || size !in 1..128_000_000) throw CodedException("Invalid recognition file.")
      val hash = MessageDigest.getInstance("SHA-256")
      var total = 0L
      file.inputStream().use { input ->
        val buffer = ByteArray(65_536)
        while (true) {
          val count = input.read(buffer)
          if (count < 0) break
          total += count
          if (total > 128_000_000) throw CodedException("Recognition file is too large.")
          hash.update(buffer, 0, count)
        }
      }
      if (total != size) throw CodedException("Recognition file changed during verification.")
      hash.digest().joinToString("") { "%02x".format(it.toInt() and 255) }
    }.runOnQueue(Queues.DEFAULT)
  }
}
