import React from 'react';
import { Copy, X } from 'lucide-react';

export default function CodeViewer({ file, code, onClose }) {
  const [copied, setCopied] = React.useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLanguage = (filename) => {
    const ext = filename.split('.').pop();
    const languageMap = {
      js: 'JavaScript', jsx: 'JSX', py: 'Python', ts: 'TypeScript',
      tsx: 'TSX', json: 'JSON', html: 'HTML', css: 'CSS',
      md: 'Markdown', sql: 'SQL', yaml: 'YAML',
    };
    return languageMap[ext] || ext.toUpperCase();
  };

  const lines = code.split('\n');
  const maxLineNumber = lines.length;

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
      <div className="flex items-center justify-between bg-gray-900 text-white px-6 py-4 rounded-t-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono bg-gray-800 px-3 py-1 rounded">{getLanguage(file)}</span>
          <span className="font-mono text-sm">{file}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={copyCode} className="flex items-center gap-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm transition">
            <Copy size={16} /> {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded transition"><X size={20} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-gray-50">
        <pre className="font-mono text-sm text-gray-800 p-6">
          {lines.map((line, idx) => (
            <div key={idx} className="flex">
              <span className="inline-block w-8 pr-4 text-right text-gray-500 select-none">{idx + 1}</span>
              <span className="flex-1">{line || '\n'}</span>
            </div>
          ))}
        </pre>
      </div>
      <div className="bg-gray-100 px-6 py-2 text-xs text-gray-600 border-t">{lines.length} lines • {code.length} characters</div>
    </div>
  );
}
