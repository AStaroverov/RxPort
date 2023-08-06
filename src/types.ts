export type PortLike = MessagePort | SharedWorker | Worker | SharedWorkerGlobalScope | DedicatedWorkerGlobalScope;

export type Envelope<P> = {
    id: string;
    type: string;
    payload: P;
};

export type AnyEnvelope = Envelope<any>;

