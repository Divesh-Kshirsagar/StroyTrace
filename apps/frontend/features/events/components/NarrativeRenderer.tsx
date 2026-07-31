import DOMPurify from 'isomorphic-dompurify';

interface NarrativeRendererProps {
  content: string;
}

export default function NarrativeRenderer({ content }: NarrativeRendererProps) {
  // Sanitize the HTML
  const sanitizedHtml = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });

  return (
    <div 
      className="prose prose-zinc dark:prose-invert max-w-none 
                 prose-p:leading-relaxed prose-headings:font-bold 
                 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
