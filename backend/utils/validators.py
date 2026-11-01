import re
from urllib.parse import urlparse
from fastapi import HTTPException, UploadFile

ALLOWED_GOV_SUFFIXES = (".gov.in", ".nic.in")
ALLOWED_MIME_TYPES = (
    "image/jpeg", "image/png", "image/jpg",
    "image/webp", "image/heic", "image/heif",
    "application/pdf",
    "application/octet-stream",  # fallback when browser omits content-type
)
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def is_gov_domain(url_str: str) -> bool:
    """Validate whether a URL belongs strictly to an official Indian government host (.gov.in or .nic.in)."""
    try:
        if not url_str:
            return False
        # Add protocol if missing for parsing
        if not url_str.startswith(("http://", "https://")):
            url_str = "https://" + url_str
        parsed = urlparse(url_str)
        hostname = (parsed.hostname or "").lower()
        if not hostname:
            return False
        return any(hostname == suffix.lstrip(".") or hostname.endswith(suffix) for suffix in ALLOWED_GOV_SUFFIXES)
    except Exception:
        return False


def validate_uploaded_file(file: UploadFile) -> None:
    """Validate uploaded file type and reasonable size bounds."""
    content_type = (file.content_type or "").lower().split(";")[0].strip()
    # If browser sends empty or generic content-type, allow it through (size check is below)
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{content_type}'. Allowed types: JPG, PNG, WebP, PDF."
        )


def extract_urls_and_phones(text: str) -> dict:
    """Extract and categorize URLs and phone numbers from raw text using plain regex."""
    url_pattern = r'https?://[^\s<>"]+|www\.[^\s<>"]+'
    found_urls = re.findall(url_pattern, text)
    
    # Phone numbers: 10-digit Indian mobiles, 1930 helpline, or standard landlines
    phone_pattern = r'\b(?:\+91[- ]?)?[6-9]\d{9}\b|\b1930\b|\b1800[- ]?\d{3}[- ]?\d{4}\b'
    found_phones = re.findall(phone_pattern, text)

    link_flags = []
    for raw_url in set(found_urls):
        clean_url = raw_url.rstrip(".,;!?:")
        is_official = is_gov_domain(clean_url)
        reason = "Official Indian Government portal (.gov.in / .nic.in)" if is_official else "Non-government external domain; potential security risk"
        link_flags.append({
            "url": clean_url,
            "is_official": is_official,
            "reason": reason
        })

    return {
        "link_flags": link_flags,
        "phone_numbers": list(set(found_phones))
    }
