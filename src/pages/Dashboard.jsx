import React, { useState } from 'react';
import { Settings, LogOut } from 'lucide-react';
import ExplorerTab from '../components/ExplorerTab';
import ContentTab from '../components/ContentTab';
import ArchitectureTab from '../components/ArchitectureTab';
import ChatTab from '../components/ChatTab';
import OverviewTab from '../components/OverviewTab';
import CodeSetupTab from '../components/CodeSetupTab';
import IssuesTab from '../components/IssuesTab';
import CollaboratorsTab from '../components/CollaboratorsTab';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: '📊 Overview', component: OverviewTab },
    { id: 'explorer', label: '📁 Explorer', component: ExplorerTab },
    { id: 'content', label: '📄 Content', component: ContentTab },
    { id: 'architecture', label: '🏗️ Architecture', component: ArchitectureTab },
    { id: 'chat', label: '💬 Chat', component: ChatTab },
    { id: 'codesetup', label: '⚙️ Code Setup', component: CodeSetupTab },
    { id: 'issues', label: '🐛 Issues', component: IssuesTab },
    { id: 'team', label: '👥 Team', component: CollaboratorsTab },
  ];

  const ActiveComponent = tabs.find((t) => t.id === activeTab)?.component;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RepoIntel</h1>
          <p className="text-sm text-gray-600">Repository Intelligence Platform</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition">
            <Settings size={20} className="text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition">
            <LogOut size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="bg-white border-b border-gray-200 px-8 overflow-x-auto">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-4 font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-auto p-8">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}
