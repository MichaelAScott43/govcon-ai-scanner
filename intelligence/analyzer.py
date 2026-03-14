"""
analyzer.py – Analyzes stored opportunities to compute key metrics:
  - Top agencies by number of opportunities
  - Top NAICS codes
  - Common set-asides
  - Frequently used keywords (from titles and descriptions)
"""
import re
from collections import Counter
from typing import Any

# Common English stop-words to exclude from keyword analysis
_STOP_WORDS = {
    "a", "an", "the", "and", "or", "of", "to", "in", "for", "on", "with",
    "at", "by", "from", "is", "it", "its", "be", "as", "are", "was", "were",
    "this", "that", "not", "but", "have", "had", "has", "he", "she", "they",
    "we", "i", "you", "do", "did", "will", "would", "could", "should", "may",
    "can", "no", "if", "up", "out", "so", "than", "then", "into", "over",
    "under", "about", "such", "any", "all", "each", "which", "who", "what",
    "how", "when", "where", "there", "their", "other", "per", "our", "your",
    "us", "new", "also", "only", "more", "same", "two", "one", "three", "s",
}


def _top_n(counter: Counter, n: int = 5) -> list[dict[str, Any]]:
    return [{"value": val, "count": cnt} for val, cnt in counter.most_common(n) if val]


def analyze(opportunities: list[dict]) -> dict[str, Any]:
    """
    Analyze a list of normalized opportunity dicts and return aggregated metrics.

    Returns a dict with keys:
        total_records   – total number of records analyzed
        top_agencies    – list of {value, count} for the 5 most active agencies
        top_naics       – list of {value, count} for the 5 most common NAICS codes
        top_set_asides  – list of {value, count} for the 5 most common set-asides
        top_keywords    – list of {value, count} for the 10 most frequent keywords
    """
    agencies: Counter = Counter()
    naics: Counter = Counter()
    set_asides: Counter = Counter()
    keywords: Counter = Counter()

    for opp in opportunities:
        agency = (opp.get("agency") or "").strip()
        if agency:
            agencies[agency] += 1

        code = (opp.get("naics_code") or "").strip()
        if code:
            naics[code] += 1

        sa = (opp.get("set_aside") or "").strip()
        if sa:
            set_asides[sa] += 1

        # Extract keywords from title + description
        text = " ".join(
            filter(None, [opp.get("title", ""), opp.get("description", "")])
        )
        for word in re.findall(r"[a-zA-Z]{3,}", text.lower()):
            if word not in _STOP_WORDS:
                keywords[word] += 1

    return {
        "total_records": len(opportunities),
        "top_agencies": _top_n(agencies, 5),
        "top_naics": _top_n(naics, 5),
        "top_set_asides": _top_n(set_asides, 5),
        "top_keywords": _top_n(keywords, 10),
    }
analyzer.py — Computes opportunity intelligence metrics from stored records.

Metrics produced
----------------
- top_agencies      : agencies ranked by opportunity count
- top_naics         : NAICS codes ranked by frequency
- top_set_asides    : set-aside types ranked by frequency
- top_keywords      : significant keywords extracted from titles + descriptions
- source_breakdown  : record count per data source
- total             : total number of stored records
- as_of             : ISO-8601 timestamp of analysis
"""

import json
import re
from collections import Counter
from datetime import datetime, timezone
from typing import Any

from collector import get_all_opportunities

# Words to exclude from keyword extraction
_STOPWORDS = frozenset(
    {
        "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
        "has", "have", "in", "is", "it", "its", "of", "on", "or", "that",
        "the", "this", "to", "was", "were", "will", "with", "contract",
        "services", "support", "program", "project", "system", "systems",
        "management", "service", "federal", "government", "solicitation",
        "request", "proposal", "rfp", "rfq", "sources", "sought", "notice",
    }
)


def _extract_keywords(text: str) -> list[str]:
    """Return lower-cased alphabetic tokens longer than 3 characters."""
    tokens = re.findall(r"[a-zA-Z]{4,}", text.lower())
    return [t for t in tokens if t not in _STOPWORDS]


def analyze(opportunities: list[dict] | None = None) -> dict[str, Any]:
    """
    Analyse the provided (or stored) opportunities and return a metrics dict.

    Parameters
    ----------
    opportunities:
        Pre-loaded records. If None, all records are loaded from SQLite.
    """
    if opportunities is None:
        opportunities = get_all_opportunities()

    total = len(opportunities)

    agency_counter: Counter = Counter()
    naics_counter: Counter = Counter()
    set_aside_counter: Counter = Counter()
    source_counter: Counter = Counter()
    keyword_counter: Counter = Counter()

    for opp in opportunities:
        if opp.get("agency"):
            agency_counter[opp["agency"]] += 1
        if opp.get("naics_code"):
            naics_counter[str(opp["naics_code"])] += 1
        if opp.get("set_aside"):
            set_aside_counter[opp["set_aside"]] += 1
        if opp.get("source"):
            source_counter[opp["source"]] += 1

        text = " ".join(
            filter(None, [opp.get("title", ""), opp.get("description", "")])
        )
        keyword_counter.update(_extract_keywords(text))

    return {
        "total": total,
        "top_agencies": [
            {"agency": k, "count": v} for k, v in agency_counter.most_common(10)
        ],
        "top_naics": [
            {"naics_code": k, "count": v} for k, v in naics_counter.most_common(10)
        ],
        "top_set_asides": [
            {"set_aside": k, "count": v}
            for k, v in set_aside_counter.most_common(10)
        ],
        "top_keywords": [
            {"keyword": k, "count": v} for k, v in keyword_counter.most_common(20)
        ],
        "source_breakdown": dict(source_counter),
        "as_of": datetime.now(timezone.utc).isoformat(),
    }


def analysis_to_json(analysis: dict[str, Any]) -> str:
    """Serialise an analysis dict to a JSON string."""
    return json.dumps(analysis, default=str)
