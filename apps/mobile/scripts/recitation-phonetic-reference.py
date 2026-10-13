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
events = len(sys.argv) > 1 and sys.argv[1] == "--events"
if len(sys.argv) > 1 and not events:
    raise ValueError("Explicit comparison-only event hypothesis mode required")
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
    entry = {"index": row["index"], "wordPhones": words, "phonemes": "".join(words)}
    if events:
        original = text.split()
        if not 3 <= len(original) <= 32:
            raise ValueError("Bounded full-utterance hypothesis scope required")
        hypotheses = [{"kind": "unchanged", "index": None, "phonemes": entry["phonemes"]}]
        # Recompute contextual phonetics after each word operation. Never reuse
        # full-verse assimilation after deleting/repeating its triggering word.
        # Every interior position is included, not the test's expected location.
        for position in range(1, len(original) - 1):
            for kind in ("omission", "repetition"):
                modified = original[:position] + ([] if kind == "omission" else [original[position]] * 2) + original[position + 1:]
                raw_phones = quran_phonetizer(" ".join(modified), attributes, remove_spaces=True).phonemes
                # Removing a triggering hamza can leave a written madd mark in
                # this converter's counterfactual output. The model has no token
                # for this non-speech annotation. Preserve the raw evidence;
                # strip only that mark, retaining every letter/vowel/length token.
                phones = raw_phones.replace("\u0653", "")
                hypotheses.append({"kind": kind, "index": position, "phonemes": phones, "rawPhonemes": raw_phones})
            proposals = row.get("substitutions", [])
            if not isinstance(proposals, list) or len(proposals) > 8:
                raise ValueError("Bounded independent lexical proposals required")
            for proposed in proposals:
                if not isinstance(proposed, str) or not proposed or len(proposed) > 100 or len(proposed.split()) != 1:
                    raise ValueError("Single-word independent lexical proposal required")
                modified = original[:position] + [proposed] + original[position + 1:]
                raw_phones = quran_phonetizer(" ".join(modified), attributes, remove_spaces=True).phonemes
                hypotheses.append({"kind": "substitution", "index": position, "phonemes": raw_phones.replace("\u0653", ""),
                                   "rawPhonemes": raw_phones, "proposedWord": proposed})
        entry["hypotheses"] = hypotheses
    results.append(entry)
print(json.dumps({"referenceOnly": True, "version": "0.6.4", "attributes": attributes.model_dump(),
                  "eventWrittenMarkNormalization": ["U+0653 only; original hypothetical phonetics retained"] if events else [], "results": results}, ensure_ascii=False))
