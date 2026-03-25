const AppAlerts = {
    iconTitleMap: {
        success: 'Sucesso',
        error: 'Erro',
        warning: 'Atencao',
        info: 'Informacao',
        question: 'Confirmacao'
    },

    sanitizeText(value) {
        return String(value ?? '').replace(/\s+/g, ' ').trim();
    },

    buildTitle(icon, title) {
        const cleanTitle = this.sanitizeText(title);
        if (cleanTitle) return cleanTitle;
        return this.iconTitleMap[icon] || 'Mensagem';
    },

    async show({ icon = 'info', title = '', text = '', timer, toast = false, confirmButtonText = 'OK' } = {}) {
        if (typeof Swal === 'undefined') {
            return;
        }

        const cleanText = this.sanitizeText(text);
        if (!cleanText) {
            return;
        }

        const config = {
            icon,
            title: this.buildTitle(icon, title),
            text: cleanText,
            confirmButtonText
        };

        if (toast) {
            Object.assign(config, {
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: timer || 2500,
                timerProgressBar: true
            });
        } else if (timer) {
            config.timer = timer;
            config.timerProgressBar = true;
        }

        return Swal.fire(config);
    },

    success(text, title) {
        return this.show({ icon: 'success', title, text, toast: true });
    },

    error(text, title) {
        return this.show({ icon: 'error', title, text });
    },

    warning(text, title) {
        return this.show({ icon: 'warning', title, text });
    },

    info(text, title) {
        return this.show({ icon: 'info', title, text });
    },

    async confirm({
        title = 'Confirmacao',
        text = 'Deseja continuar?',
        confirmButtonText = 'Sim',
        cancelButtonText = 'Cancelar',
        icon = 'warning'
    } = {}) {
        if (typeof Swal === 'undefined') {
            return window.confirm(text);
        }

        const result = await Swal.fire({
            icon,
            title,
            text,
            showCancelButton: true,
            confirmButtonText,
            cancelButtonText,
            reverseButtons: true
        });

        return result.isConfirmed;
    },

    showAlertElement(alertElement) {
        if (!alertElement || alertElement.dataset.swalHandled === 'true') {
            return;
        }

        const text = this.sanitizeText(alertElement.textContent);
        if (!text) {
            alertElement.remove();
            return;
        }

        let icon = 'info';
        if (alertElement.classList.contains('alert-success')) icon = 'success';
        if (alertElement.classList.contains('alert-danger')) icon = 'error';
        if (alertElement.classList.contains('alert-warning')) icon = 'warning';

        alertElement.dataset.swalHandled = 'true';
        this.show({
            icon,
            text,
            toast: icon === 'success'
        });
        alertElement.remove();
    },

    consumeQueryAlerts() {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        const alertKeys = ['success', 'error', 'warning', 'info'];
        let shouldCleanUrl = false;

        alertKeys.forEach((key) => {
            const message = params.get(key);
            if (!message) return;

            shouldCleanUrl = true;
            this.show({
                icon: key === 'error' ? 'error' : key,
                text: message,
                toast: key === 'success'
            });
            params.delete(key);
        });

        if (shouldCleanUrl) {
            const nextUrl = `${url.pathname}${params.toString() ? `?${params.toString()}` : ''}${url.hash}`;
            window.history.replaceState({}, document.title, nextUrl);
        }
    },

    consumeInlineAlerts(root = document) {
        root.querySelectorAll('.alert').forEach((alertElement) => this.showAlertElement(alertElement));
    },

    observeInlineAlerts() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (!(node instanceof HTMLElement)) return;

                    if (node.classList.contains('alert')) {
                        this.showAlertElement(node);
                    } else {
                        this.consumeInlineAlerts(node);
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }
};

window.AppAlerts = AppAlerts;
window.alert = (message) => AppAlerts.show({ icon: 'info', text: message });

document.addEventListener('DOMContentLoaded', () => {
    AppAlerts.consumeQueryAlerts();
    AppAlerts.consumeInlineAlerts();
    AppAlerts.observeInlineAlerts();
});
