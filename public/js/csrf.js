(function () {
    const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

    const getCsrfToken = () => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta?.getAttribute('content') || '';
    };

    const ensureFormToken = (form) => {
        if (!form || SAFE_METHODS.has((form.method || 'GET').toUpperCase())) {
            return;
        }

        let hiddenInput = form.querySelector('input[name="_csrf"]');
        if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = '_csrf';
            form.appendChild(hiddenInput);
        }

        hiddenInput.value = getCsrfToken();
    };

    const attachTokensToForms = (root = document) => {
        root.querySelectorAll('form').forEach((form) => ensureFormToken(form));
    };

    const originalFetch = window.fetch?.bind(window);
    if (originalFetch) {
        window.fetch = (input, init = {}) => {
            const requestInit = { ...init };
            const method = (requestInit.method || 'GET').toUpperCase();
            const requestUrl = typeof input === 'string' ? input : input?.url;
            const targetUrl = requestUrl ? new URL(requestUrl, window.location.origin) : null;
            const isSameOrigin = !targetUrl || targetUrl.origin === window.location.origin;

            if (isSameOrigin && !SAFE_METHODS.has(method)) {
                const headers = new Headers(requestInit.headers || (input instanceof Request ? input.headers : undefined));
                headers.set('X-CSRF-Token', getCsrfToken());
                requestInit.headers = headers;

                if (!requestInit.credentials) {
                    requestInit.credentials = 'same-origin';
                }
            }

            return originalFetch(input, requestInit);
        };
    }

    document.addEventListener('DOMContentLoaded', () => {
        attachTokensToForms();

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (!(node instanceof HTMLElement)) {
                        return;
                    }

                    if (node.matches('form')) {
                        ensureFormToken(node);
                        return;
                    }

                    attachTokensToForms(node);
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    });
})();
