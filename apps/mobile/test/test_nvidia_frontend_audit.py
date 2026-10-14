"""Audit boundary/provenance fixtures, never speech-accuracy evidence."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).parents[1] / "scripts"))
from audit_nvidia_frontend import original_frontend, worker_frontend

FIXTURE = """
def main():
    for line in sys.stdin:
        x = pcm
        x = x + 1
        with torch.no_grad():
            spectrum = x
            features = spectrum * 2
            features = features + 3
            encoded, lengths = session.run(None, {})
"""


class FrontendAuditBoundary(unittest.TestCase):
    def test_encoder_and_input_loop_are_never_executed(self):
        # No sys.stdin/session exist in the execution namespace; only selected
        # arithmetic statements run. A signal never reaches model inference.
        self.assertEqual(worker_frontend(FIXTURE)(1, None, None), 7)

    def test_unknown_frontend_boundary_is_rejected(self):
        for source in (FIXTURE.replace("features = features + 3", "other = features + 3"),
                       FIXTURE.replace("encoded, lengths", "encoded"),
                       FIXTURE.replace("torch.no_grad()", "torch.enable_grad()"),
                       FIXTURE.replace("x = x + 1", "x = x + 1\n        x = x + 2"),
                       FIXTURE[:FIXTURE.index("        with torch.no_grad()")]):
            with self.assertRaises(ValueError):
                worker_frontend(source)

    def test_ambiguous_main_or_input_loop_is_rejected(self):
        for source in (FIXTURE + "\ndef main(): pass\n",
                       FIXTURE + "    for line in sys.stdin: pass\n"):
            with self.assertRaises(ValueError):
                worker_frontend(source)

    def test_upstream_source_is_checked_before_parsing_or_execution(self):
        for source in (b"raise RuntimeError('must never execute')", b"not valid python!"):
            with self.assertRaisesRegex(ValueError, "Unverified upstream"):
                original_frontend(source, None, None)


if __name__ == "__main__":
    unittest.main()
