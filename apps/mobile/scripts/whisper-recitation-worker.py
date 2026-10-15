"""Independent local waveform-only baseline, never an expected-ayah prompt.

Pinned Whisper weights through the existing isolated Transformers runtime.
No API, user recording, reference forcing, invented word times or native export.
"""
import base64
import hashlib
import json
import sys
from pathlib import Path


def main():
    root = Path(sys.argv[1]).resolve()
    approved = {
        "whisper-turbo-comparison": ("openai/whisper-large-v3-turbo", "41f01f3fe87f28c78e2fbf8b568835947dd65ed9", "MIT", "542566a422ae4f3fd23f1ba11add198fca01bbf82e66e6a2857b3f608b1eb9d1"),
        "tadabur-medium-comparison": ("rakansuliman/tadabur-whisper-medium", "e82c2d827ad0df27e31042f7fb87c73df1da2c8b", "CC-BY-NC-4.0", "9e3e7472373fa6570350e0c67c624307b18a35b2efee62cb00d6f46b944b6f27")
    }
    if root.name not in approved or root != Path("output/quran-development", root.name).resolve():
        raise ValueError("Explicit ignored comparison directory required")
    sys.path.insert(0, str(Path("output/quran-development/qwen-comparison/libraries").resolve()))
    import numpy as np
    import torch
    import transformers
    from transformers import AutoProcessor, WhisperForConditionalGeneration

    manifest = json.loads((root / "assets/verified-manifest.json").read_text())
    repository, revision, license_id, model_hash = approved[root.name]
    if (manifest["repository"] != repository or manifest["revision"] != revision
            or manifest["license"] != license_id or manifest["verifiedSha256"]["model.safetensors"] != model_hash):
        raise ValueError("Pinned upstream model provenance required")
    if any(name.startswith(("reciter_", "quran_", "sheikh_", "surah_")) for name in manifest["verifiedSha256"]):
        raise ValueError("Only ASR assets, never speaker identity or canonical restoration")
    for name, expected in manifest["verifiedSha256"].items():
        if Path(name).name != name:
            raise ValueError("Unexpected asset path")
        with (root / "assets" / name).open("rb") as stream:
            if hashlib.file_digest(stream, "sha256").hexdigest() != expected:
                raise ValueError("Unverified model asset")
    if transformers.__version__ != "5.19.0":
        raise ValueError("Pinned comparison runtime required")
    mode = sys.argv[2]
    if mode not in ("auto", "cpu-f32", "mps-f32"):
        raise ValueError("Explicit supported runtime required")
    device = "cpu" if mode == "cpu-f32" or not torch.backends.mps.is_available() else "mps"
    if mode == "mps-f32" and device != "mps":
        raise ValueError("Requested MPS runtime is unavailable")
    torch.set_num_threads(2)
    dtype = torch.float16 if device == "mps" and mode == "auto" else torch.float32
    processor = AutoProcessor.from_pretrained(root / "assets", local_files_only=True, trust_remote_code=False)
    model = WhisperForConditionalGeneration.from_pretrained(root / "assets", local_files_only=True,
        trust_remote_code=False, dtype=dtype, attn_implementation="sdpa").to(device).eval()
    tadabur = root.name == "tadabur-medium-comparison"
    beam_width = 1 if tadabur else 5
    print(json.dumps({"ready": True, "device": device, "dtype": str(dtype), "beamWidth": beam_width,
        "versions": {"torch": torch.__version__, "numpy": np.__version__, "transformers": transformers.__version__},
        "canonicalPrompt": False, "forcedAlignment": False}), flush=True)
    for line in sys.stdin:
        if len(line) > 192000 * 6:
            raise ValueError("Request exceeds bounded whole-utterance comparison")
        request = json.loads(line)
        if set(request) != {"pcm"}:
            raise ValueError("Only PCM is accepted, not an expected answer")
        data = bytearray(base64.b64decode(request["pcm"], validate=True))
        if not 64000 <= len(data) <= 192000 * 4 or len(data) % 4:
            raise ValueError("Bounded 16 kHz mono float PCM required")
        pcm = np.frombuffer(data, dtype="<f4")
        if not np.isfinite(pcm).all() or np.abs(pcm).max() > 1.00001:
            raise ValueError("Invalid actual acoustic samples")
        try:
            inputs = processor(pcm, sampling_rate=16000, return_tensors="pt", return_attention_mask=True).to(device, dtype)
            with torch.inference_mode():
                options = {"suppress_tokens": [], "forced_decoder_ids": None} if tadabur else {}
                output = model.generate(**inputs, language="ar", task="transcribe", do_sample=False,
                    num_beams=beam_width, max_new_tokens=128, return_timestamps=False, **options)
            text = processor.batch_decode(output, skip_special_tokens=True)[0]
            eos = model.generation_config.eos_token_id
            eos = [eos] if isinstance(eos, int) else eos
            truncated = output.shape[1] >= 128 and int(output[0, -1]) not in (eos or [])
            print(json.dumps({"text": text, "generatedTokens": output.shape[1], "truncated": truncated,
                "wordTimestamps": None, "acousticConfidence": None}, ensure_ascii=False), flush=True)
            del inputs, output
        finally:
            pcm.fill(0)
            del data, pcm, request


if __name__ == "__main__":
    main()
