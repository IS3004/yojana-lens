/**
 * YojanaLens - Official Citizen Grievance PDF & Print Generator
 * Produces clean, official-format petition letterheads ready for municipal office submission.
 * Native browser print-to-vector-PDF ensures 100% Devanagari (Hindi) and English font fidelity.
 */

export function printPetitionPdf(complaint, lang = 'en') {
  if (!complaint) return

  const isHi = lang === 'hi'
  const dateStr = new Date(complaint.created_at || Date.now()).toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const rawId = complaint.id || '00000000'
  const refId = `REF/YJL-${rawId.slice(0, 8).toUpperCase()}`

  const printWindow = window.open('', '_blank', 'width=880,height=960')
  if (!printWindow) {
    alert(isHi ? 'कृपया पीडीएफ डाउनलोड करने के लिए पॉप-अप की अनुमति दें' : 'Please allow pop-ups to download or print the official petition.')
    return
  }

  const html = `<!DOCTYPE html>
<html lang="${isHi ? 'hi' : 'en'}">
<head>
  <meta charset="utf-8" />
  <title>YojanaLens_Petition_${rawId.slice(0, 8)}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Nirmala UI", "Noto Sans Devanagari", sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.6;
      margin: 0;
      padding: 24px;
    }
    .no-print {
      margin-bottom: 20px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .print-btn {
      background: #ea580c;
      color: #ffffff;
      border: none;
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .print-btn:hover {
      background: #c2410c;
    }
    .letterhead {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 28px;
      background: #ffffff;
    }
    .top-bar {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .top-bar h1 {
      font-size: 18px;
      margin: 0 0 3px 0;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .top-bar .subtitle {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
    }
    .ref-badge {
      background: #f1f5f9;
      border: 1px solid #94a3b8;
      padding: 5px 12px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      text-align: right;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      font-size: 12px;
    }
    .meta-table td {
      padding: 8px 14px;
      border: 1px solid #e2e8f0;
    }
    .meta-label {
      font-weight: 700;
      color: #475569;
      width: 130px;
      background: #f1f5f9;
    }
    .meta-val {
      color: #0f172a;
      font-weight: 600;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
      margin: 18px 0 8px 0;
    }
    .petition-content {
      background: #fafafa;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 20px;
      font-size: 12.5px;
      line-height: 1.8;
      color: #0f172a;
      white-space: pre-wrap;
      font-family: inherit;
    }
    .signature-row {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .sign-box {
      width: 220px;
      border-top: 1.5px dashed #64748b;
      padding-top: 8px;
      font-size: 11px;
      color: #475569;
      text-align: center;
      font-weight: 600;
    }
    .disclaimer-strip {
      margin-top: 36px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
      line-height: 1.4;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .letterhead {
        border: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
      ${isHi ? 'पीडीएफ सेव करें / प्रिंट करें' : 'Save as PDF / Print Petition'}
    </button>
  </div>

  <div class="letterhead">
    <div class="top-bar">
      <div>
        <h1>${isHi ? 'नागरिक प्रशासनिक शिकायत याचिका' : 'Official Citizen Grievance Petition'}</h1>
        <div class="subtitle">
          ${isHi ? 'योजनालेंस प्रशासनिक प्रारूपण प्रणाली · आधिकारिक नागरिक प्रति' : 'YojanaLens Administrative Drafting Tool · Official Citizen Copy'}
        </div>
      </div>
      <div class="ref-badge">
        ${refId}
      </div>
    </div>

    <table class="meta-table">
      <tr>
        <td class="meta-label">${isHi ? 'पंजीकरण दिनांक' : 'Filing Date'}</td>
        <td class="meta-val">${dateStr}</td>
        <td class="meta-label">${isHi ? 'प्राथमिकता श्रेणी' : 'Category'}</td>
        <td class="meta-val">${(complaint.category || 'Civic').toUpperCase()}</td>
      </tr>
      <tr>
        <td class="meta-label">${isHi ? 'स्थान / वार्ड' : 'Jurisdiction / Area'}</td>
        <td class="meta-val">${complaint.location || 'N/A'}</td>
        <td class="meta-label">${isHi ? 'गंभीरता स्तर' : 'Severity Priority'}</td>
        <td class="meta-val">${(complaint.severity || 'Medium').toUpperCase()} PRIORITY</td>
      </tr>
      <tr>
        <td class="meta-label">${isHi ? 'सक्षम प्राधिकारी' : 'Addressed To'}</td>
        <td class="meta-val" colspan="3">${complaint.department || 'Competent Municipal Authority'}</td>
      </tr>
    </table>

    <div class="section-title">
      ${isHi ? 'औपचारिक प्रशासनिक याचिका का प्रारूप' : 'Formal Administrative Petition Draft'}
    </div>

    <div class="petition-content">${complaint.formal_draft || complaint.text}</div>

    <div class="signature-row">
      <div class="sign-box">
        ${isHi ? 'शिकायतकर्ता के हस्ताक्षर / अंगूठे का निशान' : 'Signature / Thumb Impression of Citizen'}
      </div>
      <div class="sign-box">
        ${isHi ? 'कार्यालय पावती (मुहर एवं दिनांक)' : 'Municipal Office Receiving Stamp & Date'}
      </div>
    </div>

    <div class="disclaimer-strip">
      ${isHi 
        ? 'प्रारूपण सूचना: यह नागरिक याचिका योजनालेंस प्रशासनिक प्रणाली द्वारा जनहित में प्रारूपित की गई है। यह सक्षम सरकारी/नगर निगम कार्यालय में प्रस्तुत करने हेतु वैध प्रारूप है।'
        : 'Notice: This formal grievance petition was drafted via the YojanaLens Civic Redressal Assistant. Standard citizen format for submission to the designated municipal or district public administration office.'}
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
