import { describe, expect, it } from 'vitest';
import { generateGrayCode } from './grayCode';

function hammingDistance(left: string, right: string): number {
  return [...left].filter((bit, index) => bit !== right[index]).length;
}

describe('generateGrayCode', () => {
  it.each([
    [0, ['']],
    [1, ['0', '1']],
    [2, ['00', '01', '11', '10']],
    [3, ['000', '001', '011', '010', '110', '111', '101', '100']],
  ])('generates the reflected sequence for %i bits', (bits, expected) => {
    expect(generateGrayCode(bits)).toEqual(expected);
  });

  it('keeps adjacent and wraparound codes one bit apart', () => {
    const codes = generateGrayCode(5);
    for (let index = 0; index < codes.length; index += 1) {
      expect(hammingDistance(codes[index] ?? '', codes[(index + 1) % codes.length] ?? '')).toBe(1);
    }
  });

  it.each([-1, 1.5, Number.NaN])('rejects invalid bit count %s', (bits) => {
    expect(() => generateGrayCode(bits)).toThrow(RangeError);
  });
});
