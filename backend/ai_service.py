from google import genai
from google.genai import types
import json
import re
from langdetect import detect
from models import (
    UserProfile, SchemeMatch, Scheme,
    VerifyResponse, CitationItem, MatchedResultItem, EvidenceItem
)
from config import get_settings

settings = get_settings()

# Initialize Gemini client
client = None
if settings.gemini_api_key:
    try:
        client = genai.Client(api_key=settings.gemini_api_key)
    except Exception as e:
        print(f"[WARN] Failed to initialize Gemini client: {e}")

MODEL = "gemini-2.0-flash"


LANGUAGE_NAMES = {
    "hi": "Hindi", "bn": "Bengali", "te": "Telugu", "mr": "Marathi",
    "ta": "Tamil", "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam",
    "pa": "Punjabi", "ur": "Urdu", "or": "Odia", "en": "English",
    "as": "Assamese", "mai": "Maithili",
}


def detect_language(text: str) -> str:
    """Detect language code from text."""
    try:
        return detect(text)
    except Exception:
        return "en"


# ─── YojanaLens Extract Profile ──────────────────────────────────────────────

async def extract_yojanalens_profile(text: str, existing_profile: dict) -> tuple[dict, str | None]:
    """
    Extract profile fields for YojanaLens:
    age, gender, state, is_rural, occupation, land_acres, annual_income,
    category, is_bpl, has_lpg, owns_pucca_house, is_pregnant, daughter_age, disability
    Plus an optional follow_up_question if critical fields are missing.
    """
    if not client:
        # Fallback keyword extraction when Gemini API key is not yet set
        lower = text.lower()
        merged = dict(existing_profile or {})
        if any(w in lower for w in ["kisan", "farmer", "किसान"]):
            merged["occupation"] = "farmer"
            merged["is_farmer"] = True
            merged["is_rural"] = True
        if any(w in lower for w in ["student", "छात्र"]):
            merged["occupation"] = "student"
            merged["is_student"] = True
        if any(w in lower for w in ["jharkhand", "झारखंड"]):
            merged["state"] = "Jharkhand"
        if any(w in lower for w in ["bihar", "बिहार"]):
            merged["state"] = "Bihar"
        if any(w in lower for w in ["rajasthan", "राजस्थान"]):
            merged["state"] = "Rajasthan"
        if any(w in lower for w in ["bpl", "गरीब"]):
            merged["is_bpl"] = True
        if any(w in lower for w in ["woman", "महिला", "widow", "विधवा"]):
            merged["gender"] = "female"
        # Extract age numbers if present
        m_age = re.search(r"\b(\d{1,2})\s*(?:साल|वर्ष|years|yrs|yr)\b", lower)
        if m_age:
            merged["age"] = int(m_age.group(1))

        follow_up = None
        if "age" not in merged:
            follow_up = "Could you tell me your age and state?"
        elif "state" not in merged:
            follow_up = "Which state or district do you live in?"
        return merged, follow_up

    prompt = f"""
You are an expert welfare advisor extracting structured eligibility profile data from natural language
(Hindi, English, Hinglish, or any Indian regional language).

Existing profile so far:
{json.dumps(existing_profile or {}, indent=2)}

New user input:
"{text}"

Update and merge into a single JSON object with these EXACT keys (use null or keep existing values if not mentioned):
{{
  "age": integer or null,
  "gender": "male"|"female"|"other"|null,
  "state": string or null (state name in English),
  "is_rural": boolean or null,
  "occupation": string or null,
  "land_acres": number or null,
  "annual_income": number or null (in INR),
  "category": "general"|"obc"|"sc"|"st"|"ews"|null,
  "is_bpl": boolean or null,
  "has_lpg": boolean or null,
  "owns_pucca_house": boolean or null,
  "is_pregnant": boolean or null,
  "daughter_age": integer or null,
  "disability": string or null
}}

Also determine: If essential details (like age or state or occupation) are still missing, provide a friendly,
concise 1-sentence follow_up_question in the user's language. If the profile has sufficient context, return null for follow_up_question.

Return ONLY a JSON object format:
{{
  "profile": {{ ... }},
  "follow_up_question": "string or null"
}}
"""
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1),
        )
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", response.text.strip(), flags=re.MULTILINE).strip()
        data = json.loads(cleaned)
        return data.get("profile", existing_profile), data.get("follow_up_question")
    except Exception as e:
        print(f"[WARN] Error in extract_yojanalens_profile: {e}")
        return existing_profile or {}, None


# ─── Fact-Checking & Claim Verification (Parakh) ─────────────────────────────

async def verify_claim_with_gemini(text: str, lang: str = "en") -> VerifyResponse:
    """
    Verify forwarded WhatsApp message or rumor about an Indian government scheme.
    """
    if not client:
        # Heuristic fallback if Gemini API key is not configured
        lower = text.lower()
        if any(w in lower for w in ["free laptop", "free mobile", "click here", "bit.ly", "urgent registration"]):
            return VerifyResponse(
                verdict="false",
                confidence=0.95,
                reasoning="This message matches widely flagged cyber phishing scams. Official government schemes do not ask citizens to register via shortened links or unverified WhatsApp forwards.",
                citations=[
                    CitationItem(title="PIB Fact Check Portal", url="https://factcheck.pib.gov.in"),
                    CitationItem(title="National Cyber Crime Reporting Portal", url="https://cybercrime.gov.in")
                ]
            )
        elif any(w in lower for w in ["pm kisan", "pmkisan", "jan dhan", "ayushman"]):
            return VerifyResponse(
                verdict="supported",
                confidence=0.92,
                reasoning="This refers to a verified national welfare initiative administered by the Government of India. Always ensure you access the portal via .gov.in domains.",
                citations=[
                    CitationItem(title="National Portal of India", url="https://india.gov.in"),
                    CitationItem(title="PIB Government Notifications", url="https://pib.gov.in")
                ]
            )
        return VerifyResponse(
            verdict="unverified",
            confidence=0.35,
            reasoning="We could not find an official government circular validating this specific claim. Always confirm directly on official .gov.in websites.",
            citations=[CitationItem(title="PIB Fact Check", url="https://factcheck.pib.gov.in")]
        )

    prompt = f"""
You are the official fact-checking engine for 'YojanaLens', an Indian welfare initiative.
Analyze the following claim or forwarded message regarding an Indian government scheme:

Message: "{text}"
Response Language: "{lang}"

Determine:
1. Verdict: Must be one of ["supported", "false", "unverified"].
   - "supported": The scheme exists and the claim aligns with official government policy.
   - "false": The message is a scam, fake promise, phishing link, or debunked rumor.
   - "unverified": No official gazette or credible source exists; do not guess.
2. Confidence: Float between 0.0 and 1.0.
3. Reasoning: 2-3 sentences explaining the fact-check clearly in the requested language.
4. Citations: List of official links or portals (e.g. pib.gov.in, india.gov.in, specific ministry sites).

Return ONLY a JSON object:
{{
  "verdict": "supported"|"false"|"unverified",
  "confidence": 0.95,
  "reasoning": "...",
  "citations": [
    {{"title": "...", "url": "..."}}
  ]
}}
"""
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.2),
        )
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", response.text.strip(), flags=re.MULTILINE).strip()
        data = json.loads(cleaned)
        return VerifyResponse(**data)
    except Exception as e:
        print(f"[WARN] Error in verify_claim_with_gemini: {e}")
        return VerifyResponse(
            verdict="unverified",
            confidence=0.3,
            reasoning="Verification service currently unavailable. Please check https://factcheck.pib.gov.in directly.",
            citations=[CitationItem(title="PIB Fact Check", url="https://factcheck.pib.gov.in")]
        )


# ─── Legacy Match Helpers ───────────────────────────────────────────────────

def compute_match_score(profile: UserProfile, scheme: Scheme) -> tuple[float, str, bool]:
    criteria = scheme.eligibility
    reasons = []
    penalties = 0
    total_criteria = 0

    if criteria.min_age is not None or criteria.max_age is not None:
        total_criteria += 1
        if profile.age is not None:
            if criteria.min_age and profile.age < criteria.min_age:
                penalties += 1
                reasons.append(f"Age {profile.age} < minimum {criteria.min_age}")
            elif criteria.max_age and profile.age > criteria.max_age:
                penalties += 1
                reasons.append(f"Age {profile.age} > maximum {criteria.max_age}")
            else:
                reasons.append("Age eligible")

    if criteria.genders:
        total_criteria += 1
        if profile.gender and profile.gender not in criteria.genders:
            penalties += 1
            reasons.append(f"Scheme is for {', '.join(criteria.genders)}")
        else:
            reasons.append("Gender eligible")

    if criteria.states:
        total_criteria += 1
        if profile.state and profile.state.lower() not in [s.lower() for s in criteria.states]:
            penalties += 1
            reasons.append(f"Scheme only for: {', '.join(criteria.states)}")
        else:
            reasons.append("State eligible")

    if criteria.max_annual_income is not None:
        total_criteria += 1
        if profile.annual_income is not None and profile.annual_income > criteria.max_annual_income:
            penalties += 1
            reasons.append(f"Income exceeds limit of ₹{criteria.max_annual_income:,.0f}")
        else:
            reasons.append("Income eligible")

    if total_criteria == 0:
        score = 0.8
        eligible = True
    else:
        score = max(0.0, (total_criteria - penalties) / total_criteria)
        eligible = penalties == 0

    reason_text = "; ".join(reasons) if reasons else "Matches general eligibility criteria"
    return round(score, 2), reason_text, eligible


async def generate_ai_summary(query: str, profile: UserProfile, matches: list, lang_code: str) -> str:
    lang_name = LANGUAGE_NAMES.get(lang_code, "English")
    scheme_names = [m.scheme.name for m in matches[:5] if getattr(m, 'eligible', False)]

    prompt = f"""
You are a helpful government scheme advisor for Indian citizens.
User asked: "{query}" (Language: {lang_name})
Eligible schemes: {', '.join(scheme_names) if scheme_names else 'None found yet'}
Write a warm, concise 2-sentence summary in {lang_name}.
"""
    if not client:
        return f"Found {len(scheme_names)} eligible schemes for you."
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.7),
        )
        return response.text.strip()
    except Exception:
        return f"Found {len(scheme_names)} eligible schemes for you."
