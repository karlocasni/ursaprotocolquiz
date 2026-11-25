# Što je stvarno deployano (Unified_Script.gs)

Apps Script projekt: "Untitled project" (vlasnik Karlo), deployment **"novo s kalendarom"**,
ID `AKfycbyWQsjnenPCvl_…n5-DksO4Xg` (isti URL koriste `index.html` i `admin/`).

| Verzija | Datum | Sadržaj |
| --- | --- | --- |
| 28 | 26. 9. 2026. | = `Unified_Script.gs` iz commita `5e2b685` |
| 29 | 25. 11. 2026. | verzija 28 + **samo** tracking izmjene (handleLead, Purchase → Meta CAPI + PostHog, order ID, dropoff lista). Deployao Bruno. |
| 30 | 25. 11. 2026. | verzija 29 + stupac `phone` u `Leads` (`LEAD_EXTRA_HEADERS`). Isti deployment ID. |

**Nije deployano:** admin izmjene iz commita `75dbb52`, `e2e0344`, `c7fbaa4` (AutoBackup, zaštita od
brisanja redova, "DA" stupac). `apps_script/Unified_Script.gs` u repou ih sadrži, a živa skripta ne.
Prije sljedećeg deploya iz repoa treba odlučiti hoće li i one ići van.

Script Properties: `META_PIXEL_ID` = `1375315374544689`, `META_CAPI_TOKEN` (upisan 25. 11. 2026.).
