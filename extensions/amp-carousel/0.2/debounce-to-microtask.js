export function debounceToMicrotask(callback) {
  let running = false;
  return function () {
    if (running) {
      return;
    }
    running = true;
    Promise.resolve().then(() => {
      running = false;
      callback();
    });
  };
}