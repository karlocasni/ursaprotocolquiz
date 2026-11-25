/*
 * Zajednički tracking za quiz i sve VSL stranice. Ugovor: docs/tracking.md
 *  - Meta pixel (PageView na učitavanju; ostali eventi preko UrsaTrack.pixel)
 *  - atribucija (utm_*, fbclid, ad_id, adset_id, placement) iz URL-a, spremljena i nošena dalje kroz linkove
 *  - _fbc iz fbclid-a, _fbp iz pixela
 *  - server eventi (Lead, InitiateCheckout) prema n8n-u, koji ih šalje u Conversions API s istim event_id
 * Ovdje nema tajni: pixel ID i webhook URL su javni po prirodi.
 */
(function () {
    const PIXEL_ID = ''; // Meta dataset/pixel ID; dok je prazan, pixel se ne učitava
    const CAPI_URL = 'https://egzosfera.app.n8n.cloud/webhook/ursa-capi';
    const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content', 'fbclid', 'ad_id', 'adset_id', 'placement'];
    const ROOT = /(^|\.)ursaprotocol\.com$/.test(location.hostname) ? 'ursaprotocol.com' : '';

    // ---------- Pohrana (sve u try/catch: privatni prozori i blokirani storage) ----------
    const ls = {
        get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
    };
    function getCookie(name) {
        const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : '';
    }
    function setCookie(name, value, days) {
        let c = name + '=' + encodeURIComponent(value) + '; path=/; max-age=' + days * 86400 + '; SameSite=Lax';
        if (ROOT) c += '; domain=.' + ROOT + '; Secure';
        document.cookie = c;
    }

    // ---------- Atribucija ----------
    const url = new URLSearchParams(location.search);
    let attr = {};
    try { attr = JSON.parse(ls.get('ursa_attr') || getCookie('ursa_attr') || '{}') || {}; } catch (e) { attr = {}; }
    if (KEYS.some(k => url.get(k))) {
        // Novi klik na ad zamjenjuje cijeli stari set, da se ne miješaju dva ada
        attr = {};
        KEYS.forEach(k => { const v = url.get(k); if (v) attr[k] = v; });
        ls.set('ursa_attr', JSON.stringify(attr));
        setCookie('ursa_attr', JSON.stringify(attr), 90);
    }

    // _fbc: Meta format fb.1.<ms>.<fbclid>; pixel ga i sam postavlja, ovo pokriva slučaj kad je pixel blokiran
    const fbclid = url.get('fbclid');
    if (fbclid && !getCookie('_fbc').endsWith('.' + fbclid)) setCookie('_fbc', 'fb.1.' + Date.now() + '.' + fbclid, 90);

    function carry(href, extra) {
        const u = new URL(href, location.href);
        Object.entries(Object.assign({}, attr, extra || {})).forEach(([k, v]) => {
            if (v && !u.searchParams.has(k)) u.searchParams.set(k, v);
        });
        return u.toString();
    }

    function uuid() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        const b = new Uint8Array(16);
        (window.crypto || window.msCrypto).getRandomValues(b);
        b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
        const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
        return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    }

    // ---------- Osoba (samo ako je prošla quiz u ovom pregledniku) ----------
    const person = {
        get email() { return ls.get('ursa_email') || ''; },
        get name() { return ls.get('ursa_first_name') || ''; },
        save(email, name) { if (email) ls.set('ursa_email', email); if (name) ls.set('ursa_first_name', name); }
    };

    // ---------- Meta pixel ----------
    if (PIXEL_ID) {
        !function (f, b, e, v, n, t, s) {
            if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
            if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0;
            t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
        }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        const match = {};
        if (person.email) match.em = person.email;
        if (person.name) match.fn = person.name.toLowerCase();
        fbq('init', PIXEL_ID, match);
        fbq('track', 'PageView');
    }

    function pixel(event, data, eventId) {
        if (!PIXEL_ID || !window.fbq) return;
        try { eventId ? fbq('track', event, data || {}, { eventID: eventId }) : fbq('track', event, data || {}); } catch (e) {}
    }

    // ---------- Server event (n8n → Conversions API) ----------
    function server(eventName, eventId, extra) {
        const body = Object.assign({
            event_name: eventName,
            event_id: eventId,
            event_time: Math.floor(Date.now() / 1000),
            event_source_url: location.href,
            user_agent: navigator.userAgent,
            fbp: getCookie('_fbp'),
            fbc: getCookie('_fbc'),
            email: person.email,
            first_name: person.name,
            ph_distinct_id: window.posthog && posthog.get_distinct_id ? posthog.get_distinct_id() : '',
            attribution: attr
        }, extra || {});
        try {
            fetch(CAPI_URL, {
                method: 'POST',
                mode: 'no-cors',
                keepalive: true,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'payload=' + encodeURIComponent(JSON.stringify(body))
            }).catch(() => {});
        } catch (e) {}
    }

    window.UrsaTrack = {
        get attr() { return Object.assign({}, attr); },
        carry, uuid, pixel, server, person, setCookie,
        get fbp() { return getCookie('_fbp'); },
        get fbc() { return getCookie('_fbc'); }
    };
})();
