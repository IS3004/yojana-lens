import asyncio
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from database import connect_db, close_db, get_database
from routes import router
from config import get_settings
from models import HealthResponse
from utils.limiter import limiter

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown events."""
    try:
        await asyncio.wait_for(connect_db(), timeout=1.0)
    except Exception as e:
        print(f"[WARN] Database connection skipped or failed: {e}")
    yield
    try:
        await close_db()
    except Exception:
        pass


app = FastAPI(
    title="🇮🇳 YojanaLens API",
    description=(
        "Bilingual (English/Hindi) AI-powered Indian civic assistant. "
        "Find every scheme you deserve, verified at the source."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ──────────────────────────────────────────────────────────────────
app.include_router(router)
app.include_router(router, prefix="/api")


# ─── Health Check ────────────────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check():
    """Check if the API and database are up."""
    try:
        db = get_database()
        await asyncio.wait_for(db.command("ping"), timeout=0.5)
        db_ok = True
    except Exception:
        db_ok = False

    return HealthResponse(
        status="healthy" if db_ok else "degraded",
        version="1.0.0",
        db_connected=db_ok,
    )


@app.get("/", tags=["system"])
async def root():
    return {
        "message": "🇮🇳 Scheme Finder API is running",
        "docs": "/docs",
        "health": "/health",
    }
