from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ─── Enums ──────────────────────────────────────────────────────────────────

class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"
    prefer_not_to_say = "prefer_not_to_say"


class ResidenceType(str, Enum):
    urban = "urban"
    rural = "rural"
    semi_urban = "semi_urban"


class Category(str, Enum):
    general = "general"
    obc = "obc"
    sc = "sc"
    st = "st"
    ews = "ews"


class SchemeCategory(str, Enum):
    agriculture = "agriculture"
    education = "education"
    health = "health"
    housing = "housing"
    employment = "employment"
    women_welfare = "women_welfare"
    child_welfare = "child_welfare"
    pension = "pension"
    financial_assistance = "financial_assistance"
    skill_development = "skill_development"
    startup = "startup"
    other = "other"


# ─── User Profile (for eligibility check) ───────────────────────────────────

class UserProfile(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    is_rural: Optional[bool] = None
    occupation: Optional[str] = None
    land_acres: Optional[float] = None
    annual_income: Optional[float] = None          # in INR
    category: Optional[str] = None                 # General/OBC/SC/ST/EWS
    is_farmer: Optional[bool] = False
    is_student: Optional[bool] = False
    is_differently_abled: Optional[bool] = False
    is_bpl: Optional[bool] = False                 # Below Poverty Line
    has_lpg: Optional[bool] = None
    owns_pucca_house: Optional[bool] = None
    is_pregnant: Optional[bool] = None
    daughter_age: Optional[int] = None
    disability: Optional[str] = None
    residence_type: Optional[str] = None
    family_size: Optional[int] = None
    education_level: Optional[str] = None

    class Config:
        extra = "allow"


# ─── Scheme Models ───────────────────────────────────────────────────────────

class EligibilityCriteria(BaseModel):
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    genders: Optional[List[str]] = None
    states: Optional[List[str]] = None             # empty = all India
    max_annual_income: Optional[float] = None
    categories: Optional[List[str]] = None
    for_farmers: Optional[bool] = None
    for_students: Optional[bool] = None
    for_differently_abled: Optional[bool] = None
    for_bpl: Optional[bool] = None
    residence_types: Optional[List[str]] = None
    min_education: Optional[str] = None


class Scheme(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    name_hindi: Optional[str] = None
    description: str
    description_hindi: Optional[str] = None
    category: SchemeCategory
    ministry: str
    launch_year: Optional[int] = None
    is_central: bool = True                        # Central or State scheme
    state: Optional[str] = None                   # if state-specific
    eligibility: EligibilityCriteria
    benefits: List[str] = []
    documents_required: List[str] = []
    how_to_apply: str = ""
    application_url: Optional[str] = None
    helpline: Optional[str] = None
    tags: List[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


# ─── Request / Response Models ───────────────────────────────────────────────

class NaturalLanguageQuery(BaseModel):
    query: str = Field(..., min_length=5, description="User's situation in plain language (any Indian language)")
    language: Optional[str] = None


class EligibilityRequest(BaseModel):
    profile: UserProfile
    categories: Optional[List[SchemeCategory]] = None


class SchemeMatch(BaseModel):
    scheme: Scheme
    match_score: float                             # 0.0 – 1.0
    match_reason: str
    eligible: bool


class QueryResponse(BaseModel):
    query: str
    detected_language: str
    extracted_profile: UserProfile
    matched_schemes: List[SchemeMatch]
    total_found: int
    ai_summary: str


class HealthResponse(BaseModel):
    status: str
    version: str
    db_connected: bool


# ─── YojanaLens API Contract Models ──────────────────────────────────────────

class ExtractRequest(BaseModel):
    text: str
    existing_profile: Optional[Dict[str, Any]] = None


class ExtractResponse(BaseModel):
    profile: Dict[str, Any]
    follow_up_question: Optional[str] = None


class MatchRequest(BaseModel):
    profile: Dict[str, Any]
    lang: Optional[str] = "en"


class EvidenceItem(BaseModel):
    title: str
    url: str
    snippet: Optional[str] = ""


class MatchedResultItem(BaseModel):
    id: str
    scheme: str
    scheme_hi: Optional[str] = None
    benefit: str
    benefit_hi: Optional[str] = None
    status: str                                    # "likely_eligible" | "check_at_office"
    timeline_status: Optional[str] = "active"      # "active" | "upcoming" | "ended"
    timeline_cycle: Optional[str] = "Available Now"
    source_url: Optional[str] = None
    last_verified: Optional[str] = None
    opens_on: Optional[str] = None
    closes_on: Optional[str] = None
    dates_confirmed: Optional[bool] = False
    failed_rule: Optional[str] = None
    what_would_change_this: Optional[str] = None
    matched_reasons: List[str] = []
    missing_info: List[str] = []
    documents: List[str] = []
    apply_url: str
    reason: str
    source_status: str                             # "verified" | "unverified"
    evidence: List[EvidenceItem] = []

    class Config:
        extra = "allow"


class MatchResponse(BaseModel):
    profile: Dict[str, Any]
    results: List[MatchedResultItem]
    near_misses: List[MatchedResultItem] = []


class AskSchemeRequest(BaseModel):
    scheme_id: str
    question: str
    lang: Optional[str] = "en"


class AskSchemeResponse(BaseModel):
    answer: str
    grounded: bool
    source_url: Optional[str] = None


class VerifyRequest(BaseModel):
    text: str
    lang: Optional[str] = "en"


class CitationItem(BaseModel):
    title: str
    url: str


class LinkFlagItem(BaseModel):
    url: str
    is_official: bool
    reason: str


class VerifyResponse(BaseModel):
    verdict: str                                   # "supported" | "false" | "unverified"
    confidence: float
    reasoning: str
    citations: List[CitationItem] = []
    link_flags: List[LinkFlagItem] = []
    extracted_text: Optional[str] = None


class KeyDateItem(BaseModel):
    date: str
    what: str


class SimplifyResponse(BaseModel):
    summary: str
    key_dates: List[KeyDateItem] = []
    action_items: List[str] = []
    risks: List[str] = []
    translated_text: str


# ─── Complaints Models (Phase 3) ─────────────────────────────────────────────

class ComplaintRecord(BaseModel):
    id: str
    text: str
    category: str
    department: str
    severity: str
    location: str
    lang: str = "en"
    status: str = "received"
    created_at: str
    updated_at: str
    formal_draft: Optional[str] = None
    duplicates_found: List[str] = []


class ComplaintStatusUpdateRequest(BaseModel):
    status: str


class MissingDocumentStat(BaseModel):
    name: str
    count: int


class VerdictStat(BaseModel):
    supported: int = 0
    false: int = 0
    unverified: int = 0


class StatsResponse(BaseModel):
    sessions: int
    schemes_matched: int
    verdicts: VerdictStat
    top_missing_documents: List[MissingDocumentStat]
    complaints_total: Optional[int] = 0
    complaints_by_status: Optional[Dict[str, int]] = {}
    complaints_by_category: Optional[Dict[str, int]] = {}


# ─── Budget Models (Phase 4) ─────────────────────────────────────────────────

class BudgetAskRequest(BaseModel):
    question: str
    lang: str = "en"


class BudgetAskResponse(BaseModel):
    question: str
    aggregation: str
    params: Dict[str, Any] = {}
    computed_data: Any
    answer: str


class BudgetExplainRequest(BaseModel):
    chart_type: str
    chart_summary: Dict[str, Any]
    lang: str = "en"


class BudgetExplainResponse(BaseModel):
    explanation: str

