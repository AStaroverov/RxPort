import { loggerProvider } from '../providers';
import { onPortResolve } from './MessagePort';
import { AnyEnvelope } from '../types';

export function dispatch(port: MessagePort, envelope: AnyEnvelope) {
    onPortResolve(port, (state) => {
        if (!state) return;
        try {
            port.postMessage(envelope);
        } catch (err) {
            loggerProvider.error(err);
        }
    });
}
