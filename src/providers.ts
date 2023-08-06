type Logger = Pick<typeof console, 'warn' | 'error'>;
export const loggerProvider: Logger & { delegate: undefined | Partial<Logger> } = {
    warn(...args: any[]) {
        return (loggerProvider.delegate?.warn || console.warn)('Webactor: ', ...args);
    },
    error(...args: any[]) {
        return (loggerProvider.delegate?.error || console.error)('Webactor: ', ...args);
    },
    delegate: undefined,
};

export const locksProvider: LockManager & { delegate: undefined | LockManager } = {
    query() {
        const instance = locksProvider.delegate || navigator.locks;
        return instance.query();
    },
    request(a: any, b: any, c?: any) {
        const instance = locksProvider.delegate || navigator.locks;
        return c === undefined ? instance.request(a, b) : instance.request(a, b, c);
    },
    delegate: undefined,
};
