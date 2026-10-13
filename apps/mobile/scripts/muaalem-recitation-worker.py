"""Exploratory phoneme inference only, never a pronunciation or religious grade.

The encoder/all classifier weights are reconstructed with the standard HF
Wav2Vec2-BERT modules using the official checkpoint's exact named state. Follows
the architecture documented in obadx/quran-muaalem (MIT, Abdullah 2025).
No reference words/phones, grammar or forced alignment enter this recognizer.
"""
import base64
import hashlib
import json
import sys
from pathlib import Path


def main():
    root = Path(sys.argv[1]).resolve()
    if root != Path("output/quran-development/muaalem-comparison").resolve():
        raise ValueError("Use the explicit ignored phoneme experiment directory")
    sys.path.insert(0, str(Path("output/quran-development/qwen-comparison/libraries").resolve()))
    import numpy as np
    import torch
    import transformers
    from safetensors.torch import load_file
    from transformers import SeamlessM4TFeatureExtractor, Wav2Vec2BertConfig, Wav2Vec2BertModel
    from torch import nn

    manifest = json.loads((root / "assets/verified-manifest.json").read_text())
    if manifest["repository"] != "obadx/muaalem-model-v3_2" or manifest["revision"] != "01a1ef9fbe40d144ef845101e89ff924aed3fef5":
        raise ValueError("Unexpected phoneme model provenance")
    if manifest["verifiedSha256"]["model.safetensors"] != "6b6a2e85303d17ff0f3af5e1fc79ac83daecee409c756ddf27f0ced59393bb41":
        raise ValueError("Unexpected phoneme model hash")
    pinned_files = {
        "README.md": (5465, "55dc3c8658188bb99cc790e188bf30120465bb16"),
        "config.json": (2183, "14f2fea5b796d638136a96d87474dfa5657fbd97"),
        "model.safetensors": (2423124012, None),
        "preprocessor_config.json": (275, "5db61951cdf5edab6337fd84ee619500c27aaa3d"),
        "vocab.json": (1532, "0f3243cbca95a345be319f91cf05d330827f13e3"),
    }
    if set(manifest["verifiedSha256"]) != set(pinned_files):
        raise ValueError("Every pinned phoneme model asset is required")
    for name, expected in manifest["verifiedSha256"].items():
        if Path(name).name != name:
            raise ValueError("Unexpected model asset path")
        file = root / "assets" / name
        size, git_hash = pinned_files[name]
        if file.stat().st_size != size:
            raise ValueError("Unexpected pinned phoneme asset size")
        if git_hash is not None:
            if hashlib.sha1(f"blob {size}\0".encode() + file.read_bytes()).hexdigest() != git_hash:
                raise ValueError("Phoneme configuration/vocabulary differs from the official pinned repository")
        with file.open("rb") as stream:
            if hashlib.file_digest(stream, "sha256").hexdigest() != expected:
                raise ValueError("Unverified phoneme model asset")
    if transformers.__version__ != "5.19.0":
        raise ValueError("Use pinned development Transformers 5.19.0")
    config_data = json.loads((root / "assets/config.json").read_text())
    vocab = json.loads((root / "assets/vocab.json").read_text())["phonemes"]
    if config_data["level_to_vocab_size"]["phonemes"] != 43 or vocab["[PAD]"] != 0 or len(vocab) != 43:
        raise ValueError("Unexpected official phoneme vocabulary")
    configuration = Wav2Vec2BertConfig.from_dict(config_data)

    class AcousticHeads(nn.Module):
        def __init__(self):
            super().__init__()
            self.wav2vec2_bert = Wav2Vec2BertModel(configuration)
            self.dropout = nn.Dropout(configuration.final_dropout)
            self.level_to_lm_head = nn.ModuleDict({level: nn.Linear(configuration.output_hidden_size, count)
                for level, count in config_data["level_to_vocab_size"].items()})

        def forward(self, **inputs):
            hidden = self.wav2vec2_bert(**inputs).last_hidden_state
            return self.level_to_lm_head["phonemes"](self.dropout(hidden))

    torch.set_num_threads(2)
    model = AcousticHeads()
    checkpoint = load_file(root / "assets/model.safetensors", device="cpu")
    # Every original encoder and every classifier must match. No random/missing
    # parameters, renamed guesses, silently ignored heads or partial loading.
    model.load_state_dict(checkpoint, strict=True)
    del checkpoint
    model.eval()
    mode = sys.argv[2] if len(sys.argv) > 2 else "cpu"
    if mode not in ("cpu", "mps"):
        raise ValueError("Explicit supported phoneme runtime required")
    if mode == "mps" and not torch.backends.mps.is_available():
        raise ValueError("Requested phoneme MPS runtime unavailable")
    model.to(mode, dtype=torch.float32)
    extractor = SeamlessM4TFeatureExtractor.from_pretrained(root / "assets", local_files_only=True)
    id_to_token = {index: token for token, index in vocab.items()}
    print(json.dumps({"ready": True, "device": mode, "dtype": "float32", "weightsStrictlyMatched": True,
        "canonicalPrompt": False, "forcedAlignment": False, "wordRecognitionQualified": False,
        "vocab": id_to_token, "versions": {"torch": torch.__version__, "transformers": transformers.__version__, "numpy": np.__version__}}), flush=True)
    for line in sys.stdin:
        if len(line) > 192000 * 6:
            raise ValueError("Phoneme request exceeds twelve-second bound")
        request = json.loads(line)
        if set(request) != {"pcm"}:
            raise ValueError("Recognizer accepts only audio PCM, never its expected answer")
        data = bytearray(base64.b64decode(request["pcm"], validate=True))
        if not 64000 <= len(data) <= 192000 * 4 or len(data) % 4:
            raise ValueError("Invalid bounded mono 16 kHz PCM")
        pcm = np.frombuffer(data, dtype="<f4")
        if not np.isfinite(pcm).all() or np.abs(pcm).max() > 1.00001:
            raise ValueError("Invalid phoneme acoustic samples")
        try:
            inputs = extractor(pcm, sampling_rate=16000, return_tensors="pt").to(mode)
            with torch.inference_mode():
                logits = model(**inputs)
                acoustic = torch.log_softmax(logits[0], dim=-1).cpu().numpy().astype("<f4")
            if acoustic.ndim != 2 or acoustic.shape[1] != 43 or not np.isfinite(acoustic).all():
                raise ValueError("Invalid actual phoneme emissions")
            ids = acoustic.argmax(axis=1)
            emitted = [int(value) for index, value in enumerate(ids) if value != 0 and (index == 0 or value != ids[index - 1])]
            print(json.dumps({"phonemes": "".join(id_to_token[value] for value in emitted), "timeSteps": acoustic.shape[0],
                "vocabSize": 43, "blankId": 0, "logprobs": base64.b64encode(acoustic.tobytes()).decode("ascii")}, ensure_ascii=False), flush=True)
            acoustic.fill(0)
            del inputs, logits, acoustic, ids, emitted
        finally:
            pcm.fill(0)
            del pcm, data, request


if __name__ == "__main__":
    main()
