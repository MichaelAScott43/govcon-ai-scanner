"""
main.py – FastAPI application entry point for the opportunity intelligence service.

Run locally with:
    uvicorn main:app --reload --port 8000

Environment variables (see .env.example):
    SAM_API_KEY   – SAM.gov API key (required for live data)
    SQLITE_DB_PATH – path to the SQLite database file (default: intelligence.db)
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from collector import init_db
from routes import router

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s – %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="GovCon AI Scanner – Opportunity Intelligence",
    description="Minimal FastAPI service that fetches, analyzes, and scores SAM.gov opportunities.",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow the existing Node/React front-end to call this service during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "opportunity-intelligence"}
