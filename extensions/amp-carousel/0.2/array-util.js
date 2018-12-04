import {mod} from './util.js';

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