import json
from typing import Dict, Any, Tuple, Optional, List
from utils.gemini_client import generate_gemini_json, analyze_multimodal_document

EMPTY_PROFILE_SHAPE = {
    "age": None,
    "gender": None,
    "state": None,
    "is_rural": None,
    "occupation": None,
    "land_acres": None,
    "annual_income": None,
    "category": None,
    "is_bpl": None,
    "has_lpg": None,
    "owns_pucca_house": None,
    "is_pregnant": None,
    "daughter_age": None,
    "disability": None
}


async def extract_profile_from_text(
    text: str,
    existing_profile: Optional[Dict[str, Any]] = None
) -> Tuple[Dict[str, Any], Optional[str]]:
    """
    Extract profile using Gemini LLM into structured profile JSON.
    Never invents data; outputs null if not stated.
    """
    existing = dict(existing_profile or {})
    fallback = {
        "profile": {**EMPTY_PROFILE_SHAPE, **existing},
        "follow_up_question": None
    }

    prompt = f"""
You are an expert bilingual welfare assistant. Your job is to extract civic eligibility parameters from user input.
Do NOT invent values. If a field is not explicitly mentioned, keep its existing value or use null.

Existing Profile:
{json.dumps(existing, indent=2)}

New User Input:
"{text}"

Extract and update into this EXACT JSON structure:
{{
  "profile": {{
    "age": integer or null,
    "gender": "male"|"female"|"other"|null,
    "state": string or null (Indian state in English),
    "is_rural": boolean or null,
    "occupation": string or null,
    "land_acres": number or null,
    "annual_income": number or null,
    "category": "general"|"obc"|"sc"|"st"|"ews"|null,
    "is_bpl": boolean or null,
    "has_lpg": boolean or null,
    "owns_pucca_house": boolean or null,
    "is_pregnant": boolean or null,
    "daughter_age": integer or null,
    "disability": string or null
  }},
  "follow_up_question": "A concise 1-sentence follow-up if age or state is missing, otherwise null"
}}
"""
    result = await generate_gemini_json(prompt, fallback)
    return result.get("profile", fallback["profile"]), result.get("follow_up_question")


async def extract_profile_from_document_image(
    image_bytes: bytes,
    mime_type: str,
    existing_profile: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Read a document photo (ration card, income certificate, caste certificate, or Aadhaar style document).
    CRITICAL PRIVACY RULE: Never extract, store, or return identity numbers (Aadhaar, PAN, card numbers).
    Extract only demographic and civic eligibility factors (age, gender, state, income, category, BPL status).
    """
    existing = dict(existing_profile or {})
    fallback = {**EMPTY_PROFILE_SHAPE, **existing}

    prompt = """
You are a privacy-first civic OCR assistant reading an Indian government identity card or certificate.
CRITICAL SAFETY & PRIVACY RULES:
1. NEVER output or transcribe any Aadhaar numbers, PAN numbers, ration card numbers, or citizen ID numbers.
2. Only identify public demographic parameters: age / year of birth, gender, state, BPL/income indicators, category (SC/ST/OBC).
3. If an item is unreadable, blurred, or missing, output null.

Return ONLY this JSON shape:
{
  "age": integer or null,
  "gender": "male"|"female"|"other"|null,
  "state": string or null (standard Indian state name),
  "is_rural": boolean or null,
  "occupation": string or null,
  "land_acres": number or null,
  "annual_income": number or null,
  "category": "general"|"obc"|"sc"|"st"|"ews"|null,
  "is_bpl": boolean or null,
  "has_lpg": boolean or null,
  "owns_pucca_house": boolean or null,
  "is_pregnant": boolean or null,
  "daughter_age": integer or null,
  "disability": string or null
}
"""
    extracted = await analyze_multimodal_document(
        image_bytes=image_bytes,
        mime_type=mime_type,
        prompt=prompt,
        fallback_data=fallback
    )

    # Merge non-null extracted fields into existing profile
    merged = {**EMPTY_PROFILE_SHAPE, **existing}
    for k, v in extracted.items():
        if v is not None and k in merged:
            merged[k] = v

    return merged


async def answer_scheme_question(
    scheme: Dict[str, Any],
    evidence_snippets: List[Dict[str, str]],
    question: str,
    lang: str = "en"
) -> Dict[str, Any]:
    """
    Strictly grounded Q&A per scheme. Uses ONLY the scheme JSON and verified Tavily snippets as context.
    If the answer is not present in the context, replies that information is unavailable and references official URL.
    """
    context_text = f"""
Scheme Details:
Name: {scheme.get('scheme')} ({scheme.get('scheme_hi', '')})
Benefit: {scheme.get('benefit')}
Official URL: {scheme.get('source_url')}
Last Verified: {scheme.get('last_verified')}
Application Status: {scheme.get('status')}
Documents Required: {', '.join(scheme.get('documents', []))}
Reason/Eligibility: {scheme.get('reason')}

Verified Official Evidence Snippets:
{chr(10).join([f"- {ev.get('title')}: {ev.get('snippet')} ({ev.get('url')})" for ev in evidence_snippets]) if evidence_snippets else "No external evidence snippets."}
"""

    fallback = {
        "answer": f"Information regarding this specific query is not explicitly confirmed in the verified scheme record. Please consult the official portal directly at: {scheme.get('source_url')}",
        "grounded": False,
        "source_url": scheme.get("source_url")
    }

    lang_instruction = "Respond in Hindi" if lang == "hi" else "Respond in English"

    prompt = f"""
You are the grounded civic knowledge assistant for YojanaLens.
A citizen is asking a question about a specific government scheme:
Question: "{question}"
Target Language: {lang_instruction}

Context:
{context_text}

Rules:
1. Answer ONLY using the facts in the Context above.
2. Do NOT invent eligibility rules, quotas, dates, or application fees.
3. If the answer is NOT present in the Context, explicitly state: "This information is not available in our verified scheme records. Please verify directly on the official portal."
4. Always provide the official URL in the response.

Return JSON:
{{
  "answer": "Grounded answer text in requested language",
  "grounded": true or false,
  "source_url": "{scheme.get('source_url')}"
}}
"""
    return await generate_gemini_json(prompt, fallback, temperature=0.0)


async def ocr_image_or_pdf(file_bytes: bytes, mime_type: str) -> str:
    """
    Extract text from an uploaded image or PDF circular using Gemini vision.
    Handles Hindi, English, and regional Indian scripts.
    """
    from utils.gemini_client import get_genai_client
    from google.genai import types

    client = get_genai_client()
    if not client:
        return ""

    part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
    prompt = "Transcribe all text from this government circular, gazette notice, or message verbatim. Support both Hindi (Devanagari) and English."

    for model in ["gemini-2.5-flash", "gemini-2.0-flash"]:
        try:
            resp = client.models.generate_content(
                model=model,
                contents=[part, prompt]
            )
            if resp and resp.text:
                return resp.text.strip()
        except Exception as e:
            print(f"[WARN] OCR failed on {model}: {e}")
            continue

    return ""


async def judge_claim_against_evidence(
    claim_text: str,
    evidence_snippets: List[Dict[str, str]],
    lang: str = "en"
) -> Dict[str, Any]:
    """
    Strict fact-check against retrieved official government evidence.
    Rule 2c: If no relevant evidence is returned, return 'unverified' WITHOUT asking the LLM.
    Otherwise, Gemini judges only against retrieved snippets and drops any hallucinated citations.
    """
    if not evidence_snippets:
        reasoning = (
            "आधिकारिक सरकारी पोर्टल (.gov.in / .nic.in) पर इस दावे की पुष्टि करने वाला कोई आधिकारिक रिकॉर्ड नहीं मिला।"
            if lang == "hi"
            else "We could not find an official government source or circular on .gov.in / .nic.in confirming this claim."
        )
        return {
            "verdict": "unverified",
            "confidence": 0.0,
            "reasoning": reasoning,
            "citations": []
        }

    valid_urls = {ev["url"] for ev in evidence_snippets if ev.get("url")}
    context = "\n\n".join([
        f"Source: {ev.get('title')}\nURL: {ev.get('url')}\nContent: {ev.get('snippet')}"
        for ev in evidence_snippets
    ])

    lang_instr = "Hindi" if lang == "hi" else "English"

    prompt = f"""
You are the official claim fact-checker for YojanaLens.
Analyze this forwarded message or claim:
"{claim_text}"

Based ONLY on these verified official government evidence snippets (.gov.in / .nic.in):
{context}

Rules:
1. Verdict must be "supported" (if official circular explicitly proves it), "false" (if explicitly debunked or scam pattern), or "unverified".
2. Confidence: float 0.0 to 1.0.
3. Reasoning: 2-3 clear sentences in {lang_instr} explaining why based on the evidence.
4. Citations: array of {{"title": "...", "url": "..."}} strictly matching the provided URLs.

Return JSON:
{{
  "verdict": "supported"|"false"|"unverified",
  "confidence": 0.9,
  "reasoning": "...",
  "citations": [
    {{"title": "...", "url": "..."}}
  ]
}}
"""
    fallback = {
        "verdict": "unverified",
        "confidence": 0.4,
        "reasoning": "Could not determine verdict from retrieved government snippets.",
        "citations": [{"title": ev.get("title", "Official Source"), "url": ev["url"]} for ev in evidence_snippets[:2]]
    }

    raw = await generate_gemini_json(prompt, fallback)
    raw_citations = raw.get("citations", [])

    # Drop any citation URL that was not in the retrieved results
    filtered_citations = [
        c for c in raw_citations
        if isinstance(c, dict) and c.get("url") in valid_urls
    ]

    return {
        "verdict": raw.get("verdict", "unverified"),
        "confidence": float(raw.get("confidence", 0.5)),
        "reasoning": raw.get("reasoning", fallback["reasoning"]),
        "citations": filtered_citations
    }


async def simplify_government_notice(
    notice_text: str,
    lang: str = "en"
) -> Dict[str, Any]:
    """
    Simplifies complex bureaucratic notices and gazettes into clear citizen action items.
    Returns: {summary, key_dates: [{date, what}], action_items: [string], risks: [string], translated_text}
    """
    lang_instr = "Hindi" if lang == "hi" else "English"

    prompt = f"""
You are an expert citizen advocate simplifying complex government notifications, orders, or gazettes.
Notification Text:
\"\"\"{notice_text[:4000]}\"\"\"

Target Language: {lang_instr}

Analyze and extract:
1. summary: A plain-language 2-3 sentence overview of what this notice is about.
2. key_dates: List of {{"date": "YYYY-MM-DD or readable date", "what": "milestone description"}}.
3. action_items: Step-by-step list of concrete actions citizens or applicants must take.
4. risks: Potential pitfalls, scam warnings, or penalties mentioned.
5. translated_text: Clear, accessible version translated into {lang_instr}.

Return JSON:
{{
  "summary": "...",
  "key_dates": [{{"date": "...", "what": "..."}}],
  "action_items": ["..."],
  "risks": ["..."],
  "translated_text": "..."
}}
"""
    fallback = {
        "summary": "This document contains an administrative notification. Please refer to the official publishing department for complete procedural guidelines.",
        "key_dates": [],
        "action_items": ["Review document for personal eligibility requirements"],
        "risks": ["Never share OTP or banking passwords with third-party agents"],
        "translated_text": notice_text[:500]
    }
    return await generate_gemini_json(prompt, fallback)


async def classify_and_draft_complaint(
    complaint_text: str,
    location: str,
    lang: str = "en"
) -> Dict[str, Any]:
    """
    Classify civic issue and generate a formal administrative grievance draft.
    Categories: road | water | sanitation | electricity | health | other
    Severity: low | medium | high
    Do not store or generate names, phone numbers, or personal identifiers.
    """
    lang_instr = "Hindi" if lang == "hi" else "English"

    prompt = f"""
You are an expert civic grievance officer for Indian public administration.
A citizen has reported a local public issue:
Description: "{complaint_text}"
Location: "{location}"
Response Language: {lang_instr}

Tasks:
1. Classify category into EXACTLY one of: "road", "water", "sanitation", "electricity", "health", "other".
2. Identify the responsible Indian municipal/state department (e.g. Public Works Department (PWD), Municipal Corporation Water Board, DISCOM).
3. Determine severity: "low", "medium", or "high".
4. Draft a respectful, professional administrative grievance letter in {lang_instr} addressed to the competent authority.
   Do NOT invent personal citizen names, phone numbers, or addresses. Use generic respectful citizen placeholders.

Return JSON:
{{
  "category": "road"|"water"|"sanitation"|"electricity"|"health"|"other",
  "department": "Name of public department",
  "severity": "low"|"medium"|"high",
  "formal_draft": "Formal administrative petition text..."
}}
"""
    fallback_category = "other"
    lower = (complaint_text + " " + location).lower()
    if any(w in lower for w in ["road", "pothole", "सड़क", "गड्ढा"]):
        fallback_category = "road"
    elif any(w in lower for w in ["water", "pipe", "पानी", "जल"]):
        fallback_category = "water"
    elif any(w in lower for w in ["sewer", "drain", "garbage", "waste", "कचरा", "नाली"]):
        fallback_category = "sanitation"
    elif any(w in lower for w in ["electric", "power", "meter", "बिजली", "करंट"]):
        fallback_category = "electricity"
    elif any(w in lower for w in ["hospital", "clinic", "doctor", "दवा", "अस्पताल"]):
        fallback_category = "health"

    fallback = {
        "category": fallback_category,
        "department": "District Municipal Administration",
        "severity": "medium",
        "formal_draft": f"To the Competent Municipal Authority,\n\nSubject: Urgent public grievance regarding {fallback_category} at {location}\n\nI wish to bring to your urgent attention a civic grievance: {complaint_text}. Kindly inspect and resolve at the earliest.\n\nRespectfully submitted,\nConcerned Citizen"
    }

    return await generate_gemini_json(prompt, fallback)


async def classify_budget_question(question: str) -> Dict[str, Any]:
    """
    Step 1 of Budget Ask pipeline:
    Gemini maps the citizen's question to a specific pandas aggregation.
    No calculations are done by the LLM.
    """
    prompt = f"""
You are a public finance data router.
Given a citizen's question about the Indian Union Budget dataset, map it to the most relevant aggregation function and extract parameters.

Available aggregations:
1. "total_by_sector": allocations grouped by sector, or spend for a specific sector (params: sector, year)
2. "compare_years": YoY trends across years for a scheme or sector (params: scheme_name, sector)
3. "top_n": line items with the highest allocations (params: n, year)
4. "department_spend": allocations for a specific department or ministry (params: department, year)
5. "summary": general overview across the dataset

Citizen Question: "{question}"

Return JSON ONLY:
{{
  "aggregation": "total_by_sector" | "compare_years" | "top_n" | "department_spend" | "summary",
  "params": {{
    "sector": string or null,
    "scheme_name": string or null,
    "department": string or null,
    "year": string or null,
    "n": integer
  }}
}}
"""
    fallback = {
        "aggregation": "summary",
        "params": {"sector": None, "scheme_name": None, "department": None, "year": None, "n": 10}
    }
    result = await generate_gemini_json(prompt, fallback)

    # If Gemini not available, apply keyword-based local classification as fallback
    if result == fallback:
        q = question.lower()
        # Detect scheme names in the question
        scheme_keywords = {
            # Rural
            "mgnrega": "MGNREGA", "nrega": "MGNREGA", "mahatma gandhi": "MGNREGA",
            # Agriculture
            "pm-kisan": "PM-KISAN", "pmkisan": "PM-KISAN", "pm kisan": "PM-KISAN",
            "fasal bima": "Pradhan Mantri Fasal Bima Yojana",
            "pmfby": "Pradhan Mantri Fasal Bima Yojana", "crop insurance": "Pradhan Mantri Fasal Bima Yojana",
            "interest subvention": "Modified Interest Subvention Scheme",
            # Water
            "jal jeevan": "Jal Jeevan Mission", "har ghar jal": "Jal Jeevan Mission",
            "jjm": "Jal Jeevan Mission",
            # Housing
            "pradhan mantri awas": "PM Awas Yojana", "pmay": "PM Awas Yojana",
            "pm awas": "PM Awas Yojana", "housing scheme": "PM Awas Yojana",
            "smart cities": "Smart Cities Mission & AMRUT 2.0", "amrut": "Smart Cities Mission & AMRUT 2.0",
            # Healthcare
            "ayushman": "Ayushman Bharat - PMJAY", "pmjay": "Ayushman Bharat - PMJAY",
            "ab-pmjay": "Ayushman Bharat - PMJAY", "health cover": "Ayushman Bharat - PMJAY",
            "national health mission": "National Health Mission (NHM)", "nhm": "National Health Mission (NHM)",
            "pmsma": "Pradhan Mantri Surakshit Matritva Abhiyan",
            "matritva": "Pradhan Mantri Surakshit Matritva Abhiyan",
            # Education & Scholarships
            "nsp": "National Scholarship Portal - NSP",
            "national scholarship": "National Scholarship Portal - NSP",
            "scholarship portal": "National Scholarship Portal - NSP",
            "pre matric": "National Scholarship Portal - NSP",
            "post matric": "National Scholarship Portal - NSP",
            "samagra shiksha": "Samagra Shiksha Abhiyan",
            "ssa": "Samagra Shiksha Abhiyan", "school education": "Samagra Shiksha Abhiyan",
            "mid day meal": "Mid-Day Meal Scheme", "midday meal": "Mid-Day Meal Scheme",
            "pm poshan": "Mid-Day Meal Scheme", "school nutrition": "Mid-Day Meal Scheme",
            "ugc": "Higher Education Financing Agency & Scholarships",
            "higher education": "Higher Education Financing Agency & Scholarships",
            # Women & Child
            "poshan": "Saksham Anganwadi and Poshan 2.0", "anganwadi": "Saksham Anganwadi and Poshan 2.0",
            "beti bachao": "Beti Bachao Beti Padhao", "bbbp": "Beti Bachao Beti Padhao",
            "mission shakti": "Beti Bachao Beti Padhao",
            # Social Welfare
            "nsap": "National Social Assistance Programme",
            "national social assistance": "National Social Assistance Programme",
            "old age pension": "National Social Assistance Programme",
            "pm janman": "PM Janman - Tribal Welfare", "tribal": "PM Janman - Tribal Welfare",
            "disability scholarship": "Scholarships for Persons with Disabilities",
            "depwd": "Scholarships for Persons with Disabilities",
            "persons with disabilities": "Scholarships for Persons with Disabilities",
            "pmgsy": "Pradhan Mantri Gram Sadak Yojana",
            "gram sadak": "Pradhan Mantri Gram Sadak Yojana", "rural road": "Pradhan Mantri Gram Sadak Yojana",
            # Hindi scheme terms
            "एनएसपी": "National Scholarship Portal - NSP", "छात्रवृत्ति": "National Scholarship Portal - NSP",
            "मनरेगा": "MGNREGA", "नरेगा": "MGNREGA", "पीएम किसान": "PM-KISAN", "किसान": "PM-KISAN",
            "आयुष्मान": "Ayushman Bharat - PMJAY", "जल जीवन": "Jal Jeevan Mission",
            "पीएम आवास": "PM Awas Yojana", "आवास योजना": "PM Awas Yojana",
            "समग्र शिक्षा": "Samagra Shiksha Abhiyan", "मिड डे मील": "Mid-Day Meal Scheme",
            "पोषण": "Saksham Anganwadi and Poshan 2.0", "आंगनवाड़ी": "Saksham Anganwadi and Poshan 2.0",
        }
        sector_keywords = {
            "rural": "Rural Development", "village": "Rural Development", "ग्रामीण": "Rural Development",
            "agriculture": "Agriculture & Allied", "farmer": "Agriculture & Allied", "kisan": "Agriculture & Allied", "कृषि": "Agriculture & Allied",
            "water": "Drinking Water & Sanitation", "sanitation": "Drinking Water & Sanitation", "जल": "Drinking Water & Sanitation", "स्वच्छता": "Drinking Water & Sanitation",
            "housing": "Housing & Urban Affairs", "urban": "Housing & Urban Affairs", "आवास": "Housing & Urban Affairs", "शहरी": "Housing & Urban Affairs",
            "health": "Healthcare", "medical": "Healthcare", "hospital": "Healthcare", "स्वास्थ्य": "Healthcare", "चिकित्सा": "Healthcare",
            "education": "Education", "school": "Education", "scholarship": "Education", "शिक्षा": "Education", "स्कूल": "Education",
            "women": "Women & Child Development", "child": "Women & Child Development", "महिला": "Women & Child Development", "बाल": "Women & Child Development",
            "social welfare": "Social Welfare", "pension": "Social Welfare", "disability": "Social Welfare", "सामाजिक": "Social Welfare", "पेंशन": "Social Welfare",
        }
        detected_scheme = None
        for k in sorted(scheme_keywords.keys(), key=len, reverse=True):
            if k in q:
                detected_scheme = scheme_keywords[k]
                break

        detected_sector = None
        for k in sorted(sector_keywords.keys(), key=len, reverse=True):
            if k in q:
                detected_sector = sector_keywords[k]
                break

        years = [w for w in q.split() if w.isdigit() and len(w) == 4]
        detected_year = f"{years[0]}-{str(int(years[0])+1)[2:]}" if years else None

        # Priority 1: Specific scheme match takes absolute precedence
        if detected_scheme:
            result = {"aggregation": "compare_years", "params": {
                "scheme_name": detected_scheme, "sector": None, "department": None,
                "year": detected_year, "n": 10
            }}
        # Priority 2: Top / highest queries
        elif any(w in q for w in ["top", "highest", "most", "largest", "maximum", "biggest", "शीर्ष", "सबसे"]):
            result = {"aggregation": "top_n", "params": {
                "scheme_name": None, "sector": detected_sector, "department": None,
                "year": detected_year or "2024-25", "n": 3 if "3" in q else 5
            }}
        # Priority 3: YoY trend / comparison queries
        elif any(w in q for w in ["change", "trend", "year", "yoy", "compare", "growth", "increase", "decrease", "2022", "2023", "2024", "बदलाव", "वृद्धि"]):
            result = {"aggregation": "compare_years", "params": {
                "scheme_name": None, "sector": detected_sector,
                "department": None, "year": detected_year, "n": 10
            }}
        # Priority 4: Sector overview
        elif detected_sector:
            result = {"aggregation": "total_by_sector", "params": {
                "sector": detected_sector, "scheme_name": None, "department": None,
                "year": detected_year, "n": 10
            }}

    return result


async def phrase_budget_answer(
    question: str,
    computed_data: Any,
    meta: Dict[str, Any],
    lang: str = "en"
) -> str:
    """
    Step 3 of Budget Ask pipeline:
    Gemini phrases the final citizen-facing answer strictly using the computed numbers from pandas.
    If the numbers cannot answer the question, it clearly says so.
    """
    lang_instr = "Hindi" if lang == "hi" else "English"
    data_str = json.dumps(computed_data, indent=2, default=str)
    dataset_title = meta.get("dataset_name", "Open Government Budget Data")
    dataset_url = meta.get("source_url", "https://www.indiabudget.gov.in/")
    unit_str = meta.get("unit", "₹ Crore")

    prompt = (
        f"You are a public finance civic assistant.\n"
        f"A citizen asked: \"{question}\"\n"
        f"Target Language: {lang_instr}\n"
        f"Dataset: {dataset_title} ({dataset_url})\n"
        f"Currency Unit: {unit_str}\n\n"
        f"Strict Execution Rules:\n"
        f"1. Answer the question in {lang_instr} strictly and solely using the computed numbers below.\n"
        f"2. Under NO circumstance invent or hallucinate any numbers or figures not present in the computed data.\n"
        f"3. If the computed data is empty or cannot answer the question, clearly state that this specific information is not available in the current dataset, and recommend checking {dataset_url}.\n"
        f"4. Keep the answer concise (2-4 sentences) and citizen-friendly.\n\n"
        f"Computed Data:\n{data_str}\n\n"
        f"Return JSON:\n"
        f"{{\n"
        f"  \"answer\": \"Clear citizen answer in {lang_instr}...\"\n"
        f"}}\n"
    )

    fallback_parts = []
    if isinstance(computed_data, dict):
        # Build a human-readable sentence from the computed data keys
        if "scheme_name" in computed_data and "allocations" in computed_data:
            allocs = computed_data["allocations"]
            parts = ", ".join([f"₹{v:,} Cr in {y}" for y, v in allocs.items()]) if isinstance(allocs, dict) else str(allocs)
            fallback_parts.append(f"Budget allocations for {computed_data['scheme_name']}: {parts}.")
        elif "scheme" in computed_data and "yearly_allocations_crores" in computed_data:
            allocs = computed_data["yearly_allocations_crores"]
            if lang == "hi":
                parts = ", ".join([f"{y} में ₹{int(v):,} करोड़" for y, v in sorted(allocs.items())])
                fallback_parts.append(f"{computed_data['scheme']} के लिए वर्ष-वार बजट आवंटन: {parts}।")
            else:
                parts = ", ".join([f"₹{int(v):,} Cr in {y}" for y, v in sorted(allocs.items())])
                fallback_parts.append(f"Year-wise budget allocations for {computed_data['scheme']}: {parts}.")
        elif "sector" in computed_data and "yearly_allocations_crores" in computed_data:
            allocs = computed_data["yearly_allocations_crores"]
            if lang == "hi":
                parts = ", ".join([f"{y} में ₹{int(v):,} करोड़" for y, v in sorted(allocs.items())])
                fallback_parts.append(f"{computed_data['sector']} क्षेत्र के लिए वर्ष-वार आवंटन: {parts}।")
            else:
                parts = ", ".join([f"₹{int(v):,} Cr in {y}" for y, v in sorted(allocs.items())])
                fallback_parts.append(f"Year-wise allocations for {computed_data['sector']} sector: {parts}.")
        elif "total_budget_by_year" in computed_data:
            allocs = computed_data["total_budget_by_year"]
            if lang == "hi":
                parts = ", ".join([f"{y} में ₹{int(v):,} करोड़" for y, v in sorted(allocs.items())])
                fallback_parts.append(f"कुल कल्याणकारी बजट (वर्ष-वार): {parts}।")
            else:
                parts = ", ".join([f"₹{int(v):,} Cr in {y}" for y, v in sorted(allocs.items())])
                fallback_parts.append(f"Total welfare budget year-wise: {parts}.")
        elif "top_schemes" in computed_data:
            tops = computed_data["top_schemes"]
            sector_ctx = f" ({computed_data['sector']})" if computed_data.get("sector") else ""
            if isinstance(tops, list) and tops:
                names = ", ".join([f"{s.get('scheme_name','?')} (₹{int(s.get('allocation_crores',0)):,} Cr)" for s in tops[:3]])
                if lang == "hi":
                    fallback_parts.append(f"शीर्ष योजनाएं{sector_ctx}: {names}।")
                else:
                    fallback_parts.append(f"Top schemes{sector_ctx} by allocation: {names}.")
        elif "sector" in computed_data and "total_allocation_crores" in computed_data:
            yr = computed_data.get('year', '2024-25')
            if lang == "hi":
                fallback_parts.append(f"वर्ष {yr} में, {computed_data['sector']} क्षेत्र को ₹{int(computed_data.get('total_allocation_crores', 0)):,} करोड़ का आवंटन मिला।")
            else:
                fallback_parts.append(f"In {yr}, {computed_data['sector']} sector received ₹{int(computed_data.get('total_allocation_crores', 0)):,} Crore.")
        elif "total_budget_crores" in computed_data:
            if lang == "hi":
                fallback_parts.append(
                    f"यह डेटासेट {computed_data.get('total_schemes_tracked','कई')} कल्याणकारी योजनाओं को कवर करता है, "
                    f"जिसका कुल बजट वर्ष {computed_data.get('latest_year','2024-25')} में ₹{int(computed_data['total_budget_crores']):,} करोड़ है।"
                )
            else:
                fallback_parts.append(
                    f"The dataset covers {computed_data.get('total_schemes_tracked','several')} welfare schemes "
                    f"with a total budget of ₹{int(computed_data['total_budget_crores']):,} Crore in "
                    f"{computed_data.get('latest_year','the latest year')}. "
                    f"Sectors tracked: {', '.join(computed_data.get('sectors_tracked', [])[:5])}."
                )
        else:
            # generic: list top-level numeric values
            for k, v in computed_data.items():
                if isinstance(v, (int, float)):
                    fallback_parts.append(f"{k.replace('_', ' ').title()}: ₹{int(v):,} Crore.")
    fallback_text = " ".join(fallback_parts) if fallback_parts else (
        "इस प्रश्न के लिए विशिष्ट बजट आंकड़े वर्तमान डेटासेट में उपलब्ध नहीं हैं। आधिकारिक आंकड़ों के लिए कृपया indiabudget.gov.in देखें।"
        if lang == "hi" else
        "The specific allocation data for your query is not available in the current dataset. "
        f"Please visit {dataset_url} for official figures."
    )
    fallback = {"answer": fallback_text}
    res = await generate_gemini_json(prompt, fallback)
    return res.get("answer", fallback["answer"])


async def explain_budget_chart(
    chart_type: str,
    chart_summary: Dict[str, Any],
    lang: str = "en"
) -> str:
    """
    Explain chart data in 2 simple, citizen-friendly sentences in en or hi.
    """
    lang_instr = "Hindi" if lang == "hi" else "English"
    data_str = json.dumps(chart_summary, indent=2, default=str)

    prompt = (
        f"You are a civic financial educator.\n"
        f"Explain the following public spending chart data in 2 clear, accessible sentences in {lang_instr}.\n"
        f"Chart Type: {chart_type}\n"
        f"Target Language: {lang_instr}\n\n"
        f"Chart Data Summary:\n{data_str}\n\n"
        f"Rules:\n"
        f"- Exactly 1 to 2 clear sentences.\n"
        f"- Mention the highest allocation or main trend using the exact figures from the data.\n"
        f"- Do not invent numbers.\n\n"
        f"Return JSON:\n"
        f"{{\n"
        f"  \"explanation\": \"Two sentence citizen explanation...\"\n"
        f"}}\n"
    )

    fallback = {
        "explanation": f"This chart displays {chart_type} across verified government budget allocations. Refer to the table and figures for precise details."
    }
    res = await generate_gemini_json(prompt, fallback)
    return res.get("explanation", fallback["explanation"])


