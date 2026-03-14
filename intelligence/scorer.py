"""
scorer.py – Scores the analyzed opportunity trends on a 0–100 scale.

Scoring heuristic
-----------------
The score is a weighted combination of three sub-scores:

1. Volume score (40 pts) – How many records are in the database relative to
   a "healthy" baseline of 500 records.  Capped at 40.

2. Diversity score (30 pts) – Breadth across agencies, NAICS codes, and
   set-asides.  More variety ⟹ richer market intelligence.

3. Keyword richness score (30 pts) – Number of unique meaningful keywords
   discovered, scored against a baseline of 10 (the maximum returned by
   the analyzer).  Reaching all 10 top keywords earns the full 30 points.
"""
from typing import Any


def score(metrics: dict[str, Any]) -> int:
    """
    Compute an integer trend score in the range [0, 100].

    Parameters
    ----------
    metrics:
        The dict returned by ``analyzer.analyze()``.
scorer.py — Computes a trend score (0–100) from opportunity analysis metrics.

Scoring factors
---------------
1. Volume      — raw number of stored opportunities (up to 40 pts)
2. Recency     — proportion of opportunities from multiple active sources (up to 20 pts)
3. Diversity   — number of distinct agencies and NAICS codes (up to 20 pts)
4. Source span — number of distinct data sources contributing records (up to 20 pts)
"""

from __future__ import annotations

from typing import Any


def score(analysis: dict[str, Any]) -> int:
    """
    Derive an integer trend score in the range [0, 100].

    Parameters
    ----------
    analysis:
        Dict returned by ``analyzer.analyze()``.

    Returns
    -------
    int
        An integer score between 0 and 100 (inclusive).
    """
    total = metrics.get("total_records", 0)
    top_agencies = metrics.get("top_agencies", [])
    top_naics = metrics.get("top_naics", [])
    top_set_asides = metrics.get("top_set_asides", [])
    top_keywords = metrics.get("top_keywords", [])

    # 1. Volume score (0–40)
    volume_score = min(40, int(total / 500 * 40))

    # 2. Diversity score (0–30): sum of unique counts across the three
    #    dimension lists, each capped at 5; 15 unique items ⟹ 30 pts.
    unique_dims = len(top_agencies) + len(top_naics) + len(top_set_asides)
    diversity_score = min(30, int(unique_dims / 15 * 30))

    # 3. Keyword richness score (0–30)
    keyword_score = min(30, int(len(top_keywords) / 10 * 30))

    total_score = volume_score + diversity_score + keyword_score
        Score between 0 (low activity) and 100 (high, diverse activity).
    """
    total = analysis.get("total", 0)
    top_agencies = analysis.get("top_agencies", [])
    top_naics = analysis.get("top_naics", [])
    source_breakdown = analysis.get("source_breakdown", {})

    # 1. Volume score — logarithmic scale, caps at 1 000 records for full marks
    volume_score = min(40, int(40 * min(total, 1000) / 1000))

    # 2. Source recency score — more active sources → higher score
    active_sources = len([v for v in source_breakdown.values() if v > 0])
    source_score = min(20, active_sources * 5)

    # 3. Diversity score — distinct agencies + distinct NAICS codes
    agency_diversity = min(10, len(top_agencies))
    naics_diversity = min(10, len(top_naics))
    diversity_score = agency_diversity + naics_diversity

    # 4. Source span score — rewards breadth of data sources
    span_score = min(20, len(source_breakdown) * 5)

    total_score = volume_score + source_score + diversity_score + span_score
    return max(0, min(100, total_score))
