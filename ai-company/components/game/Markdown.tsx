"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// AIの出力を安全に表示（生HTMLは無効・リンクは外部タブ）
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-ai">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-sky-soft underline">
              {children}
            </a>
          ),
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
