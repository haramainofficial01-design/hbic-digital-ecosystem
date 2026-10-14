"""Pure path-math fixtures, NOT Quran speech/recognition accuracy."""
import importlib.util
import math
from pathlib import Path
import sys
import unittest

spec = importlib.util.spec_from_file_location("hbic_rnnt_beam", Path(__file__).parents[1] / "scripts/rnnt_beam.py")
beam_module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = beam_module
spec.loader.exec_module(beam_module)
beam = beam_module.rnnt_beam


class BeamMath(unittest.TestCase):
    def test_summed_alignment_mass_and_same_frame_repetition(self):
        def probabilities(frame, ids):
            if len(ids) >= 3:
                return [-math.inf, -math.inf, 0.0]
            return [math.log(.3 + .05 * frame), math.log(.2), math.log(.5 - .05 * frame)]
        paths = {}

        def enumerate_paths(frame, ids, score):
            if frame == 2:
                paths[ids] = beam_module.logadd(paths.get(ids, -math.inf), score)
                return
            p = probabilities(frame, ids)
            enumerate_paths(frame + 1, ids, score + p[2])
            if len(ids) < 3:
                for token in [0, 1]:
                    enumerate_paths(frame, ids + (token,), score + p[token])
        enumerate_paths(0, (), 0.0)
        result = beam(2, 2, (), probabilities, lambda ids, token: ids + (token,), width=64, tokens_per_node=2)
        for ids, mass in paths.items():
            self.assertTrue(math.isfinite(mass))
        winner = max(paths, key=paths.get)
        self.assertEqual(tuple(result["ids"]), winner)
        self.assertAlmostEqual(result["log_path_mass"], paths[winner], places=12)
        self.assertFalse(result["reference_conditioned"])
        self.assertFalse(result["confidence_qualified"])

    def test_repeated_tokens_are_not_ctc_collapsed(self):
        p = lambda frame, ids: [0.0, -math.inf] if len(ids) < 2 else [-math.inf, 0.0]
        result = beam(1, 1, (), p, lambda ids, token: ids + (token,))
        self.assertEqual(result["ids"], [0, 0])
        self.assertEqual([e[1] for e in result["emissions"]], [0, 0])

    def test_competitive_truncation_is_explicit(self):
        result = beam(1, 1, (), lambda frame, state: [math.log(.99), math.log(.01)],
                      lambda state, token: state, symbols_per_frame=1)
        self.assertTrue(result["competitive_symbol_cap"])

    def test_blank_only_and_empty_or_invalid_acoustics(self):
        result = beam(3, 1, (), lambda frame, state: [-math.inf, 0.0], lambda state, token: state)
        self.assertEqual(result["ids"], [])
        self.assertFalse(result["competitive_symbol_cap"])
        for scores in [[math.nan, 0.0], [math.inf, 0.0], [.1, 0.0], [-math.inf, -math.inf], [0.0]]:
            with self.assertRaises(ValueError):
                beam(1, 1, (), lambda frame, state: scores, lambda state, token: state)

    def test_bounded_search_and_no_reference_argument(self):
        for kw in [{"width": 65}, {"tokens_per_node": 0}, {"symbols_per_frame": 11}]:
            with self.assertRaises(ValueError):
                beam(1, 1, (), lambda f, s: [-math.inf, 0.0], lambda s, t: s, **kw)
        with self.assertRaises(TypeError):
            beam(1, 1, (), lambda f, s: [-math.inf, 0.0], lambda s, t: s, expected="answer")


if __name__ == "__main__":
    unittest.main()
