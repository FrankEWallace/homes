import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('parses a simple table keyed by lower-cased headers', () => {
    const rows = parseCsv('Title,City\nSunny loft,Austin\nBay condo,San Francisco');
    expect(rows).toEqual([
      { title: 'Sunny loft', city: 'Austin' },
      { title: 'Bay condo', city: 'San Francisco' },
    ]);
  });

  it('handles quoted fields with embedded commas and quotes', () => {
    const rows = parseCsv('title,desc\n"Loft, downtown","He said ""hi"""');
    expect(rows[0]).toEqual({ title: 'Loft, downtown', desc: 'He said "hi"' });
  });

  it('handles quoted fields with embedded newlines', () => {
    const rows = parseCsv('title,desc\n"A","line one\nline two"');
    expect(rows[0].desc).toBe('line one\nline two');
  });

  it('skips blank lines and trims a trailing newline', () => {
    const rows = parseCsv('a,b\n1,2\n\n3,4\n');
    expect(rows).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
  });

  it('strips a UTF-8 BOM from the header', () => {
    const rows = parseCsv('﻿title,city\nx,y');
    expect(rows[0]).toEqual({ title: 'x', city: 'y' });
  });

  it('returns [] for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });
});
