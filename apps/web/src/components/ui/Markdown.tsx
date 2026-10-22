import React from "react";

/** Minimal, dependency-free markdown for LLM output: headings, lists, code fences, **bold**, *italic*, `code`. */
export function Markdown({ text }: { text: string }) {
  return <div className="md">{renderMarkdown(text)}</div>;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let inCode = false;
  let codeLang = "";
  let buf: string[] = [];

  lines.forEach((line, i) => {
    if (line.trim().startsWith("```")) {
      if (!inCode) { inCode = true; codeLang = line.trim().slice(3); buf = []; }
      else {
        inCode = false;
        out.push(<pre key={`c${i}`}>{codeLang && <span className="md-lang">{codeLang}</span>}{buf.join("\n")}</pre>);
      }
      return;
    }
    if (inCode) { buf.push(line); return; }
    if (!line.trim()) { out.push(<div key={i} style={{ height: 8 }} />); return; }

    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) { const Tag = (`h${h[1].length + 2}`) as "h3" | "h4" | "h5"; out.push(<Tag key={i}>{inline(h[2])}</Tag>); return; }

    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    if (bullet) { out.push(<div key={i} className="md-li"><span className="md-bullet">•</span><span>{inline(bullet[1])}</span></div>); return; }

    const num = line.match(/^\s*(\d+)[.)]\s+(.*)/);
    if (num) { out.push(<div key={i} className="md-li"><span className="md-num">{num[1]}.</span><span>{inline(num[2])}</span></div>); return; }

    out.push(<p key={i}>{inline(line)}</p>);
  });
  if (inCode && buf.length) out.push(<pre key="c-end">{buf.join("\n")}</pre>);
  return out;
}

function inline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={m.index}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={m.index}>{m[4]}</em>);
    else if (m[5]) parts.push(<code key={m.index}>{m[6]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
