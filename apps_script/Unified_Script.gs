// --- CONFIGURATION ---
const SURECART_API_KEY = 'st_osM4jFpCRxrfuP7rrPCYsc4i'; 
const SHEET_NAME = 'Sheet1';
// ---------------------

function doPost(e) {
  const ss = SpreadsheetApp.openById('1jbSOKSfX6I0vMwiiSJiuHOtmhK_ozJ0L6yO11xppKlQ');
  
  // Standard response for webhooks and CORS
  const response = ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  try {
    let payloadStr = e.postData.contents;
    let payload = {};
    try {
        payload = JSON.parse(payloadStr);
    } catch(e) {
        return response; // Not valid JSON
    }

    // 0. ADMIN PLAN (/admin/plan): merge calendar events + reels into the 'Plan' sheet
    if (payload.action === 'savePlan') {
        const lock = LockService.getScriptLock();
        lock.waitLock(20000);
        try {
            const merged = mergePlanStates(readPlanState(ss), payload.plan || {});
            writePlanState(ss, merged);
            return ContentService.createTextOutput(JSON.stringify({ status: "success", plan: merged }))
              .setMimeType(ContentService.MimeType.JSON);
        } finally {
            lock.releaseLock();
        }
    }

    // 1. ADMIN PANEL: SYNC ENTIRE SHEET (Edit mode save)
    if (payload.action === 'syncSheet') {
        const rawData = payload.data;
        if (!rawData || !Array.isArray(rawData) || rawData.length <= 1) {
            return ContentService.createTextOutput(JSON.stringify({ 
                status: "error", 
                message: "Odbijeno: Pokušaj brisanja svih podataka! Tablica ne može biti prazna." 
            })).setMimeType(ContentService.MimeType.JSON);
        }

        const mainSheet = ss.getSheetByName('Sheet1');
        
        // Auto-backup existing data to Sheet1_AutoBackup before overwriting
        try {
            const existingData = mainSheet.getDataRange().getValues();
            if (existingData && existingData.length > 1) {
                const backupSheet = ss.getSheetByName('Sheet1_AutoBackup') || ss.insertSheet('Sheet1_AutoBackup');
                backupSheet.clearContents();
                backupSheet.getRange(1, 1, existingData.length, existingData[0].length).setValues(existingData);
            }
        } catch(backupErr) {
            Logger.log("Backup error: " + backupErr);
        }

        // Guard: a save may only blank cells the admin cleared by hand and drop rows the admin deleted.
        // Filled cells that arrive blank are kept, and rows missing from the payload (e.g. orders that
        // came in after the admin page loaded) are appended back.
        try {
            const existingRows = mainSheet.getDataRange().getDisplayValues().slice(1)
                .filter(function(r) { return r[0] && String(r[0]).indexOf('###GROUP###') !== 0; });
            const cleared = {};
            (payload.explicitClears || []).forEach(function(k) { cleared[String(k)] = true; });
            const deleted = {};
            (payload.deletedIds || []).forEach(function(id) { deleted[String(id)] = true; });

            // Duplicate Order IDs exist, so match rows by id + occurrence number
            const keysOf = function(rows) {
                const seen = {};
                return rows.map(function(r) {
                    const id = String(r && r[0] !== undefined && r[0] !== null ? r[0] : '');
                    seen[id] = (seen[id] || 0) + 1;
                    return id + '#' + seen[id];
                });
            };
            const existingKeys = keysOf(existingRows);
            const existingByKey = {};
            existingKeys.forEach(function(k, i) { existingByKey[k] = existingRows[i]; });

            const incoming = rawData.slice(1);
            const incomingKeys = keysOf(incoming);
            const incomingKeySet = {};
            incomingKeys.forEach(function(k, i) {
                incomingKeySet[k] = true;
                const old = existingByKey[k];
                const row = incoming[i];
                if (!old || !row) return;
                for (let c = 1; c <= 5; c++) {
                    const had = String(old[c] || '').trim();
                    const now = String(row[c] !== undefined && row[c] !== null ? row[c] : '').trim();
                    if (had && !now && !cleared[row[0] + '|' + c]) row[c] = old[c];
                }
            });
            existingKeys.forEach(function(k, i) {
                const old = existingRows[i];
                if (!incomingKeySet[k] && !deleted[String(old[0])]) rawData.push(old.slice());
            });
        } catch(guardErr) {
            Logger.log("Guard error: " + guardErr);
            return ContentService.createTextOutput(JSON.stringify({
                status: "error",
                message: "Odbijeno: ne mogu provjeriti postojeće podatke prije spremanja."
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // Server-side normalization: ensure 100% uniform rectangle
        const maxCols = Math.max.apply(null, rawData.map(function(r) { return r ? r.length : 0; }));
        const cleanData = rawData.map(function(r) {
            const row = [];
            for (let c = 0; c < maxCols; c++) {
                const cell = (r && r[c] !== undefined && r[c] !== null) ? String(r[c]) : "";
                row.push(cell);
            }
            return row;
        });

        mainSheet.clearContents(); // Clear existing pure data to replace
        mainSheet.getRange(1, 1, cleanData.length, maxCols).setValues(cleanData);

        const rawMeta = payload.meta;
        if (rawMeta && Array.isArray(rawMeta) && rawMeta.length > 0) {
            const metaSheet = ss.getSheetByName('AdminMeta') || ss.insertSheet('AdminMeta');
            const maxMetaCols = Math.max.apply(null, rawMeta.map(function(r) { return r ? r.length : 0; }));
            if (maxMetaCols > 0) {
                const cleanMeta = rawMeta.map(function(r) {
                    const row = [];
                    for (let c = 0; c < maxMetaCols; c++) {
                        const cell = (r && r[c] !== undefined && r[c] !== null) ? String(r[c]) : "";
                        row.push(cell);
                    }
                    return row;
                });
                metaSheet.clearContents();
                metaSheet.getRange(1, 1, cleanMeta.length, maxMetaCols).setValues(cleanMeta);
            }
        }

        return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Promjene spremljene" }))
          .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. KVIZ: DROPOFF TRACKING
    if (payload.action === 'dropoff') {
        return handleDropoffTracker(payload, ss);
    }
    
    // 3. KVIZ: NORMAL LEAD (If applicable from frontend instead of SureCart)
    if (payload.action === 'lead') {
        handleLead(payload, ss);
        return response;
    }

    // 4. SURECART WEBHOOKS (New purchase)
    if (payload.data && (payload.type === 'order.created' || payload.type === 'charge.succeeded' || payload.data.object)) {
        const lock = LockService.getScriptLock();
        try {
            lock.waitLock(30000);
        } catch (e) {
            return response;
        }

        // Filled in only when a NEW row lands in Sheet1; sent after the lock is released (see finally)
        let purchaseJob = null;

        try {
            const eventData = payload.data.object || payload.data;

        // --- STEP 1: Extract a stable transaction ID from the raw payload BEFORE any API calls ---
        // This is the SureCart ORDER id: charge.order > purchase.initial_order > id (an order object's own id).
        // See extractSureCartOrderId(). It doubles as the dedup key and as the Meta/PostHog event_id.
        const rawTransactionId = extractSureCartOrderId(eventData);

        // --- STEP 2: Log to RawLogs immediately ---
        const logSheet = ss.getSheetByName("RawLogs") || ss.insertSheet("RawLogs");
        if (logSheet.getLastRow() === 0) {
            logSheet.appendRow(["Timestamp", "TransactionID", "RawPayload"]);
        }

        // --- STEP 3: Check RawLogs for duplicate transaction ID ---
        if (rawTransactionId) {
            const logData = logSheet.getDataRange().getValues();
            // Start from row 2 (skip header)
            for (let i = 1; i < logData.length; i++) {
                if (String(logData[i][1]) === rawTransactionId) {
                    // Duplicate! Log it as a duplicate marker and bail out early
                    logSheet.appendRow([new Date(), rawTransactionId + "__DUPLICATE", payloadStr]);
                    return response;
                }
            }
        }

        // Not a duplicate — log it properly now
        logSheet.appendRow([new Date(), rawTransactionId, payloadStr]);

        // --- STEP 4: Fetch enriched data from SureCart API ---
        const customerId = eventData.customer;
        const priceId = eventData.price;
        const orderId = rawTransactionId;

        const options = {
            "method": "GET",
            "headers": { "Authorization": "Bearer " + SURECART_API_KEY },
            "muteHttpExceptions": true
        };

        let name = "N/A", email = "N/A", phone = "N/A", variantName = "Ursa Protocol", cleanId = orderId;
        let custData = null, priceData = null, orderData = null; // kept for the Purchase tracking below

        // Fetch Customer
        if (customerId) {
            const custRes = UrlFetchApp.fetch("https://api.surecart.com/v1/customers/" + customerId, options);
            if (custRes.getResponseCode() === 200) {
                custData = JSON.parse(custRes.getContentText());
                name = custData.name || (custData.first_name + " " + (custData.last_name || "")) || "N/A";
                email = custData.email || "N/A";
                phone = custData.phone || "N/A";
            }
        }

        // Fetch Price Label
        if (priceId) {
            const priceRes = UrlFetchApp.fetch("https://api.surecart.com/v1/prices/" + priceId, options);
            if (priceRes.getResponseCode() === 200) {
                priceData = JSON.parse(priceRes.getContentText());
                variantName = priceData.label || priceData.name || variantName;
            }
        }

        // Fetch Order number (human-readable ID)
        if (orderId) {
            const orderRes = UrlFetchApp.fetch("https://api.surecart.com/v1/orders/" + orderId, options);
            if (orderRes.getResponseCode() === 200) {
                orderData = JSON.parse(orderRes.getContentText());
                cleanId = orderData.number || orderId;
            }
        }

        // --- STEP 5: Write to Sheet1 ---
        const mainSheet = ss.getSheetByName('Sheet1');
        
        // Final Bulletproof Check: Make sure it's not already in Sheet1 before appending
        const existingData = mainSheet.getDataRange().getValues();
        let alreadyExists = false;
        for (let i = 0; i < existingData.length; i++) {
            if (String(existingData[i][0]) === String(cleanId) || String(existingData[i][0]) === String(orderId)) {
                alreadyExists = true;
                break;
            }
        }
        
        if (!alreadyExists) {
            mainSheet.appendRow([
                cleanId,
                name,
                email,
                " " + phone, // Space forces string to keep + character
                variantName,
                new Date().toISOString(),
                "DA" // Plaćeno default
            ]);

            purchaseJob = {
                // Prefer the id SureCart itself returned for the order; fall back to the webhook's order id
                orderId: String((orderData && orderData.id) || orderId),
                orderNumber: String(cleanId),
                email: email, phone: phone, name: name, variantName: variantName,
                eventData: eventData, custData: custData, priceData: priceData, orderData: orderData
            };
        }

        return response;
        } finally {
            lock.releaseLock();
            // Meta CAPI + PostHog Purchase. Runs after the lock is released (a duplicate webhook already
            // finds this order in RawLogs), and can never throw into the webhook response.
            if (purchaseJob) {
                try { sendPurchaseTracking(ss, purchaseJob); } catch (trackErr) { Logger.log("Purchase tracking error: " + trackErr); }
            }
        }
    }

  } catch (err) {
    return response;
  }
  return response;
}

// 5. ADMIN PANEL: GET ALL DATA
function doGet(e) {
  try {
      const ss = SpreadsheetApp.openById('1jbSOKSfX6I0vMwiiSJiuHOtmhK_ozJ0L6yO11xppKlQ');

      if (e && e.parameter && e.parameter.action === 'getPlan') {
          return ContentService.createTextOutput(JSON.stringify({ status: "success", plan: readPlanState(ss) }))
            .setMimeType(ContentService.MimeType.JSON);
      }

      const mainSheet = ss.getSheetByName('Sheet1');
      
      const dataRange = mainSheet.getDataRange();
      const numRows = dataRange.getNumRows();
      let data = [];
      
      if (numRows > 0) {
          const numCols = Math.max(dataRange.getNumColumns(), 7); // Ensure at least 7 cols
          data = mainSheet.getRange(1, 1, numRows, numCols).getDisplayValues();
      }

      const metaSheet = ss.getSheetByName("AdminMeta") || ss.insertSheet("AdminMeta");
      const metaRange = metaSheet.getDataRange();
      let meta = [];
      if (metaRange.getNumRows() > 0) {
          meta = metaSheet.getRange(1, 1, metaRange.getNumRows(), Math.max(metaRange.getNumColumns(), 1)).getDisplayValues();
      }
      
      return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          data: data,
          meta: meta
      })).setMimeType(ContentService.MimeType.JSON);
      
  } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ 
          status: "error", 
          message: err.toString() 
      })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper: Handle dropoff (kept mostly identical to old script)
function handleDropoffTracker(data, doc) {
    let sessionsSheet = doc.getSheetByName("Dropoff_Sessions");
    if (!sessionsSheet) {
      sessionsSheet = doc.insertSheet("Dropoff_Sessions");
      sessionsSheet.appendRow(["SessionID", "Last Step Reached", "Timestamp"]);
    }
    
    const sessionId = data.sessionId;
    const stepName = data.step;
    const timestamp = new Date();
    
    const dropRange = sessionsSheet.getDataRange();
    const values = dropRange.getValues();
    let rowIndex = -1;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === sessionId) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex > -1) {
      sessionsSheet.getRange(rowIndex, 2).setValue(stepName);
      sessionsSheet.getRange(rowIndex, 3).setValue(timestamp);
    } else {
      sessionsSheet.appendRow([sessionId, stepName, timestamp]);
    }
    updateDropoffTally(doc);
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" })).setMimeType(ContentService.MimeType.JSON);
}

function updateDropoffTally(doc) {
  let statsSheet = doc.getSheetByName("Dropoffs");
  if (!statsSheet) { statsSheet = doc.insertSheet("Dropoffs"); }
  
  let sessionsSheet = doc.getSheetByName("Dropoff_Sessions");
  if (!sessionsSheet) return;
  
  const values = sessionsSheet.getDataRange().getValues();
  if (values.length <= 1) return;
  
  let counts = {};
  for (let i = 1; i < values.length; i++) {
    let step = values[i][1];
    counts[step] = (counts[step] || 0) + 1;
  }
  
  statsSheet.clear();
  statsSheet.appendRow(["Pitanje na kojem je korisnik odustao", "Broj ljudi"]);
  statsSheet.getRange("A1:B1").setFontWeight("bold");
  
  // Flow order of the step names the quiz sends (index.html). Unknown names are appended below.
  const dropoffSteps = [
    'Kartica 1 (Početak)',
    'Pitanje 1 (Spol)',
    'Pitanje 2 (Cilj)',
    'Pitanje 3 (Godine)',
    'Pitanje 4 (Tip tijela)',
    'Pitanje 5 (Ime)',
    'Pitanje 6 (Motivacija)',
    'Pitanje 7 (Iskustvo)',
    'Pitanje 8 (Pokušaji)',
    'Pitanje 9 (Prehrana)',
    'Pitanje 10 (Strah)',
    'Video je spreman',
    'Loading ekran...',
    'Rezultat (Tip tijela)',
    'Zadnji ekran (Spreman)',
    'Završio kviz (VSL)'
  ];
  
  let totalRows = [];
  dropoffSteps.forEach(function(step) {
    if (counts[step] !== undefined || step === 'Završio kviz (VSL)') {
      totalRows.push([step, counts[step] || 0]);
    }
  });
  
  for (let step in counts) {
    if (dropoffSteps.indexOf(step) === -1) {
      totalRows.push([step, counts[step]]);
    }
  }
  
  if (totalRows.length > 0) {
    statsSheet.getRange(2, 1, totalRows.length, 2).setValues(totalRows);
  }
}


// --- LEADS + PURCHASE TRACKING (Meta CAPI, PostHog) ---
// Contract: docs/tracking.md. No secrets here: Meta values come from Script Properties
// META_PIXEL_ID, META_CAPI_TOKEN, optional META_TEST_EVENT_CODE, optional META_API_VERSION.
const SPREADSHEET_ID = '1jbSOKSfX6I0vMwiiSJiuHOtmhK_ozJ0L6yO11xppKlQ';
const META_DEFAULT_API_VERSION = 'v26.0';
const PURCHASE_EVENT_SOURCE_URL = 'https://nemaneide.ursaprotocol.com/';
const POSTHOG_CAPTURE_URL = 'https://eu.i.posthog.com/i/v0/e/';
// Public PostHog project ingestion key (already in the site's HTML). Not a secret.
const POSTHOG_PROJECT_KEY = 'phc_AuRfJaborn4gGwAvKQAzWJtkQ8KWBbk6ruoBPymR3jAo';

const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content',
    'fbclid', 'ad_id', 'adset_id', 'placement'];
// Original 'Leads' columns. Never reorder or rename: old rows depend on them.
const LEAD_BASE_HEADERS = ["Timestamp", "Ime", "Email", "Vrsta", "Cilj", "DatumPrijave"];
// Added to the RIGHT of the existing columns. Rows are written by header name, so order drift is harmless.
const LEAD_EXTRA_HEADERS = ['event_id', 'bodytype', 'age', 'motivation', 'struggle', 'tried', 'diet', 'fear', 'phone']
    .concat(ATTRIBUTION_KEYS)
    .concat(['fbp', 'fbc', 'user_agent', 'ph_distinct_id', 'page_url']);
const LEAD_QUIZ_KEYS = ['bodytype', 'age', 'motivation', 'struggle', 'tried', 'diet', 'fear'];

// Quiz lead -> 'Leads' sheet. Keeps the old 6 columns, appends the tracking columns by header name.
function handleLead(payload, ss) {
    const lock = LockService.getScriptLock();
    let locked = false;
    try { lock.waitLock(10000); locked = true; } catch (lockErr) { /* write anyway, as before */ }
    try {
        const sheet = ss.getSheetByName('Leads') || ss.insertSheet('Leads');
        const headers = ensureHeaders(sheet, LEAD_BASE_HEADERS.concat(LEAD_EXTRA_HEADERS));

        // Fields arrive at the top level (docs/tracking.md); nested attribution/quiz objects are a fallback
        const attr = (payload.attribution && typeof payload.attribution === 'object') ? payload.attribution : {};
        const quiz = (payload.quiz && typeof payload.quiz === 'object') ? payload.quiz : {};
        const pick = function (key, nested) {
            const v = payload[key];
            if (v !== undefined && v !== null && v !== '') return String(v);
            const n = nested && nested[key];
            return (n !== undefined && n !== null) ? String(n) : '';
        };

        const now = new Date();
        const values = {};
        values['timestamp'] = now;
        values['ime'] = payload.name || "";
        values['email'] = String(payload.email || "").trim().toLowerCase();
        values['vrsta'] = "Lead";
        values['cilj'] = payload.goal || "";
        values['datumprijave'] = now;
        LEAD_EXTRA_HEADERS.forEach(function (h) {
            const nested = ATTRIBUTION_KEYS.indexOf(h) > -1 ? attr : (LEAD_QUIZ_KEYS.indexOf(h) > -1 ? quiz : null);
            values[h] = pick(h, nested);
        });

        const row = headers.map(function (h) {
            const k = String(h).trim().toLowerCase();
            return Object.prototype.hasOwnProperty.call(values, k) ? values[k] : '';
        });
        const rowIndex = sheet.getLastRow() + 1;
        // Tracking columns as plain text, so Sheets never turns a utm value into a date or number
        const textCells = [];
        headers.forEach(function (h, i) {
            if (LEAD_EXTRA_HEADERS.indexOf(String(h).trim().toLowerCase()) > -1) textCells.push(columnLetter(i + 1) + rowIndex);
        });
        if (textCells.length) sheet.getRangeList(textCells).setNumberFormat('@');
        sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    } finally {
        if (locked) lock.releaseLock();
    }
}

// Makes sure every wanted header exists in row 1. Existing headers stay where they are (old rows are not
// touched); missing ones are added to the right. Returns the full header row.
function ensureHeaders(sheet, wanted) {
    const lastCol = sheet.getLastColumn();
    const headers = (sheet.getLastRow() > 0 && lastCol > 0)
        ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h); })
        : [];
    const have = {};
    headers.forEach(function (h) { have[h.trim().toLowerCase()] = true; });
    const missing = wanted.filter(function (h) { return !have[h.trim().toLowerCase()]; });
    if (missing.length) {
        sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
        return headers.concat(missing);
    }
    return headers;
}

function columnLetter(n) {
    let s = '';
    while (n > 0) {
        const m = (n - 1) % 26;
        s = String.fromCharCode(65 + m) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}

// Most recent 'Leads' row with this email, as {lowercased header: display value}. null if none.
function findLatestLead(ss, email) {
    const target = String(email || '').trim().toLowerCase();
    if (!target || target === 'n/a') return null;
    const sheet = ss.getSheetByName('Leads');
    if (!sheet || sheet.getLastRow() < 2) return null;
    const data = sheet.getDataRange().getDisplayValues();
    const headers = data[0].map(function (h) { return String(h).trim().toLowerCase(); });
    const emailCol = headers.indexOf('email');
    if (emailCol === -1) return null;
    for (let i = data.length - 1; i >= 1; i--) {
        if (String(data[i][emailCol]).trim().toLowerCase() === target) {
            const lead = {};
            headers.forEach(function (h, c) { if (h) lead[h] = String(data[i][c] || '').trim(); });
            return lead;
        }
    }
    return null;
}

function idOf(v) {
    if (!v) return '';
    if (typeof v === 'object') return v.id ? String(v.id) : '';
    return String(v);
}

// SureCart ORDER id of a webhook object (used for dedup in RawLogs/Sheet1 and as the Purchase event_id):
// - charge objects reference their order in `order`            -> charge.order
// - purchase objects reference the order that created them      -> purchase.initial_order
// - order objects (order.created)                               -> order.id
// Values may be plain ids or expanded objects. For purchase/order objects this returns the same value as
// the previous `initial_order || id`, so RawLogs dedup keeps matching older rows.
function extractSureCartOrderId(obj) {
    if (!obj) return '';
    return idOf(obj.order) || idOf(obj.initial_order) || idOf(obj.id);
}

function firstNumber() {
    for (let i = 0; i < arguments.length; i++) {
        const v = arguments[i];
        if (v === undefined || v === null || v === '') continue;
        const n = Number(v);
        if (isFinite(n)) return n;
    }
    return null;
}

function sureCartGet(path) {
    try {
        const res = UrlFetchApp.fetch("https://api.surecart.com/v1/" + path, {
            method: "GET",
            headers: { "Authorization": "Bearer " + SURECART_API_KEY },
            muteHttpExceptions: true
        });
        if (res.getResponseCode() === 200) return JSON.parse(res.getContentText());
    } catch (err) {
        Logger.log("SureCart GET " + path + " failed: " + err);
    }
    return null;
}

// Paid amount in euros. SureCart amounts are integer cents. The order object has no total, its checkout
// does (total_amount = after discounts), so the checkout is fetched when only its id is known.
function resolvePurchaseAmount(job) {
    const ev = job.eventData || {}, order = job.orderData || {}, price = job.priceData || {};
    let checkout = (order.checkout && typeof order.checkout === 'object') ? order.checkout
        : (ev.checkout && typeof ev.checkout === 'object') ? ev.checkout : null;
    const checkoutId = checkout ? '' : (idOf(order.checkout) || idOf(ev.checkout));
    if (!checkout && checkoutId) checkout = sureCartGet('checkouts/' + encodeURIComponent(checkoutId));
    checkout = checkout || {};

    let cents = firstNumber(checkout.total_amount, checkout.amount_due, order.total_amount,
        ev.total_amount, ev.amount);
    if (cents === null && price.amount !== undefined) {
        const unit = firstNumber(price.amount);
        if (unit !== null) cents = unit * (firstNumber(ev.quantity) || 1);
    }
    const currency = String(checkout.currency || order.currency || ev.currency || price.currency || 'EUR').toUpperCase();
    return { value: cents === null ? 0 : Math.round(cents) / 100, currency: currency, checkout: checkout };
}

function sha256Hex(str) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
    return bytes.map(function (b) { return ((b + 256) % 256).toString(16); })
        .map(function (h) { return h.length === 1 ? '0' + h : h; }).join('');
}

function normalizeText(v) {
    const s = String(v || '').trim().toLowerCase();
    return (s === 'n/a' || s === 'null' || s === 'undefined') ? '' : s;
}

// Digits only, '00' prefix dropped, a single leading '0' (Croatian national format) becomes '385'.
function normalizePhone(v) {
    let d = String(v || '').replace(/\D/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2);
    else if (d.indexOf('0') === 0) d = '385' + d.slice(1);
    return d;
}

function hashedIfPresent(value) {
    return value ? sha256Hex(value) : '';
}

function logCapi(ss, target, orderId, code, body) {
    try {
        const sheet = ss.getSheetByName('CapiLog') || ss.insertSheet('CapiLog');
        if (sheet.getLastRow() === 0) sheet.appendRow(["Timestamp", "Target", "OrderID", "Code", "Response"]);
        sheet.appendRow([new Date(), target, String(orderId || ''), String(code), String(body || '').slice(0, 1000)]);
    } catch (err) {
        Logger.log("CapiLog error: " + err);
    }
}

// Builds the Purchase payload from the SureCart data and sends it to Meta CAPI and PostHog.
// Every step is isolated: a failure here never touches Sheet1 or the webhook response.
function sendPurchaseTracking(ss, job) {
    let amount = { value: 0, currency: 'EUR', checkout: {} };
    try { amount = resolvePurchaseAmount(job); } catch (err) { Logger.log("Amount error: " + err); }
    const checkout = amount.checkout || {};
    const cust = job.custData || {};

    const email = normalizeText(job.email) || normalizeText(checkout.email);
    const phone = normalizeText(job.phone) || normalizeText(checkout.phone);
    // Customer first/last name > split of the customer's full name > checkout first/last name
    const nameParts = normalizeText(job.name).split(/\s+/).filter(String);
    const firstName = normalizeText(cust.first_name) || nameParts[0] || normalizeText(checkout.first_name);
    const lastName = normalizeText(cust.last_name) || nameParts.slice(1).join(' ') || normalizeText(checkout.last_name);

    let lead = null;
    try { lead = findLatestLead(ss, email); } catch (err) { Logger.log("Leads lookup error: " + err); }

    const purchase = {
        eventId: job.orderId,
        orderNumber: job.orderNumber,
        value: amount.value,
        currency: amount.currency,
        contentName: job.variantName,
        email: email, phone: phone, firstName: firstName, lastName: lastName,
        lead: lead
    };

    try { sendMetaPurchase(ss, purchase); } catch (err) { logCapi(ss, 'meta', purchase.eventId, 'exception', err); }
    try { sendPostHogPurchase(ss, purchase); } catch (err) { logCapi(ss, 'posthog', purchase.eventId, 'exception', err); }
}

function sendMetaPurchase(ss, p) {
    const props = PropertiesService.getScriptProperties();
    const pixelId = props.getProperty('META_PIXEL_ID');
    const token = props.getProperty('META_CAPI_TOKEN');
    if (!pixelId || !token) {
        logCapi(ss, 'meta', p.eventId, 'skipped', 'META_PIXEL_ID or META_CAPI_TOKEN not set');
        return null;
    }
    const version = props.getProperty('META_API_VERSION') || META_DEFAULT_API_VERSION;
    const testCode = props.getProperty('META_TEST_EVENT_CODE');
    const lead = p.lead || {};

    const userData = {};
    const em = hashedIfPresent(p.email);
    const ph = hashedIfPresent(normalizePhone(p.phone));
    const fn = hashedIfPresent(p.firstName);
    const ln = hashedIfPresent(p.lastName);
    if (em) { userData.em = [em]; userData.external_id = [em]; } // external_id = SHA-256 of the lowercased email
    if (ph) userData.ph = [ph];
    if (fn) userData.fn = [fn];
    if (ln) userData.ln = [ln];
    if (lead.fbc) userData.fbc = lead.fbc;
    if (lead.fbp) userData.fbp = lead.fbp;
    if (lead.user_agent) userData.client_user_agent = lead.user_agent;

    const body = {
        data: [{
            event_name: 'Purchase',
            event_time: Math.floor(Date.now() / 1000),
            event_id: String(p.eventId),
            action_source: 'website',
            event_source_url: PURCHASE_EVENT_SOURCE_URL,
            user_data: userData,
            custom_data: {
                value: Number(p.value) || 0,
                currency: String(p.currency || 'EUR').toUpperCase(),
                content_name: String(p.contentName || ''),
                order_id: String(p.eventId)
            }
        }]
    };
    if (testCode) body.test_event_code = testCode;

    const url = 'https://graph.facebook.com/' + version + '/' + encodeURIComponent(pixelId) +
        '/events?access_token=' + encodeURIComponent(token);
    const res = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(body),
        muteHttpExceptions: true
    });
    const code = res.getResponseCode();
    const text = res.getContentText();
    logCapi(ss, testCode ? 'meta (test)' : 'meta', p.eventId, code, text);
    return { code: code, body: text };
}

function sendPostHogPurchase(ss, p) {
    const lead = p.lead || {};
    const properties = {
        value: Number(p.value) || 0,
        currency: String(p.currency || 'EUR').toUpperCase(),
        plan: String(p.contentName || ''),
        order_id: String(p.eventId),
        order_number: String(p.orderNumber || ''),
        event_id: String(p.eventId),
        $insert_id: String(p.eventId)
    };
    if (p.email) properties.$set = { email: p.email };
    ATTRIBUTION_KEYS.forEach(function (k) { if (lead[k]) properties[k] = lead[k]; });

    const res = UrlFetchApp.fetch(POSTHOG_CAPTURE_URL, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
            api_key: POSTHOG_PROJECT_KEY,
            event: 'purchase',
            // Same id as posthog.identify(email) in the quiz; without an email fall back to the order
            distinct_id: p.email || ('order_' + p.eventId),
            timestamp: new Date().toISOString(),
            properties: properties
        }),
        muteHttpExceptions: true
    });
    logCapi(ss, 'posthog', p.eventId, res.getResponseCode(), res.getContentText());
}

// Manual check from the Apps Script editor: sends one fake Purchase to Meta Test Events only.
// Refuses to run unless META_TEST_EVENT_CODE is set, so it can never count as a real sale.
function testPurchaseCapi() {
    const props = PropertiesService.getScriptProperties();
    if (!props.getProperty('META_TEST_EVENT_CODE')) {
        throw new Error('META_TEST_EVENT_CODE nije postavljen u Script Properties. Test se ne šalje.');
    }
    if (!props.getProperty('META_PIXEL_ID') || !props.getProperty('META_CAPI_TOKEN')) {
        throw new Error('META_PIXEL_ID i META_CAPI_TOKEN moraju biti postavljeni u Script Properties.');
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const result = sendMetaPurchase(ss, {
        eventId: 'test_' + Date.now(),
        orderNumber: 'TEST',
        value: 1,
        currency: 'EUR',
        contentName: 'TEST purchase',
        email: 'test@example.com',
        phone: '0911234567',
        firstName: 'test',
        lastName: 'kupac',
        lead: null
    });
    Logger.log(JSON.stringify(result));
    return result;
}


// --- ADMIN PLAN STORAGE ---
// The whole plan is one JSON document, split over column A of the 'Plan' sheet
// (a cell holds max 50k chars). Each chunk is prefixed with '~' so Sheets never
// parses a chunk as a number, date or formula.
const PLAN_CHUNK = 40000;

function readPlanState(ss) {
    const sheet = ss.getSheetByName('Plan');
    if (!sheet || sheet.getLastRow() === 0) return { v: 1, events: {}, reels: {} };
    const json = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues()
        .map(function (row) { return String(row[0]).slice(1); })
        .join('');
    try {
        const s = JSON.parse(json);
        return { v: 1, events: s.events || {}, reels: s.reels || {} };
    } catch (err) {
        return { v: 1, events: {}, reels: {} };
    }
}

function writePlanState(ss, state) {
    const sheet = ss.getSheetByName('Plan') || ss.insertSheet('Plan');
    const json = JSON.stringify(state);
    const rows = [];
    for (let i = 0; i < json.length; i += PLAN_CHUNK) rows.push(['~' + json.slice(i, i + PLAN_CHUNK)]);
    sheet.clearContents();
    sheet.getRange(1, 1, rows.length, 1).setNumberFormat('@').setValues(rows);
}

// Same rule as the page: per item, the version with the newer updatedAt wins (deletions are tombstones)
function mergePlanStates(a, b) {
    const out = { v: 1, events: {}, reels: {} };
    ['events', 'reels'].forEach(function (kind) {
        const A = (a && a[kind]) || {}, B = (b && b[kind]) || {};
        Object.keys(A).concat(Object.keys(B)).forEach(function (id) {
            const x = A[id], y = B[id];
            out[kind][id] = !x ? y : !y ? x : ((y.updatedAt || 0) > (x.updatedAt || 0) ? y : x);
        });
    });
    return out;
}
