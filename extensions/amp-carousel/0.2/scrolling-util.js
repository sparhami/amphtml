/**
 * Runs a callback while disabling smooth scrolling by temporarily setting
 * the `scrollBehavior` to `auto`.
 * @param {!Element} el 
 * @param {function} cb 
 */
export function runDisablingSmoothScroll(el, cb) {
  const {style} = el;
  const {scrollBehavior} = style;

  style.scrollBehavior = 'auto';
  cb();
  style.scrollBehavior = scrollBehavior;
}

