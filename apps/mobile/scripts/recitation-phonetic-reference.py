"""Pure comparison-side phonetics, NEVER called by the acoustic recognizer.

Canonical reference conversion is not a human-verbatim gold transcript and is
not pronunciation/Tajweed qualification. Defaults explicitly describe one Hafs
reading; alternative accepted readings/durations need independent evaluation.
"""
import importlib.metadata
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path("output/quran-development/muaalem-comparison/libraries").resolve()))
from quran_transcript import quran_phonetizer, MoshafAttributes

if importlib.metadata.version("quran-transcript") != "0.6.4":
    raise ValueError("Pinned comparison-side phonetizer required")
attributes = MoshafAttributes(rewaya="hafs", madd_monfasel_len=2, madd_mottasel_len=4, madd_mottasel_waqf=4, madd_aared_len=2)
request = json.load(sys.stdin)
if not isinstance(request, list) or len(request) > 100:
    raise ValueError("Bounded reference comparisons required")
results = []
for row in request:
    text = row["text"]
    if not isinstance(text, str) or len(text) > 8000 or not isinstance(row["index"], int):
        raise ValueError("Invalid comparison-side text")
    result = quran_phonetizer(text, attributes, remove_spaces=False)
    words = result.phonemes.split()
    if len(words) != len(text.split()) or any(not word for word in words):
        raise ValueError("Phonetic word coordinates must not be guessed")
    results.append({"index": row["index"], "wordPhones": words, "phonemes": "".join(words)})
print(json.dumps({"referenceOnly": True, "version": "0.6.4", "attributes": attributes.model_dump(), "results": results}, ensure_ascii=False))
