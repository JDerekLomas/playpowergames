import React from 'react';

// Render math text so screen readers pronounce symbols clearly while visuals stay intact.
// - ² is read as " square"
// - '-' and '−' are read as " minus "
// - √( ... ) keeps content together visually and supports inner replacements
export function renderMathSR(text: string): React.ReactNode {
  const renderWithSup2AndMinus = (str: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '²') {
        nodes.push(
          <span key={`sup2-v-${i}`} aria-hidden="true">
            ²
          </span>,
        );
        nodes.push(
          <span key={`sup2-sr-${i}`} className="sr-only"> square</span>,
        );
        continue;
      }
      if (ch === '-' || ch === '−') {
        nodes.push(
          <span key={`minus-v-${i}`} aria-hidden="true">{ch}</span>,
        );
        nodes.push(
          <span key={`minus-sr-${i}`} className="sr-only"> minus </span>,
        );
        continue;
      }
      let j = i;
      let buffer = '';
      while (j < str.length) {
        const cj = str[j];
        if (cj === '²' || cj === '-' || cj === '−') break;
        buffer += cj;
        j++;
      }
      if (buffer) {
        nodes.push(buffer);
        i = j - 1;
      }
    }
    return nodes.length ? nodes : [str];
  };

  // Handle √( ... ) sequences while preserving inner replacements
  const parts = text.split(/√\(([^)]+)\)/);
  if (parts.length === 1) {
    return renderWithSup2AndMinus(text);
  }

  const result: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      if (parts[i]) result.push(...renderWithSup2AndMinus(parts[i]));
    } else {
      result.push(
        <span key={`sqrt-${i}`} style={{ whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '1.2em' }}>√</span>
          <span style={{ textDecoration: 'overline' }}>{renderWithSup2AndMinus(parts[i])}</span>
        </span>
      );
    }
  }
  return result;
}
