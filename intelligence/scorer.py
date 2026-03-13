"""
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
