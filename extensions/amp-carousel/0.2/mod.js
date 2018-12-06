/**
 * @param {number} a 
 * @param {number} b 
 */
export function mod(a, b) {
  return a > 0 && b > 0 ? a % b : ((a % b) + b) % b;
}