// Toast utility functions for managing toast notifications

export interface ToastMessage {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info' | string;
    duration?: number;
}

export class ToastService {
    /**
     * Add a toast message to session storage to be displayed on the next page load
     */
    static addToast(toast: ToastMessage) {
        if (typeof window === 'undefined') return;

        try {
            const existingToasts = this.getToasts();
            const newToast = {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                ...toast
            };

            existingToasts.push(newToast);
            sessionStorage.setItem('toasts', JSON.stringify(existingToasts));
        } catch (error) {
            console.error('Error adding toast to session storage:', error);
        }
    }

    /**
     * Show a toast immediately (for client-side use)
     */
    static showToast(toast: ToastMessage) {
        if (typeof window === 'undefined') return;

        window.dispatchEvent(new CustomEvent('toast:show', {
            detail: toast
        }));
    }

    /**
     * Get all pending toasts from session storage
     */
    static getToasts(): any[] {
        if (typeof window === 'undefined') return [];

        try {
            const toastsData = sessionStorage.getItem('toasts');
            return toastsData ? JSON.parse(toastsData) : [];
        } catch (error) {
            console.error('Error getting toasts from session storage:', error);
            return [];
        }
    }

    /**
     * Clear all pending toasts from session storage
     */
    static clearToasts() {
        if (typeof window === 'undefined') return;
        sessionStorage.removeItem('toasts');
    }

    // Convenience methods for common toast types
    static success(message: string, duration?: number) {
        this.addToast({ message, type: 'success', duration });
    }

    /* static error(message: string, duration?: number) {
        this.addToast({ message, type: 'error', duration });
    } */

    static warning(message: string, duration?: number) {
        this.addToast({ message, type: 'warning', duration });
    }

    static info(message: string, duration?: number) {
        this.addToast({ message, type: 'info', duration });
    }

    static custom(message: string, type: string, duration?: number) {
        this.addToast({ message, type, duration });
    }
}

// Server-side toast helper for Astro pages
export function addServerToast(message: string, type: 'success' | 'error' | 'warning' | 'info' | string = 'info', duration?: number) {
    // This function returns a script that will be executed on the client side
    return `
        <script>
            if (typeof window !== 'undefined' && window.toastManager) {
                window.toastManager.showToast({
                    message: ${JSON.stringify(message)},
                    type: ${JSON.stringify(type)},
                    duration: ${duration || 10000}
                });
            }
        </script>
    `;
}
