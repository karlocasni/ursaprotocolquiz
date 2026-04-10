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

    // 1. ADMIN PANEL: SYNC ENTIRE SHEET (Edit mode save)
    if (payload.action === 'syncSheet') {
        const mainSheet = ss.getSheetByName('Sheet1');
        mainSheet.clearContents(); // Clear existing pure data to replace
        
        const data = payload.data;
        if (data && data.length > 0) {
            mainSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
        }

        const metaSheet = ss.getSheetByName('AdminMeta') || ss.insertSheet('AdminMeta');
        metaSheet.clearContents();
        const meta = payload.meta;
        if (meta && meta.length > 0) {
            metaSheet.getRange(1, 1, meta.length, meta[0].length).setValues(meta);
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
        let leadsSheet = ss.getSheetByName('Leads');
        if (!leadsSheet) {
            leadsSheet = ss.insertSheet('Leads');
            leadsSheet.appendRow(["Timestamp", "Ime", "Email", "Vrsta", "Cilj", "DatumPrijave"]);
        }
        leadsSheet.appendRow([new Date(), payload.name || "", payload.email || "", "Lead", payload.goal || "", new Date()]);
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

        try {
            const eventData = payload.data.object || payload.data;

        // --- STEP 1: Extract a stable transaction ID from the raw payload BEFORE any API calls ---
        // Use the most stable identifier available: initial_order > id from eventData
        const rawTransactionId = String(eventData.initial_order || eventData.id || '');

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

        // Fetch Customer
        if (customerId) {
            const custRes = UrlFetchApp.fetch("https://api.surecart.com/v1/customers/" + customerId, options);
            if (custRes.getResponseCode() === 200) {
                const custData = JSON.parse(custRes.getContentText());
                name = custData.name || (custData.first_name + " " + (custData.last_name || "")) || "N/A";
                email = custData.email || "N/A";
                phone = custData.phone || "N/A";
            }
        }

        // Fetch Price Label
        if (priceId) {
            const priceRes = UrlFetchApp.fetch("https://api.surecart.com/v1/prices/" + priceId, options);
            if (priceRes.getResponseCode() === 200) {
                const priceData = JSON.parse(priceRes.getContentText());
                variantName = priceData.label || priceData.name || variantName;
            }
        }

        // Fetch Order number (human-readable ID)
        if (orderId) {
            const orderRes = UrlFetchApp.fetch("https://api.surecart.com/v1/orders/" + orderId, options);
            if (orderRes.getResponseCode() === 200) {
                const orderData = JSON.parse(orderRes.getContentText());
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
                new Date().toISOString()
            ]);
        }

        return response;
        } finally {
            lock.releaseLock();
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
      const mainSheet = ss.getSheetByName('Sheet1');
      
      const dataRange = mainSheet.getDataRange();
      const numRows = dataRange.getNumRows();
      let data = [];
      
      if (numRows > 0) {
          const numCols = Math.max(dataRange.getNumColumns(), 6); // Ensure at least 6 cols
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
  
  const dropoffSteps = ['Kartica 1 (Početak)','Pitanje 1 (Spol)','Pitanje 2 (Cilj)','Pitanje 3 (Godine)','Pitanje 4 (Tip tijela)','Pitanje 5 (Ime)','Pitanje 6 (Motivacija)','Pitanje 7 (Iskustvo)','Pitanje 8 (Pokušaji)','Pitanje 9 (Prehrana)','Pitanje 10 (Frustracija)','Pitanje 11 (Razlog zašto ne)','Loading ekran...','Pitanje 12 (Strah)','Pitanje 13 (Jedna stvar)','Email unos','Zadnji ekran (Spreman)','Završio kviz (VSL)'];
  
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
