import { escapeHtml } from './mail';

describe('escapeHtml', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });

  it('escapes ampersands first (no double-escaping)', () => {
    expect(escapeHtml('Tom & Jerry <b>')).toBe('Tom &amp; Jerry &lt;b&gt;');
  });

  it('leaves plain text untouched', () => {
    expect(escapeHtml('Sunny 2-bed in Austin')).toBe('Sunny 2-bed in Austin');
  });
});
