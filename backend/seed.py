"""
Seed script: populates MongoDB with real Indian government schemes.
Run once: python seed.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from config import get_settings

settings = get_settings()

SCHEMES = [
    {
        "name": "PM Kisan Samman Nidhi",
        "name_hindi": "पीएम किसान सम्मान निधि",
        "description": "Direct income support of ₹6,000/year to farmer families owning cultivable land.",
        "description_hindi": "खेती योग्य भूमि वाले किसान परिवारों को प्रति वर्ष ₹6,000 की प्रत्यक्ष आय सहायता।",
        "category": "agriculture",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "launch_year": 2019,
        "is_central": True,
        "eligibility": {
            "for_farmers": True,
            "for_bpl": False,
        },
        "benefits": ["₹6,000 per year in 3 installments of ₹2,000", "Direct bank transfer (DBT)"],
        "documents_required": ["Aadhaar Card", "Land records / Khasra", "Bank passbook", "Mobile number"],
        "how_to_apply": "Visit local Patwari/Agriculture office or apply online at pmkisan.gov.in",
        "application_url": "https://pmkisan.gov.in",
        "helpline": "155261 / 011-23381092",
        "tags": ["farmer", "agriculture", "income support", "DBT"],
        "is_active": True,
    },
    {
        "name": "Pradhan Mantri Jan Dhan Yojana",
        "name_hindi": "प्रधानमंत्री जन धन योजना",
        "description": "Financial inclusion scheme offering zero-balance bank accounts with RuPay debit card, accident insurance of ₹1 lakh, and overdraft facility.",
        "category": "financial_assistance",
        "ministry": "Ministry of Finance",
        "launch_year": 2014,
        "is_central": True,
        "eligibility": {
            "min_age": 10,
        },
        "benefits": [
            "Zero-balance savings account",
            "RuPay Debit Card",
            "Accident insurance cover ₹1–2 lakh",
            "Overdraft facility up to ₹10,000",
            "Life cover ₹30,000",
        ],
        "documents_required": ["Aadhaar Card or Voter ID", "Passport size photo"],
        "how_to_apply": "Visit any bank branch or Business Correspondent (BC) outlet with KYC documents.",
        "application_url": "https://pmjdy.gov.in",
        "helpline": "1800-11-0001",
        "tags": ["bank account", "financial inclusion", "insurance", "zero balance"],
        "is_active": True,
    },
    {
        "name": "Ayushman Bharat – PM Jan Arogya Yojana",
        "name_hindi": "आयुष्मान भारत – प्रधानमंत्री जन आरोग्य योजना",
        "description": "Health insurance cover of ₹5 lakh per family per year for secondary and tertiary hospitalisation.",
        "category": "health",
        "ministry": "Ministry of Health & Family Welfare",
        "launch_year": 2018,
        "is_central": True,
        "eligibility": {
            "for_bpl": True,
        },
        "benefits": [
            "₹5 lakh health cover per family per year",
            "Cashless & paperless treatment at empanelled hospitals",
            "Covers pre and post-hospitalisation expenses",
            "No cap on family size",
        ],
        "documents_required": ["Aadhaar Card", "Ration Card", "SECC data verification"],
        "how_to_apply": "Check eligibility at pmjay.gov.in or visit nearest Common Service Centre (CSC).",
        "application_url": "https://pmjay.gov.in",
        "helpline": "14555",
        "tags": ["health", "insurance", "BPL", "hospitalisation", "cashless"],
        "is_active": True,
    },
    {
        "name": "PM Awas Yojana – Gramin",
        "name_hindi": "प्रधानमंत्री आवास योजना – ग्रामीण",
        "description": "Financial assistance to BPL rural households to construct a pucca house.",
        "category": "housing",
        "ministry": "Ministry of Rural Development",
        "launch_year": 2016,
        "is_central": True,
        "eligibility": {
            "for_bpl": True,
            "residence_types": ["rural"],
        },
        "benefits": [
            "₹1.20 lakh assistance in plain areas",
            "₹1.30 lakh in hilly/NE states",
            "Convergence with MGNREGS for 90–95 days of labour",
            "Toilet construction support under Swachh Bharat Mission",
        ],
        "documents_required": ["Aadhaar Card", "BPL certificate", "Bank account details", "Land ownership proof"],
        "how_to_apply": "Apply through Gram Panchayat or visit pmayg.nic.in",
        "application_url": "https://pmayg.nic.in",
        "helpline": "1800-11-6446",
        "tags": ["housing", "rural", "BPL", "construction", "pucca house"],
        "is_active": True,
    },
    {
        "name": "PM Scholarship Scheme (PMSS)",
        "name_hindi": "प्रधानमंत्री छात्रवृत्ति योजना",
        "description": "Scholarships for wards of ex-servicemen and ex-coast guard personnel pursuing professional degree courses.",
        "category": "education",
        "ministry": "Ministry of Defence",
        "launch_year": 2006,
        "is_central": True,
        "eligibility": {
            "for_students": True,
            "min_age": 17,
            "max_age": 25,
        },
        "benefits": [
            "₹3,000/month for boys",
            "₹3,500/month for girls",
            "Renewable annually based on performance",
        ],
        "documents_required": [
            "Aadhaar Card", "Ex-serviceman certificate", "Admission letter",
            "Marksheets (10th & 12th)", "Bank passbook",
        ],
        "how_to_apply": "Apply online at ksb.gov.in during the application window.",
        "application_url": "https://ksb.gov.in",
        "helpline": "011-26715250",
        "tags": ["scholarship", "education", "student", "defence", "ex-serviceman"],
        "is_active": True,
    },
    {
        "name": "Sukanya Samriddhi Yojana",
        "name_hindi": "सुकन्या समृद्धि योजना",
        "description": "Small savings scheme for girl children up to age 10, with attractive interest rate and tax benefits.",
        "category": "women_welfare",
        "ministry": "Ministry of Finance",
        "launch_year": 2015,
        "is_central": True,
        "eligibility": {
            "max_age": 10,
            "genders": ["female"],
        },
        "benefits": [
            "Interest rate ~8.2% p.a. (revised quarterly)",
            "Tax exemption under Section 80C",
            "Maturity on girl turning 21 years",
            "Partial withdrawal allowed after age 18",
        ],
        "documents_required": ["Girl's birth certificate", "Guardian's Aadhaar & PAN", "Address proof"],
        "how_to_apply": "Open account at any post office or authorised bank with ₹250 minimum deposit.",
        "application_url": "https://www.indiapost.gov.in",
        "helpline": "1800-266-6868",
        "tags": ["girl child", "savings", "education", "tax", "women"],
        "is_active": True,
    },
    {
        "name": "PM Mudra Yojana",
        "name_hindi": "प्रधानमंत्री मुद्रा योजना",
        "description": "Loans up to ₹10 lakh for non-corporate, non-farm small/micro enterprises.",
        "category": "employment",
        "ministry": "Ministry of Finance",
        "launch_year": 2015,
        "is_central": True,
        "eligibility": {
            "min_age": 18,
        },
        "benefits": [
            "Shishu: loans up to ₹50,000",
            "Kishore: loans ₹50,001 – ₹5 lakh",
            "Tarun: loans ₹5 lakh – ₹10 lakh",
            "No collateral required for Shishu & Kishore",
        ],
        "documents_required": [
            "Aadhaar Card", "PAN Card", "Business proof/plan",
            "Residence proof", "Bank statement (6 months)",
        ],
        "how_to_apply": "Apply at any bank, MFI, or NBFC branch. Online at udyamimitra.in",
        "application_url": "https://www.mudra.org.in",
        "helpline": "1800-180-1111",
        "tags": ["loan", "MSME", "business", "entrepreneur", "self-employment"],
        "is_active": True,
    },
    {
        "name": "National Social Assistance Programme – Old Age Pension",
        "name_hindi": "राष्ट्रीय सामाजिक सहायता कार्यक्रम – वृद्धावस्था पेंशन",
        "description": "Monthly pension for destitute elderly persons (60+) belonging to BPL households.",
        "category": "pension",
        "ministry": "Ministry of Rural Development",
        "launch_year": 1995,
        "is_central": True,
        "eligibility": {
            "min_age": 60,
            "for_bpl": True,
        },
        "benefits": [
            "₹200–300/month from Centre (states add top-up)",
            "Direct bank transfer",
        ],
        "documents_required": ["Aadhaar Card", "Age proof", "BPL certificate", "Bank passbook"],
        "how_to_apply": "Apply at district social welfare office or Gram Panchayat.",
        "application_url": "https://nsap.nic.in",
        "helpline": "1800-111-555",
        "tags": ["pension", "elderly", "old age", "BPL", "senior citizen"],
        "is_active": True,
    },
    {
        "name": "PM Kaushal Vikas Yojana (PMKVY)",
        "name_hindi": "प्रधानमंत्री कौशल विकास योजना",
        "description": "Free short-duration skill training and certification for youth to enhance employability.",
        "category": "skill_development",
        "ministry": "Ministry of Skill Development & Entrepreneurship",
        "launch_year": 2015,
        "is_central": True,
        "eligibility": {
            "min_age": 15,
            "max_age": 45,
        },
        "benefits": [
            "Free skill training (150–300 hours)",
            "Industry-recognised certification",
            "Monetary reward on successful completion",
            "Placement assistance",
        ],
        "documents_required": ["Aadhaar Card", "Bank account", "Educational certificates"],
        "how_to_apply": "Register at skillindia.gov.in or visit nearest PMKVY training centre.",
        "application_url": "https://pmkvyofficial.org",
        "helpline": "08800-55555",
        "tags": ["skill", "training", "youth", "employment", "certification"],
        "is_active": True,
    },
    {
        "name": "Startup India Seed Fund Scheme",
        "name_hindi": "स्टार्टअप इंडिया सीड फंड योजना",
        "description": "Financial assistance to startups for proof of concept, prototype development, product trials, and market entry.",
        "category": "startup",
        "ministry": "Ministry of Commerce & Industry (DPIIT)",
        "launch_year": 2021,
        "is_central": True,
        "eligibility": {
            "min_age": 18,
        },
        "benefits": [
            "Up to ₹20 lakh as grant for validation/PoC",
            "Up to ₹50 lakh as convertible debentures/debt for commercialisation",
        ],
        "documents_required": [
            "DPIIT startup recognition certificate",
            "Business plan", "Pitch deck", "Incorporation certificate",
        ],
        "how_to_apply": "Apply through incubators registered on startupindia.gov.in",
        "application_url": "https://seedfund.startupindia.gov.in",
        "helpline": "1800-115-565",
        "tags": ["startup", "funding", "entrepreneurship", "innovation", "seed fund"],
        "is_active": True,
    },
]


async def seed():
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.db_name]
    collection = db["schemes"]

    # Drop existing
    await collection.drop()
    print("🗑️  Dropped existing schemes collection")

    # Add timestamps
    now = datetime.utcnow()
    for s in SCHEMES:
        s["created_at"] = now
        s["updated_at"] = now

    result = await collection.insert_many(SCHEMES)
    print(f"✅ Inserted {len(result.inserted_ids)} schemes")

    # Create indexes
    await collection.create_index("category")
    await collection.create_index("tags")
    await collection.create_index("is_active")
    await collection.create_index([("name", "text"), ("description", "text"), ("tags", "text")])
    print("✅ Created indexes")

    client.close()
    print("🎉 Seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed())
