/*
 * VSL player: bez premotavanja, s vizualnom trakom napretka i otključavanjem ponude.
 * Video je na istom serveru; ako se jednom seli (npr. na CDN), promijeni samo VIDEO.base.
 */
(function () {
    const VIDEO = {
        base: 'video/',
        hd: 'vsl-1080.mp4',
        sd: 'vsl-720.mp4',
        poster: 'poster.jpg',
        unlockAt: 140,     // 2:20
        barAtUnlock: 0.9,  // koliko traka pokazuje u trenutku otključavanja
        barLinear: 0.12    // udio ravnomjernog punjenja, da traka ne stane pri kraju
    };

    /*
     * Traka prati jednu glatku krivulju kroz cijeli video (nema preloma na 2:20):
     *   f(x) = a*x + (1-a) * (1 - e^(-kx)) / (1 - e^(-k))
     * k se računa iz stvarnog trajanja tako da je f(unlockAt) točno barAtUnlock.
     */
    function makeBarCurve(duration) {
        const a = VIDEO.barLinear;
        const u = VIDEO.unlockAt / duration;
        const f = (x, k) => a * x + (1 - a) * (1 - Math.exp(-k * x)) / (1 - Math.exp(-k));
        let lo = 0.001, hi = 60;
        for (let i = 0; i < 60; i++) {
            const mid = (lo + hi) / 2;
            if (f(u, mid) < VIDEO.barAtUnlock) lo = mid; else hi = mid;
        }
        const k = (lo + hi) / 2;
        return t => Math.min(1, Math.max(0, f(t / duration, k)));
    }

    function pickSource() {
        const c = navigator.connection || {};
        const slow = c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || '');
        const small = Math.min(window.innerWidth, window.innerHeight) < 600 || window.innerWidth < 820;
        return VIDEO.base + (slow || small ? VIDEO.sd : VIDEO.hd);
    }

    function create(root, on) {
        root.innerHTML = `
            <video playsinline webkit-playsinline preload="metadata" poster="${VIDEO.base + VIDEO.poster}"
                disablepictureinpicture disableremoteplayback x-webkit-airplay="deny"
                controlslist="nodownload noplaybackrate nofullscreen noremoteplayback" tabindex="-1"></video>
            <button type="button" class="vp-cover" id="vp-play" aria-label="Pusti video">
                <span class="vp-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg></span>
                <span class="vp-cover-text">Pusti video</span>
            </button>
            <button type="button" class="vp-tap" aria-label="Pauziraj ili nastavi video" tabindex="-1"></button>
            <div class="vp-paused" hidden>
                <span class="vp-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg></span>
                <span>Pauzirano. Nastavi gledati</span>
            </div>
            <div class="vp-wait" hidden aria-label="Učitavanje"></div>
            <div class="vp-end" hidden></div>
            <div class="vp-ui" hidden>
                <button type="button" class="vp-btn" data-vp="toggle" aria-label="Pauza"><i class="fa-solid fa-pause"></i></button>
                <div class="vp-bar" aria-hidden="true"><span></span></div>
                <button type="button" class="vp-btn" data-vp="mute" aria-label="Isključi zvuk"><i class="fa-solid fa-volume-high"></i></button>
                <button type="button" class="vp-btn" data-vp="full" aria-label="Cijeli zaslon"><i class="fa-solid fa-expand"></i></button>
            </div>`;

        const $ = s => root.querySelector(s);
        const v = $('video');
        const fill = $('.vp-bar span');
        const ui = $('.vp-ui');
        const paused = $('.vp-paused');
        const wait = $('.vp-wait');
        let curve = null;
        let allowed = 0;      // jedina dopuštena pozicija: ono što je stvarno odgledano
        let started = false;
        let unlocked = false;
        let finished = false;
        let nextMark = 10;
        let idle;

        v.src = pickSource();

        // --- Bez premotavanja i ubrzavanja ---
        v.addEventListener('seeking', () => {
            if (Math.abs(v.currentTime - allowed) > 0.5) v.currentTime = allowed;
        });
        v.addEventListener('ratechange', () => { if (v.playbackRate !== 1) v.playbackRate = 1; });
        v.addEventListener('enterpictureinpicture', () => { if (document.exitPictureInPicture) document.exitPictureInPicture().catch(() => {}); });
        root.addEventListener('contextmenu', e => e.preventDefault());
        if ('mediaSession' in navigator) {
            ['seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack'].forEach(a => {
                try { navigator.mediaSession.setActionHandler(a, () => {}); } catch (e) {}
            });
        }

        // --- Napredak ---
        function tick() {
            if (!v.seeking && started) {
                allowed = v.currentTime;
                if (curve) fill.style.transform = `scaleX(${curve(allowed)})`;
                on.time(allowed);
                while (allowed >= nextMark) {
                    on.mark(nextMark, v.duration);
                    nextMark += 10;
                }
                if (!unlocked && allowed >= VIDEO.unlockAt) { unlocked = true; on.unlock(allowed); }
            }
            if (!v.paused && !v.ended) requestAnimationFrame(tick);
        }
        v.addEventListener('loadedmetadata', () => { curve = makeBarCurve(v.duration); });
        v.addEventListener('timeupdate', () => { if (document.hidden) tick(); });

        // --- Kontrole ---
        function play() {
            if (finished) return;
            const p = v.play();
            if (p) p.catch(err => { if (err && err.name === 'NotSupportedError') fail(); });
        }
        function toggle() { if (v.paused) play(); else v.pause(); }
        function wake() {
            root.classList.remove('vp-idle');
            clearTimeout(idle);
            idle = setTimeout(() => { if (!v.paused) root.classList.add('vp-idle'); }, 2600);
        }
        function icon(name, cls, label) {
            const b = $(`[data-vp="${name}"]`);
            b.firstElementChild.className = 'fa-solid ' + cls;
            b.setAttribute('aria-label', label);
        }

        $('.vp-cover').addEventListener('click', play);
        $('.vp-tap').addEventListener('click', () => {
            const touch = window.matchMedia('(hover: none)').matches;
            if (touch && root.classList.contains('vp-idle') && !v.paused) { wake(); return; }
            toggle();
        });
        paused.addEventListener('click', play);
        $('[data-vp="toggle"]').addEventListener('click', toggle);
        $('[data-vp="mute"]').addEventListener('click', () => { v.muted = !v.muted; on.mute(v.muted, allowed); });
        v.addEventListener('volumechange', () => icon('mute', v.muted ? 'fa-volume-xmark' : 'fa-volume-high', v.muted ? 'Uključi zvuk' : 'Isključi zvuk'));
        root.addEventListener('pointermove', wake);
        root.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && started && !v.paused) root.classList.add('vp-idle'); });

        // Cijeli zaslon samo za naš okvir. Na iPhoneu to ne postoji, a sistemski player ima premotavanje, pa se gumb skriva.
        const full = $('[data-vp="full"]');
        const req = root.requestFullscreen || root.webkitRequestFullscreen;
        if (!req) full.hidden = true;
        full.addEventListener('click', () => {
            if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            else req.call(root);
        });

        v.addEventListener('play', () => {
            paused.hidden = true;
            icon('toggle', 'fa-pause', 'Pauza');
            if (!started) {
                started = true;
                $('.vp-cover').hidden = true;
                ui.hidden = false;
                root.classList.add('vp-started');
                on.start();
            } else {
                on.resume(allowed);
            }
            wake();
            requestAnimationFrame(tick);
        });
        v.addEventListener('pause', () => {
            if (v.ended || finished) return;
            root.classList.remove('vp-idle');
            icon('toggle', 'fa-play', 'Nastavi');
            paused.hidden = false;
            on.pause(allowed);
        });
        v.addEventListener('waiting', () => { wait.hidden = false; });
        ['playing', 'pause', 'ended', 'canplay'].forEach(e => v.addEventListener(e, () => { wait.hidden = true; }));
        v.addEventListener('ended', () => {
            finished = true;
            fill.style.transform = 'scaleX(1)';
            if (document.fullscreenElement) document.exitFullscreen();
            if (!unlocked) { unlocked = true; on.unlock(v.duration); }
            ui.hidden = true;
            root.classList.add('vp-finished');
            on.finish($('.vp-end'));
        });

        // Ako se video ne može učitati, posjetitelj ne smije ostati zaključan
        function fail() { on.error(v.error ? v.error.code : 0); }
        v.addEventListener('error', fail);

        // Skriveni tab ne gleda video
        document.addEventListener('visibilitychange', () => { if (document.hidden && !v.paused) v.pause(); });

        return {
            get time() { return allowed; },
            get duration() { return v.duration || 0; },
            get started() { return started; },
            get unlocked() { return unlocked; },
            get finished() { return finished; },
            markUnlocked() { unlocked = true; }
        };
    }

    window.UrsaPlayer = { create, makeBarCurve, unlockAt: VIDEO.unlockAt };
})();
