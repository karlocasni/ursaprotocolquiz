# Tracking: PostHog + Meta pixel + Conversions API

Ugovor između frontenda (`index.html`, `assets/track.js`, `assets/vsl-page.js`), Apps Scripta
(`apps_script/Unified_Script.gs`) i n8n-a (`n8n/ursa-tracking.json`). Tko mijenja payload, mijenja ga ovdje.

Nijedan token nije u repou. Repo je javan.

| Tajna | Gdje živi |
| --- | --- |
| Meta CAPI access token | Apps Script → Project Settings → Script Properties `META_CAPI_TOKEN`; n8n credential "Meta CAPI token" |
| PostHog personal API key (za čitanje u n8n-u) | n8n credential "PostHog personal API key" |
| Resend, Slack | n8n credentials |

Javni identifikatori (smiju u kod): Meta pixel/dataset ID, PostHog project token `phc_...`, n8n webhook URL.

## Mapa eventa

Postojeća PostHog imena se ne mijenjaju. Spec ime → stvarno ime:

| Korak | Spec (Claude Docs) | PostHog (stvarno) | Meta | Dedup `event_id` | Šalje |
| --- | --- | --- | --- | --- | --- |
| Landing / VSL učitan | `$pageview` | `$pageview` (auto) | `PageView` | — | pixel |
| Start quiza | `quiz_started` | `quiz_started` (novo) | `ViewContent` `{content_name:'quiz'}` | — | pixel |
| Svako pitanje | `quiz_step` | `quiz_step_reached` (`step_id`, `step_name`, `step_index`) | — | — | — |
| Kraj quiza | `quiz_completed` | `quiz_completed` (+ odgovori, `event_id`, `has_phone`; broj ide u person property `phone`) | `Lead` | UUID iz preglednika | pixel + CAPI (n8n) |
| Rezultat (tip tijela) | — | `quiz_result_viewed` (novo, `bodytype`) | — | — | — |
| VSL učitan | `vsl_view` | `vsl_viewed` | `ViewContent` `{content_name:'vsl'}` | — | pixel |
| 50 % / 75 % videa | `vsl_50`, `vsl_75` | `vsl_50`, `vsl_75` (novo, jednom po posjetu) | — | — | — |
| Klik na checkout | `checkout_started` | `vsl_checkout_clicked` (+ `event_id`) | `InitiateCheckout` `{value, currency:'EUR'}` | UUID iz preglednika | pixel + CAPI (n8n) |
| Uplata | `purchase` | `purchase` (novo, šalje Apps Script) | `Purchase` `{value, currency:'EUR'}` | SureCart order ID | pixel (checkout) + CAPI (Apps Script) |

Ostali postojeći eventi (`vsl_video_progress`, `vsl_left`, `vsl_offer_opened`, …) ostaju kakvi jesu.

## Atribucija

Ključevi: `utm_source utm_medium utm_campaign utm_id utm_term utm_content fbclid ad_id adset_id placement`.

- `assets/track.js` ih čita iz URL-a pri svakom učitavanju. Ako URL nosi barem jedan ključ, cijeli set
  zamjenjuje spremljeni (`localStorage['ursa_attr']`) i upisuje se i u cookie `ursa_attr` na
  `.ursaprotocol.com`, da ga vidi i checkout poddomena.
- Svaki odlazni link (quiz → VSL, VSL → checkout) dobiva set preko `UrsaTrack.carry(url)`. Postojeći
  parametri u linku se ne prepisuju.
- `fbclid` → `_fbc` cookie u formatu `fb.1.<ms>.<fbclid>` na `.ursaprotocol.com`, ako ga pixel još nije postavio.

## Preglednik → n8n (Lead, InitiateCheckout)

`POST https://egzosfera.app.n8n.cloud/webhook/ursa-capi`
`Content-Type: application/x-www-form-urlencoded`, jedno polje `payload` = JSON ispod
(form-urlencoded da nema CORS preflighta; šalje se `fetch(..., {mode:'no-cors', keepalive:true})`).

```json
{
  "event_name": "Lead",
  "event_id": "8b1c…uuid",
  "event_time": 1764067200,
  "event_source_url": "https://ursaprotocol.com/?utm_source=ig…",
  "user_agent": "Mozilla/5.0 …",
  "fbp": "fb.1.1764067000000.123456789",
  "fbc": "fb.1.1764067000000.IwAR…",
  "email": "ime@primjer.hr",
  "first_name": "Ivan",
  "phone": "385912345678",
  "ph_distinct_id": "ime@primjer.hr",
  "attribution": { "utm_source": "ig", "utm_content": "STATIC_JELACIC_4x5", "fbclid": "IwAR…", "ad_id": "…" },
  "quiz": { "gender": "Muško", "goal": "…", "bodytype": "krupan", "age": "25–34", "motivation": "…", "struggle": "…", "tried": "…", "diet": "…", "fear": "…" },
  "vsl_url": "https://ursaprotocol.com/vsl.html?name=Ivan&goal=…&gender=Muško&bodytype=krupan",
  "custom_data": { "content_name": "quiz" }
}
```

- `email` je sirov, malim slovima i trimano. Hashira ga n8n (SHA-256) prije slanja u Metu.
- `phone` je neobavezan (polje u kvizu), samo znamenke s pozivnim brojem (`091…` → `385 91…`). n8n ga hashira u `user_data.ph`; pixel ga dobiva kroz advanced matching kad je spremljen u pregledniku.
- IP adresu n8n uzima iz `x-forwarded-for` headera webhooka (prva adresa).
- Za `InitiateCheckout`: `custom_data = { content_name: 'premium'|'standard', value: 500, currency: 'EUR' }`,
  `email`/`first_name` samo ako je osoba prošla quiz u tom pregledniku, `quiz` i `vsl_url` izostaju.

## Preglednik → Apps Script (lead u Sheet)

`SHEETS_URL` u `index.html` je deployment `Unified_Script.gs` (isti kao admin i SureCart webhook), `action: 'lead'`.
Prije je quiz slao na zaseban `Tracking_Script` deployment, pa Purchase nije mogao naći lead po emailu. Uz stara polja (`name`, `email`, `gender`, `goal`) dodaje:
`event_id, phone, bodytype, age, motivation, struggle, tried, diet, fear, fbp, fbc, user_agent, ph_distinct_id,
page_url` i sve ključeve atribucije na vrhu objekta. Apps Script ih piše u sheet `Leads` kao nove stupce
desno od postojećih, da `Purchase` može po emailu naći `fbc`, `fbp`, user agent i UTM.

## Purchase (Apps Script)

SureCart webhook → postojeći tok upisa u `Sheet1` → zatim:

1. `event_id` = SureCart order ID (isti koji pixel na thank-you stranici šalje kao `eventID`).
2. Meta CAPI `Purchase`: `value` i `currency` iz SureCart narudžbe, hashirani `em`, `ph`, `fn`, `ln`,
   `external_id`; iz zadnjeg reda u `Leads` s istim emailom `fbc`, `fbp`, `client_user_agent`.
   `action_source: 'website'`. Bez `META_CAPI_TOKEN` ili `META_PIXEL_ID` u Script Properties preskače se tiho.
   Ako postoji `META_TEST_EVENT_CODE`, šalje se kao `test_event_code` (samo za verifikaciju, poslije obrisati).
3. PostHog `purchase` na `https://eu.i.posthog.com/i/v0/e/`, `distinct_id` = email malim slovima
   (isti kao `posthog.identify` u quizu), `$insert_id` = order ID, propertyji `value`, `currency`, `plan`, `order_id`, `event_id`.

## Checkout (SureCart / WordPress, izvan repoa)

Snippet u `docs/checkout-pixel.html`: pixel `PageView` na checkoutu, `InitiateCheckout` se ne šalje
ponovno (već je poslan na klik), `Purchase` na stranici potvrde samo kad se iz URL-a pročita order ID.
Bez order ID-a pixel ne šalje `Purchase` — tada ga pokriva sam CAPI, bez rizika dvostrukog brojanja.

## n8n

Workflow `n8n/ursa-tracking.json`, jedan webhook (`ursa-capi`):

| Ulaz | Odmah | Wait | Provjera (PostHog HogQL po emailu) | Akcija |
| --- | --- | --- | --- | --- |
| `Lead` | CAPI `Lead` | 1 h | nema `vsl_viewed` | mail s linkom na VSL |
| `Lead` | | +23 h | ima `vsl_checkout_clicked` ili `purchase` | stop |
| | | | ima `vsl_50` | Slack `ursa-odobrenje` sa svim odgovorima i brojem, ručno (bez automatske poruke) |
| | | | inače | mail s jednim pitanjem o cilju |
| `InitiateCheckout` | CAPI `InitiateCheckout` | 1 h | nema `purchase` | mail 1 + Slack `ursa-odobrenje` (broj, paket) |
| | | +23 h | nema `purchase` | mail 2 |

Meta custom audiences (bez n8n-a): `PageView` bez `ViewContent`, 7 dana; `ViewContent` (quiz) bez `Lead`, 14 dana.

## Verifikacija prije spenda

1. Script Properties i n8n credential postavljeni, `META_TEST_EVENT_CODE` upisan u oba.
2. Events Manager → Test Events: prođi quiz i klikni checkout. Za `Lead` i `InitiateCheckout` mora stajati
   jedan event s oznakom "Deduplicated" (Browser + Server). Dva zasebna = dedup ne radi.
3. EMQ ≥ 6.0 na `Lead` i `Purchase`.
4. Obriši `META_TEST_EVENT_CODE`. Tek onda kampanja smije s PAUSED.

## PostHog dashboard

`Ursa funnel` (ID `1151378`, prikvačen): https://eu.posthog.com/project/367703/dashboard/1151378

1. Funnel `quiz_started → quiz_completed → vsl_viewed → vsl_50 → vsl_checkout_clicked → purchase` (7 dana, zadnjih 30)
2. Isti funnel po oglasu: breakdown po **event** propertyju `utm_content`, first touch
3. Leadovi, checkouti i kupnje po danu (jedinstveni ljudi)
4. Prihod po danu (`purchase.value`)
5. Leadovi po oglasu (`quiz_completed` po `utm_content`)
6. Odustajanje u kvizu (`quiz_step_reached` po `step_name`)
7. Udio leadova s brojem (`quiz_completed.has_phone`)
8. Povratak iz mailova (`$pageview` s `utm_medium=abandon`, po `utm_campaign`)
9. VSL gledanost (`vsl_viewed`, `vsl_50`, `vsl_75`)

Oglas se čita iz event propertyja `utm_content`, ne iz `$initial_utm_content`: u ovom projektu
person property `$initial_utm_content` ostaje prazan (provjereno HogQL-om 25. 11. 2026.).
Grafove je napravio n8n privremenim workflowom preko credentiala "PostHog personal API key"
(ključ "n8n ursa", prava Query read + Dashboard/Insight write); privremeni workflow je obrisan.
