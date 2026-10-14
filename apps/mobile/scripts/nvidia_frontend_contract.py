"""Fail closed on unsupported settings in the offline reconstructed frontend.
No model download, signal generation, audio or recognition is performed here.
Original checkpoint buffers remain authoritative, not recreated filterbanks.
"""
import math


def validate_frontend_config(config, window, filters):
    expected = {"sample_rate": 16000, "normalize": "per_feature", "window_size": .025,
                "window_stride": .01, "window": "hann", "features": 80, "n_fft": 512,
                "frame_splicing": 1, "pad_to": 0}
    defaults = {"preemph": .97, "exact_pad": False, "log": True,
                "log_zero_guard_type": "add", "log_zero_guard_value": 2 ** -24,
                "mag_power": 2.0, "pad_value": 0, "nb_augmentation_prob": 0.0}
    if not isinstance(config, dict) or config.get("_target_") != "nemo.collections.asr.modules.AudioToMelSpectrogramPreprocessor":
        raise ValueError("Unsupported original audio frontend")
    for key, value in expected.items():
        if type(config.get(key)) is not type(value) or config[key] != value:
            raise ValueError("Unsupported frontend field: " + key)
    for key, value in defaults.items():
        actual = config.get(key, value)
        if isinstance(value, bool):
            valid = isinstance(actual, bool) and actual == value
        elif isinstance(value, str):
            valid = isinstance(actual, str) and actual == value
        else:
            valid = not isinstance(actual, bool) and isinstance(actual, (int, float)) and math.isfinite(actual) and actual == value
        if not valid:
            raise ValueError("Unsupported frontend field: " + key)
    if tuple(window.shape) != (400,) or tuple(filters.shape) != (1, 80, 257):
        raise ValueError("Unexpected original frontend buffer shapes")
    return {"configuration_verified": True, "scope": "mono unpadded CPU evaluation only",
            "sample_rate": 16000, "hop_length": 160, "fft_size": 512,
            "normalization": "per_feature", "centered_stft": True, "feature_padding": 0,
            "eval_dither": False, "full_encoder_export_equivalence": False,
            "speech_accuracy_qualified": False}
