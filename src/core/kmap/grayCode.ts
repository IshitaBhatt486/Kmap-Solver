/** Generates the reflected binary Gray-code sequence for a bit width. */
export function generateGrayCode(bitCount: number): string[] {
  if (!Number.isInteger(bitCount) || bitCount < 0) {
    throw new RangeError('bitCount must be a non-negative integer.');
  }

  if (bitCount === 0) return [''];

  const sequence = ['0', '1'];
  for (let width = 2; width <= bitCount; width += 1) {
    const reflected = [...sequence].reverse();
    sequence.splice(0, sequence.length, ...sequence.map((code) => `0${code}`));
    sequence.push(...reflected.map((code) => `1${code}`));
  }
  return sequence;
}
