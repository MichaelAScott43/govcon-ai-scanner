"""
summarizer.py — Generates a human-readable summary of opportunity intelligence.

The summary is a short paragraph (≤ 5 sentences) that captures the most
salient insights from the analysis: total volume, dominant agencies and NAICS
codes, active data sources, and the trend score interpretation.
"""

from __future__ import annotations

from typing import Any


def _score_label(score: int) -> str:
    if score >= 80:
        return "very strong"
    if score >= 60:
        return "strong"
    if score >= 40:
        return "moderate"
    if score >= 20:
        return "low"
    return "minimal"


def summarize(analysis: dict[str, Any], trend_score: int) -> str:
    """
    Build a short plain-text summary suitable for display in a dashboard panel.

    Parameters
    ----------
    analysis:
        Dict returned by ``analyzer.analyze()``.
    trend_score:
        Integer score (0–100) returned by ``scorer.score()``.

    Returns
    -------
    str
        A human-readable summary paragraph.
    """
    total = analysis.get("total", 0)
    top_agencies = analysis.get("top_agencies", [])
    top_naics = analysis.get("top_naics", [])
    source_breakdown = analysis.get("source_breakdown", {})
    sources = list(source_breakdown.keys())

    label = _score_label(trend_score)

    parts: list[str] = [
        f"The GovCon opportunity scanner analyzed {total:,} records "
        f"across {len(sources)} federal database(s) "
        f"({', '.join(sources) if sources else 'none'})."
    ]

    if top_agencies:
        top_a = top_agencies[0]["agency"]
        parts.append(
            f"The most active contracting agency is {top_a} "
            f"with {top_agencies[0]['count']} opportunities."
        )

    if top_naics:
        top_n = top_naics[0]["naics_code"]
        parts.append(
            f"NAICS code {top_n} leads in opportunity frequency "
            f"({top_naics[0]['count']} records)."
        )

    if len(top_agencies) > 1 or len(top_naics) > 1:
        agency_names = [a["agency"] for a in top_agencies[1:3] if a.get("agency")]
        if agency_names:
            parts.append(
                f"Other notable agencies include {', '.join(agency_names)}."
            )

    parts.append(
        f"Overall market activity is {label} (trend score: {trend_score}/100)."
    )

    return " ".join(parts)
