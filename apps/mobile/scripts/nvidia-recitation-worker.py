"""Experimental, offline evaluation ONLY. Not imported by the HBIC app.

Original NVIDIA Arabic FastConformer CTC/RNNT heads (CC BY 4.0) with a pinned
community encoder and independently implemented checkpoint-defined frontend.
No canonical Quran, grammar, prompt or expected answer enters recognition.
Public evaluation PCM crosses a private local pipe only; never written to disk.
Install pinned dependencies in an ignored development venv, not globally.
"""
import base64
import hashlib
import io
import json
import sys
import tarfile
from pathlib import Path

import numpy as np
import onnxruntime as ort
import sentencepiece as spm
import torch
import yaml
from rnnt_beam import rnnt_beam

OFFICIAL_HASH = "d29d19d7c054a5fc010ac6815e9cbb0dd1b21a30e0a7f7f2982e1fecaf0c3e31"
ENCODER_HASH = "a74e77489a9e48d689bac080a30c5e54b35e5f54171273771dba9c72752eade3"


def verified(path, expected):
    with path.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != expected:
            raise ValueError("Unverified model asset")


def main():
    root = Path(sys.argv[1]).resolve()
    mode = sys.argv[2] if len(sys.argv) > 2 else "ctc"
    if mode not in ("ctc", "rnnt", "rnnt-beam-4"):
        raise ValueError("Explicit supported decoder required")
    scope = sys.argv[3] if len(sys.argv) > 3 else "rolling"
    if scope not in ("rolling", "whole", "research-benchmark"):
        raise ValueError("Explicit supported evaluation scope required")
    maximum_samples = 16000 * 90 if scope == "research-benchmark" else 192000 if scope == "whole" else 96000
    if "/output/quran-development/" not in str(root) + "/":
        raise ValueError("Only ignored development model assets are supported")
    archive = root / "nvidia-ar-official.nemo"
    encoder = root / "nvidia-ar-ctc-encoder.onnx"
    verified(archive, OFFICIAL_HASH)
    verified(encoder, ENCODER_HASH)
    torch.set_num_threads(2)
    with tarfile.open(archive) as bundle:
        # Read known members in RAM. Never extract archive paths or unpickle
        # executable objects. The original checkpoint supplies its CTC head,
        # SentencePiece tokenizer, STFT window and mel filterbank.
        config = yaml.safe_load(bundle.extractfile("./model_config.yaml").read())
        state = torch.load(io.BytesIO(bundle.extractfile("./model_weights.ckpt").read()),
                           map_location="cpu", weights_only=True)
        tokenizer_path = config["tokenizer"]["model_path"].removeprefix("nemo:")
        if "/" in tokenizer_path or ".." in tokenizer_path:
            raise ValueError("Unexpected tokenizer path")
        tokenizer = spm.SentencePieceProcessor(model_proto=bundle.extractfile("./" + tokenizer_path).read())
    window = state["preprocessor.featurizer.window"]
    filters = state["preprocessor.featurizer.fb"]
    weight = state["ctc_decoder.decoder_layers.0.weight"]
    bias = state["ctc_decoder.decoder_layers.0.bias"]
    if tokenizer.get_piece_size() != 1024 or weight.shape != (1025, 512, 1):
        raise ValueError("Unexpected CTC vocabulary or head")
    if mode.startswith("rnnt"):
        lstm = torch.nn.LSTM(640, 640, 1)
        lstm.load_state_dict({key.removeprefix("decoder.prediction.dec_rnn.lstm."): value
            for key, value in state.items() if key.startswith("decoder.prediction.dec_rnn.lstm.")})
        lstm.eval()
        embedding = state["decoder.prediction.embed.weight"]
        joint = {key: value for key, value in state.items() if key.startswith("joint.")}
    del state
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(encoder), options, providers=["CPUExecutionProvider"])
    print(json.dumps({"ready": True, "mode": mode, "blankId": 1024,
                      "canonicalPrompt": False, "forcedAlignment": False, "wordRecognitionQualified": False,
                      "vocab": {str(i): tokenizer.id_to_piece(i) for i in range(1024)},
                      "versions": {"torch": torch.__version__, "onnxruntime": ort.__version__,
                                   "numpy": np.__version__, "sentencepiece": spm.__version__}}), flush=True)
    for line in sys.stdin:
        if len(line) > maximum_samples * 6:
            raise ValueError("Bounded evaluation PCM request required")
        request = json.loads(line)
        if set(request) != {"pcm"}:
            raise ValueError("Only independent waveform PCM is accepted")
        data = bytearray(base64.b64decode(request["pcm"], validate=True))
        if not 16000 * 4 <= len(data) <= maximum_samples * 4 or len(data) % 4:
            raise ValueError("Invalid bounded mono 16 kHz PCM")
        pcm = np.frombuffer(data, dtype="<f4")
        if not np.isfinite(pcm).all() or np.abs(pcm).max() > 1.00001:
            raise ValueError("Invalid evaluation PCM")
        x = torch.from_numpy(pcm).unsqueeze(0)
        x = torch.cat((x[:, :1], x[:, 1:] - .97 * x[:, :-1]), dim=1)
        with torch.no_grad():
            spectrum = torch.stft(x, n_fft=512, hop_length=160, win_length=400,
                                  window=window, center=True, return_complex=True)
            features = torch.log(torch.matmul(filters, spectrum.abs().square()) + 2 ** -24)
            features = (features - features.mean(dim=-1, keepdim=True)) / (
                features.std(dim=-1, keepdim=True, correction=1) + 1e-5)
            encoded, lengths = session.run(None, {"audio_signal": features.numpy(),
                "length": np.array([features.shape[-1]], dtype=np.int64)})
        frames = int(lengths[0])
        if not 0 < frames <= encoded.shape[2] <= (1128 if scope == "research-benchmark" else 200 if scope == "whole" else 100):
            raise ValueError("Unexpected encoder frames")
        with torch.no_grad():
            if mode == "ctc":
                logits = torch.nn.functional.conv1d(torch.from_numpy(encoded), weight, bias)
                logprobs = logits.transpose(1, 2).log_softmax(dim=-1)[0].numpy()
                acoustic = np.ascontiguousarray(logprobs[:frames], dtype="<f4")
                winners = acoustic.argmax(axis=-1)
                pieces, last = [], -1
                for item in winners:
                    if item != 1024 and item != last:
                        pieces.append(int(item))
                    last = int(item)
                response = {"mode": mode, "text": tokenizer.decode(pieces), "timeSteps": frames,
                            "vocabSize": 1025, "blankId": 1024,
                            "logprobs": base64.b64encode(acoustic.tobytes()).decode("ascii")}
                acoustic.fill(0)
                del logits, logprobs, acoustic
            elif mode == "rnnt-beam-4":
                linear = torch.nn.functional.linear
                projected = linear(torch.from_numpy(encoded).transpose(1, 2)[0],
                                   joint["joint.enc.weight"], joint["joint.enc.bias"])
                prediction, hidden = lstm(torch.zeros((1, 1, 640)))
                initial = (linear(prediction[0, 0], joint["joint.pred.weight"], joint["joint.pred.bias"]), hidden, ())
                predictor_cache, cache_frame = {}, -1

                def probabilities(frame, predictor):
                    nonlocal cache_frame
                    if frame != cache_frame:
                        predictor_cache.clear()
                        cache_frame = frame
                    return linear(torch.relu(projected[frame] + predictor[0]),
                                  joint["joint.joint_net.2.weight"], joint["joint.joint_net.2.bias"]).log_softmax(-1).tolist()

                def advance(predictor, token):
                    ids = predictor[2] + (token,)
                    cached = predictor_cache.get(ids)
                    if cached is None:
                        pred, h = lstm(embedding[token].reshape(1, 1, 640), predictor[1])
                        cached = (linear(pred[0, 0], joint["joint.pred.weight"], joint["joint.pred.bias"]), h, ids)
                        # Per-frame beam expansion bounds this temporary cache;
                        # retained hypothesis states do not rely on the cache.
                        if len(predictor_cache) >= 512:
                            raise ValueError("Bounded acoustic predictor cache exceeded")
                        predictor_cache[ids] = cached
                    return cached

                search = rnnt_beam(frames, 1024, initial, probabilities, advance)
                emissions = [{"piece": tokenizer.id_to_piece(token), "frame": frame, "confidence": confidence}
                             for token, frame, confidence in search.pop("emissions")]
                pieces = search.pop("ids")
                response = {"mode": mode, "text": tokenizer.decode(pieces), "timeSteps": frames,
                            "vocabSize": 1025, "blankId": 1024, "emissions": emissions,
                            "symbolLimitReached": search["competitive_symbol_cap"], "search": search}
                predictor_cache.clear()
                del projected, initial, prediction, hidden, predictor_cache, search
            else:
                # Independently implemented greedy RNNT using original weights.
                # NeMo v2 RNNTDecoder primes the LSTM with a zero BOS vector;
                # blank frames retain its state. Nonblank emissions update it.
                # No language model, Quran answer or CTC-collapse is added.
                linear = torch.nn.functional.linear
                projected = linear(torch.from_numpy(encoded).transpose(1, 2)[0],
                                   joint["joint.enc.weight"], joint["joint.enc.bias"])
                prediction, hidden = lstm(torch.zeros((1, 1, 640)))
                pieces, emissions, capped = [], [], False
                for frame in range(frames):
                    for _ in range(10):
                        token = linear(prediction[0, 0], joint["joint.pred.weight"], joint["joint.pred.bias"])
                        probabilities = linear(torch.relu(projected[frame] + token),
                            joint["joint.joint_net.2.weight"], joint["joint.joint_net.2.bias"]).log_softmax(-1)
                        winner = int(probabilities.argmax())
                        if winner == 1024:
                            break
                        pieces.append(winner)
                        emissions.append({"piece": tokenizer.id_to_piece(winner), "frame": frame,
                                          "confidence": float(probabilities[winner].exp())})
                        prediction, hidden = lstm(embedding[winner].reshape(1, 1, 640), hidden)
                    else:
                        capped = True
                response = {"mode": mode, "text": tokenizer.decode(pieces), "timeSteps": frames,
                            "vocabSize": 1025, "blankId": 1024, "emissions": emissions,
                            "symbolLimitReached": capped}
                del projected, prediction, hidden, probabilities
        print(json.dumps(response, ensure_ascii=False), flush=True)
        pcm.fill(0)
        del response, request, data, pcm, x, spectrum, features, encoded


if __name__ == "__main__":
    main()
