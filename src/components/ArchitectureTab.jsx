import React, { useState } from 'react';
import { ChevronRight, Package, File, ArrowLeft } from 'lucide-react';

export default function ArchitectureTab() {
  const [drillDownComponent, setDrillDownComponent] = useState(null);

  const components = {
    'Backend': {
      description: 'FastAPI server & APIs',
      color: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      files: ['main.py', 'agents.py', 'ingest.py'],
    },
    'Database': {
      description: 'PostgreSQL with SQLAlchemy',
      color: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      files: ['db/database.py', 'db/models.py', 'db/migrations/001_initial_schema.sql'],
    },
    'Services': {
      description: 'Business logic layer',
      color: 'from-purple-50 to-pink-50',
      borderColor: 'border-purple-200',
      iconColor: 'text-purple-600',
      files: ['services/workspace_service.py', 'services/graph_service.py', 'services/search_service.py'],
    },
    'Frontend': {
      description: 'React UI application',
      color: 'from-yellow-50 to-orange-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      files: ['src/App.jsx', 'src/pages/Dashboard.jsx', 'src/components/ExplorerTab.jsx'],
    },
    'Core': {
      description: 'GitVizz analysis engine',
      color: 'from-red-50 to-rose-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      files: ['core/custom_ast_parser.py', 'core/graph_generator.py', 'core/graph_search_tool.py'],
    },
  };

  // HIGH-LEVEL VIEW
  if (!drillDownComponent) {
    return (
      <div className="h-full bg-white rounded-lg shadow p-8 overflow-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Architecture</h2>
        <p className="text-gray-600 mb-8">High-level system overview. Click any component to see its files.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(components).map(([name, details]) => (
            <button
              key={name}
              onClick={() => setDrillDownComponent(name)}
              className={`bg-gradient-to-br ${details.color} border-2 ${details.borderColor} rounded-lg p-6 text-left hover:shadow-lg transition transform hover:scale-105`}
            >
              <div className="flex items-start justify-between mb-4">
                <Package className={`${details.iconColor}`} size={32} />
                <ChevronRight className="text-gray-400" size={20} />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">{name}</h3>
              <p className="text-sm text-gray-600">{details.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // DRILL-DOWN VIEW
  const component = components[drillDownComponent];

  return (
    <div className="h-full bg-white rounded-lg shadow p-8 overflow-auto">
      <button
        onClick={() => setDrillDownComponent(null)}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 font-semibold transition"
      >
        <ArrowLeft size={20} /> Back to Architecture
      </button>

      <h2 className="text-3xl font-bold text-gray-900 mb-2">{drillDownComponent}</h2>
      <p className="text-gray-600 mb-8">{component.description}</p>

      <h3 className="font-bold text-gray-900 mb-4 text-lg">Files in this component:</h3>
      <div className="space-y-3">
        {component.files.map((file) => (
          <div key={file} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition border border-gray-200">
            <File size={20} className="text-gray-500 flex-shrink-0" />
            <span className="font-mono text-sm text-gray-800">{file}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
