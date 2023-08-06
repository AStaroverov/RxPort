import { lock, subscribeOnUnlock } from './utils/Locks';
import { AnyEnvelope, Envelope, PortLike } from './types';
import {
    catchError,
    delay,
    dematerialize,
    EMPTY,
    filter,
    finalize,
    groupBy,
    last,
    map,
    materialize,
    merge,
    mergeMap,
    Observable,
    ObservableNotification,
    of,
    ReplaySubject,
    share,
    Subject,
    switchMap,
    takeUntil,
    tap,
} from 'rxjs';
import {
    createCloseEnvelope,
    createEnvelope,
    createRandomChannelID,
    getRequestChannelID,
    getResponseChannelID,
    isCloseEnvelope,
    isSharedWorkerScope,
    noop,
    throwingError,
} from './utils/common';

import { subscribe } from './utils/subscribe';
import { dispatch } from './utils/dispatch';

export const AbortChannel = 'AbortChannel';
export const LoseChannel = 'LoseChannel';

export class RxPort<Request, Response> {
    private mapPortToRequest = new WeakMap<PortLike, ReturnType<typeof createRequest<Request, Response>>>();
    private mapPortToResponse = new WeakMap<PortLike, ReturnType<typeof createResponse<Request, Response>>>();

    constructor(public name: string) {}

    createRequest(port: PortLike) {
        if (!this.mapPortToRequest.has(port)) {
            this.mapPortToRequest.set(port, createRequest<Request, Response>(this.name, port));
        }

        return this.mapPortToRequest.get(port)!;
    }

    createProducer(port: PortLike) {
        if (!this.mapPortToResponse.has(port)) {
            this.mapPortToResponse.set(port, createResponse<Request, Response>(this.name, port));
        }

        return this.mapPortToResponse.get(port)!;
    }
}

function createRequest<Request, Response>(type: string, port: PortLike) {
    const ports$ = extractPorts$(port);

    return function request(payload: Request) {
        const selectedId$ = new Subject<string>();

        let selectId = (id: string) => {
            selectId = noop;
            selectedId$.next(id);
            selectedId$.complete();
        };

        return ports$.pipe(
            takeUntil(selectedId$),
            groupBy((port) => port),
            mergeMap((port$) => {
                const port = port$.key;
                const channelId = createRandomChannelID();

                const isOtherId = (id: string) => id !== channelId;
                const isCurrentId = (id: string) => id === channelId;

                const unlock = lock(getRequestChannelID(channelId));
                const dispatchClose = () => dispatch(port, createCloseEnvelope(channelId, type));
                const selectCurrentId = () => selectId(channelId);
                const onUnlockResponse$ = () => onUnlock$(getResponseChannelID(channelId));
                const loseChannel$ = selectedId$.pipe(
                    filter(isCurrentId),
                    mergeMap(onUnlockResponse$),
                    // give time to normally close
                    delay(1000),
                    map(() => throwingError(LoseChannel)),
                );

                dispatch(port, createEnvelope(channelId, type, payload));

                return merge(port$, loseChannel$).pipe(
                    switchMap(() => subscribeToChannel$<ObservableNotification<Response>>(port, type)),
                    filter((envelope) => isCurrentId(envelope.id)),
                    tap({
                        next: selectCurrentId,
                        finalize: unlock,
                        unsubscribe: dispatchClose,
                    }),
                    map((envelope) => envelope.payload),
                    dematerialize(),
                    takeUntil(selectedId$.pipe(filter(isOtherId))),
                );
            }),
        );
    };
}

function createResponse<Request, Response>(type: string, port: PortLike) {
    const ports$ = extractPorts$(port);
    const abort$ = new Subject<void>();
    const abortChannel$ = abort$.pipe(map(() => throwingError(AbortChannel)));
    const createProducer$ = (source$: Observable<Response>) => {
        source$ = source$.pipe(share());
        return merge(source$, abortChannel$.pipe(takeUntil(source$.pipe(last()))));
    };
    const onUnlockRequest$ = (id: string) =>
        onUnlock$(getRequestChannelID(id)).pipe(
            // give time to normally close
            delay(1000),
        );
    const createResponder$ =
        (createSource$: (payload: Request) => undefined | Observable<Response>) => (envelope: AnyEnvelope) => {
            const unlock = lock(getResponseChannelID(envelope.id));
            const source$ = createSource$(envelope.payload);

            if (source$ === undefined) return EMPTY;
            return createProducer$(source$).pipe(
                materialize(),
                map((notify) => createEnvelope(envelope.id, type, notify)),
                finalize(unlock),
                takeUntil(onUnlockRequest$(envelope.id)),
            );
        };

    return function response(createSource$: (payload: Request) => undefined | Observable<Response>) {
        const sub = ports$
            .pipe(
                groupBy((port) => port),
                mergeMap((port$) => {
                    return port$.pipe(
                        switchMap((port) =>
                            subscribeToChannel$<Request>(port, type).pipe(
                                groupBy((envelope) => envelope.id),
                                mergeMap((channel$) => {
                                    return channel$.pipe(
                                        mergeMap(createResponder$(createSource$)),
                                        takeUntil(channel$.pipe(filter(isCloseEnvelope))),
                                        catchError(() => EMPTY),
                                    );
                                }),
                                tap((envelope) => dispatch(port, envelope)),
                            ),
                        ),
                    );
                }),
            )
            .subscribe();

        return () => {
            abort$.next();
            abort$.complete();
            sub.unsubscribe();
        };
    };
}

function extractPorts$(port: PortLike): Observable<MessagePort> {
    return isSharedWorkerScope(port)
        ? sharedWorkerPorts$(port)
        : SharedWorker !== undefined && port instanceof SharedWorker
        ? of(port.port as MessagePort)
        : of(port as MessagePort);
}

let sharedPorts$: undefined | Observable<MessagePort> = undefined;

function sharedWorkerPorts$(scope: SharedWorkerGlobalScope): Observable<MessagePort> {
    if (sharedPorts$ === undefined) {
        const subject = new ReplaySubject<WeakRef<MessagePort>>();

        // Hot observable
        scope.addEventListener('connect', (event: MessageEvent) => {
            subject.next(new WeakRef(event.ports[0]));
        });

        sharedPorts$ = subject.pipe(
            map((ref) => ref.deref()),
            filter((port): port is MessagePort => port !== undefined),
        );
    }

    return sharedPorts$;
}

function subscribeToChannel$<T>(port: MessagePort, type: string): Observable<Envelope<T>> {
    return new Observable((subscriber) => {
        const unsub = subscribe(port, (envelope: AnyEnvelope) => {
            if (envelope.type === type) {
                subscriber.next(envelope as Envelope<T>);
            }
        });

        return () => unsub();
    });
}

const onUnlock$ = (id: string) => {
    return new Observable<void>((subscriber) => {
        subscribeOnUnlock(id, () => {
            subscriber.next();
            subscriber.complete();
        });
    });
};
