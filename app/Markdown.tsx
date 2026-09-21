import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Renderuje odpověď asistenta jako Markdown (nadpisy, seznamy, kód, tabulky…).
// memo: při streamování se nerenderují starší zprávy (jejich `children` se nemění).
export const Markdown = memo(function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});
