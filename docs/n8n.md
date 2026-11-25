# n8n: Ursa Tracking (Meta CAPI + abandon sekvence)

Workflow: `n8n/ursa-tracking.json`. Ugovor (payload, eventi, tablica sekvenci): `docs/tracking.md`.
U datoteci nema nijednog tokena ni ključa. Sve tajne žive samo u n8n credentialima.

## Što radi

1. **Webhook** `POST /webhook/ursa-capi` odmah vraća 200 bez tijela. Tijelo je form-urlencoded s poljem `payload` (JSON).
2. **Config** drži konstante, **Parse payload** čita JSON, hashira email i ime (SHA-256), uzima IP iz `x-forwarded-for`
   i slaže sve ostalo. Prihvaća samo `Lead` i `InitiateCheckout`; sve drugo tiho odbacuje.
3. **Meta CAPI** šalje event s istim `event_name` i `event_id` kao pixel (dedup). Ako Meta vrati grešku, mailovi idu dalje,
   a greška ostaje vidljiva u Executions.
4. **Lead**: čeka 1 h → nema `vsl_viewed` → mail s linkom na VSL. Čeka još 23 h →
   ima `vsl_checkout_clicked` ili `purchase` → stop; ima `vsl_50` → poruka u Slack `#ursa-odobrenje` (bez maila, javljaš se ručno);
   gledao manje od 50 % → mail s jednim pitanjem o cilju; nije gledao ni nakon prvog maila → ništa.
5. **InitiateCheckout s emailom**: 1 h bez `purchase` → mail 1; još 23 h bez `purchase` → mail 2. Bez emaila samo CAPI.

Zaštite:

- Bez ispravnog emaila nema mailova ni Slacka, samo CAPI.
- Webhook je javan, pa se mail šalje samo ako PostHog za taj email zaista ima `quiz_completed` (Lead) odnosno
  `vsl_checkout_clicked` (checkout). Tako nitko ne može preko webhooka slati naše mailove na tuđe adrese.
- Ako PostHog upit ne uspije, izvršenje pada i **ništa se ne šalje** (bolje nego pisati nekome tko je već kupio).
- Isti email u istom toku unutar 48 h pokreće sekvencu samo jednom (CAPI ide svaki put).
- Adrese iz `STOP_EMAILS` nikad ne dobivaju mail.

## 1. Import

1. n8n (egzosfera.app.n8n.cloud) → **Workflows** → **Add workflow** → izbornik `…` → **Import from File** →
   odaberi `n8n/ursa-tracking.json`.
2. Spremi (`Ctrl/Cmd + S`). Workflow je uvezen kao neaktivan.

## 2. Credentials (Settings → Credentials → Add credential)

Imena neka budu točno ovakva, onda ih nodovi lakše nađu. Nakon importa otvori svaki crveni node i odaberi credential.

| Ime | Tip u n8n-u | Polja | Gdje dobiti vrijednost | Nodovi |
| --- | --- | --- | --- | --- |
| `Meta CAPI token` | **Query Auth** | Name: `access_token`, Value: token | Meta Events Manager → tvoj dataset (pixel) → **Settings** → **Conversions API** → **Generate access token** | `Meta CAPI` |
| `PostHog personal API key` | **Header Auth** | Name: `Authorization`, Value: `Bearer <phx_ključ>` | PostHog (EU) → avatar → **Settings** → **Personal API keys** → **Create**. Scope: projekt Ursa, **Query: Read** (ako upit vrati 403, dodaj i **Person: Read**) | 4× `… PostHog check …` |
| `Resend` (postojeći credential **Ursa**, tip Resend API — već spojen) | **Header Auth** | Name: `Authorization`, Value: `Bearer <re_ključ>` | resend.com → **API Keys**. Ako već postoji credential iz email sekvence (`Resend` ili `Authorization Resend`), samo ga odaberi | 4× `… email …` |
| `Slack` (postojeći credential **SLACK_BOT** — već spojen) | **Slack API** (Access Token) | Access Token: `xoxb-…` | api.slack.com/apps → tvoja aplikacija → **OAuth & Permissions** → Bot Token Scopes: `chat:write` → **Install to Workspace** → kopiraj *Bot User OAuth Token*. U Slacku u `#ursa-odobrenje` upiši `/invite @ImeAplikacije` | `Slack: javi se ručno` |

Pošiljatelj mailova je `Ursa <ursa@nemaneide.com>` (isto kao postojeća sekvenca), domena mora biti verificirana u Resendu.

## 3. Config node

Otvori node **Config** i upiši:

| Polje | Vrijednost |
| --- | --- |
| `META_PIXEL_ID` | već upisano: `1375315374544689` (dataset "Ursa Protocol (ursaprotocol.com)"). Dok je `SET_ME`, CAPI se preskače. |
| `META_API_VERSION` | `v26.0` (ne diraj dok Meta ne ugasi verziju) |
| `META_TEST_EVENT_CODE` | prazno. Samo za testiranje: kod iz Events Manager → **Test events** (npr. `TEST12345`). Poslije obavezno obrisati. |
| `POSTHOG_PROJECT_ID` | već upisano: `367703`. Dok je `SET_ME`, nema mailova ni Slacka. |
| `POSTHOG_HOST` | `https://eu.posthog.com` |
| `SLACK_CHANNEL` | `ursa-odobrenje` |
| `EMAIL_FROM` | `Ursa <ursa@nemaneide.com>` |
| `STOP_EMAILS` | prazno; tu upisuješ adrese onih koji odgovore STOP, odvojene zarezom |

Odgovori na mailove (pitanja, STOP) stižu u `ursa@nemaneide.com`. STOP se ne obrađuje automatski: adresu dodaj u `STOP_EMAILS`.

## 4. Test na sebi

Frontend šalje na produkcijski URL (`/webhook/ursa-capi`), pa je najlakše testirati s aktivnim workflowom i skraćenim čekanjem.

1. U **Config** upiši `META_TEST_EVENT_CODE` (Events Manager → Test events).
2. Privremeno skrati čekanja: u `Lead: wait 1h` i `Lead: wait 23h` (ili u `Checkout: wait …` za checkout tok)
   stavi **Amount** `2`, **Unit** `Minutes`. Spremi i uključi workflow (vidi korak 5).
3. Na ursaprotocol.com prođi quiz sa svojim emailom. Za svaki novi test koristi novu adresu, npr. `ime+test1@gmail.com`,
   jer isti email unutar 48 h ne pokreće sekvencu ponovno.
4. Provjeri:
   - Events Manager → Test events: `Lead` mora biti **jedan** event s oznakom *Deduplicated* (Browser + Server).
   - n8n → **Executions**: izvršenje je u stanju *Waiting*.
   - Ne otvaraj VSL → nakon ~2 min stiže mail „jesi stigao/stigla pogledati?“ s linkom (`utm_source=email…`).
   - Za drugi korak: otvori VSL i pogledaj malo (ispod 50 %) → nakon drugog čekanja stiže mail s pitanjem o cilju.
     Pogledaj više od pola → umjesto maila poruka u `#ursa-odobrenje`. Klikni checkout → ništa.
   - Checkout tok: s emailom iz quiza klikni checkout i ne plati → mail 1, pa mail 2.
5. Kad sve radi: vrati čekanja na **1 hour** i **23 hours**, obriši `META_TEST_EVENT_CODE`, spremi.
   Izvršenja koja već čekaju zadržavaju postavke s kojima su krenula.

Bez aktivacije (samo jedan poziv): klikni **Execute workflow** (webhook sluša na test URL-u) i pošalji:

```bash
curl -X POST 'https://egzosfera.app.n8n.cloud/webhook-test/ursa-capi' \
  --data-urlencode 'payload={"event_name":"Lead","event_id":"test-'"$(date +%s)"'","event_time":'"$(date +%s)"',"event_source_url":"https://ursaprotocol.com/","user_agent":"curl-test","email":"TVOJ@EMAIL.hr","first_name":"Ime","quiz":{"gender":"Muško","goal":"test"},"vsl_url":"https://ursaprotocol.com/vsl.html?name=Ime","custom_data":{"content_name":"quiz"}}'
```

Mail ide samo ako taj email već ima `quiz_completed` u PostHogu (prođi quiz s njim barem jednom).

## 5. Aktivacija

Gore desno prebaci **Inactive → Active** (u novijim verzijama gumb **Publish**). Tek tada radi
`https://egzosfera.app.n8n.cloud/webhook/ursa-capi`. Čekanja od 1 h i 23 h n8n Cloud sprema u bazu, pa prežive restart.

## Ako nešto ne radi

- **Nema CAPI eventa**: `META_PIXEL_ID` je još `SET_ME`, ili token nema prava. Otvori izvršenje → node `Meta CAPI` → odgovor Mete.
- **Nikad ne stiže mail**: otvori `… read check …` u izvršenju. `stop_unverified` znači da PostHog za taj email ne nalazi
  `quiz_completed` / `vsl_checkout_clicked` (provjeri da quiz radi `posthog.identify(email)`).
- **Izvršenje pada na `… PostHog check …`**: krivi `POSTHOG_PROJECT_ID`, ključ bez scopea *Query: Read*, ili krivi host.
- **Slack greška `not_in_channel`**: pozovi bota u `#ursa-odobrenje`.
