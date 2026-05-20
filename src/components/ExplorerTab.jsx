import React, { useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';

export default function ExplorerTab() {
  const [expandedFolders, setExpandedFolders] = useState(new Set(['src', 'db']));
  const [selectedFile, setSelectedFile] = useState('src/main.py');

  const mockFileTree = [
    {
      name: 'src',
      type: 'folder',
      path: 'src',
      children: [
        { name: 'main.py', type: 'file', path: 'src/main.py' },
        { name: 'agents.py', type: 'file', path: 'src/agents.py' },
        { name: 'ingest.py', type: 'file', path: 'src/ingest.py' },
      ],
    },
    {
      name: 'db',
      type: 'folder',
      path: 'db',
      children: [
        { name: 'database.py', type: 'file', path: 'db/database.py' },
        { name: 'models.py', type: 'file', path: 'db/models.py' },
      ],
    },
    { name: 'README.md', type: 'file', path: 'README.md' },
  ];

  const mockFileContent = {
    'src/main.py': '# Main Application\nimport fastapi\napp = fastapi.FastAPI()\n\n@app.get("/health")\nasync def health():\n    return {"status": "ok"}',
    'src/agents.py': '# AI Agents\nclass Agent:\n    def __init__(self, name):\n        self.name = name\n    \n    async def run(self, query):\n        return f"Processing: {query}"',
    'db/database.py': '# Database Connection\nfrom sqlalchemy import create_engine\nengine = create_engine("postgresql://...")',
    'db/models.py': '# Database Models\nfrom sqlalchemy import Column, String\nclass Workspace(Base):\n    __tablename__ = "workspaces"\n    id = Column(String, primary_key=True)',
    'README.md': '# RepoIntel\n\nRepository Intelligence Platform\n\n## Features\n- Code analysis\n- Architecture visualization\n- AI-powered insights',
  };

  const toggleFolder = (path) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) newExpanded.delete(path);
    else newExpanded.add(path);
    setExpandedFolders(newExpanded);
  };

  const FileTreeItem = ({ item, level = 0 }) => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.has(item.path);

    if (isFolder) {
      return (
        <div key={item.path}>
          <div className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer" style={{ paddingLeft: `${level * 16 + 16}px` }}>
            <button onClick={() => toggleFolder(item.path)} className="p-0">
              {isExpanded ? <ChevronDown size={18} className="text-gray-600" /> : <ChevronRight size={18} className="text-gray-600" />}
            </button>
            <Folder size={18} className="text-blue-500" />
            <span className="font-medium text-gray-700">{item.name}</span>
          </div>
          {isExpanded && item.children && item.children.map((child) => <FileTreeItem key={child.path} item={child} level={level + 1} />)}
        </div>
      );
    }

    return (
      <div key={item.path}>
        <div
          onClick={() => setSelectedFile(item.path)}
          className={`flex items-center gap-2 px-4 py-2 cursor-pointer transition ${
            selectedFile === item.path ? 'bg-blue-100 border-l-4 border-blue-600' : 'hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${level * 16 + 40}px` }}
        >
          <File size={18} className="text-gray-500" />
          <span className="text-sm text-gray-700">{item.name}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex gap-4">
      {/* File Tree on Left */}
      <div className="w-1/3 bg-white rounded-lg shadow overflow-auto border-r">
        <div className="p-4 border-b sticky top-0 bg-white">
          <h3 className="font-bold text-gray-900">Explorer</h3>
        </div>
        <div>{mockFileTree.map((item) => <FileTreeItem key={item.path} item={item} />)}</div>
      </div>

      {/* Code Display on Right */}
      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
        <div className="bg-gray-900 text-white px-6 py-3 sticky top-0">
          <span className="font-mono text-sm">{selectedFile}</span>
        </div>
        <pre className="font-mono text-sm text-gray-800 p-6 overflow-auto flex-1 whitespace-pre-wrap">
          {mockFileContent[selectedFile] || '// Select a file to view its content'}
        </pre>
      </div>
    </div>
  );
}
