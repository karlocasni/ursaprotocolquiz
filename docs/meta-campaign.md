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
| Ad | `STATIC_LETAK_4x5` | statika 4:5, letak "Tražim ljude koji su sve probali i ništa nije upalilo" |
| Ad | `STATIC_ISTIPLAN_4x5` | statika 4:5, billboard "Isti plan ne radi za sva tijela" |
| Ad | `VIDEO_4RAZLOGA_58s` | video 9:16, dark post (odluka vlasnika 25. 11. 2026.) |

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
| Ad | STATIC_ISTIPLAN_4x5 (prije STATIC_JELACIC_4x5) | `120255092206890120`, kreativa `29784618354475009` |
| Ad | STATIC_LETAK_4x5 (prije STATIC_BILJEZNICA_4x5) | `120255092207080120`, kreativa `3436249950085852` |
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

## Kreative v2 (25. 11. 2026., univerzalne za muškarce i žene)

Slike: `images/ads/STATIC_LETAK_4x5.jpg`, `images/ads/STATIC_JELACIC_4x5.v3.jpg` (1600×2000, Gemini, provenance advertiser).
Stare kreative (žene, bilježnica) zamijenjene prije ikakvog spenda, pa `utm_content` = novo ime oglasa.

**STATIC_LETAK_4x5**
> Dijeta. Teretana. Aplikacije. Trčanje u siječnju.
>
> Ako ti ništa od toga nije potrajalo, problem vjerojatno nije u tebi, nego u planu koji nije napravljen za tvoje tijelo.
>
> Odgovori na 10 kratkih pitanja i saznaj koji si od 4 tipa tijela i što ti točno treba u sljedećih 90 dana. Traje 2 minute, besplatno je.

Headline "Koji si od 4 tipa tijela?" · Description "Besplatni kviz, 2 minute" · CTA Learn more

**STATIC_ISTIPLAN_4x5**
> Isti plan ne radi za sva tijela.
>
> Netko izgubi kile čim izbaci kruh. Netko drugi mjesecima broji kalorije, a vaga se ne pomakne. To nije pitanje volje, nego tipa tijela.
>
> Odgovori na 10 kratkih pitanja, saznaj koji si od 4 tipa i što ti točno treba u sljedećih 90 dana. Traje 2 minute.

Headline "Saznaj koji si od 4 tipa tijela" · Description "Besplatni kviz, 2 minute" · CTA Learn more

Obje: Advantage+ creative i automatske preinake (tekst, slika, animacija) isključeni, isti `url_tags` kao prije.

**VIDEO_4RAZLOGA_58s** (ad `120255099056770120`, kreativa `28531678013173914`, video `1118486477885143`)

`IMG_5903.MP4`, 57,6 s, 1080×1920. Vlasnik je 25. 11. 2026. odlučio da ide kao **dark post** (samo oglas, bez organske objave),
iznimka od pravila iz briefa. Kod skaliranja i dupliciranja koristiti **isti post** (`effective_object_story_id`
ovog oglasa), da lajkovi i komentari ostanu na jednom mjestu. Video je na Metu povučen s privremenog brancha koji je obrisan.

> Postoje 4 razloga zbog kojih ljudi ne dođu do forme koju žele. Ja znam sva četiri. Ne znam samo koji je tvoj.
>
> Zato sam napravio kviz od 10 kratkih pitanja. Traje 2 minute, a na kraju saznaješ koji si od 4 tipa tijela i što ti točno treba u sljedećih 90 dana.
>
> — Stjepan Ursa

Headline "Koji je tvoj razlog?" · Description "Besplatni kviz, 2 minute" · CTA Learn more

Napomene za iduću verziju videa: rez na ~25 s, početi s "Postoje točno 4 razloga…" umjesto kadra iz teretane,
"90 % planova" i "3 %" zamijeniti formulacijom bez brojki, izbaciti "savršen izgled" (Meta pravilo o negativnoj slici o sebi).
