"""Configuration fixtures, NOT speech recognition/accuracy evidence."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest

spec = importlib.util.spec_from_file_location("frontend_contract", Path(__file__).parents[1] / "scripts/nvidia_frontend_contract.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class FrontendContract(unittest.TestCase):
    def config(self):
        return {"_target_": "nemo.collections.asr.modules.AudioToMelSpectrogramPreprocessor",
                "sample_rate": 16000, "normalize": "per_feature", "window_size": .025,
                "window_stride": .01, "window": "hann", "features": 80, "n_fft": 512,
                "frame_splicing": 1, "pad_to": 0}

    def validate(self, config, window=(400,), filters=(1, 80, 257)):
        return module.validate_frontend_config(config, SimpleNamespace(shape=window), SimpleNamespace(shape=filters))

    def test_original_config_is_explicitly_unqualified(self):
        result = self.validate(self.config())
        self.assertTrue(result["configuration_verified"])
        self.assertFalse(result["speech_accuracy_qualified"])
        self.assertFalse(result["full_encoder_export_equivalence"])
        self.assertFalse(result["eval_dither"])

    def test_changed_explicit_settings_are_not_silently_ignored(self):
        for key, value in {"sample_rate": 8000, "normalize": "all_features", "window_size": .02,
                           "window_stride": .02, "window": "hamming", "features": 64,
                           "n_fft": 1024, "frame_splicing": 2, "pad_to": 16}.items():
            config = self.config()
            config[key] = value
            with self.assertRaises(ValueError):
                self.validate(config)

    def test_defaults_cannot_be_overridden_without_implementation(self):
        for key, value in {"preemph": None, "exact_pad": True, "log": False,
                           "log_zero_guard_type": "clamp", "log_zero_guard_value": 1e-5,
                           "mag_power": 1.0, "pad_value": 1, "nb_augmentation_prob": .5}.items():
            config = self.config()
            config[key] = value
            with self.assertRaises(ValueError):
                self.validate(config)

    def test_missing_untrusted_and_wrong_buffer_shapes_fail(self):
        for config in [None, {}, {**self.config(), "pad_to": False},
                       {**self.config(), "sample_rate": "16000"}, {**self.config(), "preemph": float("nan")}]:
            with self.assertRaises(ValueError):
                self.validate(config)
        for window, filters in [((401,), (1, 80, 257)), ((400,), (80, 257)), ((400,), (1, 64, 257))]:
            with self.assertRaises(ValueError):
                self.validate(self.config(), window, filters)


if __name__ == "__main__":
    unittest.main()
