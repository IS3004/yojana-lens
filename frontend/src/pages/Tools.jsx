import { useState } from 'react'
import {
  FileCheck2, IndianRupee, HelpCircle, Scale, Building,
  CheckCircle2, AlertTriangle, AlertCircle, Search, ExternalLink,
  Printer, ArrowRight, ArrowLeft, RefreshCw, FileText, Phone, ShieldCheck, XCircle, PhoneCall
} from 'lucide-react'
import { useLang } from '../i18n/strings'
import Disclaimer from '../components/Disclaimer'

// ─── 1. Dastavej Parakh: Data & Evaluator ─────────────────────────────────────
function evaluateNameMatch(name1, name2) {
  if (!name1 || !name2) return { score: 0, status: 'empty', note: 'Please enter names from both documents.' }
  const clean1 = name1.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '')
  const clean2 = name2.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '')

  if (clean1 === clean2) {
    return {
      score: 100,
      status: 'exact',
      note: 'Exact match. No clerical rejection risk.'
    }
  }

  const words1 = clean1.split(/\s+/).filter(Boolean)
  const words2 = clean2.split(/\s+/).filter(Boolean)

  const common = words1.filter(w => words2.includes(w))
  const initialsMatch = words1.some(w => words2.some(w2 => (w.length === 1 && w2.startsWith(w)) || (w2.length === 1 && w.startsWith(w2))))

  if (common.length >= Math.min(words1.length, words2.length) || initialsMatch) {
    return {
      score: 85,
      status: 'minor_mismatch',
      note: 'Minor variation (initial vs full name, or honorifics). Most central portals accept this with an Aadhaar biometric e-KYC.'
    }
  }

  return {
    score: 45,
    status: 'severe_mismatch',
    note: 'Significant spelling discrepancy detected. High probability of rejection in PFMS / e-KYC. Rectification recommended before application.'
  }
}

// ─── 2. CSC Rate Card Database ────────────────────────────────────────────────
const CSC_SERVICES = [
  {
    name_en: 'Aadhaar Demographic Update (Name, Address, Mobile, Gender)',
    name_hi: 'आधार डेमोग्राफिक अपडेट (नाम, पता, मोबाइल, लिंग)',
    official_fee: '₹50',
    statutory: 'UIDAI Gazette Notification',
    free: false,
    dept: 'UIDAI',
    rule: 'No additional scanning or print charges allowed.'
  },
  {
    name_en: 'Aadhaar Mandatory Biometric for Children (Age 5 & 15 yrs)',
    name_hi: 'बच्चों का अनिवार्य बायोमेट्रिक अपडेट (5 और 15 वर्ष)',
    official_fee: '₹0 (FREE)',
    statutory: 'Govt Mandate',
    free: true,
    dept: 'UIDAI',
    rule: 'Strictly zero charge. Asking for money is an offense.'
  },
  {
    name_en: 'Ayushman Bharat Card Generation & PVC Print',
    name_hi: 'आयुष्मान भारत कार्ड निर्माण एवं प्रिंट',
    official_fee: '₹0 (FREE)',
    statutory: 'National Health Authority (NHA)',
    free: true,
    dept: 'Ministry of Health',
    rule: 'Free at all empaneled hospitals & CSCs.'
  },
  {
    name_en: 'PM-KISAN Biometric e-KYC',
    name_hi: 'पीएम-किसान बायोमेट्रिक ई-केवाईसी',
    official_fee: '₹15',
    statutory: 'Ministry of Agriculture',
    free: false,
    dept: 'Dept of Agriculture',
    rule: 'Maximum ₹15 per successful biometric auth.'
  },
  {
    name_en: 'E-Shram Unorganized Worker Card & Printout',
    name_hi: 'ई-श्रम असंगठित श्रमिक कार्ड पंजीकरण व प्रिंट',
    official_fee: '₹0 (FREE)',
    statutory: 'Ministry of Labour & Employment',
    free: true,
    dept: 'Ministry of Labour',
    rule: '100% sponsored by Central Government.'
  },
  {
    name_en: 'Income / Caste / Domicile Certificate Online Filing',
    name_hi: 'आय / जाति / निवास प्रमाण पत्र ऑनलाइन आवेदन',
    official_fee: '₹30 max CSC service charge',
    statutory: 'State e-District Guidelines',
    free: false,
    dept: 'Revenue Dept',
    rule: 'Plus actual state stamp duty if applicable.'
  },
  {
    name_en: 'CPGRAMS / CM Portal Civic Grievance Filing',
    name_hi: 'सीपीग्राम्स / मुख्यमंत्री पोर्टल शिकायत पंजीकरण',
    official_fee: '₹0 (FREE)',
    statutory: 'Dept of Administrative Reforms',
    free: true,
    dept: 'Public Grievances (DARPG)',
    rule: 'Citizen grievances must be registered without fee.'
  }
]

// ─── 3. Rejection Codes Database ──────────────────────────────────────────────
const REJECTION_CODES = [
  {
    code: 'PFMS-02',
    name: 'Bank Account Dormant / Inactive',
    portal: 'PM-KISAN, NSP, Ladli Behna',
    cause_en: 'No transaction recorded in account for over 6 months; bank marked it dormant.',
    cause_hi: 'पिछले 6 महीने में कोई लेनदेन न होने से बैंक ने खाते को निष्क्रिय (Dormant) कर दिया है।',
    action_en: 'Visit home branch with Aadhaar & Passbook. Deposit ₹100 or withdraw cash to re-activate.',
    action_hi: 'अपनी बैंक शाखा में आधार व पासबुक ले जाएं। ₹100 जमा या निकासी कर री-एक्टिवेट कराएं।'
  },
  {
    code: 'NPCI-MAPPER-FAILED',
    name: 'Aadhaar Not Seeded in NPCI Payment Bridge',
    portal: 'All DBT Schemes (Direct Benefit Transfer)',
    cause_en: 'Aadhaar is linked for KYC but NPCI DBT mandate is not mapped to this specific bank.',
    cause_hi: 'आधार बैंक में लगा है परंतु डीबीटी सब्सिडी प्राप्त करने हेतु NPCI मैपर पर मैप नहीं है।',
    action_en: 'Submit "NPCI Aadhaar Seeding Consent Form" at your bank branch. Ask specifically for DBT mapping.',
    action_hi: 'बैंक में "NPCI आधार सीडिंग सहमति फॉर्म" भरें। डीबीटी मैपिंग के लिए कहें।'
  },
  {
    code: 'LAND-KHASRA-MISMATCH',
    name: 'Land Record Not Linked with Beneficiary',
    portal: 'PM-KISAN, PM Fasal Bima',
    cause_en: 'Land mutation not completed in state Bhulekh portal or name spelling mismatch in RoR/Khasra.',
    cause_hi: 'राज्य भूलेख पोर्टल में दाखिल-खारिज अधूरा है या खसरा खतौनी में नाम का अंतर है।',
    action_en: 'Visit Block Revenue Circle / Tahsil office. Get land mutation verification signed by Revenue Inspector (Patwari).',
    action_hi: 'प्रखंड राजस्व कार्यालय / तहसील में पटवारी/लेखपाल से मिलकर भूमि सत्यापन कराएं।'
  },
  {
    code: 'EKYC-BIO-MISMATCH',
    name: 'Biometric Authentication Failed',
    portal: 'Aadhaar, Ration PDS, PM-KISAN',
    cause_en: 'Fingerprint ridges faded due to age or manual labour; UIDAI biometric match score below threshold.',
    cause_hi: 'शारीरिक श्रम या उम्र के कारण उंगलियों के निशान घिस गए हैं, जिससे मशीन पढ़ नहीं पा रही।',
    action_en: 'Opt for Iris scan or Mobile OTP-based e-KYC. If needed, update biometrics at Aadhaar Seva Kendra.',
    action_hi: 'आइरिस (आंखों की पुतली) स्कैन या मोबाइल ओटीपी विकल्प चुनें। आधार केंद्र पर बायोमेट्रिक अपडेट कराएं।'
  },
  {
    code: 'IFSC-INVALID-MERGED',
    name: 'Bank IFSC Merged / Obsolete',
    portal: 'Scholarships, Pensions, DBT',
    cause_en: 'Your branch was merged (e.g. Syndicate into Canara, Allahabad into Indian Bank, Andhra into Union).',
    cause_hi: 'बैंक विलय (जैसे सिंडिकेट का केनरा में) के कारण पुराना IFSC कोड अमान्य हो गया है।',
    action_en: 'Log in to scheme portal or visit CSC. Update bank details with the NEW IFSC code of the merged entity.',
    action_hi: 'योजना पोर्टल पर लॉगिन करें या सीएससी जाकर विलय हुए नए बैंक का नया IFSC अपडेट करें।'
  },
  {
    code: 'NSP-INST-VERIF-PEND',
    name: 'Institute / Nodal Officer Verification Pending',
    portal: 'National Scholarship Portal (NSP)',
    cause_en: 'College / School Institute Nodal Officer (INO) has not approved application before cutoff date.',
    cause_hi: 'स्कूल या कॉलेज के छात्रवृत्ति नोडल अधिकारी (INO) ने अंतिम तिथि से पूर्व सत्यापन नहीं किया।',
    action_en: 'Submit printed application copy to college scholarship cell. Urge principal to approve via INO login.',
    action_hi: 'कॉलेज के छात्रवृत्ति विभाग में प्रिंटआउट जमा करें और नोडल अधिकारी से तुरंत अप्रूव कराएं।'
  }
]

export default function Tools() {
  const { lang, t } = useLang()
  const isHi = lang === 'hi'

  // View state: 'grid' (all 5 tiles) or specific tool id ('dastavej', 'csc', 'karan', 'rti', 'dbt')
  const [activeTab, setActiveTab] = useState('dastavej')
  const [viewMode, setViewMode] = useState('focused') // 'grid' | 'focused'

  // 1. Dastavej Parakh State
  const [doc1Name, setDoc1Name] = useState('')
  const [doc2Name, setDoc2Name] = useState('')
  const [certType, setCertType] = useState('income')
  const [certDate, setCertDate] = useState('')
  const [docResult, setDocResult] = useState(null)

  const handleAuditDocs = (e) => {
    e.preventDefault()
    const nameEval = evaluateNameMatch(doc1Name, doc2Name)
    let certEval = null

    if (certDate) {
      const issue = new Date(certDate)
      const now = new Date()
      const diffMonths = (now.getFullYear() - issue.getFullYear()) * 12 + (now.getMonth() - issue.getMonth())

      if (certType === 'income') {
        const expired = diffMonths > 6
        certEval = {
          valid: !expired,
          status: expired ? 'expired' : 'valid',
          months: diffMonths,
          advice: expired
            ? (isHi ? 'आय प्रमाण पत्र 6 माह पुराना है। अधिकांश योजनाओं में नया प्रमाण पत्र अनिवार्य है।' : 'Income Certificate exceeds 6 months. High risk of rejection; please renew.')
            : (isHi ? 'आय प्रमाण पत्र वैध है।' : 'Income Certificate is within the standard 6-month validity window.')
        }
      } else if (certType === 'ews') {
        const expired = diffMonths > 12
        certEval = {
          valid: !expired,
          status: expired ? 'expired' : 'valid',
          advice: expired
            ? (isHi ? 'EWS प्रमाण पत्र केवल 1 वित्तीय वर्ष हेतु मान्य होता है।' : 'EWS certificate is valid for 1 Financial Year only. Renewal required.')
            : (isHi ? 'EWS प्रमाण पत्र वर्तमान सत्र हेतु मान्य है।' : 'EWS certificate is currently valid.')
        }
      } else {
        certEval = {
          valid: true,
          status: 'lifetime',
          advice: isHi ? 'जाति/निवास प्रमाण पत्र सामान्यतः स्थायी मान्य होते हैं।' : 'Caste and Domicile certificates are generally lifetime valid.'
        }
      }
    }

    setDocResult({ nameEval, certEval })
  }

  // 2. CSC Search State
  const [cscQuery, setCscQuery] = useState('')
  const filteredCsc = CSC_SERVICES.filter(s =>
    s.name_en.toLowerCase().includes(cscQuery.toLowerCase()) ||
    s.name_hi.includes(cscQuery) ||
    s.dept.toLowerCase().includes(cscQuery.toLowerCase())
  )

  // 3. Karan Khoj State
  const [rejectionQuery, setRejectionQuery] = useState('')
  const filteredCodes = REJECTION_CODES.filter(c =>
    c.code.toLowerCase().includes(rejectionQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(rejectionQuery.toLowerCase()) ||
    c.portal.toLowerCase().includes(rejectionQuery.toLowerCase())
  )

  // 4. RTI Escalator State
  const [rtiRefId, setRtiRefId] = useState('REF/YJL-2026')
  const [rtiDept, setRtiDept] = useState('Municipal Public Works Department')
  const [rtiArea, setRtiArea] = useState('Ward 12, Main Market')
  const [rtiGrievance, setRtiGrievance] = useState('Deep potholes on connecting road creating severe traffic congestion and accidents for over 30 days.')

  const printRti = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=920')
    if (!printWindow) return

    const html = `<!DOCTYPE html>
<html lang="${isHi ? 'hi' : 'en'}">
<head>
  <meta charset="utf-8"/>
  <title>RTI_Section_6_1_${rtiRefId.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #0f172a; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 20px; }
    .header h1 { font-size: 16px; margin: 0; text-transform: uppercase; }
    .header p { font-size: 11px; color: #475569; margin: 4px 0 0 0; }
    .stamp-box { float: right; border: 1.5px dashed #ea580c; padding: 10px 16px; font-size: 11px; text-align: center; color: #ea580c; font-weight: bold; border-radius: 4px; }
    .clear { clear: both; }
    .field { margin-bottom: 12px; font-size: 13px; }
    .demands { background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 20px; border-radius: 6px; font-size: 12.5px; margin: 16px 0; }
    .demands ol { margin: 0; padding-left: 20px; }
    .demands li { margin-bottom: 8px; }
    .signature { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
    .sign-box { border-top: 1px solid #64748b; width: 200px; text-align: center; padding-top: 6px; color: #475569; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: right; margin-bottom: 16px;">
    <button onclick="window.print()" style="background:#ea580c;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">
      ${isHi ? 'RTI आवेदन प्रिंट / सेव करें' : 'Print / Save RTI Application'}
    </button>
  </div>
  <div class="stamp-box">
    ${isHi ? 'कोर्ट फीस स्टाम्प ₹10<br/>(Court Fee Stamp)' : 'Court Fee Stamp ₹10<br/>Affix Here'}
  </div>
  <div class="clear"></div>

  <div class="header">
    <h1>${isHi ? 'सूचना का अधिकार अधिनियम, 2005 की धारा 6(1) के तहत आवेदन' : 'APPLICATION UNDER SECTION 6(1) OF THE RIGHT TO INFORMATION ACT, 2005'}</h1>
    <p>${isHi ? 'नागरिक सेवा अधिकार एवं सार्वजनिक शिकायत निवारण' : 'Citizen Charter & Public Grievance Escalation'}</p>
  </div>

  <div class="field">
    <strong>${isHi ? 'सेवा में (To):' : 'To:'}</strong><br/>
    ${isHi ? 'लोक सूचना अधिकारी (PIO)' : 'The Public Information Officer (PIO)'}<br/>
    ${rtiDept}<br/>
    ${rtiArea}
  </div>

  <div class="field">
    <strong>${isHi ? 'विषय:' : 'Subject:'}</strong> ${isHi 
      ? `लंबित नागरिक शिकायत (संदर्भ संख्या: ${rtiRefId}) पर हुई कार्रवाई की प्रमाणित जानकारी बाबत्।` 
      : `Information regarding daily action taken on un-resolved grievance Reference ID: ${rtiRefId}.`}
  </div>

  <div class="field">
    ${isHi 
      ? `महोदय / महोदया,<br/>मैंने दिनांक पर क्षेत्र <strong>${rtiArea}</strong> में निम्नलिखित नागरिक समस्या हेतु शिकायत दर्ज कराई थी:<br/><em>"${rtiGrievance}"</em><br/><br/>निर्धारित समय सीमा बीत जाने के उपरांत भी समस्या का निवारण नहीं हुआ है। अतः आरटीआई अधिनियम, 2005 के अंतर्गत निम्नलिखित प्रमाणित सूचना उपलब्ध कराएं:`
      : `Respected Sir/Madam,<br/>I had registered a civic grievance regarding: <em>"${rtiGrievance}"</em> for locality <strong>${rtiArea}</strong> (Reference ID: ${rtiRefId}). Despite expiry of citizen charter deadlines, the issue remains unresolved. Under Section 6(1) of RTI Act 2005, please furnish certified copies of the following:`}
  </div>

  <div class="demands">
    <ol>
      <li>${isHi ? 'उक्त शिकायत के पंजीकरण से लेकर आज तक की दैनिक प्रगति रिपोर्ट (Daily Progress Report) एवं फाइल मूवमेंट रजिस्टर की प्रमाणित प्रति।' : 'Certified daily progress report and file movement register from receipt of complaint to present date.'}</li>
      <li>${isHi ? 'उन अधिकारियों एवं कर्मचारियों के नाम व पदनाम जिनकी टेबल पर यह फाइल निर्धारित अवधि से अधिक समय तक लंबित रही।' : 'Names, designations, and official addresses of officers who held the file beyond the Citizen Charter limit.'}</li>
      <li>${isHi ? 'सिटिजन चार्टर की समयसीमा का उल्लंघन करने वाले जिम्मेदार कर्मियों पर की गई कार्रवाई का विवरण।' : 'Details of penalty or disciplinary accountability initiated for violation of public service delivery timelines.'}</li>
      <li>${isHi ? 'इस स्थल पर किए गए किसी भी फील्ड निरीक्षण, एस्टीमेट या कार्य आदेश (Work Order) की प्रमाणित छायाप्रति।' : 'Certified copies of field inspection notes, technical estimates, or work sanction orders prepared for this site.'}</li>
    </ol>
  </div>

  <div class="field" style="font-size:12px; color:#475569;">
    ${isHi 
      ? 'आवेदन शुल्क: ₹10 का पोस्टल ऑर्डर / कोर्ट फीस स्टाम्प संलग्न है। मैं भारत का नागरिक हूँ।'
      : 'Application Fee: ₹10 Court Fee Stamp / Postal Order attached. I confirm that I am a citizen of India.'}
  </div>

  <div class="signature">
    <div class="sign-box">
      ${isHi ? 'आवेदक के हस्ताक्षर / नाम' : 'Signature / Name of Applicant'}
    </div>
    <div class="sign-box">
      ${isHi ? 'दिनांक एवं संपर्क विवरण' : 'Date & Contact Details'}
    </div>
  </div>
  <script>window.onload = function() { setTimeout(function(){ window.print(); }, 350); };</script>
</body>
</html>`

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  // 5. DBT State
  const [dbtAadhaarLinked, setDbtAadhaarLinked] = useState(null)
  const [dbtNpciSeeded, setDbtNpciSeeded] = useState(null)
  const [dbtActive, setDbtActive] = useState(null)

  const printDbtBankLetter = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=920')
    if (!printWindow) return

    const html = `<!DOCTYPE html>
<html lang="${isHi ? 'hi' : 'en'}">
<head>
  <meta charset="utf-8"/>
  <title>Bank_DBT_NPCI_Application</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: -apple-system, sans-serif; line-height: 1.7; color: #0f172a; padding: 24px; font-size: 13px; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 16px; }
    .box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; border-radius: 6px; margin: 16px 0; }
  </style>
</head>
<body>
  <div style="text-align:right; margin-bottom: 12px;">
    <button onclick="window.print()" style="background:#ea580c;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">Print Letter</button>
  </div>
  <div class="header">
    <h2 style="margin:0; font-size: 16px; text-transform: uppercase;">
      ${isHi ? 'बैंक शाखा प्रबंधक को आवेदन: डीबीटी (DBT) हेतु NPCI आधार मैपिंग' : 'APPLICATION TO BRANCH MANAGER: NPCI AADHAAR SEEDING FOR DBT'}
    </h2>
  </div>
  <p>
    <strong>${isHi ? 'सेवा में (To):' : 'To:'}</strong><br/>
    ${isHi ? 'शाखा प्रबंधक महोदय,' : 'The Branch Manager,'}<br/>
    ${isHi ? '[बैंक का नाम एवं शाखा]' : '[Name of Bank & Branch]'}<br/>
  </p>
  <p>
    <strong>${isHi ? 'विषय:' : 'Subject:'}</strong> 
    ${isHi ? 'सरकारी छात्रवृत्ति / किसान सम्मान निधि / डीबीटी सब्सिडी प्राप्त करने हेतु खाते को NPCI से जोड़ने बाबत।' : 'Request for NPCI Aadhaar Mapping under Aadhaar Payment Bridge (APB) for receiving Govt DBT.'}
  </p>
  <p>
    ${isHi 
      ? 'महोदय,<br/>मेरा बचत खाता संख्या _________________ आपकी शाखा में संचालित है। मुझे केंद्र/राज्य सरकार की कल्याणकारी योजनाओं (PM-KISAN/छात्रवृत्ति/पेंशन) का लाभ प्राप्त करने हेतु अपने बैंक खाते को NPCI मैपर (DBT Enabled) से लिंक कराना है।'
      : 'Respected Sir/Madam,<br/>I hold a savings account (A/c No: _________________) in your branch. In order to receive Direct Benefit Transfer (DBT) subsidies for welfare schemes/scholarships, I request you to link my bank account to the NPCI Aadhaar Mapper under APBS.'}
  </p>
  <div class="box">
    <strong>${isHi ? 'संलग्न दस्तावेज़:' : 'Enclosed Documents:'}</strong><br/>
    1. ${isHi ? 'स्वप्रमाणित आधार कार्ड की छायाप्रति' : 'Self-attested photocopy of Aadhaar Card'}<br/>
    2. ${isHi ? 'बैंक पासबुक के प्रथम पृष्ठ की छायाप्रति' : 'Photocopy of first page of Bank Passbook'}<br/>
    3. ${isHi ? 'हस्ताक्षरित NPCI सहमति फॉर्म (Consent Form)' : 'Signed NPCI Seeding Mandate'}
  </div>
  <p style="margin-top: 40px;">
    ${isHi ? 'भवदीय / भवदीया:' : 'Yours faithfully,'}<br/><br/>
    ${isHi ? 'हस्ताक्षर:' : 'Signature:'} ____________________<br/>
    ${isHi ? 'नाम:' : 'Name:'} ____________________<br/>
    ${isHi ? 'मोबाइल नंबर:' : 'Mobile No:'} ____________________
  </p>
  <script>window.onload = function() { setTimeout(function(){ window.print(); }, 300); };</script>
</body>
</html>`

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const toolDefinitions = [
    {
      id: 'dastavej',
      icon: <FileCheck2 className="text-saffron" size={24} />,
      title_en: 'Document Auditor',
      title_hi: 'दस्तावेज़ परख (नाम व वैधता)',
      desc: isHi ? 'आधार, बैंक पासबुक और प्रमाण पत्र में नाम की वर्तनी एवं 6 माह की वैधता जांचें।' : 'Check spelling variations across Aadhaar, bank passbook, and 6-month validity before applying.',
      tag: 'Pre-Check',
    },
    {
      id: 'csc',
      icon: <IndianRupee className="text-emerald-verified" size={24} />,
      title_en: 'CSC Official Rate Card',
      title_hi: 'सीएससी आधिकारिक दर सूची',
      desc: isHi ? 'सरकारी राजपत्र द्वारा तय आधिकारिक शुल्क। अवैध वसूली व दलाली से बचें।' : 'Official gazette fee rates for Aadhaar, Ayushman & certificates. Anti-overcharging protection.',
      tag: 'Anti-Fraud',
    },
    {
      id: 'karan',
      icon: <HelpCircle className="text-info" size={24} />,
      title_en: 'Rejection Decrypter',
      title_hi: 'कारण खोज (अस्वीकृति कोड)',
      desc: isHi ? 'PFMS, PM-KISAN, व NPCI एरर कोड दर्ज करें और 3-स्टेप समाधान पाएं।' : 'Decode cryptic PFMS, DBT, and banking rejection codes into plain 3-step action recipes.',
      tag: 'Fix Errors',
    },
    {
      id: 'rti',
      icon: <Scale className="text-amber-warn" size={24} />,
      title_en: 'Auto-RTI Escalator',
      title_hi: 'आरटीआई (RTI) याचिका',
      desc: isHi ? '15+ दिन से लंबित नागरिक शिकायतों पर धारा 6(1) कानूनी सूचना पत्र बनाएं।' : 'Generate legally binding Section 6(1) RTI applications for neglected civic grievances.',
      tag: 'Legal Action',
    },
    {
      id: 'dbt',
      icon: <Building className="text-emerald-verified" size={24} />,
      title_en: 'DBT Bank Readiness',
      title_hi: 'डीबीटी (DBT) बैंक जांच',
      desc: isHi ? 'जांचें कि खाता NPCI मैपर पर सक्रिय है और बैंक शाखा पत्र प्रिंट करें।' : 'Interactive 3-step stepper test for NPCI mapper seeding and print letter to branch manager.',
      tag: 'Banking',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            {t.tools?.title || 'Citizen Civic Toolkit (नागरिक सुविधा केंद्र)'}
          </h1>
          <span className="text-xs px-3 py-1 rounded-full bg-saffron-tint text-saffron font-bold border border-saffron/30">
            5-in-1 Citizen Suite
          </span>
        </div>
        <p className="text-xs sm:text-sm text-muted max-w-3xl leading-relaxed">
          {t.tools?.subtitle || 'Essential tools solving critical ground-level administrative roadblocks for Indian citizens.'}
        </p>
      </div>

      {/* 5-Tile Grid (2-column on mobile, 3/5 on desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {toolDefinitions.map((tool) => {
          const isCurrent = activeTab === tool.id
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => {
                setActiveTab(tool.id)
                setViewMode('focused')
              }}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer shadow-card ${
                isCurrent
                  ? 'bg-surface border-saffron ring-2 ring-saffron/20'
                  : 'bg-surface border-border hover:border-saffron/40 hover:shadow-md'
              }`}
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-border flex items-center justify-center">
                  {tool.icon}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    {tool.tag}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-navy leading-snug mt-0.5">
                    {isHi ? tool.title_hi : tool.title_en}
                  </h3>
                </div>
                <p className="text-[11px] text-muted line-clamp-2 leading-relaxed hidden sm:block">
                  {tool.desc}
                </p>
              </div>

              <div className="pt-2 mt-2 border-t border-border flex items-center justify-between text-[11px] font-bold text-saffron">
                <span>{isCurrent ? 'Viewing' : 'Open Tool'}</span>
                <ArrowRight size={12} />
              </div>
            </button>
          )
        })}
      </div>

      {/* Focused Single-Task View with Back Button */}
      <div className="space-y-6">
        {/* Focused view top navigation bar */}
        <div className="flex items-center justify-between bg-surface p-3.5 rounded-2xl border border-border shadow-2xs">
          <button
            type="button"
            onClick={() => {
              // Cycle to next tool or keep view
              window.scrollTo({ top: 120, behavior: 'smooth' })
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-navy"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-saffron" />
            <span>Active Tool: {toolDefinitions.find(t => t.id === activeTab)?.title_en}</span>
          </button>

          <span className="text-xs text-muted font-medium hidden sm:inline">
            Official Civic Helper & Statutory Guidelines
          </span>
        </div>

        {/* ─── TAB 1: DASTAVEJ PARAKH ────────────────────────────────────────── */}
        {activeTab === 'dastavej' && (
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-6">
            <div>
              <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                <FileCheck2 className="text-saffron" size={22} />
                <span>{isHi ? 'दस्तावेज़ परख (नाम व वैधता परीक्षक)' : 'Dastavej Parakh — Document Mismatch & Expiry Auditor'}</span>
              </h2>
              <p className="text-xs text-muted mt-1">
                {isHi 
                  ? 'आवेदन से पूर्व अपने आधार, बैंक पासबुक और प्रमाण पत्र में नाम की वर्तनी एवं 6 माह की वैधता जांचें।'
                  : 'Prevent the #1 reason for scheme rejections: check spelling variations across documents and certificate expiry dates before applying.'}
              </p>
            </div>

            <form onSubmit={handleAuditDocs} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy">
                  {isHi ? 'दस्तावेज़ 1: आधार कार्ड पर नाम' : 'Document 1: Name on Aadhaar Card'}
                </label>
                <input
                  type="text"
                  value={doc1Name}
                  onChange={e => setDoc1Name(e.target.value)}
                  placeholder="e.g. Ramesh Kumar Sharma"
                  className="w-full text-xs sm:text-sm p-3 border border-border rounded-xl focus-visible:outline-3 focus-visible:outline-saffron focus-visible:outline-offset-2 transition-all bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy">
                  {isHi ? 'दस्तावेज़ 2: बैंक पासबुक / राशन कार्ड पर नाम' : 'Document 2: Name on Bank Passbook / Ration Card'}
                </label>
                <input
                  type="text"
                  value={doc2Name}
                  onChange={e => setDoc2Name(e.target.value)}
                  placeholder="e.g. Ramesh K Sharma"
                  className="w-full text-xs sm:text-sm p-3 border border-border rounded-xl focus-visible:outline-3 focus-visible:outline-saffron focus-visible:outline-offset-2 transition-all bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy">
                  {isHi ? 'प्रमाण पत्र का प्रकार' : 'Certificate Type'}
                </label>
                <select
                  value={certType}
                  onChange={e => setCertType(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 border border-border rounded-xl focus-visible:outline-3 focus-visible:outline-saffron focus-visible:outline-offset-2 transition-all bg-white"
                >
                  <option value="income">{isHi ? 'आय प्रमाण पत्र (Income Certificate - 6 Mo Validity)' : 'Income Certificate (6-Month Validity)'}</option>
                  <option value="ews">{isHi ? 'EWS प्रमाण पत्र (EWS Certificate - 1 FY Validity)' : 'EWS Certificate (1 Financial Year)'}</option>
                  <option value="caste">{isHi ? 'जाति प्रमाण पत्र (Caste Certificate)' : 'Caste Certificate'}</option>
                  <option value="domicile">{isHi ? 'निवास प्रमाण पत्र (Domicile / Resident)' : 'Domicile / Resident Certificate'}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy">
                  {isHi ? 'प्रमाण पत्र जारी होने का दिनांक' : 'Certificate Issue Date'}
                </label>
                <input
                  type="date"
                  value={certDate}
                  onChange={e => setCertDate(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 border border-border rounded-xl focus-visible:outline-3 focus-visible:outline-saffron focus-visible:outline-offset-2 transition-all bg-white"
                />
              </div>

              <div className="md:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={!doc1Name && !doc2Name && !certDate}
                  className="px-6 py-3 rounded-xl bg-saffron hover:bg-saffron-hover disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer min-h-[48px]"
                >
                  <ShieldCheck size={16} />
                  <span>{isHi ? 'दस्तावेज़ मिलान एवं वैधता जांचें' : 'Audit Document Match & Expiry'}</span>
                </button>
              </div>
            </form>

            {/* Audit Result */}
            {docResult && (
              <div className="border border-border rounded-2xl p-5 bg-slate-50 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  {isHi ? 'सत्यापन परिणाम (Audit Report)' : 'Document Audit Report'}
                </h3>

                {/* Name Score */}
                <div className="bg-white border border-border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-navy">
                        {isHi ? 'नाम मिलान विश्वसनीयता:' : 'Name Match Confidence:'}
                      </span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        docResult.nameEval.score >= 90
                          ? 'bg-emerald-tint text-emerald-verified border border-emerald-verified/30'
                          : docResult.nameEval.score >= 70
                          ? 'bg-amber-tint text-amber-warn border border-amber-warn/30'
                          : 'bg-danger-tint text-danger border border-danger/30'
                      }`}>
                        {docResult.nameEval.score}% Match
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{docResult.nameEval.note}</p>
                  </div>

                  {docResult.nameEval.score >= 80 ? (
                    <CheckCircle2 size={24} className="text-emerald-verified shrink-0" />
                  ) : (
                    <AlertTriangle size={24} className="text-danger shrink-0" />
                  )}
                </div>

                {/* Certificate Expiry Result */}
                {docResult.certEval && (
                  <div className={`p-4 rounded-xl border ${
                    docResult.certEval.valid
                      ? 'bg-emerald-tint text-emerald-verified border-emerald-verified/30'
                      : 'bg-danger-tint text-danger border-danger/30'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-xs">
                      {docResult.certEval.valid ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      <span>
                        {docResult.certEval.valid
                          ? (isHi ? 'प्रमाण पत्र वैध है' : 'Certificate is Currently Valid')
                          : (isHi ? 'प्रमाण पत्र अवधि समाप्त (Expired)' : 'Certificate Expired')}
                      </span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">{docResult.certEval.advice}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: CSC OFFICIAL RATE CARD ─────────────────────────────────── */}
        {activeTab === 'csc' && (
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <IndianRupee className="text-emerald-verified" size={22} />
                  <span>{isHi ? 'सीएससी एवं सेवा केंद्र आधिकारिक दर सूची' : 'Official CSC & Seva Kendra Fee Rate Card'}</span>
                </h2>
                <p className="text-xs text-muted mt-1">
                  {isHi 
                    ? 'सरकारी राजपत्र द्वारा निर्धारित आधिकारिक शुल्क। किसी भी दलाल को अतिरिक्त राशि न दें।' 
                    : 'Official government gazette rates for public services. Overcharging by cyber cafes or agents is illegal.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://findmycsc.nic.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-xs font-bold text-navy hover:bg-slate-50 transition-colors bg-white shadow-2xs"
                >
                  <span>{isHi ? 'नज़दीकी CSC खोजें' : 'Locate CSC Kendra'}</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Anti-Corruption 1064 Helpline as Highlighted Pill */}
            <div className="bg-amber-tint border border-amber-warn/40 rounded-2xl p-4 text-xs text-navy flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="text-amber-warn shrink-0" size={18} />
                <div>
                  <p className="font-bold text-amber-warn">
                    {isHi ? 'अवैध वसूली के विरुद्ध आधिकारिक सतर्कता' : 'Anti-Overcharging Citizen Protection'}
                  </p>
                  <p className="text-muted text-[11px] leading-tight">
                    {isHi ? 'अधिक शुल्क मांगने पर तुरंत रिपोर्ट करें' : 'Operators charging extra commit a statutory offense.'}
                  </p>
                </div>
              </div>

              {/* 1064 Helpline Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-danger text-white text-xs font-extrabold shadow-xs shrink-0">
                <PhoneCall size={14} />
                <span>Anti-Corruption Helpline: 1064 / 1915</span>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-muted" size={16} />
              <input
                type="text"
                value={cscQuery}
                onChange={e => setCscQuery(e.target.value)}
                placeholder={isHi ? 'सेवा या विभाग खोजें (जैसे आधार, आयुष्मान, ई-श्रम)...' : 'Filter by service or department (e.g. Aadhaar, Ayushman, PM-KISAN)...'}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-border rounded-xl focus-visible:outline-3 focus-visible:outline-saffron focus-visible:outline-offset-2 transition-all bg-white"
              />
            </div>

            {/* Clean Rates Table */}
            <div className="border border-border rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-border text-muted font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Service / सेवा</th>
                    <th className="p-4">Official Fee / वैध शुल्क</th>
                    <th className="p-4">Department</th>
                    <th className="p-4 hidden sm:table-cell">Statutory Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-navy">
                  {filteredCsc.map((svc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-bold text-navy">
                        {isHi ? svc.name_hi : svc.name_en}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full font-bold text-xs inline-block border ${
                          svc.free
                            ? 'bg-emerald-tint text-emerald-verified border-emerald-verified/30'
                            : 'bg-info-tint text-info border-info/30'
                        }`}>
                          {svc.official_fee}
                        </span>
                      </td>
                      <td className="p-4 text-muted font-medium">{svc.dept}</td>
                      <td className="p-4 text-muted text-[11px] hidden sm:table-cell">{svc.rule}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 3: KARAN KHOJ (REJECTION CODE DECRYPTER) ──────────────────── */}
        {activeTab === 'karan' && (
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-6">
            <div>
              <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                <HelpCircle className="text-info" size={22} />
                <span>{isHi ? 'कारण खोज — अस्वीकृति कोड व समाधान' : 'Karan Khoj — Rejection Code Decrypter'}</span>
              </h2>
              <p className="text-xs text-muted mt-1">
                {isHi 
                  ? 'पोर्टल पर मिला एरर कोड या एसएमएस दर्ज करें और जानें कि आपकी राशि या आवेदन क्यों रुका और उसे कैसे ठीक करें।'
                  : 'Decode cryptic PFMS, PM-KISAN, and DBT portal error messages into plain English/Hindi with a 3-step action recipe.'}
              </p>
            </div>

            {/* Quick example code chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted font-bold mr-1">Example codes:</span>
              {['PFMS-02', 'NPCI-MAPPER-FAILED', 'LAND-KHASRA-MISMATCH', 'IFSC-INVALID-MERGED', 'EKYC-BIO-MISMATCH'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setRejectionQuery(c)}
                  className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-saffron-tint hover:border-saffron/40 hover:text-saffron text-navy font-mono text-[11px] transition-all border border-border font-semibold cursor-pointer"
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-muted" size={16} />
              <input
                type="text"
                value={rejectionQuery}
                onChange={e => setRejectionQuery(e.target.value)}
                placeholder="Type rejection error code or keyword (e.g. PFMS, biometric, dormant, NPCI)..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-border rounded-xl focus-visible:outline-3 focus-visible:outline-saffron focus-visible:outline-offset-2 transition-all bg-white"
              />
            </div>

            {/* Results card "Why it happened / 3 steps to fix" */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCodes.map((item, idx) => (
                <div key={idx} className="border border-border rounded-2xl p-5 bg-white space-y-3 shadow-2xs hover:shadow-card transition-all">
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
                    <span className="font-mono text-xs font-bold text-saffron bg-saffron-tint px-2.5 py-1 rounded-lg border border-saffron/30">
                      {item.code}
                    </span>
                    <span className="text-[11px] text-muted font-semibold truncate max-w-[150px]">
                      {item.portal}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-navy">{item.name}</h4>
                    <p className="text-xs text-navy mt-1.5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-border">
                      <strong className="text-amber-warn">{isHi ? 'कारण (Why it happened):' : 'Why it happened:'}</strong> {isHi ? item.cause_hi : item.cause_en}
                    </p>
                  </div>

                  <div className="bg-emerald-tint/70 border border-emerald-verified/30 rounded-xl p-3 text-xs text-emerald-verified leading-relaxed">
                    <strong className="font-bold">{isHi ? '3-कदम समाधान (Action Steps):' : '3-Step Action Plan:'}</strong>{' '}
                    <span className="text-navy">{isHi ? item.action_hi : item.action_en}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 4: AUTO-RTI ESCALATOR ─────────────────────────────────────── */}
        {activeTab === 'rti' && (
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <Scale className="text-amber-warn" size={22} />
                  <span>{isHi ? '1-क्लिक आरटीआई (RTI) याचिका प्रारूपक' : '1-Click Auto-RTI Petition Escalator'}</span>
                </h2>
                <p className="text-xs text-muted mt-1">
                  {isHi 
                    ? 'यदि आपकी शिकायत 15-30 दिन से अधिक समय से लंबित है, तो सूचना का अधिकार अधिनियम की धारा 6(1) के तहत कानूनी याचिका तैयार करें।'
                    : 'When municipal complaints are ignored beyond citizen charter deadlines, generate a Section 6(1) Right to Information legal demand.'}
                </p>
              </div>

              <button
                type="button"
                onClick={printRti}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-saffron hover:bg-saffron-hover text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
              >
                <Printer size={15} />
                <span>{isHi ? 'RTI आवेदन प्रिंट / PDF' : 'Download RTI Petition PDF'}</span>
              </button>
            </div>

            <div className="bg-amber-tint/80 border border-amber-warn/40 rounded-xl p-4 text-xs text-navy flex items-start gap-2.5">
              <Scale size={18} className="text-amber-warn shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-warn">{isHi ? 'कानूनी शक्ति: धारा 6(1) आरटीआई कानून 2005' : 'Legal Authority: Section 6(1) of RTI Act 2005'}</p>
                <p className="opacity-90 leading-relaxed mt-0.5">
                  {isHi 
                    ? 'अधिकारियों को 30 दिनों के भीतर दैनिक फाइल रिकॉर्ड और देरी का लिखित कारण देना कानूनी रूप से अनिवार्य है। ₹10 की कोर्ट फीस स्टाम्प लगाएं।'
                    : 'Public Information Officers are legally mandated to reply within 30 days. Affix a ₹10 Court Fee Stamp or Postal Order.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy">Complaint Reference ID</label>
                <input
                  type="text"
                  value={rtiRefId}
                  onChange={e => setRtiRefId(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 border border-border rounded-xl outline-none focus-visible:outline-3 focus-visible:outline-saffron bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy">Addressed Department / Authority</label>
                <input
                  type="text"
                  value={rtiDept}
                  onChange={e => setRtiDept(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 border border-border rounded-xl outline-none focus-visible:outline-3 focus-visible:outline-saffron bg-white"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-navy">Location / Ward / City</label>
                <input
                  type="text"
                  value={rtiArea}
                  onChange={e => setRtiArea(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 border border-border rounded-xl outline-none focus-visible:outline-3 focus-visible:outline-saffron bg-white"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-navy">Grievance Summary</label>
                <textarea
                  rows={2}
                  value={rtiGrievance}
                  onChange={e => setRtiGrievance(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 border border-border rounded-xl outline-none focus-visible:outline-3 focus-visible:outline-saffron bg-white"
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-border rounded-xl p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Live Legal Draft Preview</span>
              <p className="text-xs text-navy font-mono leading-relaxed">
                Subject: Information under RTI Act 2005 regarding inaction on Grievance #{rtiRefId} at {rtiArea}.<br/>
                Demand: Certified copies of Daily Progress Report, File Movement Register, and names of officers who withheld the file beyond statutory delivery timelines.
              </p>
            </div>
          </div>
        )}

        {/* ─── TAB 5: DBT BANK HEALTH CHECK (STEPPER UI) ────────────────────── */}
        {activeTab === 'dbt' && (
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <Building className="text-emerald-verified" size={22} />
                  <span>{isHi ? 'डीबीटी (DBT) बैंक खाता तत्परता जांच' : 'DBT Bank Account Readiness & Branch Letter'}</span>
                </h2>
                <p className="text-xs text-muted mt-1">
                  {isHi 
                    ? 'जांचें कि आपका बैंक खाता सरकारी सब्सिडी और छात्रवृत्ति प्राप्त करने हेतु सक्षम है या नहीं, एवं बैंक प्रबंधक हेतु आवेदन पत्र बनाएं।'
                    : 'Check if your bank account is mapped on NPCI to receive direct benefit transfers without bounce-backs.'}
                </p>
              </div>

              <button
                type="button"
                onClick={printDbtBankLetter}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-verified hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
              >
                <Printer size={15} />
                <span>{isHi ? 'बैंक प्रबंधक पत्र प्रिंट / PDF' : 'Print Bank Manager Letter'}</span>
              </button>
            </div>

            {/* Diagnostic Stepper UI */}
            <div className="space-y-5 border border-border rounded-2xl p-5 sm:p-6 bg-slate-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                3-Step Diagnostic Stepper
              </h3>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-border shadow-2xs">
                  <div className="flex items-start gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      dbtAadhaarLinked === true ? 'bg-emerald-verified text-white' : dbtAadhaarLinked === false ? 'bg-danger text-white' : 'bg-slate-200 text-navy'
                    }`}>
                      1
                    </span>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-navy">
                        Is your Aadhaar linked to your bank account?
                      </p>
                      <p className="text-[11px] text-muted">Core KYC requirement at your bank branch</p>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setDbtAadhaarLinked(true)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        dbtAadhaarLinked === true ? 'bg-emerald-verified text-white shadow-xs' : 'bg-slate-100 text-navy hover:bg-slate-200'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setDbtAadhaarLinked(false)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        dbtAadhaarLinked === false ? 'bg-danger text-white shadow-xs' : 'bg-slate-100 text-navy hover:bg-slate-200'
                      }`}
                    >
                      No / Not Sure
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-border shadow-2xs">
                  <div className="flex items-start gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      dbtNpciSeeded === true ? 'bg-emerald-verified text-white' : dbtNpciSeeded === false ? 'bg-danger text-white' : 'bg-slate-200 text-navy'
                    }`}>
                      2
                    </span>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-navy">
                        Is this bank account specifically seeded on the NPCI DBT Mapper?
                      </p>
                      <p className="text-[11px] text-muted">Mandate for receiving PM-KISAN, NSP scholarships, or Ladli Behna</p>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setDbtNpciSeeded(true)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        dbtNpciSeeded === true ? 'bg-emerald-verified text-white shadow-xs' : 'bg-slate-100 text-navy hover:bg-slate-200'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setDbtNpciSeeded(false)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        dbtNpciSeeded === false ? 'bg-danger text-white shadow-xs' : 'bg-slate-100 text-navy hover:bg-slate-200'
                      }`}
                    >
                      No / Not Sure
                    </button>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-border shadow-2xs">
                  <div className="flex items-start gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      dbtActive === true ? 'bg-emerald-verified text-white' : dbtActive === false ? 'bg-danger text-white' : 'bg-slate-200 text-navy'
                    }`}>
                      3
                    </span>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-navy">
                        Have you done any cash deposit/withdrawal in the last 6 months?
                      </p>
                      <p className="text-[11px] text-muted">Accounts without transactions become dormant (PFMS-02 rejection)</p>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setDbtActive(true)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        dbtActive === true ? 'bg-emerald-verified text-white shadow-xs' : 'bg-slate-100 text-navy hover:bg-slate-200'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setDbtActive(false)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        dbtActive === false ? 'bg-danger text-white shadow-xs' : 'bg-slate-100 text-navy hover:bg-slate-200'
                      }`}
                    >
                      No (May be Dormant)
                    </button>
                  </div>
                </div>
              </div>

              {/* Score & Evaluation */}
              {(dbtAadhaarLinked !== null || dbtNpciSeeded !== null || dbtActive !== null) && (
                <div className="mt-4 p-5 rounded-2xl border bg-white space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-navy">DBT Readiness Verdict:</span>
                    {dbtAadhaarLinked && dbtNpciSeeded && dbtActive ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-tint text-emerald-verified border border-emerald-verified/30">
                        100% Ready for Subsidies
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-danger-tint text-danger border border-danger/30">
                        Action Required — Risk of Payment Bounce
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted leading-relaxed">
                    {dbtAadhaarLinked && dbtNpciSeeded && dbtActive
                      ? (isHi ? 'आपका खाता डीबीटी योजनाओं (पीएम-किसान, छात्रवृत्ति आदि) के लिए पूर्णतः तैयार है।' : 'Your account is ready to receive direct welfare subsidies without blockage.')
                      : (isHi ? 'आपका खाता NPCI मैपर पर लिंक नहीं है या निष्क्रिय हो सकता है। कृपया ऊपर "बैंक प्रबंधक पत्र प्रिंट" पर क्लिक कर बैंक में आवेदन जमा करें।' : 'Click the button above to print the pre-filled application letter to your Branch Manager requesting NPCI Aadhaar seeding.')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Disclaimer />
    </div>
  )
}
