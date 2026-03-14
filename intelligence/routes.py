"""
routes.py – FastAPI router exposing the opportunity intelligence endpoints.
routes.py — FastAPI application exposing opportunity intelligence endpoints.

Endpoints
---------
GET  /opportunity-intelligence
    Returns analyzed metrics, trend score, summary, and key insights
    based on the currently stored SAM.gov opportunity records.

POST /opportunity-intelligence/refresh
    Fetches the latest opportunities from SAM.gov, re-analyzes the data,
    and returns the updated intelligence payload.
"""
import logging

from fastapi import APIRouter, HTTPException

from collector import collect, load_all
from analyzer import analyze
from scorer import score
from summarizer import summarize

logger = logging.getLogger(__name__)

router = APIRouter(tags=["opportunity-intelligence"])


def _build_intelligence() -> dict:
    """Load stored records, analyze, score, and summarize them."""
    opportunities = load_all()
    metrics = analyze(opportunities)
    trend_score = score(metrics)
    return summarize(metrics, trend_score)


@router.get("/opportunity-intelligence")
def get_opportunity_intelligence() -> dict:
    """Return the current opportunity intelligence payload."""
    try:
        return _build_intelligence()
    except Exception as exc:
        logger.exception("Error building opportunity intelligence")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/opportunity-intelligence/refresh")
def refresh_opportunity_intelligence() -> dict:
    """
    Pull the latest opportunities from SAM.gov, persist them to SQLite,
    re-analyze the full dataset, and return the updated payload.
    """
    try:
        written = collect()
        payload = _build_intelligence()
        payload["records_fetched"] = written
        return payload
    except Exception as exc:
        logger.exception("Error refreshing opportunity intelligence")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    Returns the latest cached analysis, score, and summary.

POST /opportunity-intelligence/refresh
    Re-fetches from all federal opportunity databases (optionally filtered by
    NAICS codes), re-analyses, re-scores, and returns the updated results.

Environment variables
---------------------
SAM_API_KEY          : SAM.gov / api.data.gov key (required for SAM.gov source)
INTELLIGENCE_DB_PATH : Path to the SQLite file (default: intelligence.db)
INTEL_PORT           : Port for the uvicorn server (default: 8001)
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from analyzer import analyze, analysis_to_json
from collector import DB_PATH, collect_all, get_all_opportunities, init_db
from scorer import score
from summarizer import summarize

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="GovCon Opportunity Intelligence",
    description=(
        "Scans all federal opportunity databases that use NAICS codes "
        "(SAM.gov, USASpending.gov, SBIR.gov, Grants.gov) and exposes "
        "aggregated intelligence metrics."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class RefreshRequest(BaseModel):
    naics_codes: list[str] = []
    days_back: int = 30


class IntelligenceResponse(BaseModel):
    score: int
    summary: str
    analysis: dict[str, Any]
    last_refreshed: str | None


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def _load_cache() -> dict[str, Any] | None:
    """Return the most recent cached result from SQLite, or None."""
    init_db()
    try:
        with sqlite3.connect(DB_PATH) as conn:
            row = conn.execute(
                "SELECT analysis, score, summary, last_refreshed "
                "FROM intelligence_cache ORDER BY id DESC LIMIT 1"
            ).fetchone()
    except Exception:  # noqa: BLE001
        return None

    if not row:
        return None
    analysis_raw, cached_score, summary, last_refreshed = row
    try:
        analysis = json.loads(analysis_raw)
    except (TypeError, json.JSONDecodeError):
        analysis = {}
    return {
        "score": cached_score,
        "summary": summary,
        "analysis": analysis,
        "last_refreshed": last_refreshed,
    }


def _save_cache(analysis: dict, trend_score: int, summary: str) -> None:
    """Persist the latest result to the intelligence_cache table."""
    init_db()
    now = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM intelligence_cache")
        conn.execute(
            "INSERT INTO intelligence_cache (analysis, score, summary, last_refreshed) "
            "VALUES (?, ?, ?, ?)",
            (analysis_to_json(analysis), trend_score, summary, now),
        )
        conn.commit()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get(
    "/opportunity-intelligence",
    response_model=IntelligenceResponse,
    summary="Get latest opportunity intelligence",
    description=(
        "Returns the most recently cached analysis, trend score, and summary. "
        "Call POST /opportunity-intelligence/refresh to update the data."
    ),
)
async def get_intelligence() -> IntelligenceResponse:
    cached = _load_cache()
    if cached:
        return IntelligenceResponse(**cached)

    # No cache yet — run a quick analysis on whatever is already stored
    opportunities = get_all_opportunities()
    if not opportunities:
        raise HTTPException(
            status_code=404,
            detail=(
                "No opportunity data available yet. "
                "Call POST /opportunity-intelligence/refresh to fetch data."
            ),
        )

    analysis = analyze(opportunities)
    trend_score = score(analysis)
    summary = summarize(analysis, trend_score)
    _save_cache(analysis, trend_score, summary)

    return IntelligenceResponse(
        score=trend_score,
        summary=summary,
        analysis=analysis,
        last_refreshed=analysis.get("as_of"),
    )


@app.post(
    "/opportunity-intelligence/refresh",
    response_model=IntelligenceResponse,
    summary="Refresh opportunity data from all federal databases",
    description=(
        "Re-fetches from SAM.gov, USASpending.gov, SBIR.gov, and Grants.gov. "
        "Optionally filter by specific NAICS codes. "
        "Returns updated metrics immediately after collection."
    ),
)
async def refresh_intelligence(body: RefreshRequest) -> IntelligenceResponse:
    try:
        await collect_all(
            naics_codes=body.naics_codes or [],
            days_back=body.days_back,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Collection error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Collection failed: {exc}") from exc

    opportunities = get_all_opportunities()
    analysis = analyze(opportunities)
    trend_score = score(analysis)
    summary = summarize(analysis, trend_score)
    _save_cache(analysis, trend_score, summary)

    return IntelligenceResponse(
        score=trend_score,
        summary=summary,
        analysis=analysis,
        last_refreshed=analysis.get("as_of"),
    )


# ---------------------------------------------------------------------------
# Dev entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("INTEL_PORT", "8001"))
    uvicorn.run("routes:app", host="0.0.0.0", port=port, reload=True)
