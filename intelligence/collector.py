"""
collector.py – Fetches recent opportunities from SAM.gov, normalizes fields,
and stores records in an SQLite database.
"""
import os
import sqlite3
import logging
from datetime import datetime, timedelta, timezone
from contextlib import contextmanager

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SAM_API_KEY = os.getenv("SAM_API_KEY", "")
SAM_BASE_URL = "https://api.sam.gov/opportunities/v2/search"
DB_PATH = os.getenv("SQLITE_DB_PATH", "intelligence.db")

collector.py — Fetches opportunities from all federal databases that use NAICS codes.

Supported sources
-----------------
- SAM.gov           (requires SAM_API_KEY env var)
- USASpending.gov   (public API, no key required)
- SBIR.gov          (public API, no key required)
- Grants.gov        (public API, no key required)

Records are normalised to a common schema and stored in SQLite, deduplicating
by notice_id across sources.
"""

import asyncio
import logging
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

DB_PATH = os.environ.get("INTELLIGENCE_DB_PATH", "intelligence.db")

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_connection() -> sqlite3.Connection:
def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def db_cursor():
    conn = get_connection()
    try:
        cur = conn.cursor()
        yield cur
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    """Create the opportunities table if it does not already exist."""
    with db_cursor() as cur:
        cur.execute(
def init_db() -> None:
    """Create tables if they do not already exist."""
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS opportunities (
                notice_id        TEXT PRIMARY KEY,
                title            TEXT,
                agency           TEXT,
                naics_code       TEXT,
                set_aside        TEXT,
                posted_date      TEXT,
                response_date    TEXT,
                description      TEXT,
                opportunity_type TEXT,
                source           TEXT,
                url              TEXT,
                fetched_at       TEXT
            )
            """
        )


# ---------------------------------------------------------------------------
# Normalization
# ---------------------------------------------------------------------------

def _extract_agency(raw: dict) -> str:
    """Extract a best-effort agency name from a raw SAM.gov record."""
    if raw.get("fullParentPathName"):
        return raw["fullParentPathName"]
    org_hierarchy = raw.get("organizationHierarchy")
    if isinstance(org_hierarchy, list) and org_hierarchy:
        return org_hierarchy[0].get("name", "")
    return raw.get("department", "")


def _normalize(raw: dict) -> dict:
    """Map a raw SAM.gov opportunity dict to our canonical schema."""
    return {
        "notice_id": raw.get("noticeId") or raw.get("solicitationNumber") or "",
        "title": raw.get("title") or "",
        "agency": _extract_agency(raw),
        "naics_code": raw.get("naicsCode") or "",
        "set_aside": raw.get("typeOfSetAside") or raw.get("setAside") or "",
        "posted_date": raw.get("postedDate") or "",
        "response_date": raw.get("responseDeadLine") or raw.get("archiveDate") or "",
        "description": raw.get("description") or "",
        "opportunity_type": raw.get("type") or raw.get("opportunityType") or "",
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS intelligence_cache (
                id             INTEGER PRIMARY KEY,
                analysis       TEXT,
                score          INTEGER,
                summary        TEXT,
                last_refreshed TEXT
            )
            """
        )
        conn.commit()


# ---------------------------------------------------------------------------
# Common normalisation
# ---------------------------------------------------------------------------

def _normalize(raw: dict, source: str) -> dict:
    """Map a raw API record to our common opportunity schema."""
    return {
        "notice_id": raw.get("notice_id") or raw.get("noticeId") or raw.get("id"),
        "title": raw.get("title"),
        "agency": raw.get("agency"),
        "naics_code": raw.get("naics_code") or raw.get("naicsCode"),
        "set_aside": raw.get("set_aside") or raw.get("setAside"),
        "posted_date": raw.get("posted_date") or raw.get("postedDate"),
        "response_date": raw.get("response_date") or raw.get("responseDeadLine"),
        "description": (raw.get("description") or "")[:500],
        "opportunity_type": raw.get("opportunity_type") or raw.get("noticeType"),
        "source": source,
        "url": raw.get("url") or raw.get("uiLink"),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# SAM.gov fetch
# ---------------------------------------------------------------------------

def _fetch_page(posted_from: str, posted_to: str, offset: int = 0, limit: int = 100) -> dict:
    """Fetch a single page of opportunities from SAM.gov."""
    params = {
        "api_key": SAM_API_KEY,
        "postedFrom": posted_from,
        "postedTo": posted_to,
        "limit": limit,
        "offset": offset,
    }
    resp = requests.get(SAM_BASE_URL, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def collect(days_back: int = 30, max_records: int = 500) -> int:
    """
    Fetch up to *max_records* opportunities posted in the last *days_back* days
    from SAM.gov, normalize them, and upsert into SQLite.

    Returns the number of records written.
    """
    init_db()

    if not SAM_API_KEY:
        logger.warning("SAM_API_KEY is not set – skipping live fetch, returning 0 records.")
        return 0

    today = datetime.now(timezone.utc)
    posted_from = (today - timedelta(days=days_back)).strftime("%m/%d/%Y")
    posted_to = today.strftime("%m/%d/%Y")

    written = 0
    offset = 0
    limit = min(100, max_records)

    while written < max_records:
        try:
            data = _fetch_page(posted_from, posted_to, offset=offset, limit=limit)
        except requests.HTTPError as exc:
            logger.error("SAM.gov request failed: %s", exc)
            break

        opportunities = data.get("opportunitiesData") or data.get("opportunities") or []
        if not opportunities:
            break

        with db_cursor() as cur:
            for raw in opportunities:
                record = _normalize(raw)
                if not record["notice_id"]:
                    continue
                cur.execute(
                    """
                    INSERT INTO opportunities
                        (notice_id, title, agency, naics_code, set_aside,
                         posted_date, response_date, description, opportunity_type, fetched_at)
                    VALUES
                        (:notice_id, :title, :agency, :naics_code, :set_aside,
                         :posted_date, :response_date, :description, :opportunity_type, :fetched_at)
                    ON CONFLICT(notice_id) DO UPDATE SET
                        title            = excluded.title,
                        agency           = excluded.agency,
                        naics_code       = excluded.naics_code,
                        set_aside        = excluded.set_aside,
                        posted_date      = excluded.posted_date,
                        response_date    = excluded.response_date,
                        description      = excluded.description,
                        opportunity_type = excluded.opportunity_type,
                        fetched_at       = excluded.fetched_at
                    """,
                    record,
                )
                written += 1

        total = data.get("totalRecords", 0)
        offset += len(opportunities)
        if offset >= total or offset >= max_records:
            break

    logger.info("collect() wrote %d records to %s", written, DB_PATH)
    return written


def load_all() -> list[dict]:
    """Return all stored opportunities as a list of dicts."""
    init_db()
    with db_cursor() as cur:
        cur.execute("SELECT * FROM opportunities")
        return [dict(row) for row in cur.fetchall()]
def _upsert(conn: sqlite3.Connection, records: list[dict]) -> None:
    """Insert or replace records, deduplicating by notice_id."""
    for r in records:
        if not r.get("notice_id"):
            continue
        conn.execute(
            """
            INSERT OR REPLACE INTO opportunities
                (notice_id, title, agency, naics_code, set_aside, posted_date,
                 response_date, description, opportunity_type, source, url, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                r["notice_id"], r["title"], r["agency"], r["naics_code"],
                r["set_aside"], r["posted_date"], r["response_date"],
                r["description"], r["opportunity_type"], r["source"],
                r["url"], r["fetched_at"],
            ),
        )
    conn.commit()


# ---------------------------------------------------------------------------
# SAM.gov
# ---------------------------------------------------------------------------

async def _fetch_sam(naics_codes: list[str], days_back: int) -> list[dict]:
    """Fetch contract opportunities from SAM.gov for each NAICS code."""
    api_key = os.environ.get("SAM_API_KEY")
    if not api_key:
        logger.warning("SAM_API_KEY not set — skipping SAM.gov collection")
        return []

    today = datetime.now(timezone.utc)
    from_date = (today - timedelta(days=days_back)).strftime("%Y-%m-%d")
    to_date = today.strftime("%Y-%m-%d")

    results: list[dict] = []
    async with httpx.AsyncClient(timeout=30) as client:
        # Query each NAICS code individually (cap at 10 to avoid rate limits)
        for naics in naics_codes[:10]:
            try:
                resp = await client.get(
                    "https://api.sam.gov/opportunities/v1/search",
                    params={
                        "api_key": api_key,
                        "postedFrom": from_date,
                        "postedTo": to_date,
                        "naics": naics,
                        "limit": 100,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                for item in data.get("opportunitiesData", []):
                    results.append(
                        _normalize(
                            {
                                "notice_id": item.get("noticeId"),
                                "title": item.get("title"),
                                "agency": (
                                    item.get("fullParentPathName")
                                    or item.get("departmentIndAgency")
                                ),
                                "naics_code": item.get("naicsCode"),
                                "set_aside": (
                                    item.get("typeOfSetAsideDescription")
                                    or item.get("typeOfSetAside")
                                ),
                                "posted_date": item.get("postedDate"),
                                "response_date": item.get("responseDeadLine"),
                                "description": item.get("description", ""),
                                "opportunity_type": item.get("noticeType"),
                                "url": item.get("uiLink")
                                or f"https://sam.gov/opp/{item.get('noticeId')}/view",
                            },
                            "sam.gov",
                        )
                    )
            except Exception as exc:  # noqa: BLE001
                logger.error("SAM.gov error for NAICS %s: %s", naics, exc)

        # Also run a broad recent-opportunities query when no NAICS filter is supplied
        if not naics_codes:
            try:
                resp = await client.get(
                    "https://api.sam.gov/opportunities/v1/search",
                    params={
                        "api_key": api_key,
                        "postedFrom": from_date,
                        "postedTo": to_date,
                        "limit": 100,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                for item in data.get("opportunitiesData", []):
                    results.append(
                        _normalize(
                            {
                                "notice_id": item.get("noticeId"),
                                "title": item.get("title"),
                                "agency": (
                                    item.get("fullParentPathName")
                                    or item.get("departmentIndAgency")
                                ),
                                "naics_code": item.get("naicsCode"),
                                "set_aside": (
                                    item.get("typeOfSetAsideDescription")
                                    or item.get("typeOfSetAside")
                                ),
                                "posted_date": item.get("postedDate"),
                                "response_date": item.get("responseDeadLine"),
                                "description": item.get("description", ""),
                                "opportunity_type": item.get("noticeType"),
                                "url": item.get("uiLink")
                                or f"https://sam.gov/opp/{item.get('noticeId')}/view",
                            },
                            "sam.gov",
                        )
                    )
            except Exception as exc:  # noqa: BLE001
                logger.error("SAM.gov broad query error: %s", exc)

    return results


# ---------------------------------------------------------------------------
# USASpending.gov
# ---------------------------------------------------------------------------

async def _fetch_usaspending(naics_codes: list[str], days_back: int) -> list[dict]:
    """Fetch recent contract awards from USASpending.gov filtered by NAICS codes."""
    today = datetime.now(timezone.utc)
    from_date = (today - timedelta(days=days_back)).strftime("%Y-%m-%d")
    to_date = today.strftime("%Y-%m-%d")

    filters: dict = {
        "award_type_codes": ["A", "B", "C", "D"],
        "time_period": [{"start_date": from_date, "end_date": to_date}],
    }
    if naics_codes:
        filters["naics_codes"] = naics_codes[:20]

    results: list[dict] = []
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(
                "https://api.usaspending.gov/api/v2/search/spending_by_award/",
                json={
                    "filters": filters,
                    "fields": [
                        "Award ID",
                        "Recipient Name",
                        "Awarding Agency",
                        "Award Amount",
                        "Description",
                        "naics_code",
                        "Award Date",
                        "Period of Performance Current End Date",
                    ],
                    "limit": 100,
                    "page": 1,
                    "sort": "Award Date",
                    "order": "desc",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            for item in data.get("results", []):
                award_id = item.get("Award ID") or item.get("generated_internal_id")
                results.append(
                    _normalize(
                        {
                            "notice_id": f"usa_{award_id}",
                            "title": item.get("Description") or f"Contract {award_id}",
                            "agency": item.get("Awarding Agency"),
                            "naics_code": item.get("naics_code"),
                            "set_aside": None,
                            "posted_date": item.get("Award Date"),
                            "response_date": item.get(
                                "Period of Performance Current End Date"
                            ),
                            "description": item.get("Description", ""),
                            "opportunity_type": "Contract Award",
                            "url": f"https://www.usaspending.gov/award/{award_id}",
                        },
                        "usaspending.gov",
                    )
                )
        except Exception as exc:  # noqa: BLE001
            logger.error("USASpending.gov error: %s", exc)

    return results


# ---------------------------------------------------------------------------
# SBIR.gov
# ---------------------------------------------------------------------------

async def _fetch_sbir(naics_codes: list[str]) -> list[dict]:
    """Fetch open SBIR/STTR solicitations from SBIR.gov."""
    results: list[dict] = []
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.get(
                "https://api.sbir.gov/public/api/solicitations",
                params={"open": "true", "rows": 100, "start": 0},
            )
            resp.raise_for_status()
            raw = resp.json()
            items = (
                raw
                if isinstance(raw, list)
                else raw.get("results", raw.get("solicitations", []))
            )
            for item in items:
                naics = item.get("naics") or item.get("naics_code")
                # Filter by NAICS when codes are provided
                if naics_codes and naics and str(naics) not in naics_codes:
                    continue
                sol_id = item.get("solicitation_number") or item.get("id")
                results.append(
                    _normalize(
                        {
                            "notice_id": f"sbir_{sol_id}",
                            "title": (
                                item.get("solicitation_title") or item.get("title")
                            ),
                            "agency": item.get("agency") or item.get("department"),
                            "naics_code": naics,
                            "set_aside": "Small Business",
                            "posted_date": (
                                item.get("open_date") or item.get("release_date")
                            ),
                            "response_date": (
                                item.get("close_date") or item.get("deadline")
                            ),
                            "description": item.get("program_description", ""),
                            "opportunity_type": item.get("program") or "SBIR/STTR",
                            "url": (
                                item.get("solicitation_agency_url")
                                or "https://www.sbir.gov/solicitations"
                            ),
                        },
                        "sbir.gov",
                    )
                )
        except Exception as exc:  # noqa: BLE001
            logger.error("SBIR.gov error: %s", exc)

    return results


# ---------------------------------------------------------------------------
# Grants.gov
# ---------------------------------------------------------------------------

async def _fetch_grants() -> list[dict]:
    """
    Fetch posted federal grants from Grants.gov.

    Note: Grants.gov uses CFDA assistance-listing numbers rather than NAICS
    codes internally, so NAICS filtering is not applied here. Grants are
    included to provide a comprehensive cross-agency picture.
    """
    results: list[dict] = []
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(
                "https://api.grants.gov/v1/api/search2",
                json={
                    "keyword": "",
                    "oppStatuses": "posted",
                    "rows": 100,
                    "startRecordNum": 0,
                    "sortBy": "openDate|desc",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            for item in data.get("data", {}).get("oppHits", []):
                opp_id = item.get("id") or item.get("oppNumber")
                results.append(
                    _normalize(
                        {
                            "notice_id": f"grants_{opp_id}",
                            "title": item.get("title"),
                            "agency": item.get("agencyName") or item.get("agency"),
                            "naics_code": None,
                            "set_aside": None,
                            "posted_date": item.get("openDate") or item.get("postedDate"),
                            "response_date": item.get("closeDate"),
                            "description": item.get("synopsis", ""),
                            "opportunity_type": "Grant",
                            "url": (
                                f"https://grants.gov/search-results-detail/{opp_id}"
                            ),
                        },
                        "grants.gov",
                    )
                )
        except Exception as exc:  # noqa: BLE001
            logger.error("Grants.gov error: %s", exc)

    return results


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def collect_all(
    naics_codes: Optional[list[str]] = None,
    days_back: int = 30,
) -> int:
    """
    Fetch from all federal opportunity databases and persist to SQLite.

    Parameters
    ----------
    naics_codes:
        NAICS codes to filter by. Pass an empty list or None to fetch broadly.
    days_back:
        How many calendar days back to look for new opportunities.

    Returns
    -------
    int
        Total number of records upserted (including deduplication).
    """
    init_db()
    codes = naics_codes or []

    sam, usas, sbir, grants = await asyncio.gather(
        _fetch_sam(codes, days_back),
        _fetch_usaspending(codes, days_back),
        _fetch_sbir(codes),
        _fetch_grants(),
    )

    all_records = sam + usas + sbir + grants
    with get_db() as conn:
        _upsert(conn, all_records)

    logger.info(
        "Collected %d records: SAM=%d USASpending=%d SBIR=%d Grants=%d",
        len(all_records),
        len(sam),
        len(usas),
        len(sbir),
        len(grants),
    )
    return len(all_records)


def get_all_opportunities(limit: int = 500) -> list[dict]:
    """Return stored opportunities from SQLite, most recently fetched first."""
    init_db()
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM opportunities ORDER BY fetched_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]
