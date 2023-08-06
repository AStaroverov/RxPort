import { AnyEnvelope, Envelope } from '../types';

export const noop = (): any => {};

export function isEnvelope<T extends AnyEnvelope>(some: any): some is T {
    return typeof some === 'object' && typeof some.id === 'string';
}

export function createEnvelope<P>(id: string, type: string, payload: P): Envelope<P> {
    return {
        id,
        type,
        payload,
    };
}

export function createCloseEnvelope(id: string, type: string): Envelope<'__CLOSE__'> {
    return {
        id,
        type,
        payload: '__CLOSE__' as const,
    };
}

export function isCloseEnvelope(some: any): some is Envelope<'__CLOSE__'> {
    return isEnvelope(some) && some.payload === '__CLOSE__';
}

export function createShortRandomString() {
    return Math.round(Math.random() * Date.now()).toString(32);
}

export function createRandomChannelID() {
    return `channel-${createShortRandomString()}`;
}

export function getRequestChannelID(base: string) {
    return `request-${base}`;
}

export function getResponseChannelID(base: string) {
    return `response-${base}`;
}

export function throwingError(message: string): never {
    throw new Error(message);
}

export const isWindow = (context: unknown): context is Window =>
    typeof Window !== 'undefined' && context instanceof Window;

export const isSharedWorkerScope = (context: unknown): context is SharedWorkerGlobalScope =>
    typeof SharedWorkerGlobalScope !== 'undefined' && context instanceof SharedWorkerGlobalScope;

export const isDedicatedWorkerScope = (context: unknown): context is DedicatedWorkerGlobalScope =>
    typeof DedicatedWorkerGlobalScope !== 'undefined' && context instanceof DedicatedWorkerGlobalScope;
