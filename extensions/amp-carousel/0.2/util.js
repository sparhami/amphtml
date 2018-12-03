export function mod(a, b) {
  return (a + b) % b;
}

export function debounce(callback, minInterval) {
  let locker = 0;
  let timestamp = 0;
  let nextCallArgs = null;

  /**
   * @param {?Array} args
   */
  function fire(args) {
    nextCallArgs = null;
    callback.apply(null, args);
  }

  /**
   * Wait function for debounce
   */
  function waiter() {
    locker = 0;
    const remaining = minInterval - (Date.now() - timestamp);
    if (remaining > 0) {
      locker = setTimeout(waiter, remaining);
    } else {
      fire(nextCallArgs);
    }
  }

  return function(...args) {
    timestamp = Date.now();
    nextCallArgs = args;
    if (!locker) {
      locker = setTimeout(waiter, minInterval);
    }
  };
}

export function debounceWithPromise(callback) {
  let running = false;

  return function() {
    if (running) {
      return;
    }

    running = true;
    Promise.resolve().then(() => {
      running = false;
      callback();
    });
  }
}

export function listenOnce(target, name, fn, options) {
  const listen = (event) => {
    fn(event);
    target.removeEventListener(name, listen, options);
  };
  target.addEventListener(name, listen, options);
}

export function wrappingDistance(a, b, total) {
  return Math.min(
    forwardWrappingDistance(a, b, total),
    backwardWrappingDistance(a, b, total));
}

export function forwardWrappingDistance(a, b, total) {
  return mod(b - a, total);
}

export function backwardWrappingDistance(a, b, total) {
  return mod(a - b, total);
}