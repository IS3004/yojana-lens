import os
from dotenv import load_dotenv
load_dotenv()

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

# Optional supabase client
_supabase_client = None

# In-memory local fallback store when Supabase credentials are not yet configured
_local_complaints: List[Dict[str, Any]] = [
  {
    "id": "c1a2b3c4-1111-4000-8000-000000000001",
    "text": "Frequent power outages in Ward 12 affecting students preparing for board exams.",
    "category": "electricity",
    "department": "State Electricity Distribution Company (DISCOM)",
    "severity": "high",
    "location": "Dhanbad, Ward 12",
    "lang": "en",
    "status": "in_progress",
    "created_at": "2026-10-10T10:00:00Z",
    "updated_at": "2026-10-10T10:00:00Z"
  },
  {
    "id": "c1a2b3c4-2222-4000-8000-000000000002",
    "text": "Open sewer drain overflowing near primary school causing mosquito breeding.",
    "category": "sanitation",
    "department": "Municipal Corporation Public Health Department",
    "severity": "high",
    "location": "Ranchi Main Road",
    "lang": "en",
    "status": "received",
    "created_at": "2026-10-12T08:30:00Z",
    "updated_at": "2026-10-12T08:30:00Z"
  },
  {
    "id": "c1a2b3c4-3333-4000-8000-000000000003",
    "text": "Deep potholes on the main market connecting road creating traffic congestion.",
    "category": "road",
    "department": "Public Works Department (PWD)",
    "severity": "medium",
    "location": "Dhanbad Station Road",
    "lang": "en",
    "status": "received",
    "created_at": "2026-10-14T11:15:00Z",
    "updated_at": "2026-10-14T11:15:00Z"
  }
]


def get_supabase():
    """Initialize or return Supabase client."""
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
        key = (
            os.getenv("SUPABASE_SERVICE_KEY")
            or os.getenv("SUPABASE_KEY")
            or os.getenv("SUPABASE_ANON_KEY")
            or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
        )
        if url and key and "supabase.co" in url:
            try:
                from supabase import create_client
                _supabase_client = create_client(url, key)
            except Exception as e:
                print(f"[WARN] Failed to connect to Supabase: {e}")
                _supabase_client = None
    return _supabase_client


async def insert_complaint(record: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a complaint record into Supabase or fallback store."""
    client = get_supabase()
    now_iso = datetime.now(timezone.utc).isoformat()
    record["id"] = record.get("id") or str(uuid.uuid4())
    record["created_at"] = record.get("created_at") or now_iso
    record["updated_at"] = record.get("updated_at") or now_iso
    record["status"] = record.get("status", "received")

    if client:
        try:
            res = client.table("complaints").insert(record).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            print(f"[WARN] Supabase insert failed: {e}. Falling back to memory store.")

    _local_complaints.insert(0, record)
    return record


async def fetch_complaints(category: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetch complaint records with optional filtering."""
    client = get_supabase()
    if client:
        try:
            query = client.table("complaints").select("*").order("created_at", desc=True)
            if category:
                query = query.eq("category", category)
            if status:
                query = query.eq("status", status)
            res = query.execute()
            return res.data or []
        except Exception as e:
            print(f"[WARN] Supabase select failed: {e}. Falling back to memory store.")

    # Local fallback filter
    results = list(_local_complaints)
    if category:
        results = [c for c in results if c.get("category") == category]
    if status:
        results = [c for c in results if c.get("status") == status]
    return results


async def update_complaint_status(complaint_id: str, new_status: str) -> Optional[Dict[str, Any]]:
    """Update complaint status in Supabase or fallback store."""
    client = get_supabase()
    now_iso = datetime.now(timezone.utc).isoformat()

    if client:
        try:
            res = client.table("complaints").update({
                "status": new_status,
                "updated_at": now_iso
            }).eq("id", complaint_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            print(f"[WARN] Supabase status update failed: {e}")

    for c in _local_complaints:
        if c.get("id") == complaint_id:
            c["status"] = new_status
            c["updated_at"] = now_iso
            return c
    return None
