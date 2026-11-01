import os
import json
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent / "data"
META_FILE = DATA_DIR / "meta.json"
DEFAULT_CSV = DATA_DIR / "budget_allocations.csv"


def load_meta() -> Dict[str, Any]:
    if META_FILE.exists():
        try:
            with open(META_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "dataset_name": "Indian Union Budget Allocation Dataset",
        "source_url": "https://www.indiabudget.gov.in/",
        "year": "2024-25",
        "ministry": "Ministry of Finance",
        "unit": "₹ Crore"
    }


def load_budget_df() -> Tuple[Optional[pd.DataFrame], Dict[str, Any]]:
    """
    Load CSV from backend/data/. Returns (DataFrame or None, meta).
    Provides an honest empty state when no CSV exists.
    """
    meta = load_meta()
    if not DATA_DIR.exists():
        return None, meta

    # Check for default or any other CSV file
    csv_files = list(DATA_DIR.glob("*.csv"))
    if not csv_files:
        return None, meta

    target_csv = DEFAULT_CSV if DEFAULT_CSV.exists() else csv_files[0]
    try:
        df = pd.read_csv(target_csv)
        # Standardize column names
        df.columns = [c.strip().lower() for c in df.columns]
        # Ensure allocation is numeric
        if "allocation_crores" in df.columns:
            df["allocation_crores"] = pd.to_numeric(df["allocation_crores"], errors="coerce").fillna(0.0)
        return df, meta
    except Exception as e:
        print(f"Error loading budget CSV {target_csv}: {e}")
        return None, meta


def get_budget_summary() -> Dict[str, Any]:
    """
    GET /budget/summary
    Computed via pure pandas.
    """
    df, meta = load_budget_df()
    if df is None or df.empty:
        return {
            "available": False,
            "meta": meta,
            "message": "No budget dataset found in backend/data/. Please place a valid CSV file (e.g. budget_allocations.csv) with columns: year, sector, department, scheme_name, allocation_crores."
        }

    years = sorted(df["year"].dropna().unique().tolist())
    latest_year = years[-1] if years else "2024-25"
    latest_df = df[df["year"] == latest_year]

    # 1. Total by sector for latest year
    sector_group = latest_df.groupby("sector")["allocation_crores"].sum().reset_index()
    sector_group = sector_group.sort_values(by="allocation_crores", ascending=False)
    by_sector = [
        {"sector": row["sector"], "allocation": round(float(row["allocation_crores"]), 2)}
        for _, row in sector_group.iterrows()
    ]

    # 2. Year-over-year total change
    yearly_group = df.groupby("year")["allocation_crores"].sum().reset_index()
    yearly_group = yearly_group.sort_values(by="year")
    by_year = []
    prev_total = None
    for _, row in yearly_group.iterrows():
        yr = str(row["year"])
        tot = round(float(row["allocation_crores"]), 2)
        yoy_pct = None
        if prev_total and prev_total > 0:
            yoy_pct = round(((tot - prev_total) / prev_total) * 100, 2)
        by_year.append({
            "year": yr,
            "total_allocation": tot,
            "yoy_growth_percent": yoy_pct
        })
        prev_total = tot

    # 3. Top 10 line items in latest year
    top_df = latest_df.sort_values(by="allocation_crores", ascending=False).head(10)
    top_10 = []
    for _, row in top_df.iterrows():
        scheme = str(row.get("scheme_name", "N/A"))
        # Check previous year allocation for YoY
        curr_alloc = float(row.get("allocation_crores", 0.0))
        yoy_change = None
        if len(years) >= 2:
            prev_yr = years[-2]
            prev_row = df[(df["scheme_name"] == scheme) & (df["year"] == prev_yr)]
            if not prev_row.empty:
                prev_alloc = float(prev_row["allocation_crores"].values[0])
                if prev_alloc > 0:
                    yoy_change = round(((curr_alloc - prev_alloc) / prev_alloc) * 100, 2)

        top_10.append({
            "scheme_name": scheme,
            "department": str(row.get("department", "N/A")),
            "sector": str(row.get("sector", "N/A")),
            "allocation": round(curr_alloc, 2),
            "yoy_change": yoy_change,
            "year": latest_year
        })

    return {
        "available": True,
        "meta": meta,
        "latest_year": latest_year,
        "total_budget_latest_year": round(float(latest_df["allocation_crores"].sum()), 2),
        "by_sector": by_sector,
        "by_year": by_year,
        "top_10_schemes": top_10
    }


def execute_budget_aggregation(aggregation: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes aggregation using pandas. Never guesses or invents numbers.
    """
    df, meta = load_budget_df()
    if df is None or df.empty:
        return {"error": "Dataset is not available."}

    years = sorted(df["year"].dropna().unique().tolist())
    latest_year = years[-1] if years else "2024-25"

    agg = (aggregation or "summary").lower().strip()
    params = params or {}

    if agg == "total_by_sector":
        sector_filter = params.get("sector")
        year_filter = params.get("year") or latest_year
        subset = df[df["year"] == year_filter] if year_filter in years else df
        if sector_filter:
            subset = subset[subset["sector"].str.contains(sector_filter, case=False, na=False)]
            if subset.empty:
                return {
                    "matched": False,
                    "message": f"No sector matching '{sector_filter}' found in year {year_filter}."
                }
            tot = float(subset["allocation_crores"].sum())
            schemes = subset[["scheme_name", "allocation_crores"]].to_dict(orient="records")
            return {
                "sector": sector_filter,
                "year": year_filter,
                "total_allocation_crores": round(tot, 2),
                "schemes": schemes
            }
        else:
            grouped = subset.groupby("sector")["allocation_crores"].sum().reset_index()
            return {
                "year": year_filter,
                "sector_allocations": grouped.to_dict(orient="records")
            }

    elif agg == "compare_years":
        scheme_filter = params.get("scheme_name")
        sector_filter = params.get("sector")
        if scheme_filter:
            subset = df[df["scheme_name"].str.contains(scheme_filter, case=False, na=False)]
            if subset.empty:
                # Fuzzy fallback on keywords
                for token in scheme_filter.replace("-", " ").split():
                    if len(token) > 2:
                        match_try = df[df["scheme_name"].str.contains(token, case=False, na=False)]
                        if not match_try.empty:
                            subset = match_try
                            break
            if subset.empty:
                return {"matched": False, "message": f"No scheme matching '{scheme_filter}' found."}
            yearly = subset.groupby("year")["allocation_crores"].sum().to_dict()
            actual_name = subset["scheme_name"].iloc[0]
            return {"scheme": actual_name, "yearly_allocations_crores": yearly}
        elif sector_filter:
            subset = df[df["sector"].str.contains(sector_filter, case=False, na=False)]
            if subset.empty:
                return {"matched": False, "message": f"No sector matching '{sector_filter}' found."}
            yearly = subset.groupby("year")["allocation_crores"].sum().to_dict()
            return {"sector": sector_filter, "yearly_allocations_crores": yearly}
        else:
            yearly = df.groupby("year")["allocation_crores"].sum().to_dict()
            return {"total_budget_by_year": yearly}

    elif agg == "top_n":
        n = int(params.get("n") or 10)
        n = max(1, min(n, 20))
        year_filter = params.get("year") or latest_year
        sector_filter = params.get("sector")
        subset = df[df["year"] == year_filter] if year_filter in years else df
        if sector_filter:
            sector_matches = subset[subset["sector"].str.contains(sector_filter, case=False, na=False)]
            if not sector_matches.empty:
                subset = sector_matches
        top = subset.sort_values(by="allocation_crores", ascending=False).head(n)
        return {
            "year": year_filter,
            "sector": sector_filter if sector_filter and not subset.empty else None,
            "top_schemes": top[["scheme_name", "department", "sector", "allocation_crores"]].to_dict(orient="records")
        }

    elif agg == "department_spend":
        dept_filter = params.get("department")
        year_filter = params.get("year") or latest_year
        subset = df[df["year"] == year_filter] if year_filter in years else df
        if dept_filter:
            subset = subset[subset["department"].str.contains(dept_filter, case=False, na=False)]
            if subset.empty:
                return {"matched": False, "message": f"No department matching '{dept_filter}' found."}
            tot = float(subset["allocation_crores"].sum())
            return {
                "department": dept_filter,
                "year": year_filter,
                "total_allocation_crores": round(tot, 2),
                "schemes": subset[["scheme_name", "allocation_crores"]].to_dict(orient="records")
            }
        else:
            grouped = subset.groupby("department")["allocation_crores"].sum().reset_index()
            return {
                "year": year_filter,
                "departments": grouped.sort_values(by="allocation_crores", ascending=False).to_dict(orient="records")
            }

    # Default: summary
    latest_df = df[df["year"] == latest_year]
    return {
        "dataset_name": meta.get("dataset_name"),
        "latest_year": latest_year,
        "total_budget_crores": round(float(latest_df["allocation_crores"].sum()), 2),
        "total_schemes_tracked": int(df["scheme_name"].nunique()),
        "sectors_tracked": df["sector"].unique().tolist()
    }
