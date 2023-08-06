# RxPort

### Introduction

The RxPort library provides a simple and efficient way to create communication channels between different threads in
your
application using RxJS.

### Installation

```
npm install rxport rxjs
```

## Usage

To create a observable between threads, you need something that will share between threads information about you stream.
Class RxPort provides a simple way to do that.

```typescript
const myObservablePort = new RxPort<string, string>('MyObservable');
```

Now you can use this port to create a observable between threads.

In one thread you need to create producer part of the observable:

```typescript
// SharedWorker
const myProducer = myObservablePort.createProducer(self);
```

Now you can use this producer to response to requests from other threads:

```typescript
myProducer.subscribe((request: string) => {
    console.log(response); // 'Hi Alis'
    return of('Hi Bob');
});
```

In other thread you need to create consumer part of the observable:

```typescript
// Main thread
const request = myObservablePort.createRequest(new SharedWorker('shared-worker.js'));
```

Now you can use this request to create a observable that will send requests to other thread:

```typescript
request('Hi Alis').subscribe((response: string) => {
    console.log(response); // 'Hi Bob'
});
```

### Destroying producer

If you want to destroy producer, you need to call destroy method:

```typescript
import {interval} from "rxjs";

const destroy = myProducer.subscribe(() => interval(1000));

destroy();
```

If you destroy producer, while there are active requests, they will receive Abort Error;

```typescript
import {AbortConnectionMessage} from "rxport";

request('...').subscribe({
    error: (error) => {
        if (error.message === AbortConnectionMessage) {
            console.log('Producer was aborted');
        }
    }
});
```

### Lose connection

If you lose connection between threads, you will receive Lose Connection Error:

```typescript
import {LoseConnectionMessage} from "rxport";

request('...').subscribe({
    error: (error) => {
        if (error.message === LoseConnectionMessage) {
            console.log('Connection was lost');
        }
    }
});
```

You can meet this error, if create observable from SharedWorker to Window(browser tab), and close window.

### Advanced usage

You can create a observable not only between threads, actually you can create a stream any object that implements
MessagePort interface.

```typescript
const channel = new MessageChannel();
const rxPort = new RxPort<string, string>('...');

const producer = rxPort.createProducer(channel.port1);
const request = rxPort.createRequest(channel.port2);
```
