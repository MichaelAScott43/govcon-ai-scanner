"""
summarizer.py – Assembles analyzed metrics and a trend score into a
human-readable summary and structured key insights for the frontend.
"""
from typing import Any


def _first_value(items: list[dict]) -> str:
    """Return the 'value' field of the first list item, or an empty string."""
    return items[0]["value"] if items else ""


def summarize(metrics: dict[str, Any], trend_score: int) -> dict[str, Any]:
    """
    Build the summary payload that the frontend consumes.

    Parameters
    ----------
    metrics:
        Output of ``analyzer.analyze()``.
    trend_score:
        Integer score 0–100 from ``scorer.score()``.

    Returns
    -------
    dict with keys:
        score           – integer trend score
        summary         – one-sentence plain-text summary
        top_agency      – name of the most active agency
        top_naics       – most common NAICS code
        top_set_aside   – most common set-aside type
        top_keywords    – list of up to 10 keyword strings
        metrics         – the full metrics dict for richer frontend use
    """
    top_agency = _first_value(metrics.get("top_agencies", []))
    top_naics = _first_value(metrics.get("top_naics", []))
    top_set_aside = _first_value(metrics.get("top_set_asides", []))
    keyword_list = [kw["value"] for kw in metrics.get("top_keywords", [])]
    total = metrics.get("total_records", 0)

    # Build a plain-text summary sentence
    if total == 0:
        summary_text = (
            "No opportunity data is available yet. "
            "Run a refresh to pull the latest records from SAM.gov."
        )
    else:
        parts = [f"Analyzed {total} recent SAM.gov opportunities"]
        if top_agency:
            parts.append(f"led by {top_agency}")
        if top_naics:
            parts.append(f"(top NAICS: {top_naics})")
        if top_set_aside:
            parts.append(f"with '{top_set_aside}' as the most common set-aside")
        summary_text = " ".join(parts) + f". Trend score: {trend_score}/100."

    return {
        "score": trend_score,
        "summary": summary_text,
        "top_agency": top_agency,
        "top_naics": top_naics,
        "top_set_aside": top_set_aside,
        "top_keywords": keyword_list,
        "metrics": metrics,
    }
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
