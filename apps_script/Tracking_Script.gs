/*
 * Upute za postavljanje Google Apps Script za praćenje odustajanja i leadova
 * 
 * Kad to napraviš, OBAVEZNO OTVORI 'index.html' u ovom projektu, pronađi 
 * varijablu SHEETS_URL pri dnu i po potrebi zamijeni stari link sa novim 
 * Web App URL-om koji ćeš dobiti (upute dolje).
 *
 * UPUTE:
 * 1. Otiđi na svoj Google Sheet za leadove.
 * 2. U gornjem meniju klikni: Extensions > Apps Script (Proširenja > Apps Script).
 * 3. Obriši sav stari kod koji tamo postoji i zalijepi sav ovaj kod ispod.
 * 4. Klikni "Deploy" u gornjem desnom kutu -> "New Deployment".
 * 5. Klikni na "Select type" (ikonica kotačića) i odaberi "Web app".
 * 6. Pod "Who has access" (ili "Any") obavezno odaberi "Anyone" (Svatko).
 * 7. Zatim klikni "Deploy" i daj dopuštenja / autoriziraj skriptu ako te Google pita (Advanced -> Go to script (unsafe)).
 * 8. Kopiraj dobiveni Web App URL.
 * 9. U `index.html` fajlu (koji sam ti već izmijenio), provjeri je li tvoj SHEETS_URL var jednak ovom novom. Ako si ostao na istoj skripti, a samo kopirao kod gore, ne moraš ni mijenjati URL!
 *
 * Skripta iz donjeg koda će SAMA KREIRATI listove `Dropoffs` i `Dropoff_Sessions` u tvom Google Sheetu, tako da ti ni to ne moraš ručno dodavati!
 */

function doPost(e) {
  try {
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Invalid JSON" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const doc = SpreadsheetApp.getActiveSpreadsheet();

    // AKO JE "action" === 'dropoff' -> SPREMAMO PODATKE O ODUSTAJANJU KORISNIKA
    if (data.action === 'dropoff') {
      let sessionsSheet = doc.getSheetByName("Dropoff_Sessions");
      if (!sessionsSheet) {
        sessionsSheet = doc.insertSheet("Dropoff_Sessions");
        sessionsSheet.appendRow(["SessionID", "Last Step Reached", "Timestamp"]);
      }
      
      const sessionId = data.sessionId;
      const stepName = data.step;
      const timestamp = new Date();
      
      // Pronađi postoji li već ova sesija u "Dropoff_Sessions" 
      const dataRange = sessionsSheet.getDataRange();
      const values = dataRange.getValues();
      let rowIndex = -1;
      
      // Krećemo od kraja (ili početka) da nađemo index sesije.
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === sessionId) {
          rowIndex = i + 1; // +1 jer su redovi u Sheetu indexirani od 1
          break;
        }
      }
      
      if (rowIndex > -1) {
        // Ažuriraj korak i timestamp za postojeću sesiju
        sessionsSheet.getRange(rowIndex, 2).setValue(stepName);
        sessionsSheet.getRange(rowIndex, 3).setValue(timestamp);
      } else {
        // Nema sesije, dodaj novi red
        sessionsSheet.appendRow([sessionId, stepName, timestamp]);
      }
      
      // Ažuriraj "Dropoffs" sheet gdje se prikazuju statistike
      updateDropoffTally(doc);
      
      return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Dropoff tracked" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // U SUPROTNOM SLUČAJU -> SPREMAMO NORMALAN LEAD (Klijenta)
    let leadsSheet = doc.getSheetByName("Sheet1") || doc.getSheets()[0];
    
    let name = data.name || "";
    let email = data.email || "";
    let gender = data.gender || "";
    let goal = data.goal || "";
    
    leadsSheet.appendRow([new Date(), name, email, gender, goal]);
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Lead saved" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Opcionalno za GET requestove
function doGet(e) {
  return ContentService.createTextOutput("Radi!");
}

function updateDropoffTally(doc) {
  let statsSheet = doc.getSheetByName("Dropoffs");
  if (!statsSheet) {
    statsSheet = doc.insertSheet("Dropoffs");
  }
  
  let sessionsSheet = doc.getSheetByName("Dropoff_Sessions");
  if (!sessionsSheet) return;
  
  const values = sessionsSheet.getDataRange().getValues();
  if (values.length <= 1) return;
  
  let counts = {};
  for (let i = 1; i < values.length; i++) {
    let step = values[i][1];
    counts[step] = (counts[step] || 0) + 1;
  }
  
  // Očisti i upiši header iznova
  statsSheet.clear();
  statsSheet.appendRow(["Pitanje na kojem je korisnik odustao", "Broj ljudi"]);
  statsSheet.getRange("A1:B1").setFontWeight("bold");
  
  // Poznati koraci za ispravan redoslijed
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
    'Pitanje 10 (Frustracija)',
    'Pitanje 11 (Razlog zašto ne)',
    'Loading ekran...',
    'Pitanje 12 (Strah)',
    'Pitanje 13 (Jedna stvar)',
    'Email unos',
    'Zadnji ekran (Spreman)',
    'Završio kviz (VSL)'
  ];
  
  let totalRows = [];
  dropoffSteps.forEach(function(step) {
    // Ako ima korisnika u tom koraku ILI ako je to VSL korak ostavit ćemo ga da se vidi kao 0 ako nema
    if (counts[step] !== undefined || step === 'Završio kviz (VSL)') {
      totalRows.push([step, counts[step] || 0]);
    }
  });
  
  // Dodaj ostale (u slučaju izmjena naziva)
  for (let step in counts) {
    if (dropoffSteps.indexOf(step) === -1) {
      totalRows.push([step, counts[step]]);
    }
  }
  
  if (totalRows.length > 0) {
    statsSheet.getRange(2, 1, totalRows.length, 2).setValues(totalRows);
  }
}
