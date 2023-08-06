import { firstDef, secondDef } from './common/observables';
import { tap } from 'rxjs';

const worker = new SharedWorker(new URL('./common/worker.ts', import.meta.url), {
    name: 'sharedWorker',
    type: 'module',
});

const getFirst = firstDef.createRequest(worker);
const getSecond = secondDef.createRequest(worker);

getFirst('ping 1')
    .pipe(
        tap({
            next: (payload) => {
                console.log('>> FIRST - N', payload);
            },
            error: (payload) => {
                console.log('>> FIRST - E', payload);
            },
            complete: () => {
                console.log('>> FIRST - C');
            },
        }),
    )
    .subscribe();

getSecond('ping 2')
    .pipe(
        tap({
            next: (payload) => {
                console.log('>> SECOND - N', payload);
            },
            error: (payload) => {
                console.log('>> SECOND - E', payload);
            },
            complete: () => {
                console.log('>> SECOND - C');
            },
        }),
    )
    .subscribe();
