import { Fragment, type ReactNode } from "react";

/**
 * Dependency-free HTML syntax highlighter with a custom dark "Liquid Glass" theme.
 *
 * NOTE: The brief requests `react-syntax-highlighter`, but no package manager is
 * available in this environment to install it. This component fulfils the same
 * requirement — tokenised, colour-coded HTML with a per-line `bg-red-500/20`
 * overlay on the offending line — with zero new dependencies. Swap in
 * `react-syntax-highlighter` later if the toolchain allows.
 */

interface CodeSnippetProps {
  /** Raw HTML snippet returned by the backend. */
  code: string;
  /** Zero-based index of the line to flag with the red overlay. */
  highlightLine?: number;
}

type TokenType = "punct" | "tag" | "attr" | "string" | "text" | "comment";

interface Token {
  value: string;
  type: TokenType;
}

const TOKEN_CLASSNAMES: Record<TokenType, string> = {
  punct: "text-slate-500",
  tag: "text-cyan-300",
  attr: "text-violet-300",
  string: "text-amber-200",
  text: "text-slate-200/90",
  comment: "italic text-slate-500",
};

// Matches an attribute name optionally followed by `="value"`.
const ATTRIBUTE_PATTERN = /([a-zA-Z_:][\w:.-]*)(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)?/g;

function tokenizeTagBody(body: string, tokens: Token[]): void {
  let isFirstWord = true;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  ATTRIBUTE_PATTERN.lastIndex = 0;
  while ((match = ATTRIBUTE_PATTERN.exec(body)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ value: body.slice(lastIndex, match.index), type: "punct" });
    }

    const [, name, equals, quoted] = match;
    tokens.push({ value: name, type: isFirstWord ? "tag" : "attr" });
    isFirstWord = false;

    if (equals) {
      tokens.push({ value: equals, type: "punct" });
    }
    if (quoted) {
      tokens.push({ value: quoted, type: "string" });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < body.length) {
    tokens.push({ value: body.slice(lastIndex), type: "punct" });
  }
}

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  // Split the line into tags (`<...>`), comments, and plain text runs.
  const segmentPattern = /(<!--[\s\S]*?-->)|(<\/?)([^<>]*?)(\/?>)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = segmentPattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ value: line.slice(lastIndex, match.index), type: "text" });
    }

    const [, comment, openPunct, body, closePunct] = match;
    if (comment) {
      tokens.push({ value: comment, type: "comment" });
    } else {
      tokens.push({ value: openPunct, type: "punct" });
      if (body) {
        tokenizeTagBody(body, tokens);
      }
      tokens.push({ value: closePunct, type: "punct" });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    tokens.push({ value: line.slice(lastIndex), type: "text" });
  }

  return tokens;
}

function renderTokens(line: string): ReactNode {
  if (line.length === 0) {
    return <span className="text-slate-200/90">&nbsp;</span>;
  }
  return tokenizeLine(line).map((token, index) => (
    <span key={index} className={TOKEN_CLASSNAMES[token.type]}>
      {token.value}
    </span>
  ));
}

export default function CodeSnippet({ code, highlightLine }: CodeSnippetProps) {
  const lines = code.replace(/\r\n/g, "\n").split("\n");

  return (
    <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/70 p-0 font-mono text-[12.5px] leading-6">
      <code className="block">
        {lines.map((line, index) => {
          const isHighlighted = index === highlightLine;
          return (
            <Fragment key={index}>
              <div
                className={[
                  "flex min-w-full px-3",
                  isHighlighted ? "bg-red-500/20 ring-1 ring-inset ring-red-400/30" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="mr-4 inline-block w-6 shrink-0 select-none text-right text-slate-600">
                  {index + 1}
                </span>
                <span className="whitespace-pre">{renderTokens(line)}</span>
              </div>
            </Fragment>
          );
        })}
      </code>
    </pre>
  );
}
