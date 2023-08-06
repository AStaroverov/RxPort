import { firstDef, secondDef } from './observables';
import { interval, map, take } from 'rxjs';

const onFirstRequest = firstDef.createProducer(self as unknown as SharedWorkerGlobalScope);
const onSecondRequest = secondDef.createProducer(self as unknown as SharedWorkerGlobalScope);

onFirstRequest((payload) => {
    console.log('F', payload);
    return interval(1000).pipe(
        take(1),
        map((i) => `F ${i}`),
    );
});

const stop2 = onSecondRequest((payload) => {
    console.log('S', payload);
    return interval(1000).pipe(map((i) => `S ${i}`));
});

setTimeout(() => {
    stop2();
}, 5000);
