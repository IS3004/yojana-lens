import os
from typing import List, Dict, Any
from tavily import TavilyClient
from config import get_settings
from utils.validators import is_gov_domain

settings = get_settings()

OFFICIAL_GOV_DOMAINS = [
    "pib.gov.in",
    "india.gov.in",
    "mygov.in",
    "cybercrime.gov.in",
    "rbi.org.in",
    "eci.gov.in",
    "mohfw.gov.in",
    "pmkisan.gov.in",
    "pmjay.gov.in",
    "scholarships.gov.in",
    "gov.in",
    "nic.in"
]

_tavily_client = None


def get_tavily_client() -> TavilyClient:
    """Initialize Tavily client if API key is present."""
    global _tavily_client
    if _tavily_client is None:
        tavily_key = os.getenv("TAVILY_API_KEY", "")
        if tavily_key:
            try:
                _tavily_client = TavilyClient(api_key=tavily_key)
            except Exception as e:
                print(f"[WARN] Failed to instantiate TavilyClient: {e}")
                _tavily_client = None
    return _tavily_client


async def search_official_evidence(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """
    Search Tavily strictly restricted to official Indian government sites (.gov.in / .nic.in).
    Drops any result whose domain is not an official government host.
    """
    client = get_tavily_client()
    if not client:
        return []

    try:
        response = client.search(
            query=query,
            search_depth="advanced",
            include_domains=OFFICIAL_GOV_DOMAINS,
            max_results=max_results
        )
        raw_results = response.get("results", [])
        verified_results = []

        for item in raw_results:
            url = item.get("url", "")
            if is_gov_domain(url):
                verified_results.append({
                    "title": item.get("title", "Official Notification"),
                    "url": url,
                    "snippet": item.get("content", "")
                })

        return verified_results
    except Exception as err:
        print(f"[WARN] Tavily official search encountered error: {err}")
        return []
