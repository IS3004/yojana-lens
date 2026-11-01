import json
import os
from typing import Dict, Any, List, Tuple

SCHEMES_FILE_PATH = os.path.join(os.path.dirname(__file__), "schemes.json")


def load_schemes() -> List[Dict[str, Any]]:
    """Load canonical government schemes dataset from disk."""
    if not os.path.exists(SCHEMES_FILE_PATH):
        return []
    with open(SCHEMES_FILE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def evaluate_single_rule(
    rule_name: str,
    rule_target: Any,
    profile: Dict[str, Any]
) -> Tuple[bool, str, str]:
    """
    Evaluate a single eligibility rule in pure Python. The LLM never decides eligibility.
    Returns: (passed: bool, failed_rule_label: str, hint: str)
    """
    age = profile.get("age")
    income = profile.get("annual_income")
    gender = (profile.get("gender") or "").lower()
    occupation = (profile.get("occupation") or "").lower()
    is_farmer = profile.get("is_farmer") or occupation in ("farmer", "kisan")
    is_student = profile.get("is_student") or occupation in ("student", "scholar")
    is_bpl = profile.get("is_bpl") or (income is not None and income <= 100000)
    is_rural = profile.get("is_rural")
    owns_pucca = profile.get("owns_pucca_house")

    if rule_name == "min_age":
        passed = (age is None) or (age >= rule_target)
        label = "Minimum age criterion"
        hint = f"Applicant must be at least {rule_target} years old (current: {age or 'unspecified'})."
        return passed, label, hint

    if rule_name == "max_age":
        passed = (age is None) or (age <= rule_target)
        label = "Maximum age restriction"
        hint = f"Applicant must be at or below {rule_target} years of age (current: {age or 'unspecified'})."
        return passed, label, hint

    if rule_name == "max_annual_income":
        passed = (income is None) or (income <= rule_target)
        label = "Annual income ceiling"
        curr_str = f"₹{income:,.0f}" if income is not None else "unspecified"
        hint = f"Family annual income must not exceed ₹{rule_target:,.0f} (current: {curr_str})."
        return passed, label, hint

    if rule_name == "is_farmer":
        passed = bool(is_farmer)
        label = "Agricultural landholder requirement"
        hint = "Requires family ownership of cultivable agricultural land verified by state Khasra records."
        return passed, label, hint

    if rule_name == "is_student":
        passed = bool(is_student)
        label = "Student enrollment status"
        hint = "Requires active enrollment in an authorized educational or vocational institution."
        return passed, label, hint

    if rule_name == "is_bpl_or_senior":
        is_senior = age is not None and age >= 70
        passed = bool(is_bpl or is_senior)
        label = "Vulnerable income or Senior citizen criterion"
        hint = "Requires valid BPL/SECC registration, or citizen age 70+ for universal Ayushman inclusion."
        return passed, label, hint

    if rule_name == "is_bpl":
        passed = bool(is_bpl)
        label = "Below Poverty Line (BPL) qualification"
        hint = "Requires state-issued BPL ration card or Antyodaya Anna Yojana (AAY) enrollment."
        return passed, label, hint

    if rule_name == "is_rural":
        passed = (is_rural is None) or bool(is_rural)
        label = "Rural dwelling verification"
        hint = "Scheme is earmarked for notified rural panchayat residents."
        return passed, label, hint

    if rule_name == "owns_pucca_house":
        passed = not owns_pucca
        label = "Homeless or Kutcha-dwelling requirement"
        hint = "Beneficiary family must not own a concrete pucca residential dwelling anywhere in India."
        return passed, label, hint

    if rule_name == "has_girl_child_under_10":
        has_daughter = bool(profile.get("daughter_age") and profile.get("daughter_age") <= 10)
        is_young_girl = (gender == "female" and age is not None and age <= 10)
        passed = has_daughter or is_young_girl or (gender == "female" and age is None)
        label = "Girl child under 10 years of age"
        hint = "Account can only be opened for a girl child before she attains 10 years of age."
        return passed, label, hint

    if rule_name == "is_entrepreneur_or_vendor":
        is_micro = occupation in ("vendor", "artisan", "shopkeeper", "self_employed", "business")
        passed = is_micro or occupation == "" or occupation is None
        label = "Micro-enterprise or trade profile"
        hint = "Applicable to self-employed individuals, artisans, shopkeepers, or micro entrepreneurs."
        return passed, label, hint

    if rule_name == "has_electricity_connection":
        passed = True
        label = "Active grid electricity connection"
        hint = "Requires an active consumer number with a state electricity distribution company (DISCOM)."
        return passed, label, hint

    return True, rule_name, "Check local office guidelines."


def match_profile_against_schemes(
    profile: Dict[str, Any],
    lang: str = "en"
) -> Dict[str, Any]:
    """
    Deterministic rule engine that matches user profiles against canonical schemes.
    Returns:
      - results: fully eligible schemes (failed_count == 0)
      - near_misses: schemes where exactly 1 rule fails, with failed rule label and action hint.
    """
    schemes = load_schemes()
    eligible_results = []
    near_misses = []

    for scheme in schemes:
        rules = scheme.get("rules", {})
        failed_rules = []
        matched_reasons = []

        for r_name, r_val in rules.items():
            passed, label, hint = evaluate_single_rule(r_name, r_val, profile)
            if passed:
                matched_reasons.append(f"✓ Meets {label.lower()}")
            else:
                failed_rules.append({
                    "rule": r_name,
                    "label": label,
                    "hint": hint
                })

        # Calculate rule pass rate
        total_rules = max(1, len(rules))
        passed_rules_count = total_rules - len(failed_rules)

        card_data = {
            "id": scheme["id"],
            "scheme": scheme["scheme"],
            "scheme_hi": scheme.get("scheme_hi"),
            "benefit": scheme["benefit"],
            "benefit_hi": scheme.get("benefit_hi"),
            "status": "likely_eligible" if len(failed_rules) == 0 else "check_at_office",
            "timeline_status": scheme.get("status", "active"),
            "source_url": scheme.get("source_url"),
            "last_verified": scheme.get("last_verified"),
            "opens_on": scheme.get("opens_on"),
            "closes_on": scheme.get("closes_on"),
            "dates_confirmed": scheme.get("dates_confirmed", False),
            "matched_reasons": matched_reasons if matched_reasons else ["Profile aligns with primary target category"],
            "missing_info": [f["hint"] for f in failed_rules],
            "documents": scheme.get("documents", []),
            "apply_url": scheme.get("apply_url", scheme.get("source_url")),
            "reason": scheme.get("reason", ""),
            "source_status": "verified",
            "evidence": scheme.get("evidence", [])
        }

        if len(failed_rules) == 0:
            eligible_results.append(card_data)
        elif len(failed_rules) == 1:
            # Exactly one rule failed: near miss!
            near_miss_card = dict(card_data)
            near_miss_card["failed_rule"] = failed_rules[0]["label"]
            near_miss_card["what_would_change_this"] = failed_rules[0]["hint"]
            near_misses.append(near_miss_card)

    return {
        "profile": profile,
        "results": eligible_results,
        "near_misses": near_misses
    }
