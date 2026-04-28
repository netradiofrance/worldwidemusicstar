/**
 * Tiny markdown -> HTML converter sufficient for the blog content
 * we generate (paragraphs, h2, h3, lists, bold/italic, links).
 *
 * For richer needs later, swap to `marked` or `markdown-it`. This is
 * intentionally small so we don't ship a parser to the client.
 */
function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inList = false;
  let para: string[] = [];

  function flushPara() {
    if (para.length === 0) return;
    out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  }
  function flushList() {
    if (inList) { out.push('</ul>'); inList = false; }
  }

  function inline(s: string): string {
    let r = escape(s);
    // links [text](url)
    r = r.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // bold **x**
    r = r.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // italic *x*
    r = r.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // inline code `x`
    r = r.replace(/`([^`]+)`/g, '<code>$1</code>');
    return r;
  }

  for (const raw of lines) {
    const l = raw.trimEnd();
    if (l.startsWith('## ')) {
      flushPara(); flushList();
      out.push(`<h2>${inline(l.slice(3))}</h2>`); continue;
    }
    if (l.startsWith('### ')) {
      flushPara(); flushList();
      out.push(`<h3>${inline(l.slice(4))}</h3>`); continue;
    }
    if (l.startsWith('- ') || l.startsWith('* ')) {
      flushPara();
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(l.slice(2))}</li>`); continue;
    }
    if (l.trim() === '') {
      flushPara(); flushList(); continue;
    }
    para.push(l);
  }
  flushPara(); flushList();
  return out.join('\n');
}
