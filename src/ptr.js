import { $ } from './dom.js';

const THRESHOLD = 72;

// Pull-to-refresh: only from the top of the page, with no sheet open.
export function initPullToRefresh(refresh) {
    const ptr = $('ptr');
    let startY = null;
    let pull = 0;
    let busy = false;

    const set = (distance) => {
        ptr.style.setProperty('--pull', `${distance}px`);
        ptr.style.opacity = Math.min(distance / THRESHOLD, 1);
        ptr.classList.toggle('ready', distance >= THRESHOLD);
    };

    document.addEventListener(
        'touchstart',
        (event) => {
            const blocked = busy || window.scrollY > 0 || document.body.classList.contains('sheet-open');
            startY = blocked ? null : event.touches[0].clientY;
            pull = 0;
        },
        { passive: true },
    );

    document.addEventListener(
        'touchmove',
        (event) => {
            if (startY === null) return;
            const dy = event.touches[0].clientY - startY;
            if (dy <= 0) {
                set(0);
                return;
            }
            pull = Math.min(dy * 0.5, THRESHOLD * 1.4);
            set(pull);
        },
        { passive: true },
    );

    document.addEventListener('touchend', () => {
        if (startY === null) return;
        startY = null;
        if (pull >= THRESHOLD) {
            busy = true;
            ptr.classList.add('loading');
            set(THRESHOLD * 0.7);
            Promise.all([refresh(), new Promise((resolve) => setTimeout(resolve, 600))]).finally(() => {
                busy = false;
                ptr.classList.remove('loading');
                set(0);
            });
        } else {
            set(0);
        }
        pull = 0;
    });
}
