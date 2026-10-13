"""Pure comparison-side phonetics, NEVER called by the acoustic recognizer.

Canonical reference conversion is not a human-verbatim gold transcript and is
not pronunciation/Tajweed qualification. Defaults explicitly describe one Hafs
reading; alternative accepted readings/durations need independent evaluation.
"""
import importlib.metadata
import hashlib
import json
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path("output/quran-development/muaalem-comparison/libraries").resolve()))
from quran_transcript import quran_phonetizer, MoshafAttributes

if importlib.metadata.version("quran-transcript") != "0.6.4":
    raise ValueError("Pinned comparison-side phonetizer required")
attributes = MoshafAttributes(rewaya="hafs", madd_monfasel_len=2, madd_mottasel_len=4, madd_mottasel_waqf=4, madd_aared_len=2)
events = len(sys.argv) > 1 and sys.argv[1] == "--events"
lexicon = len(sys.argv) > 1 and sys.argv[1] == "--lexicon"
raw_scope = len(sys.argv) > 1 and sys.argv[1] == "--raw-scope"
if len(sys.argv) > 1 and not events and not lexicon and not raw_scope:
    raise ValueError("Explicit comparison-only event hypothesis mode required")
request = json.load(sys.stdin)
if not isinstance(request, list) or len(request) > 100:
    raise ValueError("Bounded reference comparisons required")
results = []


def reference_letters(text):
    """Comparison-side spelling lookup only, never normalize ASR to a right answer.

    Keep every base letter, hamza, word order and repetition. Ignore written
    vowels/annotation marks and tatweel, and equate wasl/alef for corpus lookup.
    This cannot qualify vowel/pronunciation accuracy.
    """
    text = unicodedata.normalize("NFC", text)
    return " ".join("".join(c for c in text if not unicodedata.combining(c)
        and c != "\u0640" and not "\u06d6" <= c <= "\u06ed").replace("\u0671", "ا").split())


imlaei_corpus = None
corpus_sha = None


def imlaei_reference(text):
    """Resolve full canonical ayahs, including repeated compositions, from text.

    No audio, recognized phonemes, guessed ayah ID or fuzzy matching participates.
    Refuse missing/ambiguous phonetics instead of replacing a reference with the
    model's best-looking answer. The pinned corpus remains unmodified.
    """
    global imlaei_corpus, corpus_sha
    if imlaei_corpus is None:
        path = Path("output/quran-development/muaalem-comparison/libraries/quran_transcript/quran-script/quran-uthmani-imlaey.json")
        data = path.read_bytes()
        corpus_sha = hashlib.sha256(data).hexdigest()
        if corpus_sha != "76513995151fc5e4a47e07eceb61d3bd87db23a6be831a1e55ca689cc24b7f7f":
            raise ValueError("Pinned comparison-side Quran spelling map required")
        imlaei_corpus = {}
        for sura in json.loads(data)["quran"]["sura"]:
            for aya in sura["aya"]:
                key = reference_letters(aya["@imlaey"])
                imlaei_corpus.setdefault(key, []).append(aya["@uthmani"])
    target = reference_letters(text)
    memo = {}

    def compositions(remaining):
        if not remaining:
            return [()]
        if remaining in memo:
            return memo[remaining]
        found = set()
        for key, scripts in imlaei_corpus.items():
            if remaining == key or remaining.startswith(key + " "):
                for tail in compositions(remaining[len(key):].strip()):
                    if len(tail) >= 8:
                        raise ValueError("Bounded canonical reference composition required")
                    for script in scripts:
                        found.add((script,) + tail)
                        if len(found) > 32:
                            raise ValueError("Ambiguous canonical reference composition")
        memo[remaining] = list(found)
        return memo[remaining]

    candidates = compositions(target)
    if not candidates:
        raise ValueError("Exact canonical reference spelling unavailable")
    phones = {quran_phonetizer(" ".join(parts), attributes, remove_spaces=True).phonemes
              for parts in candidates}
    if len(phones) != 1 or not next(iter(phones)):
        raise ValueError("Ambiguous canonical reference phonetics")
    return next(iter(phones)), {"scriptFormat": "imlaei", "method": "exact-base-letter full-ayah composition",
        "corpusSha256": corpus_sha, "candidateCompositions": len(candidates), "phoneticResults": 1,
        "vowelsQualified": False}


for row in request:
    text = row["text"]
    if not isinstance(text, str) or len(text) > 8000 or not isinstance(row["index"], int):
        raise ValueError("Invalid comparison-side text")
    try:
        if raw_scope and row.get("scriptFormat") == "imlaei":
            phonemes, provenance = imlaei_reference(text)
            results.append({"index": row["index"], "phonemes": phonemes, "wordLocationsQualified": False,
                            "referenceProvenance": provenance})
            continue
        if row.get("scriptFormat", "uthmani") != "uthmani":
            raise ValueError("Explicit supported comparison-side spelling required")
        result = quran_phonetizer(text, attributes, remove_spaces=raw_scope)
        if raw_scope:
            if not result.phonemes:
                raise ValueError("Empty full-scope phonetics")
            # Raw benchmark PER needs a full phonetic string, not fabricated
            # word boundaries where Quran orthography joins written words.
            results.append({"index": row["index"], "phonemes": result.phonemes, "wordLocationsQualified": False})
            continue
        words = result.phonemes.split()
        if len(words) != len(text.split()) or any(not word for word in words):
            raise ValueError("Phonetic word coordinates must not be guessed")
    except (ValueError, AssertionError, IndexError):
        if not lexicon and not raw_scope:
            raise
        # Lexicon coverage is diagnostic. Preserve explicit exclusions without
        # guessing word boundaries or losing the rest of this bounded batch.
        results.append({"index": row["index"], "error": "Exact comparison-side reference unavailable"})
        continue
    entry = {"index": row["index"], "wordPhones": words, "phonemes": "".join(words)}
    if events:
        original = text.split()
        if not 3 <= len(original) <= 32:
            raise ValueError("Bounded full-utterance hypothesis scope required")
        proposals = row.get("substitutions", [])
        if not isinstance(proposals, list) or len(proposals) > 16 or (len(original) - 2) * (2 + len(proposals)) + 1 > 257:
            raise ValueError("Bounded independent lexical proposals required")
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
