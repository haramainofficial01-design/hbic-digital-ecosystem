"""Local exploratory ASR only. No canonical words, remote audio or fabricated timings.

Runs official Apache-2.0 Qwen3-ASR weights through pinned Transformers. Reuses
the existing development torch/numpy runtime without modifying its packages.
Additional libraries live in an isolated ignored directory. Not shipped in HBIC.
"""
import base64
import hashlib
import json
import sys
from pathlib import Path


def main():
    root = Path(sys.argv[1]).resolve()
    approved = {
        "qwen-comparison": ("Qwen/Qwen3-ASR-0.6B-hf", "7f1569a48a89f3e3f4dc3a5c9d28bddd903bc76c", "d3f212dd20abecd315d830bc54ae3865e56ebfc3276484e57b771288ba27fd35"),
        "qwen-1.7b-comparison": ("Qwen/Qwen3-ASR-1.7B-hf", "bcd2b5b7f32b480ab5790554cfa8347f246a14f3", "2db53c7d81bd9b8cbc6a074e89be2c968a0d373fb4ee68bb1b1e14f7042dfee1")
    }
    if root.name not in approved or root != Path("output/quran-development", root.name).resolve():
        raise ValueError("Use the explicit ignored comparison directory")
    # All variants share one isolated package target, never duplicate torch.
    sys.path.insert(0, str(Path("output/quran-development/qwen-comparison/libraries").resolve()))
    import numpy as np
    import torch
    import transformers
    from transformers import AutoProcessor, Qwen3ASRForConditionalGeneration

    manifest = json.loads((root / "assets/verified-manifest.json").read_text())
    repository, revision, model_hash = approved[root.name]
    if manifest["repository"] != repository or manifest["revision"] != revision:
        raise ValueError("Unexpected model provenance")
    if manifest["verifiedSha256"]["model.safetensors"] != model_hash:
        raise ValueError("Unexpected model hash")
    for name, expected in manifest["verifiedSha256"].items():
        if Path(name).name != name:
            raise ValueError("Unexpected asset path")
        with (root / "assets" / name).open("rb") as stream:
            if hashlib.file_digest(stream, "sha256").hexdigest() != expected:
                raise ValueError("Unverified model asset")
    if transformers.__version__ != "5.19.0":
        raise ValueError("Use pinned Transformers 5.19.0")
    torch.set_num_threads(2)
    mode = sys.argv[2] if len(sys.argv) > 2 else "auto"
    if mode not in ("auto", "cpu-f32", "mps-f32"):
        raise ValueError("Explicit supported runtime comparison required")
    device = "cpu" if mode == "cpu-f32" or not torch.backends.mps.is_available() else "mps"
    if mode == "mps-f32" and device != "mps":
        raise ValueError("Requested MPS comparison is unavailable")
    dtype = torch.bfloat16 if device == "mps" and mode == "auto" else torch.float32
    processor = AutoProcessor.from_pretrained(root / "assets", local_files_only=True, trust_remote_code=False)
    model = Qwen3ASRForConditionalGeneration.from_pretrained(root / "assets", local_files_only=True,
        trust_remote_code=False, dtype=dtype, attn_implementation="sdpa").to(device).eval()
    print(json.dumps({"ready": True, "device": device, "dtype": str(dtype), "versions": {
        "torch": torch.__version__, "numpy": np.__version__, "transformers": transformers.__version__},
        "canonicalPrompt": False, "forcedAlignment": False}), flush=True)
    for line in sys.stdin:
        if len(line) > 192000 * 6:
            raise ValueError("Request exceeds twelve-second offline bound")
        request = json.loads(line)
        if set(request) != {"pcm"}:
            raise ValueError("Only waveform PCM is accepted, never an expected answer")
        data = bytearray(base64.b64decode(request["pcm"], validate=True))
        if not 64000 <= len(data) <= 192000 * 4 or len(data) % 4:
            raise ValueError("Invalid bounded 16 kHz mono PCM")
        pcm = np.frombuffer(data, dtype="<f4")
        if not np.isfinite(pcm).all() or np.abs(pcm).max() > 1.00001:
            raise ValueError("Invalid acoustic samples")
        try:
            inputs = processor.apply_transcription_request(audio=pcm, sampling_rate=16000, language="Arabic").to(device, dtype)
            with torch.inference_mode():
                output = model.generate(**inputs, do_sample=False, max_new_tokens=128)
            emitted = output[:, inputs["input_ids"].shape[1]:]
            text = processor.decode(emitted, return_format="transcription_only")[0]
            eos = model.generation_config.eos_token_id
            eos = [eos] if isinstance(eos, int) else eos
            truncated = emitted.shape[1] >= 128 and int(emitted[0, -1]) not in (eos or [])
            print(json.dumps({"text": text, "generatedTokens": emitted.shape[1], "truncated": truncated,
                "wordTimestamps": None, "acousticConfidence": None}, ensure_ascii=False), flush=True)
            del inputs, output, emitted
        finally:
            pcm.fill(0)
            del data, pcm, request


if __name__ == "__main__":
    main()
