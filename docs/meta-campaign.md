# Meta kampanja: URSA_QUIZ_COLD_2026-11

Sve se kreira preko Marketing API-ja (nikad kroz Ads Manager u pregledniku) i sve ostaje **PAUSED**.
Pušta je vlasnik, i tek nakon što je dedup potvrđen u Test Events (docs/tracking.md → Verifikacija).

## Struktura

| Razina | Ime | Postavke |
| --- | --- | --- |
| Kampanja | `URSA_QUIZ_COLD_2026-11` | Objective `OUTCOME_SALES`, bez campaign budgeta (ABO), special ad categories `NONE` |
| Ad set | `BROAD_HR_25-54` | Budžet na ad setu (iznos postavlja vlasnik), optimizacija `OFFSITE_CONVERSIONS` na `Lead` (pixel), billing `IMPRESSIONS`, `LOWEST_COST_WITHOUT_CAP` |
| | | Targeting: HR, 25–54, oba spola, broad (bez interesa), Advantage+ audience isključen, automatski placementi |
| | | Isključeno: followeri Pagea/IG-a, postojeći klijenti (customer lista), kupci (`Purchase` 180 dana) |
| Ad | `STATIC_JELACIC_4x5` | statika 4:5 |
| Ad | `STATIC_BILJEZNICA_4x5` | statika 4:5 |
| Ad | `VIDEO_4RAZLOGA_25s` | **iz postojećeg organskog reela (post ID), nikad fresh upload** |

Sva tri ada u istom ad setu, ne dijeliti po spolu.

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
