/*
 * Sadržaj i logika za sve VSL stranice (vsl, vsl2, vsl21, vsl3).
 * Razlike među stranicama su u <body>:
 *   data-page    ime stranice u analitici
 *   data-gender  "auto" (iz kviza), "m" ili "f"
 *   data-lock    "1" = ponuda zaključana dok se ne odgleda 2:20, "0" = odmah otvorena
 */
(function () {
    const CHECKOUT = {
        premium: 'https://nemaneide.ursaprotocol.com/checkout/',
        standard: 'https://nemaneide.ursaprotocol.com/checkout/'
    };
    // Bez sale.js (npr. stara stranica iz cachea) ponuda radi s redovnim cijenama
    const sale = window.UrsaSale || { active: false, stripHtml: () => '', barHtml: () => '', priceHtml: (plan, regular) => `<p class="price">${regular}<span>€</span></p>`, url: (plan, regular) => regular, start: () => {} };
    const WHATSAPP = 'https://wa.me/385992088022?text=%20URSAPROTOCOL';
    const REGULAR = { premium: 597, standard: 397 }; // isto kao priceHtml u offerHtml()

    const body = document.body;
    const PAGE = body.dataset.page;
    const params = new URLSearchParams(location.search);
    const store = (() => { try { return window.sessionStorage; } catch (e) { return null; } })();
    const fromQuiz = key => params.get(key) || (store && store.getItem('ursa_' + key)) || '';
    const isFemale = body.dataset.gender === 'f' || (body.dataset.gender === 'auto' && fromQuiz('gender') === 'Žensko');
    const BODY_TYPES = {
        mrsav: ['Mršav', 'Mršava', 'mrsav.webp'],
        prosjecan: ['Prosječan', 'Prosječna', 'prosjEcan.webp'],
        krupan: ['Krupan', 'Krupna', 'krupan.webp'],
        pretezak: ['Pretežak', 'Preteška', 'pretezak.webp']
    };
    const bodytype = BODY_TYPES[fromQuiz('bodytype')] ? fromQuiz('bodytype') : '';
    // Bez track.js (stara stranica iz cachea) sve radi kao prije, samo bez pixela i atribucije
    const T = window.UrsaTrack || { pixel: () => {}, server: () => {}, carry: u => u, uuid: () => String(Date.now()) + Math.random().toString(16).slice(2), setCookie: () => {} };

    // ---------- Analitika (PostHog) ----------
    function track(event, props, leaving) {
        if (!window.posthog) return;
        const common = { vsl_page: PAGE, vsl_gender: isFemale ? 'Žensko' : 'Muško', vsl_from_quiz: params.has('goal'), vsl_version: '2026-11', vsl_sale: sale.active, vsl_bodytype: bodytype || 'nepoznato' };
        try { posthog.capture(event, Object.assign(common, props), leaving ? { transport: 'sendBeacon' } : undefined); } catch (e) {}
    }

    // ---------- Tekst ponude ----------
    const VALUE = [
        ['90-dnevni personalizirani plan transformacije', 'Svaki dan, svaki trening, svaki obrok isplaniran za tebe. Samo prati plan.'],
        ['Plan treninga napravljen za tvoj cilj', 'Tvoj plan. Za tvoje tijelo. Za tvoju razinu. Mijenja se kako napređuješ.'],
        ['Plan prehrane s točnim popisom namirnica', 'Točno što jesti, koliko, i kada. Bez dijeta, bez gladovanja, bez kompliciranja.'],
        ['Ekskluzivna aplikacija samo za polaznike', 'Svi treninzi, obroci i napredak na jednom mjestu. Otvoriš i znaš točno što radiš danas.'],
        ['Ursa osobno pregledava tvoj napredak', 'Ispravlja greške, odgovara na pitanja i ne dopušta ti da odustaneš. Ovo nije neki random trener. Ovo je direktan pristup njemu.'],
        ['24/7 podrška', 'Kada god imaš pitanje, slobodno pošalji poruku. Tu smo kad god ti treba.'],
        ['Tjedno praćenje i prilagodba plana', 'Svaki tjedan pregledavamo napredak i prilagođavamo plan. Nema stagnacije.'],
        ['Privatna zajednica', 'Grupa ljudi koji prolaze isto. Motivacija, odgovornost, rezultati.'],
        ['Privatni seminari i edukacije', 'Ekskluzivni video seminari samo za članove. Znanje koje nećeš naći na YouTubeu.']
    ];
    const BONUSES = [
        ['Privatni video trening "Neprobojni mindset"', 'Mentalni operativni sustav koji koristim ja i koji koriste moji najuspješniji klijenti. Kako da nastaviš i kad ti se ne da i kako da budeš konsistentan kad svi drugi odustanu.'],
        ['Vodič za teške dane', 'Moj osobni sustav za dane kad bi najradije sve poslao u pm. Jer motivacija dolazi i odlazi. To svi znamo. Ali muškarci koji naprave transformaciju imaju sustav za te dane.'],
        ['Vodič za suplemente', 'Znam koliko para ljudi bacaju na gluposti, BCAA-e, fat burnere i sto drugih stvari koje su vidjeli na Instagramu. U ovom vodiču reći ću ti točno što vrijedi uzimati, što je bacanje para i što ja osobno koristim. Bez sponzoriranih sranja. Samo istina.'],
        ['2 mjesečna grupna LIVE Q&amp;A poziva', 'Sa mnom i s ostalim polaznicima URSA Protocol-a. Trening, prehrana, mindset — pitaš što hoćeš, možemo pričati o bilo čemu.']
    ];
    const FEATURES = ['Kompletni program transformacije', 'Plan treninga i prehrane', 'Pristup aplikaciji', 'Ursa pregledava tvoj napredak', '24/7 podrška', 'Privatna zajednica', 'Svi bonusi', 'Garantirana transformacija i novi izgled'];
    const PREMIUM = ['Ursa te prati punih 6 mjeseci', 'Prioritetni odgovor od Urse', 'Privatni 1-na-1 poziv sa Ursom kada god trebaš', 'Doživotni popust na sve buduće programe', 'Zajednički trening sa Ursom uživo', 'Karta za godišnji URSA Giveaway (5000€+)'];
    const COMPARE = ['Znaš točno što radiš svaki dan', 'Netko pregledava tvoj napredak', 'Plan prehrane prilagođen tebi', 'Imaš podršku kada zapneš', 'Okružen si ljudima s istim ciljem'];
    const FAQ = [
        ['Trebam li iskustvo s treningom?', 'Ne. Uopće nije bitno jesi li ikad ušao u teretanu ili treniraš godinama. Program se prilagođava tebi. Dobiješ plan za svoju razinu i kreneš od tamo. Neke od naših najboljih transformacija napravili su muškarci koji nikada prije nisu ozbiljno trenirali.'],
        ['Trebam li teretanu?', 'Za najbolje rezultate da. Ali ako nemaš pristup teretani, imamo verzije treninga za kod kuće s minimalnom opremom. Neće biti isti rezultat kao u punoj teretani, ali možeš napraviti ozbiljan napredak.'],
        ['Nemam vremena, radim cijeli dan.', 'Treninzi traju 45 do 60 minuta, 3 do 5 puta tjedno. Priprema obroka 15 do 20 minuta. I iskreno, imaš vremena. Svi imamo ista 24 sata. Pitanje je samo što staviš na listu prioriteta. Ako imaš vremena navečer za serije, društvene mreže i gledanje videa, imaš vremena i za trening.'],
        ['Što ako ne mogu jesti određenu hranu?', 'Plan prehrane se prilagođava tebi. Alergije, netolerancije i preferencije uzimaju se u obzir. Nema namirnica koje moraš jesti. Sve se može zamijeniti.'],
        ['Koliko brzo ću vidjeti rezultate?', 'Većina polaznika vidi prve promjene unutar 2 do 3 tjedna. Ozbiljnije vidljive promjene dolaze oko 4. do 6. tjedna. Za 90 dana možeš očekivati veliku promjenu. Ali puno ovisi o tebi. Koliko si dosljedan, toliko će rezultati brže doći.'],
        ['Već sam probao sve i ništa ne radi.', 'Nisi probao ovo. Probao si sam. Probao si razne planove s interneta. Probao si bez nekoga tko te vodi i prilagođava plan tebi svaki tjedan. Ovo nije još jedan pokušaj. Ovo je sustav koji je transformirao stotine muškaraca. Razlika je što ovaj put nisi sam.'],
        ['Mislim da sam prestar za ovo.', 'Imamo polaznike od 18 do 50 i više godina. Plan se prilagođava tvojoj dobi, razini i cilju. Godine nisu problem. Nedostatak plana je problem.'],
        ['Koja je razlika između 90 i 180 dana?', '90 dana je dovoljno za ozbiljnu transformaciju. 180 dana daje ti duplo više vremena s Ursom, mjesečne individualne pozive, prioritetnu podršku i doživotni pristup budućim pogodnostima. Muškarci koji odaberu 180 dana često postižu bolje rezultate jer imaju dovoljno vremena da promjena postane trajna navika.'],
        ['Kako izgleda aplikacija?', 'Otvoriš ujutro i točno piše što radiš taj dan. Koji trening. Koji obroci. Koliko čega. Praćenje napretka, slike i brojke, sve na jednom mjestu. Nema razmišljanja. Samo otvoriš i pratiš plan.'],
        ['Što ako imam pitanje usred dana ili navečer?', 'Imaš podršku cijeli dan. Pošalji poruku kad god ti treba. U 7 ujutro ili u 11 navečer dobit ćeš odgovor.'],
        ['Što ako nisam zadovoljan?', 'Prati plan do kraja. Ako ne vidiš rezultate, vraćamo ti svaki cent. I Ursa ti daje 200 eura iz vlastitog džepa kao ispriku za izgubljeno vrijeme. Ti dobiješ sve nazad, mi gubimo novac. Spreman je to napraviti jer nijedan muškarac koji je pratio protokol do kraja nije ostao isti.'],
        ['Je li plaćanje sigurno?', 'Potpuno. Plaćanje ide preko sigurnog sustava za naplatu koji koriste najveće svjetske tvrtke. Podaci tvoje kartice idu direktno tom sustavu. Mi ih nikada ne vidimo, ne spremamo i nemamo pristup njima. Sve je zaštićeno bankarskom razinom sigurnosti.'],
        ['Mogu li plaćati na rate?', 'Da. Prihvaćamo i druge načine plaćanja. Javi nam se porukom i dogovorit ćemo opciju koja ti najviše odgovara.'],
        ['Kad mogu početi?', 'Odmah. Čim se prijaviš, dobiješ pristup aplikaciji i svoj plan. Ne čekaš nikoga. Ne čekaš ponedjeljak.'],
        ['Imam još pitanja.', `Javi nam se porukom klikom na gumb ispod. Odgovaramo brzo.<a class="btn wa" href="${WHATSAPP}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Pošalji poruku na WhatsApp</a>`]
    ];

    // "Ne znaš koji je paket za tebe?": WhatsApp Ursi s već napisanom porukom (ime, cilj i odgovori iz kviza)
    function waPlanHref() {
        const name = fromQuiz('name');
        const facts = [
            ['Cilj', fromQuiz('goal')],
            ['Godine', fromQuiz('age')],
            ['Tip tijela', bodytype ? BODY_TYPES[bodytype][isFemale ? 1 : 0] : ''],
            ['Iskustvo', fromQuiz('struggle')]
        ].filter(f => f[1]);
        const lines = [`Bok Ursa${name && name !== 'Prijatelju' ? ', ja sam ' + name : ''}. ${isFemale ? 'Pogledala' : 'Pogledao'} sam tvoj video i ne znam koji je paket za mene.`];
        if (facts.length) lines.push('', ...facts.map(([k, v]) => `${k}: ${v}`));
        lines.push('', 'Koji bi mi preporučio?');
        return WHATSAPP.split('?')[0] + '?text=' + encodeURIComponent(lines.join('\n'));
    }

    const check = '<i class="fa-solid fa-check" aria-hidden="true"></i>';
    const list = (items, cls) => `<ul class="${cls}">${items.map(i => `<li>${check}<span>${i}</span></li>`).join('')}</ul>`;
    const cta = (where, cls) => `<a class="btn ${cls || ''}" href="#premium-plan" data-cta="${where}">Želim krenuti →</a>`;
    const proof = `<div class="proof"><img src="images/web/socialproof.webp" width="520" height="231" alt="Uspješni polaznici" loading="lazy"><p>Petar, Matej, Josip i još 1012 muškaraca je počelo iz iste točke kao ti. Danas izgledaju najbolje ikad.</p></div>`;
    const claws = '<span class="claws" aria-hidden="true"></span>';

    function offerHtml() {
        return `
        ${sale.stripHtml()}
        <section class="band value" data-section="1 Sto dobivas">
            <div class="wrap">
                <h2>Evo sve što dobivaš da za 90 dana imaš tijelo koje si oduvijek htio:</h2>
                <img class="stack" src="images/web/stack.webp" width="1500" height="626" alt="URSA Protocol paket: program, bonusi i aplikacija">
                <div class="value-grid">${VALUE.map(([t, d]) => `<div class="value-item"><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>
            </div>
        </section>

        <section class="band band--2 results" data-section="2 Transformacije">
            <div class="wrap">
                <h2>Krenuli su iz iste točke kao ti. Pogledaj ih sada.</h2>
                <div class="results-grid">${[1, 2, 3, 4, 5, 6].map(i => `<img src="images/web/testimonial${i}.webp" width="760" height="760" alt="Transformacija polaznika ${i}" loading="lazy">`).join('')}</div>
            </div>
        </section>

        <section class="band bonuses" data-section="3 Bonusi">
            <div class="wrap">
                <div class="head">
                    <h2>Dobit ćeš i 4 ekskluzivna neviđena bonusa potpuno besplatno.</h2>
                    <p>Kako bi ti dao još veću prednost i olakšao put, odlučio sam ubaciti nešto ekstra…</p>
                </div>
                <div class="bonus-grid">${BONUSES.map(([t, d], i) => `<article class="bonus"><div class="bonus-img"><img src="images/web/bonus${i + 1}.webp" alt="" loading="lazy"></div><div><p class="bonus-tag">Besplatan bonus #${i + 1}</p><h3>${t}</h3><p>${d}</p></div></article>`).join('')}</div>
            </div>
        </section>

        <section class="band band--2 pricing" data-section="4 Cijene">
            <div class="wrap">
                ${sale.barHtml()}
                <h2>Odaberi svoj plan:</h2>
                <div class="plans">
                    <article class="plan plan--top" id="premium-plan">
                        <p class="plan-badge">Najpopularniji odabir</p>
                        <h3>Potpuna transformacija</h3>
                        <p class="plan-len">180 dana programa</p>
                        <p class="plan-for">Za one koji žele ekskluzivni pristup Ursi i rezultate koji ostaju.</p>
                        ${list(FEATURES, 'ticks')}
                        <div class="plan-extra"><p>Ekskluzivno uz Premium:</p>${list(PREMIUM, 'ticks')}</div>
                        <div class="plan-buy">${sale.priceHtml('premium', 597)}<a class="btn" id="btn-buy-797" href="${sale.url('premium', CHECKOUT.premium)}" data-buy="premium">Želim krenuti →</a></div>
                    </article>
                    <article class="plan">
                        <h3>Spreman za promjenu</h3>
                        <p class="plan-len">90 dana programa</p>
                        <p class="plan-for">Sve što trebaš za plan transformacije u 90 dana.</p>
                        ${list(FEATURES, 'ticks')}
                        <div class="plan-buy">${sale.priceHtml('standard', 397)}<a class="btn btn--white" id="btn-buy-497" href="${sale.url('standard', CHECKOUT.standard)}" data-buy="standard">Započni →</a></div>
                    </article>
                </div>
                <div class="plan-help">
                    <p><strong>Ne znaš koji je paket za tebe?</strong> Piši Ursi na WhatsApp. Poruka s tvojim odgovorima iz kviza je već napisana, samo je pošalješ.</p>
                    <a class="btn wa" href="${waPlanHref()}" target="_blank" rel="noopener" data-wa="paket"><i class="fa-brands fa-whatsapp"></i> Pitaj Ursu na WhatsApp</a>
                </div>
            </div>
        </section>

        <section class="band guarantee" data-section="5 Garancija">
            ${claws}
            <div class="wrap">
                <h2>Za 90 dana izgledaš bolje nego ikad.<br>Ako ne, vraćam ti sve + 200€.</h2>
                <div class="guarantee-text">
                    <p>Imam toliko povjerenja u ovaj program da ti dajem garanciju koja ide protiv mene.</p>
                    <p>Prati plan. Pojavi se. Odradi što ti kažem. Ako za 90 dana ne vidiš promjenu na svom tijelu, ne samo da ti vraćam kompletan iznos, nego ti dajem 200€ iz vlastitog džepa kao ispriku za izgubljeno vrijeme.</p>
                    <p>Zašto? Jer nitko tko je pratio ovaj program nije ostao isti. Nitko. I spreman sam staviti svoj novac iza te tvrdnje.</p>
                    <p><strong>Ovdje ne riskiraš ništa. Doslovno ništa.</strong></p>
                    <p>Jedino što možeš izgubiti je tijelo koje ti se ne sviđa.</p>
                    ${cta('garancija', 'btn--ink')}
                </div>
            </div>
        </section>

        <section class="band compare" data-section="6 Usporedba">
            <div class="wrap">
                <h2>Pogledaj usporedbu…</h2>
                <table>
                    <thead><tr><td></td><th scope="col">Sam, bez plana</th><th scope="col">URSA</th></tr></thead>
                    <tbody>
                        ${COMPARE.map(c => `<tr><th scope="row">${c}</th><td class="no"><i class="fa-solid fa-xmark" role="img" aria-label="Ne"></i></td><td class="yes"><i class="fa-solid fa-check" role="img" aria-label="Da"></i></td></tr>`).join('')}
                        <tr><th scope="row">Rezultati za 90 dana</th><td class="no">Možda</td><td class="yes">Garantirano</td></tr>
                    </tbody>
                </table>
                <div class="after">${cta('usporedba')}${proof}</div>
            </div>
        </section>

        <section class="band band--2 letter" data-section="7 Pismo">
            <div class="wrap">
                <div class="letter-top">
                    <div class="letter-text">
                        <h2>Moram ti reći još ovo…</h2>
                        <p>Ti i ja znamo jednu stvar:</p>
                        <p class="strong">Ako ništa ne promijeniš, ništa se neće promijeniti.</p>
                        <p>Možeš zatvoriti ovu stranicu. Možeš si reći "razmislit ću". Ali ti i ja znamo što "razmislit ću" zapravo znači. Znači nikad.</p>
                        <p class="strong">I to nije prvi put.</p>
                        <p>Koliko puta si već rekao "od ponedjeljka"?</p>
                        <p>Koliko puta si krenuo pa odustao nakon dva tjedna?</p>
                        <p>Koliko puta si se pogledao u ogledalo i obećao sebi da će biti drugačije, a onda napravio apsolutno ništa?</p>
                        <p>To nije manjak volje. To je manjak sustava. I to se danas može promijeniti.</p>
                        <p class="strong">Imaš 2 opcije.</p>
                    </div>
                    <div class="letter-img"><img src="images/web/ursa.webp" width="975" height="1300" alt="Ursa" loading="lazy"></div>
                </div>
                <div class="options">
                    <div class="option option--1">
                        <h3>Opcija 1:</h3>
                        <p>Klikneš gumb ispod i prestaješ lagati samome sebi.</p>
                        <p>Dobivaš točan plan. Ursu osobno. Podršku svaki dan. Zajednicu koja te drži. I prvi put u životu ovo ne radiš sam.</p>
                        <p class="date" id="date-badge"></p>
                        <p>Taj dan ćeš ili stajati pred ogledalom u tijelu koje si sam izgradio ili ćeš stajati u istom tijelu u kojom stojiš sada i pitati se zašto opet nisi ništa napravio.</p>
                        <p>Taj dan dolazi, sviđalo se to tebi ili ne.</p>
                        <p>Jedino pitanje je što ćeš vidjeti kada se pogledaš.</p>
                    </div>
                    <div class="option">
                        <h3>Opcija 2:</h3>
                        <p>Ne napraviš ništa.</p>
                        <p>Zatvoriš stranicu. Otvoriš Instagram. Gledaš tuđe transformacije. Kažeš "on ima bolju genetiku". Nema.</p>
                        <p>Imao je plan i nekoga tko ga je vodio.</p>
                        <p>I nastaviš po starom. Isti treninzi bez smisla. Ista prehrana bez plana. Isti rezultati. Nikakvi.</p>
                        <p>I za godinu dana stojiš na istom mjestu, čitaš sličnu stranicu i opet se dvoumiš.</p>
                    </div>
                </div>
                <div class="after after--letter">
                    <p class="now">Koliko puta ćeš ponoviti isti krug prije nego što kažeš dosta? <strong>Ovo je taj trenutak. Ovdje. Sada.</strong></p>
                    ${cta('pismo')}${proof}
                </div>
            </div>
        </section>

        <section class="band faq" data-section="8 Cesta pitanja">
            <div class="wrap faq-wrap">
                <div class="faq-head"><h2>Česta pitanja</h2>${cta('faq')}</div>
                <div>${FAQ.map(([q, a], i) => `<details id="faq-${i + 1}"><summary>${q}<i class="fa-solid fa-plus" aria-hidden="true"></i></summary><div class="answer"><p>${a}</p></div></details>`).join('')}</div>
            </div>
        </section>

        <footer class="band band--2 foot" data-section="9 Podnozje">
            <div class="wrap">
                <div class="foot-top">
                    <img src="images/web/logo.webp" width="640" height="510" alt="URSA PROTOCOL" loading="lazy">
                    <nav>
                        <a href="https://drive.google.com/drive/folders/1NpvLzwIeTb3f-KmKWSqDC0EFBHChSTgB?usp=drive_link" target="_blank" rel="noopener noreferrer">Cjenik</a>
                        <a href="#">Disclaimer</a><a href="#">Privacy Policy</a><a href="#">Refund Policy</a>
                    </nav>
                    <p>Kontakt: <a href="mailto:kontakt@nemaneide.com">kontakt@nemaneide.com</a><br>Whatsapp: <a href="${WHATSAPP}" target="_blank" rel="noopener">+385 99 2088 022</a></p>
                </div>
                <div class="legal">
                    <p>This site is not a part of the Facebook website or Facebook, Inc. Additionally, this site is NOT endorsed by Facebook in any way. FACEBOOK is a trademark of Facebook, Inc.</p>
                    <p>NAPOMENA: Rezultati variraju od osobe do osobe i ovise o individualnom tijelu, genetici, prehrambenim navikama i dosljednosti. Primjeri transformacija prikazani na ovoj stranici nisu garancija identičnih rezultata. Ovaj program nije zamjena za medicinski savjet. Savjetuj se sa svojim liječnikom prije početka programa.</p>
                    <p>© ${new Date().getFullYear()} URSA PROTOCOL. Sva prava pridržana.</p>
                </div>
            </div>
        </footer>`;
    }

    // ---------- Ženska verzija ----------
    const FEMALE = [
        [/Rekao si/g, 'Rekla si'],
        [/koje si oduvijek htio/g, 'koje si oduvijek htjela'],
        [/Krenuli su iz iste točke kao ti/g, 'Krenule su iz iste točke kao ti'],
        [/budeš konsistentan/g, 'budeš konsistentna'],
        [/sve poslao u pm/g, 'sve poslala u pm'],
        [/muškarci koji/g, 'ljudi koji'],
        [/Petar, Matej, Josip i još 1012 muškaraca/g, 'Ana, Petra, Ivana i još 1012 žena'],
        [/stotine muškaraca/g, 'stotine ljudi'],
        [/Muškarci koji odaberu/g, 'Ljudi koji odaberu'],
        [/nijedan muškarac koji/g, 'nitko tko'],
        [/lagati samome sebi/g, 'lagati samoj sebi'],
        [/već rekao/g, 'već rekla'],
        [/krenuo pa odustao/g, 'krenula pa odustala'],
        [/si se pogledao u ogledalo/g, 'si se pogledala u ogledalo'],
        [/obećao sebi/g, 'obećala sebi'],
        [/napravio apsolutno ništa/g, 'napravila apsolutno ništa'],
        [/si sam izgradio/g, 'si sama izgradila'],
        [/nisi ništa napravio/g, 'nisi ništa napravila'],
        [/Spreman za promjenu/g, 'Spremna za promjenu'],
        [/jesi li ikad ušao/g, 'jesi li ikad ušla'],
        [/sam probao sve/g, 'sam probala sve'],
        [/Nisi probao/g, 'Nisi probala'],
        [/Probao si sam\./g, 'Probala si sama.'],
        [/Probao si/g, 'Probala si'],
        [/ovaj put nisi sam\./g, 'ovaj put nisi sama.'],
        [/sam prestar za/g, 'sam prestara za'],
        [/si dosljedan/g, 'si dosljedna'],
        [/nisam zadovoljan\?/g, 'nisam zadovoljna?'],
        [/testimonial([1-6])\.webp/g, 'testimonialfemale$1.webp'],
        [/Sam, bez plana/g, 'Sama, bez plana'],
        [/Okružen si/g, 'Okružena si'],
        [/ne radiš sam\./g, 'ne radiš sama.'],
        [/"on ima bolju genetiku"/g, '"ona ima bolju genetiku"'],
        [/Imao je plan i nekoga tko ga je vodio/g, 'Imala je plan i nekoga tko ju je vodio']
    ];
    const forGender = text => isFemale ? FEMALE.reduce((t, [from, to]) => t.replace(from, to), text) : text;

    // ---------- Prikaz ----------
    const pitch = document.getElementById('vsl-pitch');
    pitch.innerHTML = forGender(offerHtml());

    sale.start(pitch, {
        seen: (plan, price) => track('vsl_sale_seen', { plan: plan, price: price }),
        regularUrl: plan => CHECKOUT[plan]
    });

    const goalEl = document.getElementById('hero-goal');
    if (goalEl) {
        // Samo cijeli odgovori iz kviza; skraćen ili nepoznat tekst iz linka pada na općeniti cilj
        const GOALS = {
            'izgubiti višak kilograma': 'izgubiti višak kilograma',
            'dobiti mišiće i izgledati bolje': 'dobiti mišiće i izgledati bolje',
            'izgubiti kilograme i dobiti mišiće u isto vrijeme': 'izgubiti kilograme i dobiti mišiće u isto vrijeme',
            'ne znam točno, ali želim početak': 'napraviti prvi korak'
        };
        const answers = [params.get('goal'), store && store.getItem('ursa_goal')];
        const known = answers.map(a => GOALS[(a || '').replace(/\s+/g, ' ').trim().toLowerCase()]).find(Boolean);
        goalEl.textContent = known || 'postići svoj cilj';
        const said = document.getElementById('hero-said');
        if (said) said.textContent = forGender(said.textContent);
    }

    // Tip tijela iz quiza (kreativ "koji si od 4"): mala oznaka iznad naslova
    const heroTitle = document.querySelector('.hero h1');
    if (bodytype && heroTitle) {
        const [m, f, img] = BODY_TYPES[bodytype];
        const tag = document.createElement('p');
        tag.className = 'hero-type';
        tag.innerHTML = `<img src="images/web/${img}" alt="" width="40" height="40"><span>Tvoj tip tijela: <b></b></span>`;
        tag.querySelector('b').textContent = isFemale ? f : m;
        heroTitle.before(tag);
    }

    const d = new Date();
    d.setDate(d.getDate() + 90);
    document.getElementById('date-badge').textContent = d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'numeric', year: 'numeric' }) + ' → To je datum. Točno 90 dana od danas.';

    document.querySelectorAll('.faq details').forEach(item => item.addEventListener('toggle', () => {
        if (!item.open) return;
        track('vsl_faq_opened', { question: item.querySelector('summary').textContent.trim() });
        document.querySelectorAll('.faq details[open]').forEach(o => { if (o !== item) o.open = false; });
    }));

    // ---------- Stanje posjeta ----------
    const openedAt = Date.now();
    const visit = { seen: false, opened: false, checkout: false, section: '' };

    // ---------- Zaključavanje ----------
    const lock = document.getElementById('unlock-loader');
    const KEY = 'ursa_vsl_unlocked';
    const remembered = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
    const remember = on => { try { on ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch (e) {} };
    const skipLock = params.has('reveal') || params.get('open') === '1' || params.get('skip') === 'true';
    if (params.get('lock') === '1') remember(false); // za testiranje: ?lock=1 ponovno zaključa

    const ring = lock && lock.querySelector('.progress');
    const RING = 2 * Math.PI * 32;

    function lockProgress(t) {
        if (!lock || lock.classList.contains('unlocked')) return;
        const left = Math.max(0, Math.ceil(UrsaPlayer.unlockAt - t));
        document.getElementById('unlock-time').textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
        ring.style.strokeDashoffset = RING * (1 - Math.min(1, t / UrsaPlayer.unlockAt));
    }

    function unlockReady() {
        if (!lock || lock.classList.contains('unlocked')) return;
        remember(true);
        ring.style.strokeDashoffset = 0;
        lock.disabled = false;
        lock.querySelector('#unlock-icon').innerHTML = '<i class="fa-solid fa-lock-open"></i>';
        lock.classList.add('unlocked');
    }

    function openOffer(how, scroll) {
        if (visit.opened) return;
        visit.opened = true;
        pitch.hidden = false;
        if (lock) lock.hidden = true;
        track('vsl_offer_opened', { how: how, second: Math.round(player.time) });
        watchSections();
        if (scroll) pitch.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ---------- Player ----------
    const videoEl = document.getElementById('vsl-video');
    // Diskretni pragovi gledanja, jednom po posjetu (vsl_video_progress ostaje kakav je)
    const milestones = [[0.5, 'vsl_50'], [0.75, 'vsl_75']];
    function watchMilestones(t) {
        const dur = player && player.duration;
        if (!dur || !isFinite(dur)) return;
        while (milestones.length && t / dur >= milestones[0][0]) {
            const [, name] = milestones.shift();
            track(name, { second: Math.round(t), percent: Math.round(t / dur * 100) });
        }
    }
    const player = UrsaPlayer.create(videoEl, {
        start: () => track('vsl_video_started', { seconds_to_start: Math.round((Date.now() - openedAt) / 1000) }),
        time: t => { lockProgress(t); watchMilestones(t); },
        mark: (s, dur) => track('vsl_video_progress', { second: s, percent: Math.round(s / dur * 100) }),
        pause: s => track('vsl_video_paused', { second: Math.round(s) }),
        resume: s => track('vsl_video_resumed', { second: Math.round(s) }),
        mute: (m, s) => track('vsl_video_muted', { muted: m, second: Math.round(s) }),
        unlock: s => { track('vsl_video_unlocked', { second: Math.round(s) }); unlockReady(); },
        finish: end => {
            track('vsl_video_finished', {});
            end.hidden = false;
            end.innerHTML = `<button type="button" class="btn" id="vp-end-cta">Želim krenuti →</button>`;
            end.firstElementChild.addEventListener('click', () => { openOffer('kraj videa', false); goToPlans('kraj videa'); });
        },
        error: code => { track('vsl_video_error', { code: code }); unlockReady(); openOffer('greska videa', false); }
    });

    new IntersectionObserver((entries, io) => {
        if (entries[0].isIntersecting) { visit.seen = true; track('vsl_video_seen', {}); io.disconnect(); }
    }, { threshold: 0.5 }).observe(videoEl);

    // ---------- Čitanje ponude ----------
    function watchSections() {
        const io = new IntersectionObserver(entries => entries.forEach(e => {
            if (!e.isIntersecting) return;
            io.unobserve(e.target);
            const name = e.target.dataset.section;
            if (parseInt(name) > (parseInt(visit.section) || 0)) visit.section = name;
            track('vsl_section_viewed', { section: name, section_no: parseInt(name) });
        }), { rootMargin: '0px 0px -40% 0px' });
        pitch.querySelectorAll('[data-section]').forEach(s => io.observe(s));
    }

    function goToPlans(where) {
        track('vsl_cta_clicked', { where: where });
        (pitch.querySelector('.sale-bar') || document.getElementById('premium-plan')).scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    pitch.addEventListener('click', e => {
        const jump = e.target.closest('[data-cta]');
        if (jump) { e.preventDefault(); goToPlans(jump.dataset.cta); return; }
        const wa = e.target.closest('[data-wa]');
        if (wa) {
            track('vsl_whatsapp_clicked', { where: wa.dataset.wa, second: Math.round(player.time) }, true);
            T.pixel('Contact', { content_name: wa.dataset.wa }, T.uuid());
            return;
        }
        const buy = e.target.closest('[data-buy]');
        if (buy) {
            visit.checkout = true;
            const plan = buy.dataset.buy;
            const value = sale.active && sale.price ? sale.price(plan) : REGULAR[plan];
            // Jedan UUID po kliku: isti ide u PostHog, pixel i CAPI (dedup)
            const eventId = T.uuid();
            track('vsl_checkout_clicked', { plan: plan, second: Math.round(player.time), event_id: eventId, value: value }, true);
            T.pixel('InitiateCheckout', { content_name: plan, value: value, currency: 'EUR' }, eventId);
            T.server('InitiateCheckout', eventId, { custom_data: { content_name: plan, value: value, currency: 'EUR' } });
            // Za Purchase na checkout poddomeni (docs/checkout-pixel.html)
            T.setCookie('ursa_ck', JSON.stringify({ plan: plan, value: value, currency: 'EUR', ic_event_id: eventId }), 7);
            // Atribucija ide i na checkout; kratka odgoda da pixel stigne poslati event prije odlaska sa stranice
            const href = T.carry(buy.href, bodytype ? { bodytype: bodytype } : null);
            if (!e.defaultPrevented && buy.target !== '_blank' && !(e.metaKey || e.ctrlKey || e.shiftKey)) {
                e.preventDefault();
                setTimeout(() => { location.href = href; }, 300);
            } else {
                buy.href = href;
            }
        }
    });

    if (lock) lock.addEventListener('click', () => { if (lock.classList.contains('unlocked')) openOffer('klik', true); });

    if (body.dataset.lock !== '1') openOffer('bez zakljucavanja', false);
    else if (skipLock) openOffer('link', false);
    else if (remembered()) openOffer('vec otkljucano', false);
    else { lock.hidden = false; lockProgress(0); }

    // ---------- Odlazak: dokle je posjetitelj došao ----------
    let lastLeave = '';
    function leave() {
        const read = parseInt(visit.section) >= 2; // prvi dio ponude se vidi i bez skrolanja
        const stage = visit.checkout ? '6 kliknuo checkout'
            : visit.opened && read && player.started ? '5 gledao i citao ponudu'
            : visit.opened && read ? '4 citao ponudu bez videa'
            : player.unlocked ? '3 otkljucao, nije citao'
            : player.started ? '2 otisao prije otkljucavanja'
            : '1 nije pustio video';
        const key = [stage, Math.round(player.time), visit.section].join('|');
        if (key === lastLeave) return;
        lastLeave = key;
        track('vsl_left', {
            stage: stage,
            second: Math.round(player.time),
            percent: player.duration ? Math.round(player.time / player.duration * 100) : 0,
            finished: player.finished,
            last_section: visit.section || 'nema',
            seconds_on_page: Math.round((Date.now() - openedAt) / 1000)
        }, true);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) leave(); });
    window.addEventListener('pagehide', leave);

    track('vsl_viewed', { locked: !visit.opened });
    T.pixel('ViewContent', { content_name: 'vsl', content_category: PAGE });
})();
