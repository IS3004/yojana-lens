// ─── Mock data used when VITE_USE_MOCK=true ───────────────────────────────

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms))

export const mockExtract = async ({ text, existing_profile = {} }) => {
  await delay()
  const lower = text.toLowerCase()
  const profile = { ...existing_profile }

  // Age extraction
  const mAge = lower.match(/\b(\d{1,2})\s*(?:साल|वर्ष|years|yrs|age|उम्र)\b/) || lower.match(/\bage\s*(\d{1,2})\b/)
  if (mAge) profile.age = parseInt(mAge[1], 10)
  else if (lower.includes('45')) profile.age = 45
  else if (lower.includes('22')) profile.age = 22
  else if (lower.includes('35')) profile.age = 35
  else if (lower.includes('62') || lower.includes('बुजुर्ग') || lower.includes('senior')) profile.age = 62

  // Gender
  if (lower.includes('महिला') || lower.includes('woman') || lower.includes('widow') || lower.includes('विधवा') || lower.includes('girl')) {
    profile.gender = 'female'
  } else if (lower.includes('पुरुष') || lower.includes('man') || lower.includes('boy')) {
    profile.gender = 'male'
  }

  // State
  if (lower.includes('jharkhand') || lower.includes('झारखंड')) profile.state = 'Jharkhand'
  else if (lower.includes('rajasthan') || lower.includes('राजस्थान')) profile.state = 'Rajasthan'
  else if (lower.includes('bihar') || lower.includes('बिहार')) profile.state = 'Bihar'
  else if (lower.includes('up') || lower.includes('uttar pradesh') || lower.includes('उत्तर प्रदेश')) profile.state = 'Uttar Pradesh'
  else if (lower.includes('delhi') || lower.includes('दिल्ली')) profile.state = 'Delhi'

  // Occupation / Role
  if (lower.includes('किसान') || lower.includes('farmer') || lower.includes('agriculture') || lower.includes('खेती')) {
    profile.occupation = 'farmer'
    profile.is_farmer = true
    profile.is_rural = true
  } else if (lower.includes('student') || lower.includes('छात्र') || lower.includes('college') || lower.includes('b.tech') || lower.includes('पढ़ाई')) {
    profile.occupation = 'student'
    profile.is_student = true
  } else if (lower.includes('artisan') || lower.includes('कारीगर') || lower.includes('बढ़ई') || lower.includes('लोहार') || lower.includes('craftsman')) {
    profile.occupation = 'artisan'
  } else if (lower.includes('vendor') || lower.includes('ठेला') || lower.includes('दुकान') || lower.includes('street vendor')) {
    profile.occupation = 'vendor'
  }

  // Land
  const mLand = lower.match(/(\d+(?:\.\d+)?)\s*(?:एकड़|acre|acres)/)
  if (mLand) profile.land_acres = parseFloat(mLand[1])

  // Category
  if (lower.includes('sc') || lower.includes('अनुसूचित जाति')) profile.category = 'sc'
  else if (lower.includes('st') || lower.includes('अनुसूचित जनजाति')) profile.category = 'st'
  else if (lower.includes('obc') || lower.includes('अन्य पिछड़ा')) profile.category = 'obc'
  else if (lower.includes('general') || lower.includes('सामान्य')) profile.category = 'general'

  // Poverty / BPL
  if (lower.includes('bpl') || lower.includes('गरीब') || lower.includes('कम आय') || lower.includes('no income')) {
    profile.is_bpl = true
    profile.annual_income = profile.annual_income || 60000
  }

  // Rural
  if (lower.includes('village') || lower.includes('गांव') || lower.includes('ग्रामीण') || lower.includes('rural')) {
    profile.is_rural = true
  }

  // Special checks
  if (lower.includes('solar') || lower.includes('सोलर') || lower.includes('बिजली')) {
    profile.interested_in_solar = true
  }
  if (lower.includes('pregnant') || lower.includes('गर्भवती')) {
    profile.is_pregnant = true
  }

  const missingFields = []
  if (!profile.age) missingFields.push('age')
  if (!profile.state) missingFields.push('state')

  // Only ask follow-up if text is very short and missing both
  const follow_up_question = (missingFields.length > 0 && text.trim().split(' ').length < 4)
    ? `Could you also share your ${missingFields.join(' and ')} to help us fine-tune the results?`
    : null

  return { data: { profile, follow_up_question } }
}

// ─── MASTER SCHEME REPOSITORY (Active, Upcoming, Ended) ─────────────────────

const ALL_MOCK_SCHEMES = [
  // ── 1. ACTIVE / AVAILABLE SCHEMES ───────────────────────────────────────
  {
    id: 'pm-kisan',
    scheme: 'PM Kisan Samman Nidhi',
    scheme_hi: 'पीएम किसान सम्मान निधि',
    benefit: '₹6,000/year direct cash transfer in 3 quarterly installments',
    benefit_hi: 'प्रति वर्ष ₹6,000 तीन किस्तों में सीधे बैंक खाते में',
    timeline_status: 'active',
    timeline_cycle: 'Available Now (Cycle: 2026-27)',
    status: 'likely_eligible',
    category: 'agriculture',
    matched_reasons: ['Farmer profile detected', 'Applicable across all Indian states', 'Direct DBT transfers'],
    missing_info: ['Do you have land registered in your name?', 'Is e-KYC completed on pmkisan.gov.in?'],
    documents: ['Aadhaar Card', 'Land Record (Khasra/Khatauni)', 'Bank Passbook linked with Aadhaar'],
    apply_url: 'https://pmkisan.gov.in',
    reason: 'Provides income support of ₹6,000 annually to all landholder farmer families.',
    source_status: 'verified',
    evidence: [
      { title: 'PM-Kisan Official Portal', url: 'https://pmkisan.gov.in', snippet: 'Direct income support of ₹6000/year to landholder farmer families across India.' },
      { title: 'Ministry of Agriculture Circular', url: 'https://agricoop.nic.in', snippet: '19th installment successfully transferred via DBT.' }
    ],
  },
  {
    id: 'pmjdy',
    scheme: 'Pradhan Mantri Jan Dhan Yojana',
    scheme_hi: 'प्रधानमंत्री जन धन योजना',
    benefit: 'Zero-balance bank account + ₹2 Lakh accident insurance cover',
    benefit_hi: 'शून्य-बैलेंस खाता + ₹2 लाख दुर्घटना बीमा व ओवरड्राफ्ट सुविधा',
    timeline_status: 'active',
    timeline_cycle: 'Always Open (Universal Banking)',
    status: 'likely_eligible',
    category: 'financial_assistance',
    matched_reasons: ['Open to all Indian citizens aged 10+', 'No minimum balance penalty'],
    missing_info: [],
    documents: ['Aadhaar Card or Voter ID', 'Passport Size Photo'],
    apply_url: 'https://pmjdy.gov.in',
    reason: 'Ensures affordable access to financial services, remittances, credit, and insurance.',
    source_status: 'verified',
    evidence: [
      { title: 'Ministry of Finance PMJDY Portal', url: 'https://pmjdy.gov.in', snippet: 'Over 50 crore beneficiaries banked with built-in RuPay insurance.' }
    ],
  },
  {
    id: 'pmjay',
    scheme: 'Ayushman Bharat – PM Jan Arogya Yojana',
    scheme_hi: 'आयुष्मान भारत – प्रधानमंत्री जन आरोग्य योजना',
    benefit: '₹5 Lakh/year cashless hospital treatment per family at empanelled hospitals',
    benefit_hi: 'प्रति परिवार प्रति वर्ष ₹5 लाख तक का कैशलेस व मुफ्त इलाज',
    timeline_status: 'active',
    timeline_cycle: 'Available Now (Universal for Seniors 70+ & BPL)',
    status: 'likely_eligible',
    category: 'health',
    matched_reasons: ['BPL / Economically weaker family or senior citizen', 'Covers secondary and tertiary hospitalization'],
    missing_info: ['Is your family listed in the SECC 2011 or state NFSA database?'],
    documents: ['Aadhaar Card', 'Ration Card', 'Income / BPL Certificate'],
    apply_url: 'https://pmjay.gov.in',
    reason: 'World largest government-funded healthcare assurance scheme for vulnerable families.',
    source_status: 'verified',
    evidence: [
      { title: 'National Health Authority (NHA)', url: 'https://pmjay.gov.in', snippet: 'Cashless access to healthcare services for vulnerable citizens.' }
    ],
  },
  {
    id: 'pmay-g',
    scheme: 'Pradhan Mantri Awas Yojana (Gramin)',
    scheme_hi: 'प्रधानमंत्री आवास योजना (ग्रामीण)',
    benefit: '₹1.20 Lakh to ₹1.30 Lakh direct financial grant to build pucca house',
    benefit_hi: 'पक्का मकान बनाने के लिए ₹1.20 लाख से ₹1.30 लाख की सीधी सहायता',
    timeline_status: 'active',
    timeline_cycle: 'Active Target 2026-27 Extension',
    status: 'likely_eligible',
    category: 'housing',
    matched_reasons: ['Rural resident with kutcha or no pucca house', 'Includes 90 days MGNREGA labour support'],
    missing_info: ['Do you or any family member already own a pucca house?'],
    documents: ['Aadhaar Card', 'MGNREGA Job Card', 'Bank Passbook', 'Land ownership document'],
    apply_url: 'https://pmayg.nic.in',
    reason: 'Housing for All initiative providing durable shelter to rural homeless and kutcha-house families.',
    source_status: 'verified',
    evidence: [
      { title: 'Ministry of Rural Development', url: 'https://pmayg.nic.in', snippet: 'Financial assistance for pucca construction with toilet assistance under SBM.' }
    ],
  },
  {
    id: 'surya-ghar',
    scheme: 'PM Surya Ghar: Muft Bijli Yojana',
    scheme_hi: 'पीएम सूर्य घर: मुफ्त बिजली योजना',
    benefit: 'Up to ₹78,000 direct subsidy for rooftop solar + up to 300 units free electricity/month',
    benefit_hi: 'रूफटॉप सोलर पर ₹78,000 तक की सीधी सब्सिडी + 300 यूनिट मुफ्त बिजली',
    timeline_status: 'active',
    timeline_cycle: 'Available Now (Nationwide Portal Open)',
    status: 'likely_eligible',
    category: 'financial_assistance',
    matched_reasons: ['Open to residential households with grid electricity connection', 'Major power bill reduction'],
    missing_info: ['Do you have suitable shadow-free rooftop space?'],
    documents: ['Electricity Bill', 'Aadhaar Card', 'Bank Account details', 'Rooftop photograph'],
    apply_url: 'https://pmsuryaghar.gov.in',
    reason: 'Subsidizes residential rooftop solar installations to provide free electricity to 1 crore households.',
    source_status: 'verified',
    evidence: [
      { title: 'PM Surya Ghar National Portal', url: 'https://pmsuryaghar.gov.in', snippet: 'Central financial assistance credited directly to bank account within 30 days.' }
    ],
  },
  {
    id: 'pm-vishwakarma',
    scheme: 'PM Vishwakarma Yojana',
    scheme_hi: 'पीएम विश्वकर्मा योजना',
    benefit: '₹15,000 tool kit incentive + collateral-free loans up to ₹3 Lakh at 5% interest',
    benefit_hi: '₹15,000 टूलकिट सहायता + 5% रियायती ब्याज दर पर ₹3 लाख तक का ऋण',
    timeline_status: 'active',
    timeline_cycle: 'Applications Ongoing (18 Traditional Trades)',
    status: 'likely_eligible',
    category: 'skill_development',
    matched_reasons: ['Artisans, carpenters, blacksmiths, cobblers, tailors & traditional craftspeople'],
    missing_info: ['Which of the 18 specified traditional craft trades do you practice?'],
    documents: ['Aadhaar Card', 'Mobile Number', 'Bank Account Details', 'Trade Proof / Self Declaration'],
    apply_url: 'https://pmvishwakarma.gov.in',
    reason: 'Comprehensive end-to-end support for artisans including skill training, toolkit grant, and soft credit.',
    source_status: 'verified',
    evidence: [
      { title: 'Ministry of MSME PM Vishwakarma', url: 'https://pmvishwakarma.gov.in', snippet: 'Formal recognition as Vishwakarma with ID card and credit support.' }
    ],
  },
  {
    id: 'nsp-scholarships',
    scheme: 'National Scholarship Portal (Pre & Post Matric)',
    scheme_hi: 'राष्ट्रीय छात्रवृत्ति पोर्टल (मैट्रिक-पूर्व एवं उत्तर छात्रवृत्तियां)',
    benefit: '₹2,500 to ₹50,000/year scholarship allowance credited directly to student account',
    benefit_hi: 'कोर्स व मेरिट अनुसार ₹2,500 से ₹50,000 प्रति वर्ष छात्रवृत्ति',
    timeline_status: 'active',
    timeline_cycle: 'Academic Cycle 2026-27 Open',
    status: 'likely_eligible',
    category: 'education',
    matched_reasons: ['Enrolled student', 'Wide coverage for SC/ST/OBC/Minority/General students'],
    missing_info: ['What is your current course and previous academic year score?'],
    documents: ['Aadhaar Card', 'Bonafide Student Certificate', 'Previous Year Marksheet', 'Income Certificate'],
    apply_url: 'https://scholarships.gov.in',
    reason: 'Centralized government scholarship window ensuring students from weak financial backgrounds continue education.',
    source_status: 'verified',
    evidence: [
      { title: 'National Scholarship Portal (Govt of India)', url: 'https://scholarships.gov.in', snippet: 'Common electronic portal for multiple central & state educational scholarships.' }
    ],
  },
  {
    id: 'sukanya-samriddhi',
    scheme: 'Sukanya Samriddhi Yojana',
    scheme_hi: 'सुकन्या समृद्धि योजना',
    benefit: '8.2% guaranteed tax-free interest for girl child education & marriage fund',
    benefit_hi: 'बालिका के लिए 8.2% गारंटीड ब्याज व 80C आयकर छूट',
    timeline_status: 'active',
    timeline_cycle: 'Available Now at Post Offices & Banks',
    status: 'likely_eligible',
    category: 'women_welfare',
    matched_reasons: ['Family with girl child under 10 years of age', 'Highest sovereign interest among small savings'],
    missing_info: ['What is the age of your daughter? (Must be under 10 years)'],
    documents: ['Birth certificate of girl child', 'Parent/Guardian Aadhaar & PAN', 'Address proof'],
    apply_url: 'https://www.indiapost.gov.in',
    reason: 'Small deposit scheme under Beti Bachao Beti Padhao campaign securing future of the girl child.',
    source_status: 'verified',
    evidence: [
      { title: 'India Post Small Savings', url: 'https://www.indiapost.gov.in', snippet: 'Account can be opened with just ₹250 initial deposit at any Post Office.' }
    ],
  },
  {
    id: 'pm-mudra',
    scheme: 'Pradhan Mantri Mudra Yojana (PMMY)',
    scheme_hi: 'प्रधानमंत्री मुद्रा योजना',
    benefit: 'Collateral-free business loans up to ₹20 Lakh (Tarun Plus limit expanded)',
    benefit_hi: 'बिना गारंटी के ₹20 लाख तक का व्यवसाय ऋण (शिशु, किशोर, तरुण श्रेणी)',
    timeline_status: 'active',
    timeline_cycle: 'Always Open at All Commercial & Gramin Banks',
    status: 'likely_eligible',
    category: 'employment',
    matched_reasons: ['Self-employed, small shopkeeper, micro-entrepreneur or artisan'],
    missing_info: ['Do you have a business plan or existing enterprise registration?'],
    documents: ['Aadhaar Card', 'PAN Card', 'Proof of Business Address', 'Bank Statement (6 months)'],
    apply_url: 'https://www.mudra.org.in',
    reason: 'Funds the unfunded: provides collateral-free institutional credit to micro and small enterprises.',
    source_status: 'verified',
    evidence: [
      { title: 'MUDRA Portal', url: 'https://www.mudra.org.in', snippet: 'Financial support for micro enterprises across India.' }
    ],
  },
  {
    id: 'ignoaps-pension',
    scheme: 'Indira Gandhi National Old Age Pension Scheme',
    scheme_hi: 'इंदिरा गांधी राष्ट्रीय वृद्धावस्था पेंशन योजना',
    benefit: 'Monthly pension of ₹1,000–₹2,500 (Central + State Top-up) directly to bank',
    benefit_hi: 'वरिष्ठ नागरिकों (60+) के लिए ₹1,000 से ₹2,500 प्रतिमाह पेंशन',
    timeline_status: 'active',
    timeline_cycle: 'Available Now (Quarterly Verification)',
    status: 'likely_eligible',
    category: 'pension',
    matched_reasons: ['Senior citizen aged 60 or above', 'Belongs to BPL / economically vulnerable category'],
    missing_info: ['Are you receiving any other central or state pension?'],
    documents: ['Aadhaar Card', 'Age Proof Certificate', 'BPL Card / Income Certificate', 'Bank Passbook'],
    apply_url: 'https://nsap.nic.in',
    reason: 'Monthly social security allowance for senior citizens below poverty line.',
    source_status: 'verified',
    evidence: [
      { title: 'National Social Assistance Programme (NSAP)', url: 'https://nsap.nic.in', snippet: 'Non-contributory pension for vulnerable elderly citizens.' }
    ],
  },

  // ── 2. UPCOMING SCHEMES ─────────────────────────────────────────────────
  {
    id: 'pm-vidyalaxmi-2026',
    scheme: 'PM Vidyalaxmi Higher Education Scheme',
    scheme_hi: 'पीएम विद्यालक्ष्मी उच्च शिक्षा योजना',
    benefit: '100% collateral-free, guarantee-free education loan + 75% credit guarantee by Govt',
    benefit_hi: 'शीर्ष 860 संस्थानों हेतु बिना गारंटी पूरा शिक्षा ऋण + 3% ब्याज छूट',
    timeline_status: 'upcoming',
    timeline_cycle: 'Upcoming (Portal Launching Soon)',
    status: 'likely_eligible',
    category: 'education',
    matched_reasons: ['Students admitted to top 860 NIRF-ranked institutions', 'Family income up to ₹8 Lakh gets 3% interest subvention'],
    missing_info: ['Institute NIRF rank and admission allotment letter'],
    documents: ['Aadhaar Card', 'College Admission Proof', 'Class 12 Marksheet', 'Income Proof'],
    apply_url: 'https://www.vidyalakshmi.co.in',
    reason: 'Cabinet-approved landmark initiative ensuring no meritorious student is denied higher education due to financial hurdles.',
    source_status: 'verified',
    evidence: [
      { title: 'Cabinet Decision Brief on PM-Vidyalaxmi', url: 'https://pib.gov.in', snippet: 'Govt approval for financial support to meritorious students entering quality higher education institutes.' }
    ],
  },
  {
    id: 'drone-didi-phase2',
    scheme: 'Namo Drone Didi Scheme (Phase 2)',
    scheme_hi: 'नमो ड्रोन दीदी योजना (द्वितीय चरण)',
    benefit: 'Free agricultural drone worth ₹10 Lakh + 80% capital subsidy + pilot training stipend',
    benefit_hi: 'महिला स्वयं सहायता समूहों को ड्रोन, 80% अनुदान व पायलट प्रशिक्षण',
    timeline_status: 'upcoming',
    timeline_cycle: 'Upcoming (Next Intake Window)',
    status: 'check_at_office',
    category: 'women_welfare',
    matched_reasons: ['Rural women associated with Deendayal Antyodaya Yojana - NRLM SHGs'],
    missing_info: ['Are you an active member of an approved village Self Help Group (SHG)?'],
    documents: ['SHG Membership Certificate', 'Aadhaar Card', 'Minimum Class 10 Certificate', 'Bank Passbook'],
    apply_url: 'https://nrlm.gov.in',
    reason: 'Empowers rural women SHGs to become agricultural technology entrepreneurs providing drone spraying services.',
    source_status: 'verified',
    evidence: [
      { title: 'Ministry of Rural Development Drone Didi Guidelines', url: 'https://nrlm.gov.in', snippet: '15,000 selected women SHGs being equipped with agricultural drones for rental income.' }
    ],
  },
  {
    id: 'green-rural-hydrogen-2027',
    scheme: 'National Green Hydrogen Rural Decentralized Subsidy',
    scheme_hi: 'राष्ट्रीय हरित हाइड्रोजन ग्रामीण विकेंद्रीकृत सब्सिडी',
    benefit: 'Capital subsidy up to 50% for biomass-to-hydrogen farmer producer organizations',
    benefit_hi: 'कृषि बायोमास व ग्रीन हाइड्रोजन प्रोजेक्ट्स पर 50% तक पूंजीगत अनुदान',
    timeline_status: 'upcoming',
    timeline_cycle: 'Upcoming (Gazette Notification In Draft)',
    status: 'check_at_office',
    category: 'agriculture',
    matched_reasons: ['Farmer Producer Organizations (FPOs) and agricultural cooperatives'],
    missing_info: ['Registered Farmer Producer Company (FPC) documentation'],
    documents: ['FPO Incorporation Certificate', 'Project Feasibility Report', 'Land lease agreement'],
    apply_url: 'https://mnre.gov.in',
    reason: 'Upcoming green energy decentralized mission converting agricultural stubble into clean hydrogen energy.',
    source_status: 'verified',
    evidence: [
      { title: 'Ministry of New & Renewable Energy (MNRE)', url: 'https://mnre.gov.in', snippet: 'National Green Hydrogen Mission rural pilot projects roadmap.' }
    ],
  },

  // ── 3. ENDED / CLOSED SCHEMES (ARCHIVED) ─────────────────────────────────
  {
    id: 'pmgkay-covid-special',
    scheme: 'PM Garib Kalyan Anna Yojana (Covid Relief Window)',
    scheme_hi: 'प्रधानमंत्री गरीब कल्याण अन्न योजना (विशेष कोविड राहत चरण)',
    benefit: '5 kg free foodgrains per person/month over and above normal NFSA quota',
    benefit_hi: 'सामान्य राशन के अतिरिक्त 5 किलो प्रतिमाह अतिरिक्त मुफ्त खाद्यान्न',
    timeline_status: 'ended',
    timeline_cycle: 'Ended (Merged into Universal Free NFSA Ration)',
    status: 'check_at_office',
    category: 'financial_assistance',
    matched_reasons: ['NFSA Antyodaya & Priority Household ration card holders'],
    missing_info: ['Note: This emergency Covid tranche is closed; benefits now integrated under standard NFSA.'],
    documents: ['Ration Card', 'Aadhaar Card'],
    apply_url: 'https://dfpd.gov.in',
    reason: 'Emergency pandemic food security program run during 2020-2023, now permanently integrated into regular free ration under NFSA.',
    source_status: 'verified',
    evidence: [
      { title: 'Department of Food & Public Distribution', url: 'https://dfpd.gov.in', snippet: 'Special emergency tranches concluded and converted to 5-year free ration under unified NFSA.' }
    ],
  },
  {
    id: 'atal-solar-pump-ph1',
    scheme: 'Atal Solar Krishi Pump Scheme (Phase 1)',
    scheme_hi: 'अटल सौर कृषि पंप योजना (प्रथम चरण)',
    benefit: '95% subsidy on 3HP and 5HP DC solar water pumping systems for irrigation',
    benefit_hi: 'किसानों को 95% सब्सिडी पर 3HP/5HP सोलर कृषि पंप',
    timeline_status: 'ended',
    timeline_cycle: 'Ended / Closed (Quota Exhausted, Succeeded by PM-KUSUM)',
    status: 'check_at_office',
    category: 'agriculture',
    matched_reasons: ['Farmers with cultivable land lacking conventional electric pump connections'],
    missing_info: ['Phase 1 quota exhausted. Please check "PM-KUSUM Component B" for current open applications.'],
    documents: ['Land 7/12 extract', 'No Electricity Dues NOC', 'Aadhaar Card'],
    apply_url: 'https://pmkusum.mnre.gov.in',
    reason: 'Initial phase concluded after meeting state capacity targets; ongoing solar pump subsidies now run under PM-KUSUM.',
    source_status: 'verified',
    evidence: [
      { title: 'State Energy Agency Notification', url: 'https://pmkusum.mnre.gov.in', snippet: 'Phase 1 concluded. Beneficiaries redirected to PM KUSUM portal for new solar pump connections.' }
    ],
  },
  {
    id: 'aatmanirbhar-rozhgar-closed',
    scheme: 'Aatmanirbhar Bharat Rozgar Yojana (ABRY)',
    scheme_hi: 'आत्मनिर्भर भारत रोजगार योजना (ABRY)',
    benefit: 'Government paid employee & employer EPF contribution (24% of wages) for 2 years',
    benefit_hi: 'नए कर्मचारियों हेतु 2 वर्ष तक 24% भविष्य निधि (EPF) का सरकारी भुगतान',
    timeline_status: 'ended',
    timeline_cycle: 'Ended on 31 March 2024 (Registration Window Closed)',
    status: 'check_at_office',
    category: 'employment',
    matched_reasons: ['Employees earning under ₹15,000 entering formal workforce'],
    missing_info: ['New registrations under this incentive window ended on 31-03-2024.'],
    documents: ['UAN Number', 'Aadhaar linked with EPFO', 'Bank Details'],
    apply_url: 'https://www.epfindia.gov.in',
    reason: 'Post-pandemic employment generation scheme subsidizing employer & employee social security contributions.',
    source_status: 'verified',
    evidence: [
      { title: 'EPFO Official Notification', url: 'https://www.epfindia.gov.in', snippet: 'ABRY registration window concluded. Ongoing disbursements for active beneficiaries till completion of 2-year tenure.' }
    ],
  }
]

// ─── MATCH FUNCTION WITH TIMELINE SUPPORT ───────────────────────────────────

export const mockMatch = async ({ profile }) => {
  await delay(600)

  const isFarmer = profile.occupation === 'farmer' || profile.is_farmer || profile.is_rural
  const isStudent = profile.occupation === 'student' || profile.is_student
  const isArtisan = profile.occupation === 'artisan'
  const isVendor = profile.occupation === 'vendor'
  const isSenior = (profile.age && profile.age >= 60)
  const isBpl = profile.is_bpl || (profile.annual_income && profile.annual_income < 120000)
  const isWoman = profile.gender === 'female'
  const hasGirlChild = profile.daughter_age || isWoman
  const isSolar = profile.interested_in_solar

  // Score and filter schemes dynamically
  const scored = ALL_MOCK_SCHEMES.map((scheme) => {
    let relevance = 0
    const reasons = [...scheme.matched_reasons]

    // Relevance scoring
    if (scheme.id === 'pmjdy') relevance += 5 // universal
    if (scheme.id === 'surya-ghar') relevance += 4 // universal household

    if (isFarmer && (scheme.category === 'agriculture' || scheme.id === 'pmay-g')) {
      relevance += 10
    }
    if (isStudent && (scheme.category === 'education' || scheme.id === 'pm-vidyalaxmi-2026')) {
      relevance += 10
    }
    if (isArtisan && scheme.id === 'pm-vishwakarma') {
      relevance += 12
    }
    if (isVendor && (scheme.id === 'pm-mudra' || scheme.category === 'employment')) {
      relevance += 10
    }
    if (isBpl && (scheme.id === 'pmjay' || scheme.id === 'pmay-g' || scheme.id === 'pmgkay-covid-special')) {
      relevance += 10
    }
    if (isSenior && scheme.id === 'ignoaps-pension') {
      relevance += 12
    }
    if (isWoman && (scheme.category === 'women_welfare' || scheme.id === 'drone-didi-phase2')) {
      relevance += 8
    }
    if (hasGirlChild && scheme.id === 'sukanya-samriddhi') {
      relevance += 9
    }
    if (isSolar && scheme.id === 'surya-ghar') {
      relevance += 15
    }

    // Baseline relevance so all schemes appear in their respective tabs if relevant
    return { ...scheme, relevance }
  })

  // Sort: highest relevance first, then by timeline (active first, upcoming second, ended last)
  const timelineOrder = { active: 1, upcoming: 2, ended: 3 }
  const sorted = scored.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance
    return (timelineOrder[a.timeline_status] || 9) - (timelineOrder[b.timeline_status] || 9)
  })

  // Separate fully matched from near misses (1 rule away)
  const results = []
  const near_misses = []

  sorted.forEach((scheme) => {
    if (scheme.relevance >= 8 || scheme.id === 'pmjdy') {
      results.push(scheme)
    } else if (scheme.relevance >= 4) {
      // 1 rule away
      const nearScheme = {
        ...scheme,
        failed_rule: scheme.category === 'education' ? 'Student Enrollment' : 'Land Records / Category',
        what_would_change_this: scheme.category === 'education'
          ? 'Requires active enrollment in an authorized technical or degree course'
          : 'Requires certified ownership of cultivable agricultural land'
      }
      near_misses.push(nearScheme)
    } else {
      results.push(scheme)
    }
  })

  return { data: { profile, results, near_misses } }
}

export const mockVerify = async ({ text }) => {
  await delay(1000)
  const lower = text.toLowerCase()
  if (lower.includes('free laptop') || lower.includes('free mobile') || lower.includes('click here') || lower.includes('bit.ly')) {
    return {
      data: {
        verdict: 'false',
        confidence: 0.95,
        reasoning: 'No official government notification exists for this scheme. The message contains a link asking for personal details, which is a common phishing pattern. PIB Fact Check has repeatedly flagged similar messages.',
        citations: [
          { title: 'PIB Fact Check — Fake Free Laptop Scheme', url: 'https://factcheck.pib.gov.in' },
          { title: 'National Cybercrime Reporting Portal', url: 'https://cybercrime.gov.in' },
        ],
      },
    }
  }
  if (lower.includes('pm kisan') || lower.includes('pmkisan') || lower.includes('jan dhan') || lower.includes('ayushman')) {
    return {
      data: {
        verdict: 'supported',
        confidence: 0.96,
        reasoning: 'This is a genuine, verified Government of India welfare initiative. Benefits are directly credited through Direct Benefit Transfer (DBT) into Aadhaar-seeded accounts.',
        citations: [
          { title: 'PM-Kisan Official Portal', url: 'https://pmkisan.gov.in' },
          { title: 'National Portal of India', url: 'https://india.gov.in' },
        ],
      },
    }
  }
  return {
    data: {
      verdict: 'unverified',
      confidence: 0.45,
      reasoning: 'We could not find an official government gazette or press release confirming or denying this specific claim. We will not guess — please verify directly at pib.gov.in or consult your local district welfare office.',
      citations: [
        { title: 'Press Information Bureau (PIB)', url: 'https://pib.gov.in' },
      ],
    },
  }
}

export const mockStats = async () => {
  await delay(400)
  return {
    data: {
      sessions: 1480,
      schemes_matched: 5420,
      verdicts: { supported: 360, false: 215, unverified: 102 },
      top_missing_documents: [
        { name: 'Aadhaar Card', count: 910 },
        { name: 'Income Certificate', count: 670 },
        { name: 'Land Records (Khasra)', count: 420 },
        { name: 'Bank Passbook', count: 395 },
        { name: 'Ration Card', count: 305 },
      ],
      complaints_total: 24,
      complaints_by_status: { received: 8, in_progress: 11, resolved: 5 },
      complaints_by_category: { road: 9, water: 6, sanitation: 4, electricity: 3, health: 2 }
    },
  }
}

export const mockBudgetSummary = async () => {
  await delay(400)
  return {
    data: {
      available: true,
      meta: {
        dataset_name: "Union Budget of India - Major Welfare Schemes & Sectoral Allocations",
        source_url: "https://www.indiabudget.gov.in/",
        year: "2024-25",
        ministry: "Ministry of Finance, Government of India",
        unit: "₹ Crore (INR)"
      },
      latest_year: "2024-25",
      total_budget_latest_year: 367805.0,
      by_sector: [
        { sector: "Rural Development", allocation: 98000.0 },
        { sector: "Agriculture & Allied", allocation: 82600.0 },
        { sector: "Housing & Urban Affairs", allocation: 80671.0 },
        { sector: "Drinking Water & Sanitation", allocation: 70163.0 },
        { sector: "Healthcare", allocation: 45689.0 },
        { sector: "Education", allocation: 37500.0 },
        { sector: "Women & Child Development", allocation: 21200.0 },
        { sector: "Social Welfare", allocation: 9652.0 }
      ],
      by_year: [
        { year: "2022-23", total_allocation: 322898.0, yoy_growth_percent: null },
        { year: "2023-24", total_allocation: 350380.0, yoy_growth_percent: 8.51 },
        { year: "2024-25", total_allocation: 367805.0, yoy_growth_percent: 4.97 }
      ],
      top_10_schemes: [
        { scheme_name: "MGNREGA (Rural Employment)", department: "Department of Rural Development", sector: "Rural Development", allocation: 86000.0, yoy_change: 43.33, year: "2024-25" },
        { scheme_name: "PM Awas Yojana (Rural & Urban Housing)", department: "Ministry of Housing and Urban Affairs", sector: "Housing & Urban Affairs", allocation: 80671.0, yoy_change: 1.36, year: "2024-25" },
        { scheme_name: "Jal Jeevan Mission (Har Ghar Jal)", department: "Department of Drinking Water and Sanitation", sector: "Drinking Water & Sanitation", allocation: 70163.0, yoy_change: 0.23, year: "2024-25" },
        { scheme_name: "PM-KISAN (Income Support)", department: "Department of Agriculture and Farmers Welfare", sector: "Agriculture & Allied", allocation: 60000.0, yoy_change: 0.0, year: "2024-25" },
        { scheme_name: "National Health Mission (NHM)", department: "Department of Health and Family Welfare", sector: "Healthcare", allocation: 38189.0, yoy_change: 6.24, year: "2024-25" },
        { scheme_name: "Samagra Shiksha Abhiyan (School Education)", department: "Department of School Education and Literacy", sector: "Education", allocation: 37500.0, yoy_change: 0.13, year: "2024-25" },
        { scheme_name: "Modified Interest Subvention Scheme (Farmers Credit)", department: "Department of Agriculture and Farmers Welfare", sector: "Agriculture & Allied", allocation: 22600.0, yoy_change: -1.74, year: "2024-25" },
        { scheme_name: "Saksham Anganwadi and Poshan 2.0", department: "Ministry of Women and Child Development", sector: "Women & Child Development", allocation: 21200.0, yoy_change: 3.14, year: "2024-25" },
        { scheme_name: "Pradhan Mantri Gram Sadak Yojana (PMGSY)", department: "Department of Rural Development", sector: "Rural Development", allocation: 12000.0, yoy_change: -36.84, year: "2024-25" },
        { scheme_name: "National Social Assistance Programme (NSAP Pensions)", department: "Department of Social Justice and Empowerment", sector: "Social Welfare", allocation: 9652.0, yoy_change: 0.17, year: "2024-25" }
      ]
    }
  }
}

