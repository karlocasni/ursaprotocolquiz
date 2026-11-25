# Meta kampanja: URSA_QUIZ_COLD_2026-11

Sve se kreira preko Marketing API-ja (nikad kroz Ads Manager u pregledniku) i sve ostaje **PAUSED**.
Pušta je vlasnik, i tek nakon što je dedup potvrđen u Test Events (docs/tracking.md → Verifikacija).

## Struktura

| Razina | Ime | Postavke |
| --- | --- | --- |
| Kampanja | `URSA_QUIZ_COLD_2026-11` | Objective `OUTCOME_LEADS` (vidi napomenu), bez campaign budgeta (ABO), special ad categories `NONE` |
| Ad set | `BROAD_HR_25-54` | Budžet na ad setu: **20 €/dan je placeholder**, iznos postavlja vlasnik; optimizacija `OFFSITE_CONVERSIONS` na `Lead` (pixel), billing `IMPRESSIONS`, `LOWEST_COST_WITHOUT_CAP` |
| | | Targeting: HR, 25–54, oba spola, broad (bez interesa), Advantage+ audience isključen, automatski placementi |
| | | Isključeno: followeri Pagea/IG-a, postojeći klijenti (customer lista), kupci (`Purchase` 180 dana) |
| Ad | `STATIC_JELACIC_4x5` | statika 4:5 |
| Ad | `STATIC_BILJEZNICA_4x5` | statika 4:5 |
| Ad | `VIDEO_4RAZLOGA_25s` | **iz postojećeg organskog reela (post ID), nikad fresh upload** |

Sva tri ada u istom ad setu, ne dijeliti po spolu.

**Napomena o objectiveu:** brief traži Sales objective s optimizacijom na `Lead`. Meta to odbija
("Conversion event unavailable" za `LEAD` uz `OUTCOME_SALES`). Prednost je dana optimizaciji na `Lead`
(volumen za learning), pa je kampanja `OUTCOME_LEADS` s website konverzijom `Lead` na Ursa datasetu.
Kad `Purchase` dođe na ~50 tjedno, za optimizaciju na `Purchase` radi se nova Sales kampanja.

## Kreirano u Meti (25. 11. 2026., sve PAUSED)

| Što | Ime | ID |
| --- | --- | --- |
| Ad account | NEMA NE IDE | `act_2430184127255974` |
| Page | Stjepan Ursa | `588231537964866` |
| Dataset/pixel | Ursa Protocol (ursaprotocol.com) | `1375315374544689` |
| Kampanja | URSA_QUIZ_COLD_2026-11 | `120255092194980120` |
| Ad set | BROAD_HR_25-54 | `120255092196950120` |
| Ad | STATIC_JELACIC_4x5 | `120255092206890120` |
| Ad | STATIC_BILJEZNICA_4x5 | `120255092207080120` |
| Publika | RT_LANDED_NO_QUIZ_7D | `120255092186730120` |
| Publika | RT_QUIZ_NO_LEAD_14D | `120255092186980120` |
| Publika (isključena) | EXCL_BUYERS_180D | `120255092187470120` |
| Publika (isključena) | EXCL_PAGE_FOLLOWERS | `120255092187850120` |

Postojeći pixeli `Projekt90` i `Projekt-90` nisu korišteni: `Projekt90` šalje s `creator-akademija.web.app`
i `projekt90.nemaneide.com`, pa bi miješanje s Ursinim eventima kvarilo optimizaciju.

Još nedostaje: `VIDEO_4RAZLOGA_25s` (čeka post) i isključenje postojećih klijenata (čeka export liste).

Website URL na svakom adu: `https://ursaprotocol.com/`
URL parameters (polje Tracking → URL parameters, ne u sam URL):

```text
utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_id={{campaign.id}}&utm_term={{adset.name}}&utm_content={{ad.name}}&ad_id={{ad.id}}&adset_id={{adset.id}}&placement={{placement}}
```

## Custom audiences (abandon redovi bez kontakta)

| Ime | Pravilo |
| --- | --- |
| `RT_LANDED_NO_QUIZ_7D` | posjetili `ursaprotocol.com` (PageView), bez `ViewContent` s `content_name=quiz`, 7 dana |
| `RT_QUIZ_NO_LEAD_14D` | `ViewContent` s `content_name=quiz`, bez `Lead`, 14 dana |
| `EXCL_BUYERS_180D` | `Purchase`, 180 dana (isključenje) |

## Nacrt teksta oglasa (za pregled prije puštanja)

Pravila: cijena se ne spominje, nema prije/poslije, nema izmišljenih testimoniala, nema tvrdnji o osobnim
atributima čitatelja ("jesi li debeo", "tvoj višak kilograma") — Meta to odbija i zna srušiti account.

**Primary text**

> Većina ljudi ne zapne zbog volje, nego zato što prati plan koji nije napravljen za njihovo tijelo.
>
> Odgovori na 10 kratkih pitanja i saznaj koji si od 4 tipa tijela i što ti točno treba u sljedećih 90 dana. Traje 2 minute.

**Headline:** Koji si od 4 tipa tijela?
**Description:** Besplatni kviz, 2 minute
**CTA:** Learn more
