"""Bounded offline RNNT path-summing search. No Quran, grammar or answer input.
Search/pruned scores are NOT calibrated correctness probabilities. Timings use
the best actual path of the decoded hypothesis, never reference alignment.
"""
import math
from dataclasses import dataclass


@dataclass
class Hypothesis:
    ids: tuple
    score: float
    best_path_score: float
    emissions: tuple
    state: object


def logadd(a, b):
    if a == -math.inf:
        return b
    if b == -math.inf:
        return a
    hi, lo = max(a, b), min(a, b)
    return hi + math.log1p(math.exp(lo - hi))


def merge(destination, hypothesis):
    prior = destination.get(hypothesis.ids)
    if prior is None:
        destination[hypothesis.ids] = hypothesis
    else:
        # Predictor state depends only on emitted tokens, not blank timing.
        best = hypothesis if hypothesis.best_path_score > prior.best_path_score else prior
        destination[hypothesis.ids] = Hypothesis(best.ids, logadd(prior.score, hypothesis.score),
                                                best.best_path_score, best.emissions, best.state)


def rnnt_beam(frames, blank, initial_state, probabilities, advance,
              width=4, tokens_per_node=4, symbols_per_frame=10):
    if not isinstance(frames, int) or not 1 <= frames <= 1128 or not isinstance(blank, int) or not 1 <= blank <= 2048:
        raise ValueError("Bounded acoustic frames/vocabulary required")
    if any(not isinstance(n, int) or not 1 <= n <= bound for n, bound in
           [(width, 64), (tokens_per_node, 64), (symbols_per_frame, 10)]):
        raise ValueError("Bounded disclosed RNNT search required")
    prune = lambda hypotheses: dict((h.ids, h) for h in sorted(hypotheses.values(), key=lambda h: (-h.score, h.ids))[:width])
    beam = {(): Hypothesis((), 0.0, 0.0, (), initial_state)}
    capped_competitive = False
    evaluations = 0
    for frame in range(frames):
        active, completed = beam, {}
        for depth in range(symbols_per_frame + 1):
            following = {}
            for hyp in active.values():
                scores = list(probabilities(frame, hyp.state))
                evaluations += 1
                if len(scores) != blank + 1 or any(math.isnan(s) or s == math.inf or s > .00001 for s in scores):
                    raise ValueError("Valid original RNNT log probabilities required")
                if not any(math.isfinite(s) for s in scores):
                    raise ValueError("Empty acoustic distribution")
                if math.isfinite(scores[blank]):
                    merge(completed, Hypothesis(hyp.ids, hyp.score + scores[blank],
                          hyp.best_path_score + scores[blank], hyp.emissions, hyp.state))
                for token in sorted(range(blank), key=lambda t: (-scores[t], t))[:tokens_per_node]:
                    if not math.isfinite(scores[token]):
                        continue
                    score = hyp.score + scores[token]
                    if depth == symbols_per_frame:
                        # Any potentially competitive discarded continuation
                        # is an explicit analysis failure, not hidden truncation.
                        threshold = min((h.score for h in prune(completed).values()), default=-math.inf)
                        capped_competitive |= score >= threshold
                        continue
                    emissions = hyp.emissions + ((token, frame, math.exp(scores[token])),)
                    merge(following, Hypothesis(hyp.ids + (token,), score,
                          hyp.best_path_score + scores[token], emissions, advance(hyp.state, token)))
            completed = prune(completed)
            active = prune(following)
            if not active:
                break
        if not completed:
            raise ValueError("No complete blank-advanced acoustic path")
        beam = completed
    best = sorted(beam.values(), key=lambda h: (-h.score, h.ids))[0]
    return {"ids": list(best.ids), "emissions": list(best.emissions), "log_path_mass": best.score,
            "best_path_score": best.best_path_score, "competitive_symbol_cap": capped_competitive,
            "joint_evaluations": evaluations, "reference_conditioned": False,
            "confidence_qualified": False, "width": width, "tokens_per_node": tokens_per_node,
            "symbols_per_frame": symbols_per_frame}
