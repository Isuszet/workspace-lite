import { useState, useMemo, useCallback } from 'react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false);

  const handleFormat = useCallback((before: string, after: string = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  }, [value, onChange]);

  const renderMarkdown = useMemo(() => {
    const render = (text: string) => {
    let html = text;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-6 mb-3">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>');
    
    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded my-4 overflow-x-auto"><code>$1</code></pre>');
    html = html.replace(/`(.+?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">$1</code>');
    
    // Lists
    html = html.replace(/^\* (.+)$/gim, '<li class="ml-4">• $1</li>');
    html = html.replace(/^\d+\. (.+)$/gim, '<li class="ml-4">$1</li>');
    
    // Checkboxes
    html = html.replace(/^- \[ \] (.+)$/gim, '<div class="flex items-start gap-2 my-1"><input type="checkbox" class="mt-1" disabled /> <span>$1</span></div>');
    html = html.replace(/^- \[x\] (.+)$/gim, '<div class="flex items-start gap-2 my-1"><input type="checkbox" class="mt-1" checked disabled /> <span class="line-through text-gray-500">$1</span></div>');
    
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p class="my-4">');
    html = html.replace(/\n/g, '<br />');
    
      return '<p class="my-4">' + html + '</p>';
    };
    return render;
  }, []);

  const renderedMarkdown = useMemo(() => {
    if (!preview) return '';
    return renderMarkdown(value);
  }, [preview, value, renderMarkdown]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleFormat('# ', '')}
          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm text-gray-700 dark:text-gray-300"
          title="Заголовок 1"
        >
          H1
        </button>
        <button
          onClick={() => handleFormat('## ', '')}
          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm text-gray-700 dark:text-gray-300"
          title="Заголовок 2"
        >
          H2
        </button>
        <button
          onClick={() => handleFormat('### ', '')}
          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm text-gray-700 dark:text-gray-300"
          title="Заголовок 3"
        >
          H3
        </button>
        
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        
        <button
          onClick={() => handleFormat('**', '**')}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-bold"
          title="Жирный"
        >
          B
        </button>
        <button
          onClick={() => handleFormat('*', '*')}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm italic"
          title="Курсив"
        >
          I
        </button>
        <button
          onClick={() => handleFormat('`', '`')}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-mono"
          title="Код"
        >
          {'<>'}
        </button>
        
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        
        <button
          onClick={() => handleFormat('* ', '')}
          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm text-gray-700 dark:text-gray-300"
          title="Список"
        >
          • Список
        </button>
        <button
          onClick={() => handleFormat('- [ ] ', '')}
          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm text-gray-700 dark:text-gray-300"
          title="Чеклист"
        >
          ☐ Чеклист
        </button>
        
        <div className="flex-1" />
        
        <button
          onClick={() => setPreview(!preview)}
          className={`px-3 py-1.5 rounded text-sm ${
            preview 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
          }`}
        >
          {preview ? '✏️ Редактор' : '👁️ Предпросмотр'}
        </button>
      </div>

      {/* Editor / Preview */}
      {preview ? (
        <div
          className="prose max-w-none dark:prose-invert text-gray-900 dark:text-gray-100"
          dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-96 p-4 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Начните писать..."
        />
      )}

      {/* Markdown hints */}
      {!preview && (
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>💡 <strong>Подсказки:</strong></p>
          <p>• # Заголовок 1 | ## Заголовок 2 | ### Заголовок 3</p>
          <p>• **жирный** | *курсив* | `код` | ```блок кода```</p>
          <p>• * Элемент списка | - [ ] Чеклист | - [x] Выполнено</p>
        </div>
      )}
    </div>
  );
}