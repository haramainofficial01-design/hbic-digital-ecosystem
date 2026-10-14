"""Numerical CPU frontend audit on non-speech signals, NOT an ASR evaluation.

Fetches only a hash-pinned Apache-2.0 upstream source file into RAM. Executes
only its reviewed frontend functions, not module imports or model constructors.
Uses existing original checkpoint buffers; never downloads a model, runs an
encoder, plays a signal, writes audio, or reads a research recording.
"""
import ast
import copy
import hashlib
import io
import json
import sys
import tarfile
import types
import urllib.request
from pathlib import Path

import numpy as np
import torch
import yaml

from nvidia_frontend_contract import validate_frontend_config

SOURCE_URL = "https://raw.githubusercontent.com/NVIDIA/NeMo/v2.0.0/nemo/collections/asr/parts/preprocessing/features.py"
SOURCE_SHA = "d54718dae45bfeeeb996759128002a7767be4b8967f9a9b894c9bbb7d65697b7"
ARCHIVE_SHA = "d29d19d7c054a5fc010ac6815e9cbb0dd1b21a30e0a7f7f2982e1fecaf0c3e31"
CONFIG_SHA = "c67180984ad0da0267e1f051794c05b407418fdadfed77826cfacc2409d2015b"
TOLERANCE = 1e-5


def worker_frontend(source):
    """Compare actual worker statements; refuse changed/ambiguous structure."""
    tree = ast.parse(source)
    mains = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "main"]
    if len(mains) != 1:
        raise ValueError("Expected one worker main")
    loops = [node for node in mains[0].body if isinstance(node, ast.For)
             and ast.unparse(node.iter) == "sys.stdin"]
    if len(loops) != 1:
        raise ValueError("Expected one private PCM input loop")
    body = loops[0].body
    starts = [i for i, node in enumerate(body) if isinstance(node, ast.Assign)
              and len(node.targets) == 1 and ast.unparse(node.targets[0]) == "x"]
    if len(starts) != 2 or starts[1] != starts[0] + 1:
        raise ValueError("Expected contiguous worker waveform/preemphasis assignments")
    if starts[1] + 1 >= len(body):
        raise ValueError("Missing worker frontend block")
    block = body[starts[1] + 1]
    if not isinstance(block, ast.With) or len(block.items) != 1 or ast.unparse(block.items[0].context_expr) != "torch.no_grad()":
        raise ValueError("Expected worker frontend no-grad block")
    targets = [ast.unparse(node.targets[0]) if isinstance(node, ast.Assign) and len(node.targets) == 1 else None
               for node in block.body]
    if targets not in (["spectrum", "features", "features", "(encoded, lengths)"],
                       ["spectrum", "features", "feature_mean", "feature_std", "features", "(encoded, lengths)"]):
        raise ValueError("Worker frontend boundary changed")
    statements = copy.deepcopy(body[starts[0]:starts[1] + 1] + block.body[:-1])
    function = ast.FunctionDef(name="actual_worker_frontend",
        args=ast.arguments(posonlyargs=[], args=[ast.arg(arg=name) for name in ("pcm", "window", "filters")],
                           kwonlyargs=[], kw_defaults=[], defaults=[]),
        body=statements + [ast.Return(value=ast.Name(id="features", ctx=ast.Load()))], decorator_list=[])
    module = ast.fix_missing_locations(ast.Module(body=[function], type_ignores=[]))
    namespace = {"torch": torch}
    exec(compile(module, "<actual-worker-frontend-statements>", "exec"), namespace)
    return namespace[function.name]


def original_frontend(source, window, filters):
    if hashlib.sha256(source).hexdigest() != SOURCE_SHA:
        raise ValueError("Unverified upstream frontend source")
    tree = ast.parse(source)
    selected = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "normalize_batch"]
    classes = [node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "FilterbankFeatures"]
    names = {"stft", "get_seq_len", "log_zero_guard_value_fn", "forward"}
    if len(selected) != 1 or len(classes) != 1:
        raise ValueError("Original frontend structure changed")
    methods = [copy.deepcopy(node) for node in classes[0].body if isinstance(node, ast.FunctionDef) and node.name in names]
    if len(methods) != len(names) or {node.name for node in methods} != names:
        raise ValueError("Incomplete original frontend functions")
    # Decorators and class/module setup are not necessary to test these reviewed
    # numerical functions; the original checkpoint supplies all actual buffers.
    for method in methods:
        method.decorator_list = []
    namespace = {"torch": torch, "nn": torch.nn, "CONSTANT": 1e-5}
    exec(compile(ast.fix_missing_locations(ast.Module(body=selected + methods, type_ignores=[])),
                 "<hash-verified-reviewed-nemo-frontend-functions>", "exec"), namespace)
    instance = types.SimpleNamespace(n_fft=512, hop_length=160, win_length=400,
        exact_pad=False, window=window, fb=filters, stft_pad_amount=None,
        training=False, dither=1e-5, preemph=.97, use_grads=False,
        nb_augmentation_prob=0., mag_power=2., log=True,
        log_zero_guard_type="add", log_zero_guard_value=2 ** -24,
        frame_splicing=1, normalize="per_feature", pad_value=0, pad_to=0)
    for name in names:
        setattr(instance, name, types.MethodType(namespace[name], instance))
    return instance


def main():
    root = Path(sys.argv[1]).resolve()
    if "/output/quran-development/" not in str(root) + "/":
        raise ValueError("Only existing ignored evaluation assets are supported")
    archive = root / "nvidia-ar-official.nemo"
    with archive.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != ARCHIVE_SHA:
            raise ValueError("Unverified original checkpoint")
    torch.set_num_threads(2)
    with tarfile.open(archive) as bundle:
        config_bytes = bundle.extractfile("./model_config.yaml").read()
        if hashlib.sha256(config_bytes).hexdigest() != CONFIG_SHA:
            raise ValueError("Unexpected original frontend configuration")
        config = yaml.safe_load(config_bytes)
        state = torch.load(io.BytesIO(bundle.extractfile("./model_weights.ckpt").read()),
                           map_location="cpu", weights_only=True)
    window, filters = state["preprocessor.featurizer.window"], state["preprocessor.featurizer.fb"]
    del state
    contract = validate_frontend_config(config["preprocessor"], window, filters)
    with urllib.request.urlopen(SOURCE_URL, timeout=30) as response:
        source = response.read(100001)
    if len(source) > 100000:
        raise ValueError("Bounded upstream source required")
    official = original_frontend(source, window, filters)
    worker_path = Path(__file__).with_name("nvidia-recitation-worker.py")
    worker_bytes = worker_path.read_bytes()
    worker = worker_frontend(worker_bytes)
    results = []
    for samples in (16000, 16001, 31999, 96000):
        for kind in ("silence", "sine440", "seeded_noise"):
            if kind == "silence":
                pcm = np.zeros(samples, dtype=np.float32)
            elif kind == "sine440":
                pcm = (.1 * np.sin(np.arange(samples, dtype=np.float64) * (2 * np.pi * 440 / 16000))).astype(np.float32)
            else:
                pcm = np.random.default_rng(20261014 + samples).uniform(-.1, .1, samples).astype(np.float32)
            with torch.no_grad():
                reference, lengths = official.forward(torch.from_numpy(pcm).unsqueeze(0), torch.tensor([samples]))
                actual = worker(pcm, window, filters)
            shape_matches = tuple(reference.shape) == tuple(actual.shape)
            lengths_match = shape_matches and int(lengths[0]) == actual.shape[-1]
            finite = bool(torch.isfinite(actual).all() and torch.isfinite(reference).all())
            difference = (actual - reference).abs() if shape_matches and finite else None
            maximum = float(difference.max()) if difference is not None else None
            rms = float(difference.square().mean().sqrt()) if difference is not None else None
            passed = shape_matches and lengths_match and finite and maximum is not None and maximum <= TOLERANCE
            results.append({"signal": kind, "samples": samples, "reference_frames": int(lengths[0]),
                "worker_frames": actual.shape[-1], "max_abs_difference": maximum, "rms_difference": rms,
                "shape_matches": shape_matches, "finite": finite, "passed": passed})
            pcm.fill(0)
            del pcm, reference, actual, difference
    report = {"scope": "12 deterministic non-speech CPU frontend comparisons; not recognition accuracy",
        "source_url": SOURCE_URL, "source_sha256": SOURCE_SHA, "source_bytes": len(source),
        "archive_sha256": ARCHIVE_SHA, "config_sha256": CONFIG_SHA,
        "worker_sha256": hashlib.sha256(worker_bytes).hexdigest(),
        "audit_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "contract_sha256": hashlib.sha256(Path(__file__).with_name("nvidia_frontend_contract.py").read_bytes()).hexdigest(),
        "versions": {"torch": torch.__version__, "numpy": np.__version__, "pyyaml": yaml.__version__},
        "absolute_tolerance": TOLERANCE, "configuration": contract,
        "cases": len(results), "failures": sum(not item["passed"] for item in results), "results": results,
        "encoder_equivalence_verified": False, "speech_accuracy_measured": False, "audio_written": False}
    print(json.dumps(report, allow_nan=False, indent=2))
    if report["failures"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
