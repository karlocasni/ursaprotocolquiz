/*
 * BLACK NOVEMBER popust na VSL ponudi: niže cijene, animacija cijene i odbrojavanje.
 * LIVE = false gasi popust (lokalno se i tada vidi uz ?sale=preview)
 * Nakon END-a se sve samo vraća na redovne cijene i stari checkout.
 */
(function () {
    const LIVE = true;
    const END = Date.parse('2026-11-30T23:59:59+01:00');
    // Link otvara checkout s već odabranim planom. Cijene moraju biti iste kao na checkoutu (SureCart).
    const CHECKOUT = id => `https://nemaneide.ursaprotocol.com/checkout-20-godina-nemaneide/?line_items%5B0%5D%5Bprice_id%5D=${id}&line_items%5B0%5D%5Bquantity%5D=1`;
    const PLANS = {
        premium: { old: 597, now: 500, parts: 'ili 2 rate po 250€', url: CHECKOUT('5a1ee32f-2294-4847-acbb-43116764f1fb') },
        standard: { old: 397, now: 300, parts: 'ili 2 rate po 150€', url: CHECKOUT('ad1dd0ab-8eed-43d6-bd53-278ad93b3b02') }
    };

    const local = ['127.0.0.1', 'localhost'].includes(location.hostname);
    const preview = local && new URLSearchParams(location.search).get('sale') === 'preview';
    const active = preview || (LIVE && Date.now() < END);
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const digits = n => String(n).padStart(2, '0');

    function barHtml() {
        if (!active) return '';
        const unit = (key, label) => `<div><b data-unit="${key}">00</b><span>${label}</span></div>`;
        return `<div class="sale-bar">
            <img class="sale-badge" src="images/web/black-november.webp" width="1080" height="720" alt="Black November: brutalni popusti cijeli mjesec">
            <div class="sale-bar-text"><p>Popust za</p><p class="sale-bar-title">BLACK NOVEMBER</p><p>Vrijedi samo do 30.&nbsp;studenog u&nbsp;23:59.</p></div>
            <div class="sale-clock" role="timer" aria-label="Vrijeme do kraja popusta">${unit('d', 'dana')}${unit('h', 'sati')}${unit('m', 'min')}${unit('s', 'sek')}</div>
        </div>`;
    }

    // Traka na samom vrhu ponude
    function stripHtml() {
        if (!active) return '';
        return `<a class="sale-strip" href="#premium-plan" data-cta="black november traka"><b>BLACK NOVEMBER</b><em><u>Pogledaj popust</u> <i aria-hidden="true">↓</i></em></a>`;
    }

    function priceHtml(plan, regular) {
        if (!active) return `<p class="price">${regular}<span>€</span></p>`;
        const p = PLANS[plan];
        return `<div class="sale-price" data-plan="${plan}">
            <p class="sr-only">Cijena ${p.now}€ umjesto ${p.old}€, ${p.parts}</p>
            <div aria-hidden="true">
                <p class="sale-was"><s>${p.old}€</s><b>Štediš ${p.old - p.now}€</b></p>
                <div class="sale-stage">
                    <p class="price sale-num"><b>${p.old}</b><span>€</span></p>
                    <p class="price sale-cut">${p.old}<span>€</span></p>
                    <p class="price sale-cut sale-cut--2">${p.old}<span>€</span></p>
                    <i class="sale-claw"></i><i class="sale-claw"></i><i class="sale-claw"></i>
                </div>
                <p class="sale-parts">${p.parts}</p>
            </div>
        </div>`;
    }

    function url(plan, regular) { return active ? PLANS[plan].url : regular; }

    const wait = ms => new Promise(r => setTimeout(r, ms));

    function settle(box) {
        box.querySelector('.sale-num b').textContent = PLANS[box.dataset.plan].now;
        box.classList.add('is-low');
    }

    function count(el, from, to, ms) {
        const t0 = performance.now();
        (function step(t) {
            const x = Math.min(1, Math.max(0, (t - t0) / ms));
            el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - x, 4)));
            if (x < 1) requestAnimationFrame(step);
        })(t0);
    }

    // Kandže presijeku staru cijenu, polovice se razdvoje, nova cijena padne na mjesto
    async function slash(box) {
        const p = PLANS[box.dataset.plan];
        const num = box.querySelector('.sale-num');
        const cuts = box.querySelectorAll('.sale-cut');
        const claws = box.querySelectorAll('.sale-claw');

        num.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07) rotate(-1.5deg)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-out' });
        await wait(340);

        claws.forEach((c, i) => c.animate([
            { opacity: 1, transform: 'rotate(26deg) scaleY(0)', transformOrigin: '50% 0', easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)' },
            { opacity: 1, transform: 'rotate(26deg) scaleY(1)', transformOrigin: '50% 0', offset: 0.34 },
            { opacity: 1, transform: 'rotate(26deg) scaleY(1)', transformOrigin: '50% 100%', offset: 0.341, easing: 'cubic-bezier(0.6, 0, 0.9, 0.4)' },
            { opacity: 1, transform: 'rotate(26deg) scaleY(0)', transformOrigin: '50% 100%' }
        ], { duration: 760, delay: i * 75 }));
        await wait(240);

        num.style.opacity = 0;
        const fall = { duration: 560, easing: 'cubic-bezier(0.3, 0.2, 0.7, 1)' };
        cuts[0].animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate(-26px, 30px) rotate(-11deg)' }], fall);
        cuts[1].animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate(26px, 36px) rotate(13deg)' }], fall);
        await wait(300);

        num.style.opacity = '';
        box.classList.add('is-hit');
        count(num.querySelector('b'), p.old, p.now, 800);
        num.animate([
            { opacity: 0, transform: 'translateY(-26px) scale(1.22)' },
            { opacity: 1, transform: 'translateY(0) scale(0.96)', offset: 0.55 },
            { opacity: 1, transform: 'none' }
        ], { duration: 480, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' });
        await wait(680);
        settle(box);
    }

    function clock(root, onEnd) {
        const els = {};
        root.querySelectorAll('[data-unit]').forEach(e => { els[e.dataset.unit] = e; });
        if (!els.s) return;
        function set(key, value) {
            const el = els[key], text = digits(value);
            if (el.textContent === text) return;
            el.textContent = text;
            if (!calm) el.animate([{ opacity: 0.2, transform: 'translateY(-7px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
        }
        function tick() {
            const left = Math.max(0, Math.floor((END - Date.now()) / 1000));
            set('d', Math.floor(left / 86400));
            set('h', Math.floor(left / 3600) % 24);
            set('m', Math.floor(left / 60) % 60);
            set('s', left % 60);
            if (!left && !preview) { clearInterval(timer); onEnd(); }
        }
        const timer = setInterval(tick, 1000);
        tick();
    }

    function start(root, on) {
        if (!active) return;
        const boxes = [...root.querySelectorAll('.sale-price')];
        const bar = root.querySelector('.sale-bar');
        const badge = bar.querySelector('.sale-badge');
        // Badge udari kao pečat kad banner dođe na ekran
        function armBadge() {
            if (calm) return;
            badge.classList.add('is-armed');
            new IntersectionObserver((entries, io) => {
                if (!entries[0].isIntersecting) return;
                io.disconnect();
                badge.classList.remove('is-armed');
                badge.animate([
                    { opacity: 0, transform: 'scale(1.9) rotate(9deg)', easing: 'cubic-bezier(0.6, 0, 0.9, 0.5)' },
                    { opacity: 1, transform: 'scale(0.95) rotate(-4deg)', offset: 0.55 },
                    { opacity: 1, transform: 'scale(1.03) rotate(-2deg)', offset: 0.78 },
                    { opacity: 1, transform: 'scale(1) rotate(-3deg)' }
                ], { duration: 620, delay: 120, fill: 'backwards' });
                bar.animate([{ transform: 'none' }, { transform: 'translateY(5px)' }, { transform: 'translateY(-3px)' }, { transform: 'none' }], { duration: 260, delay: 450 });
            }, { threshold: 0.45 }).observe(bar);
        }

        function arm() {
            armBadge();
            const io = new IntersectionObserver(entries => entries.filter(e => e.isIntersecting).forEach((e, i) => {
                io.unobserve(e.target);
                on.seen(e.target.dataset.plan, PLANS[e.target.dataset.plan].now);
                if (calm) settle(e.target); else setTimeout(() => slash(e.target), 350 + i * 420);
            }), { threshold: 0.9, rootMargin: '0px 0px -6% 0px' });
            boxes.forEach(b => io.observe(b));
        }
        arm();

        // Kraj popusta dok je stranica otvorena: natrag na redovno
        clock(root, () => {
            root.querySelectorAll('.sale-bar, .sale-strip').forEach(b => b.remove());
            boxes.forEach(b => {
                root.querySelector(`[data-buy="${b.dataset.plan}"]`).href = on.regularUrl(b.dataset.plan);
                b.outerHTML = `<p class="price">${PLANS[b.dataset.plan].old}<span>€</span></p>`;
            });
            api.active = false;
        });
    }

    const api = window.UrsaSale = { active, stripHtml, barHtml, priceHtml, url, start, price: plan => PLANS[plan].now };
})();
