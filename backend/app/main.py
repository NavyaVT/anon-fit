"""AnonFit FastAPI application entrypoint."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import close_db, init_db
from app.routes import admin, auth, health, pin, users, webauthn
from app.utils.logging_store import configure_logging, log_event

settings = get_settings()

LOG_FILE = configure_logging(settings.log_level)
logger = logging.getLogger("anonfit")


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Connect to MongoDB on startup and close the pool on shutdown."""
    try:
        await init_db()
    except Exception:
        logger.exception(
            "Could not connect to MongoDB at %s. Is the database running?",
            settings.mongodb_url,
        )
        raise
    logger.info("Log file sink: %s", LOG_FILE)
    await log_event(
        level="info",
        category="system",
        event="system.startup",
        message=f"API started in {settings.environment} mode",
        metadata={"docsPath": "/docs"},
    )
    yield
    await log_event(
        level="info",
        category="system",
        event="system.shutdown",
        message="API shutting down",
    )
    await close_db()


app = FastAPI(
    title=settings.app_name,
    description=(
        "Privacy-first health & workout companion. "
        "Identity lives in `users`; health metrics live in `health_data` and "
        "reference users only through a permanent anonymized id."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    max_age=600,
)

# API routes
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(webauthn.router, prefix=settings.api_prefix)
app.include_router(users.router, prefix=settings.api_prefix)
app.include_router(pin.router, prefix=settings.api_prefix)
app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(admin.router, prefix=settings.api_prefix)


@app.get("/", tags=["System"], summary="Service root")
async def root() -> dict:
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
        "status": "ok",
    }


@app.get(f"{settings.api_prefix}/health", tags=["System"], summary="Health check")
async def health_check() -> dict:
    return {"status": "ok", "environment": settings.environment}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Never leak stack traces to clients in production."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    detail = "Internal server error" if settings.is_production else str(exc)
    return JSONResponse(status_code=500, content={"detail": detail})
