import React, { useState } from 'react';
import { X, Send, Plus } from 'lucide-react';

export default function FilesChatModal({ files, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages([...messages, userMsg]);
    setInput('');
    setLoading(true);
    setTimeout(() => {
      const assistantMsg = { role: 'assistant', content: `Analyzing ${files.length} files...` };
      setMessages((prev) => [...prev, assistantMsg]);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-3/4 h-3/4 flex flex-col">
        <div className="flex items-center justify-between bg-blue-600 text-white px-6 py-4 rounded-t-lg">
          <div>
            <h3 className="font-bold text-lg">Chat with {files.length} Files</h3>
            <p className="text-sm text-blue-100 mt-1">{files.map((f) => f.split('/').pop()).join(', ')}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded transition"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Plus size={48} className="mb-4 opacity-50" />
              <p>Ask questions about these files...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md px-4 py-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>{msg.content}</div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 border border-gray-200 px-4 py-3 rounded-lg">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="bg-white border-t px-6 py-4 rounded-b-lg">
          <div className="flex gap-3">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask about these files..." className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={handleSend} disabled={loading || !input.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"><Send size={18} />Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
