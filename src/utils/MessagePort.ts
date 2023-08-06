import { Defer } from './Defer';
import { intervalProvider } from 'rxjs/internal/scheduler/intervalProvider';

export const PING = '__PING__' as const;
export const PONG = '__PONG__' as const;

export function isMessageEvent(event: any): event is MessageEvent {
    return typeof event === 'object' && 'data' in event;
}

export function isPortReadyCheck(event: Event) {
    return isMessageEvent(event) && event.data === PING;
}

export function checkPortAsReady(port: MessagePort) {
    port.postMessage(PONG);
}

export function checkPortAsReadyOnMessage(event: Event) {
    if (isPortReadyCheck(event)) checkPortAsReady(event.target as MessagePort);
}

const mapPortToState = new WeakMap<MessagePort, boolean | Defer<boolean>>();

export function onPortResolve(port: MessagePort, onResolve: (state: boolean) => void): void {
    if (!mapPortToState.has(port)) {
        const defer = new Defer<boolean>();
        const portListener = (event: MessageEvent) => {
            if (event.data === PONG) defer.resolve(true);
        };

        port.start();
        port.addEventListener('message', portListener);

        queueMicrotask(() => port.postMessage(PING));
        const intervalId = intervalProvider.setInterval(() => port.postMessage(PING), 25);

        defer.promise
            .then((state) => mapPortToState.set(port, state))
            .finally(() => {
                intervalProvider.clearInterval(intervalId);
                port.removeEventListener('message', portListener);
            });

        mapPortToState.set(port, defer);
    }

    const state = mapPortToState.get(port)!;

    if (state instanceof Defer) {
        state.promise.then(onResolve);
    } else {
        onResolve(state);
    }
}
