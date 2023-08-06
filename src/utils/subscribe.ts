import { checkPortAsReadyOnMessage, isMessageEvent } from './MessagePort';
import { AnyEnvelope } from '../types';
import { isEnvelope } from './common';

type Callback<T extends AnyEnvelope> = (envelope: T) => unknown;

const listenedPorts = new WeakSet<MessagePort>();

function addReadyCheckApproval(port: MessagePort) {
    if (listenedPorts.has(port)) return;

    listenedPorts.add(port);

    port.addEventListener('message', checkPortAsReadyOnMessage);
}

function wrapCallback<T extends AnyEnvelope>(callback: Callback<T>) {
    return (event: Event) => {
        if (isMessageEvent(event) && isEnvelope(event.data)) {
            callback(event.data as T);
        }
    };
}

export function subscribe<T extends AnyEnvelope>(port: MessagePort, callback: Callback<T>): Function {
    addReadyCheckApproval(port);

    const wrapped = wrapCallback(callback);

    if ('start' in port) port.start();
    port.addEventListener('message', wrapped);

    return () => port.removeEventListener('message', wrapped);
}
