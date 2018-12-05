/**
 * Creates a debounced function that runs with microtask timing.
 * @param {function()} callback A callback function to run.
 * @return {function()} A debounced function.
 */
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