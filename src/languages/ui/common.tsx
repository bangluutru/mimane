import type { AnyToken } from '../types';
import type { Sentence } from '@/domains/lesson/types';

/** Render a sentence as tokens with a per-token renderer (fallback: plain text). */
export function Tokens({
  sentence, selected, onToken, render, className,
}: {
  sentence: Sentence;
  selected?: number;
  onToken?: (i: number) => void;
  render: (t: AnyToken, i: number) => React.ReactNode;
  className?: string;
}) {
  const tokens = sentence.analysis?.tokens as AnyToken[] | undefined;
  if (!tokens?.length) return <span className={className}>{sentence.text}</span>;
  return (
    <span className={className}>
      {tokens.map((t, i) =>
        t.isWord && onToken ? (
          <span
            key={i}
            className={`tok${selected === i ? ' sel' : ''}`}
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onToken(i);
            }}
          >
            {render(t, i)}
          </span>
        ) : (
          <span key={i}>{render(t, i)}</span>
        ),
      )}
    </span>
  );
}
