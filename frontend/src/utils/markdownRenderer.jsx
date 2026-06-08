import React from 'react';

/**
 * Lightweight markdown renderer for AI assistant messages.
 * Supports: **bold**, *italic*, `code`, [text](url) links, and newlines.
 *
 * Internal "pp://" scheme links are intercepted and routed in-app:
 *   pp://package/<id>       → /book-package/<id>
 *   pp://destination/<id>   → /plan-wedding?destination=<id>
 *   pp://packages           → /explore-packages
 *   pp://custom             → /plan-wedding
 *   pp://gallery            → /wedding-gallery
 *   pp://bookings           → /my-weddings
 */

export function ppLinkToRoute(href) {
  if (!href || !href.startsWith('pp://')) return null;
  const path = href.slice(5); // strip "pp://"
  if (path.startsWith('package/')) {
    const id = path.slice('package/'.length);
    return `/book-package/${encodeURIComponent(id)}`;
  }
  if (path.startsWith('destination/')) {
    const id = path.slice('destination/'.length);
    return `/plan-wedding?destination=${encodeURIComponent(id)}`;
  }
  if (path === 'packages') return '/explore-packages';
  if (path === 'custom') return '/plan-wedding';
  if (path === 'gallery') return '/wedding-gallery';
  if (path === 'bookings') return '/my-weddings';
  return null;
}

// Escape regex special chars
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/**
 * Parse a single inline string into React nodes. Handles links, bold, italic, code.
 * Order: links first (so [**bold**](url) works), then bold, then italic, then code.
 */
function renderInline(text, navigate, keyPrefix = '') {
  if (!text) return null;
  const nodes = [];
  let lastIndex = 0;
  let nodeKey = 0;

  // 1. Find markdown links [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let match;
  const linkMatches = [];
  while ((match = linkRegex.exec(text)) !== null) {
    linkMatches.push({ index: match.index, length: match[0].length, label: match[1], href: match[2] });
  }

  function pushFormatted(str) {
    if (!str) return;
    // Apply bold/italic/code on plain ranges
    const parts = splitFormatting(str);
    for (const p of parts) {
      nodes.push(<React.Fragment key={`${keyPrefix}-f-${nodeKey++}`}>{p}</React.Fragment>);
    }
  }

  for (const lm of linkMatches) {
    if (lm.index > lastIndex) {
      pushFormatted(text.slice(lastIndex, lm.index));
    }
    const route = ppLinkToRoute(lm.href);
    if (route && navigate) {
      nodes.push(
        <button
          key={`${keyPrefix}-lnk-${nodeKey++}`}
          type="button"
          onClick={(e) => { e.preventDefault(); navigate(route); }}
          className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-md bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-colors text-[0.92em] font-medium align-baseline"
        >
          {lm.label}
        </button>
      );
    } else {
      // External link — open in new tab
      nodes.push(
        <a
          key={`${keyPrefix}-ext-${nodeKey++}`}
          href={lm.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold underline hover:text-gold/80"
        >
          {lm.label}
        </a>
      );
    }
    lastIndex = lm.index + lm.length;
  }
  if (lastIndex < text.length) pushFormatted(text.slice(lastIndex));
  return nodes;
}

// Apply bold (**), italic (*), code (`) to a plain string. Returns array of strings/elements.
function splitFormatting(input) {
  const tokens = tokenize(input);
  return tokens;
}

function tokenize(input) {
  const out = [];
  // Try patterns in priority order
  const patterns = [
    { re: /\*\*([^*]+)\*\*/, wrap: (t, k) => <strong key={k} className="font-semibold text-dark">{t}</strong> },
    { re: /\*([^*]+)\*/,     wrap: (t, k) => <em key={k}>{t}</em> },
    { re: /`([^`]+)`/,       wrap: (t, k) => <code key={k} className="bg-gray-100 text-gold px-1 py-0.5 rounded text-[0.9em] font-mono">{t}</code> }
  ];
  let remaining = input;
  let key = 0;
  while (remaining.length) {
    // find earliest match across patterns
    let best = null;
    for (const p of patterns) {
      const m = remaining.match(p.re);
      if (m && (best === null || m.index < best.m.index)) best = { p, m };
    }
    if (!best) {
      out.push(remaining);
      break;
    }
    if (best.m.index > 0) out.push(remaining.slice(0, best.m.index));
    out.push(best.p.wrap(best.m[1], `tk-${key++}`));
    remaining = remaining.slice(best.m.index + best.m[0].length);
  }
  return out;
}

/**
 * Top-level renderer. Splits content into lines and detects list items.
 */
export function MarkdownMessage({ content, navigate }) {
  if (!content) return null;
  const lines = content.split('\n');
  const blocks = [];
  let listBuffer = [];
  let listType = null; // 'ol' | 'ul'

  const flushList = () => {
    if (!listBuffer.length) return;
    const items = listBuffer.map((it, i) => (
      <li key={`li-${blocks.length}-${i}`} className="ml-1">
        {renderInline(it, navigate, `li-${blocks.length}-${i}`)}
      </li>
    ));
    blocks.push(
      listType === 'ol'
        ? <ol key={`b-${blocks.length}`} className="list-decimal pl-6 space-y-1.5 my-2">{items}</ol>
        : <ul key={`b-${blocks.length}`} className="list-disc pl-6 space-y-1.5 my-2">{items}</ul>
    );
    listBuffer = [];
    listType = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (olMatch) {
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listBuffer.push(olMatch[1]);
      continue;
    }
    if (ulMatch) {
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listBuffer.push(ulMatch[1]);
      continue;
    }
    flushList();
    if (line.trim() === '') {
      blocks.push(<div key={`b-${blocks.length}`} className="h-2" />);
    } else {
      blocks.push(
        <p key={`b-${blocks.length}`} className="leading-relaxed">
          {renderInline(line, navigate, `p-${blocks.length}`)}
        </p>
      );
    }
  }
  flushList();

  return <div className="space-y-1 text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>{blocks}</div>;
}
