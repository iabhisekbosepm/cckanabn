/**
 * Simple markdown parser for task text
 * Supports: **bold**, *italic*, `code`
 */

export function parseMarkdown(text) {
  if (!text) return '';

  // Convert to string if not already
  let parsed = String(text);

  // Replace **bold** with <strong>
  parsed = parsed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Replace *italic* with <em> (simple version - single asterisks)
  // This runs after bold replacement, so ** are already converted
  parsed = parsed.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Replace `code` with <code>
  parsed = parsed.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>');

  return parsed;
}

/**
 * Extended markdown parser for chat messages
 * Supports: **bold**, *italic*, `code`, headers, lists, line breaks
 */
export function parseChatMarkdown(text) {
  if (!text) return '';

  // Convert to string if not already
  let parsed = String(text);

  // Split into lines for processing
  const lines = parsed.split('\n');
  const processedLines = lines.map(line => {
    // Headers
    if (line.startsWith('### ')) {
      return `<h4 style="font-weight:600;color:#111;margin-top:8px;margin-bottom:4px;">${processInlineMarkdown(line.slice(4))}</h4>`;
    }
    if (line.startsWith('## ')) {
      return `<h3 style="font-weight:600;color:#111;font-size:15px;margin-top:8px;margin-bottom:4px;">${processInlineMarkdown(line.slice(3))}</h3>`;
    }
    if (line.startsWith('# ')) {
      return `<h2 style="font-weight:700;color:#111;font-size:16px;margin-top:8px;margin-bottom:4px;">${processInlineMarkdown(line.slice(2))}</h2>`;
    }

    // Bullet points
    if (line.match(/^[\-\•]\s+/)) {
      const content = line.replace(/^[\-\•]\s+/, '');
      return `<div style="display:flex;gap:8px;margin-left:8px;"><span style="color:#6b7280;">•</span><span>${processInlineMarkdown(content)}</span></div>`;
    }

    // Numbered list
    if (line.match(/^\d+\.\s+/)) {
      const match = line.match(/^(\d+)\.\s+/);
      const num = match[1];
      const content = line.replace(/^\d+\.\s+/, '');
      return `<div style="display:flex;gap:8px;margin-left:8px;"><span style="color:#6b7280;">${num}.</span><span>${processInlineMarkdown(content)}</span></div>`;
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      return '<div style="height:8px;"></div>';
    }

    // Regular line with inline markdown
    return `<div>${processInlineMarkdown(line)}</div>`;
  });

  return processedLines.join('\n');
}

/**
 * Process inline markdown (bold, italic, code)
 */
function processInlineMarkdown(text) {
  let parsed = text;

  // Replace **bold** with <strong>
  parsed = parsed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Replace *italic* with <em>
  parsed = parsed.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Replace `code` with <code>
  parsed = parsed.replace(/`([^`]+)`/g, '<code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;font-size:12px;font-family:monospace;">$1</code>');

  // Replace "quoted text" with styled quotes
  parsed = parsed.replace(/"([^"]+)"/g, '<span style="color:#2563eb;">"$1"</span>');

  return parsed;
}

/**
 * React component to render chat markdown
 */
export function ChatMarkdown({ children, className = '' }) {
  if (children === null || children === undefined) return null;

  const html = parseChatMarkdown(children);

  return (
    <div
      className={`chat-markdown ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * React component to render markdown text
 */
export function MarkdownText({ children, className = '' }) {
  if (children === null || children === undefined) return null;

  const html = parseMarkdown(children);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
