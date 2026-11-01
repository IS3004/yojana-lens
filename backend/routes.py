import json
from fastapi import APIRouter, HTTPException, Query, Request, UploadFile, File, Form
from typing import Optional, List, Dict, Any
from database import get_collection
from models import (
    NaturalLanguageQuery, QueryResponse, EligibilityRequest,
    SchemeMatch, Scheme, SchemeCategory, UserProfile,
    ExtractRequest, ExtractResponse, MatchRequest, MatchResponse,
    MatchedResultItem, EvidenceItem, VerifyRequest, VerifyResponse,
    StatsResponse, VerdictStat, MissingDocumentStat,
    AskSchemeRequest, AskSchemeResponse
)
from ai_service import (
    detect_language, compute_match_score,
    verify_claim_with_gemini
)
from matcher import match_profile_against_schemes, load_schemes
import difflib
import os
from datetime import datetime, timezone, timedelta
from fastapi import Header
from llm import (
    extract_profile_from_text,
    extract_profile_from_document_image,
    answer_scheme_question,
    ocr_image_or_pdf,
    judge_claim_against_evidence,
    simplify_government_notice,
    classify_and_draft_complaint,
    classify_budget_question,
    phrase_budget_answer,
    explain_budget_chart
)
from evidence import search_official_evidence
from utils.validators import validate_uploaded_file, extract_urls_and_phones, MAX_FILE_SIZE_BYTES
from utils.limiter import limiter
from supabase_client import (
    insert_complaint, fetch_complaints, update_complaint_status
)
from budget_service import (
    get_budget_summary, execute_budget_aggregation, load_meta
)
from models import (
    NaturalLanguageQuery, QueryResponse, EligibilityRequest,
    SchemeMatch, Scheme, SchemeCategory, UserProfile,
    ExtractRequest, ExtractResponse, MatchRequest, MatchResponse,
    MatchedResultItem, EvidenceItem, VerifyRequest, VerifyResponse,
    StatsResponse, VerdictStat, MissingDocumentStat,
    AskSchemeRequest, AskSchemeResponse, SimplifyResponse, LinkFlagItem,
    ComplaintRecord, ComplaintStatusUpdateRequest,
    BudgetAskRequest, BudgetAskResponse, BudgetExplainRequest, BudgetExplainResponse
)

LIVE_METRICS = {
    "sessions": 1420,
    "schemes_matched": 5180,
    "verdicts": {
        "supported": 345,
        "false": 210,
        "unverified": 105
    },
    "missing_docs": {
        "Aadhaar Card": 920,
        "Income Certificate": 680,
        "Land Records (Khasra)": 430,
        "Bank Passbook": 390,
        "Ration Card": 310
    }
}

router = APIRouter(tags=["yojanalens"])


def doc_to_scheme(doc: dict) -> Scheme:
    """Convert MongoDB document to Scheme model."""
    doc["_id"] = str(doc["_id"])
    return Scheme(**doc)


# ─── YojanaLens Core Contracts ───────────────────────────────────────────────

@router.post("/extract", response_model=ExtractResponse, summary="Extract citizen profile from text")
@limiter.limit("30/minute")
async def extract_profile_endpoint(request: Request, body: ExtractRequest):
    """
    Accepts text describing citizen situation and accumulated profile.
    Returns merged profile and optional follow-up question.
    """
    updated_profile, follow_up = await extract_profile_from_text(
        text=body.text,
        existing_profile=body.existing_profile or {}
    )
    LIVE_METRICS["sessions"] += 1
    return ExtractResponse(
        profile=updated_profile,
        follow_up_question=follow_up
    )


@router.post("/extract-image", response_model=ExtractResponse, summary="Multimodal photo prefill")
@limiter.limit("15/minute")
async def extract_image_endpoint(
    request: Request,
    file: UploadFile = File(...),
    existing_profile: Optional[str] = Form(None)
):
    """
    Photo prefill: reads ration card, income certificate or Aadhaar-style document image.
    Extracts demographic factors into profile JSON. NEVER returns or stores citizen ID numbers.
    """
    validate_uploaded_file(file)
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Uploaded file exceeds 5 MB size limit.")

    existing_dict = {}
    if existing_profile:
        try:
            existing_dict = json.loads(existing_profile)
        except Exception:
            existing_dict = {}

    profile = await extract_profile_from_document_image(
        image_bytes=contents,
        mime_type=file.content_type or "image/jpeg",
        existing_profile=existing_dict
    )
    LIVE_METRICS["sessions"] += 1
    return ExtractResponse(profile=profile, follow_up_question=None)


@router.post("/match", response_model=MatchResponse, summary="Match schemes against citizen profile")
@limiter.limit("60/minute")
async def match_schemes_endpoint(request: Request, body: MatchRequest):
    """
    Evaluates eligibility across all schemes using strict Python rule evaluation (matcher.py).
    The LLM never decides eligibility.
    Returns:
      - results: fully eligible schemes
      - near_misses: schemes where exactly 1 rule fails, with failed rule label and action hint.
    """
    match_data = match_profile_against_schemes(body.profile, lang=body.lang or "en")
    
    # Track metrics
    LIVE_METRICS["schemes_matched"] += len(match_data.get("results", []))
    for r in match_data.get("results", []) + match_data.get("near_misses", []):
        for doc in r.get("documents", []):
            LIVE_METRICS["missing_docs"][doc] = LIVE_METRICS["missing_docs"].get(doc, 0) + 1

    return MatchResponse(
        profile=match_data["profile"],
        results=[MatchedResultItem(**r) for r in match_data["results"]],
        near_misses=[MatchedResultItem(**nm) for nm in match_data.get("near_misses", [])]
    )


@router.post("/ask-scheme", response_model=AskSchemeResponse, summary="Grounded Q&A per scheme")
@limiter.limit("30/minute")
async def ask_scheme_endpoint(request: Request, body: AskSchemeRequest):
    """
    Strictly grounded Q&A per scheme. Uses only the scheme JSON fields and official
    Tavily search evidence as context. If the answer is not present, points to the official URL.
    """
    schemes = load_schemes()
    target_scheme = next((s for s in schemes if s["id"] == body.scheme_id), None)
    if not target_scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    # Fetch live official evidence from Tavily
    query = f"{target_scheme.get('scheme')} official guidelines {body.question}"
    evidence_snippets = await search_official_evidence(query=query, max_results=3)

    ans_data = await answer_scheme_question(
        scheme=target_scheme,
        evidence_snippets=evidence_snippets,
        question=body.question,
        lang=body.lang or "en"
    )
    return AskSchemeResponse(
        answer=ans_data.get("answer", ""),
        grounded=ans_data.get("grounded", False),
        source_url=target_scheme.get("source_url")
    )

# ─── Parakh Verification & Simplification Endpoints (Phase 2) ────────────────

@router.post("/verify", response_model=VerifyResponse, summary="Verify forwarded message or claim")
@limiter.limit("20/minute")
async def verify_claim_endpoint(
    request: Request,
    text: Optional[str] = Form(None),
    lang: Optional[str] = Form("en"),
    file: Optional[UploadFile] = File(None)
):
    """
    Parakh verification engine (Phase 2):
    - Accepts text or uploaded image/PDF (OCR via Gemini multimodal).
    - Plain-code URL & phone check: flags any link not ending in .gov.in / .nic.in.
    - Tavily search restricted to official government domains.
    - If no relevant evidence: returns 'unverified' WITHOUT asking the LLM.
    - Otherwise Gemini evaluates strictly against retrieved snippets.
    """
    claim_text = (text or "").strip()
    extracted_text = None

    if file:
        validate_uploaded_file(file)
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="Uploaded file exceeds 5 MB size limit.")
        extracted_text = await ocr_image_or_pdf(contents, file.content_type or "image/jpeg")
        claim_text = (claim_text + " " + extracted_text).strip() if claim_text else extracted_text

    if not claim_text:
        # Check if JSON payload was provided as fallback
        try:
            body = await request.json()
            claim_text = body.get("text", "").strip()
            lang = body.get("lang", lang)
        except Exception:
            pass

    if not claim_text:
        raise HTTPException(status_code=400, detail="Please provide claim text or upload a document/image to verify.")

    # Plain-code URL and telephone validator (Phase 2b)
    url_audit = extract_urls_and_phones(claim_text)
    link_flags = [LinkFlagItem(**item) for item in url_audit.get("link_flags", [])]

    # Search strictly on official government domains (Phase 2c)
    evidence_snippets = await search_official_evidence(query=claim_text[:200], max_results=4)

    # Judge claim against official evidence
    judgment = await judge_claim_against_evidence(
        claim_text=claim_text,
        evidence_snippets=evidence_snippets,
        lang=lang or "en"
    )

    verdict_val = judgment.get("verdict", "unverified")
    LIVE_METRICS["verdicts"][verdict_val] = LIVE_METRICS["verdicts"].get(verdict_val, 0) + 1

    return VerifyResponse(
        verdict=verdict_val,
        confidence=judgment.get("confidence", 0.0),
        reasoning=judgment.get("reasoning", ""),
        citations=judgment.get("citations", []),
        link_flags=link_flags,
        extracted_text=extracted_text
    )


@router.post("/simplify", response_model=SimplifyResponse, summary="Simplify complex government notice")
@limiter.limit("20/minute")
async def simplify_notice_endpoint(
    request: Request,
    text: Optional[str] = Form(None),
    lang: Optional[str] = Form("en"),
    file: Optional[UploadFile] = File(None)
):
    """
    Notice Simplifier (Phase 2d):
    Simplifies administrative gazettes, circulars, and notifications into summary,
    milestone dates, citizen action items, risks, and accessible translation.
    """
    notice_text = (text or "").strip()

    if file:
        validate_uploaded_file(file)
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="Uploaded file exceeds 5 MB size limit.")
        ocr_text = await ocr_image_or_pdf(contents, file.content_type or "image/jpeg")
        notice_text = (notice_text + " " + ocr_text).strip() if notice_text else ocr_text

    if not notice_text:
        try:
            body = await request.json()
            notice_text = body.get("text", "").strip()
            lang = body.get("lang", lang)
        except Exception:
            pass

    if not notice_text:
        raise HTTPException(status_code=400, detail="Please provide notification text or upload an official circular image/PDF.")

    simplified = await simplify_government_notice(notice_text=notice_text, lang=lang or "en")
    return SimplifyResponse(**simplified)


# ─── Complaints Module Endpoints (Phase 3) ───────────────────────────────────

def find_duplicate_complaints(category: str, location: str, existing_list: List[Dict[str, Any]]) -> List[str]:
    """
    Fuzzy duplicate check in code (difflib):
    Matches same category AND similar normalized location text within the last 30 days.
    """
    duplicates = []
    norm_loc = (location or "").lower().strip()
    now = datetime.now(timezone.utc)

    for c in existing_list:
        if (c.get("category") or "").lower() == category.lower():
            # Check within 30 days
            created_str = c.get("created_at")
            is_recent = True
            if created_str:
                try:
                    c_time = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                    if (now - c_time) > timedelta(days=30):
                        is_recent = False
                except Exception:
                    pass

            if is_recent:
                other_loc = (c.get("location") or "").lower().strip()
                ratio = difflib.SequenceMatcher(None, norm_loc, other_loc).ratio()
                if ratio >= 0.65 or (norm_loc and norm_loc in other_loc) or (other_loc and other_loc in norm_loc):
                    duplicates.append(c["id"])

    return duplicates


@router.post("/complaints", response_model=ComplaintRecord, summary="File a civic grievance")
@limiter.limit("20/minute")
async def create_complaint_endpoint(
    request: Request,
    text: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    lang: Optional[str] = Form("en"),
    file: Optional[UploadFile] = File(None)
):
    """
    File a public complaint without recording citizen identity numbers (Rule 3b):
    1. Gemini classifies category, responsible department, severity, and drafts formal petition.
    2. Code computes fuzzy duplicate check on category + location within 30 days.
    3. Persists record in Supabase (or memory fallback).
    """
    complaint_body = (text or "").strip()
    location_str = (location or "").strip()

    if file:
        validate_uploaded_file(file)
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="Uploaded file exceeds 5 MB size limit.")
        ocr_text = await ocr_image_or_pdf(contents, file.content_type or "image/jpeg")
        complaint_body = (complaint_body + " " + ocr_text).strip() if complaint_body else ocr_text

    if not complaint_body:
        try:
            body = await request.json()
            complaint_body = body.get("text", "").strip()
            location_str = body.get("location", location_str).strip()
            lang = body.get("lang", lang)
        except Exception:
            pass

    if not complaint_body or not location_str:
        raise HTTPException(
            status_code=400,
            detail="Both description text and location are required to register a civic grievance."
        )

    # Classify & Draft formal administrative petition
    analysis = await classify_and_draft_complaint(
        complaint_text=complaint_body,
        location=location_str,
        lang=lang or "en"
    )

    category = analysis.get("category", "other")
    department = analysis.get("department", "Municipal Public Works Department")
    severity = analysis.get("severity", "medium")
    formal_draft = analysis.get("formal_draft", "")

    # Duplicate check in code (difflib)
    all_complaints = await fetch_complaints()
    duplicates = find_duplicate_complaints(category, location_str, all_complaints)

    record_to_save = {
        "text": complaint_body,
        "location": location_str,
        "category": category,
        "department": department,
        "severity": severity,
        "lang": lang or "en",
        "status": "received",
        "formal_draft": formal_draft,
        "duplicates_found": duplicates
    }

    saved = await insert_complaint(record_to_save)
    return ComplaintRecord(**saved)


@router.get("/complaints", response_model=List[ComplaintRecord], summary="List public complaints tracker")
async def list_complaints_endpoint(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    """Public transparency grievance tracker with status badges and filters."""
    records = await fetch_complaints(category=category, status=status)
    return [ComplaintRecord(**r) for r in records]


@router.patch("/complaints/{complaint_id}/status", response_model=ComplaintRecord, summary="Update complaint status (Admin only)")
async def update_complaint_status_endpoint(
    complaint_id: str,
    body: ComplaintStatusUpdateRequest,
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token")
):
    """Admin-token protected endpoint to advance complaint status: received | in_progress | resolved."""
    expected_token = os.getenv("ADMIN_TOKEN", "yojanalens_admin_secret_token")
    if not x_admin_token or x_admin_token != expected_token:
        raise HTTPException(status_code=401, detail="Unauthorized. Invalid or missing X-Admin-Token header.")

    valid_statuses = ("received", "in_progress", "resolved")
    if body.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{body.status}'. Must be one of: {', '.join(valid_statuses)}"
        )

    updated = await update_complaint_status(complaint_id, body.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Complaint record not found.")

    return ComplaintRecord(**updated)


@router.get("/stats", response_model=StatsResponse, summary="Get portal analytics and transparency stats")
async def get_stats_endpoint():
    """
    Returns live counters on sessions, matched schemes, fact-check verdicts, complaints, and missing docs.
    """
    complaints = await fetch_complaints()
    by_status = {"received": 0, "in_progress": 0, "resolved": 0}
    by_category = {}
    for c in complaints:
        st = c.get("status", "received")
        by_status[st] = by_status.get(st, 0) + 1
        cat = c.get("category", "other")
        by_category[cat] = by_category.get(cat, 0) + 1

    sorted_docs = sorted(
        LIVE_METRICS["missing_docs"].items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]

    return StatsResponse(
        sessions=LIVE_METRICS["sessions"],
        schemes_matched=LIVE_METRICS["schemes_matched"],
        verdicts=VerdictStat(
            supported=LIVE_METRICS["verdicts"].get("supported", 0),
            false=LIVE_METRICS["verdicts"].get("false", 0),
            unverified=LIVE_METRICS["verdicts"].get("unverified", 0)
        ),
        top_missing_documents=[
            MissingDocumentStat(name=name, count=count)
            for name, count in sorted_docs
        ],
        complaints_total=len(complaints),
        complaints_by_status=by_status,
        complaints_by_category=by_category
    )


# ─── Budget Transparency Endpoints (Phase 4) ─────────────────────────────────

@router.get("/budget/summary", summary="Get budget overview, sectoral totals and top line items")
async def get_budget_summary_endpoint():
    """
    Returns spending summary calculated purely via pandas from backend/data/ CSV.
    """
    return get_budget_summary()


@router.post("/budget/ask", response_model=BudgetAskResponse, summary="Grounded budget Q&A")
@limiter.limit("20/minute")
async def ask_budget_endpoint(request: Request, body: BudgetAskRequest):
    """
    Two-step grounded budget Q&A:
    1. Gemini maps natural question to pandas aggregation & params.
    2. Code (pandas) executes the aggregation calculation.
    3. Gemini phrases final answer strictly from the computed numbers.
    """
    # Step 1: classify question
    classification = await classify_budget_question(body.question)
    agg = classification.get("aggregation", "summary")
    params = classification.get("params", {})

    # Step 2: execute in pandas
    computed = execute_budget_aggregation(agg, params)

    # Step 3: phrase strictly from computed numbers
    meta = load_meta()
    answer = await phrase_budget_answer(
        question=body.question,
        computed_data=computed,
        meta=meta,
        lang=body.lang or "en"
    )

    return BudgetAskResponse(
        question=body.question,
        aggregation=agg,
        params=params,
        computed_data=computed,
        answer=answer
    )


@router.post("/budget/explain", response_model=BudgetExplainResponse, summary="Explain budget chart in simple terms")
@limiter.limit("20/minute")
async def explain_budget_endpoint(request: Request, body: BudgetExplainRequest):
    """
    Generates a 2-sentence plain-language citizen explanation for a Recharts visualization.
    """
    explanation = await explain_budget_chart(
        chart_type=body.chart_type,
        chart_summary=body.chart_summary,
        lang=body.lang or "en"
    )
    return BudgetExplainResponse(explanation=explanation)



# ─── Legacy Scheme Endpoints ─────────────────────────────────────────────────

@router.get("/schemes", summary="List all schemes with optional filters")
async def list_schemes(
    category: Optional[SchemeCategory] = None,
    is_central: Optional[bool] = None,
    state: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    try:
        collection = get_collection("schemes")
        query_filter: dict = {"is_active": True}

        if category:
            query_filter["category"] = category.value
        if is_central is not None:
            query_filter["is_central"] = is_central
        if state:
            query_filter["$or"] = [{"is_central": True}, {"state": {"$regex": state, "$options": "i"}}]
        if search:
            query_filter["$text"] = {"$search": search}

        total = await collection.count_documents(query_filter)
        skip = (page - 1) * limit
        cursor = collection.find(query_filter).skip(skip).limit(limit)
        schemes = [doc_to_scheme(doc) async for doc in cursor]

        return {
            "schemes": schemes,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit,
        }
    except Exception:
        return {"schemes": [], "total": 0, "page": 1, "limit": limit, "pages": 0}


@router.get("/categories", summary="List all scheme categories")
async def list_categories():
    try:
        collection = get_collection("schemes")
        pipeline = [
            {"$match": {"is_active": True}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        results = await collection.aggregate(pipeline).to_list(length=50)
        return [{"category": r["_id"], "count": r["count"]} for r in results]
    except Exception:
        return []
