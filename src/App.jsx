import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Rules from './components/Rules';
import Generators from './components/Generators';
import Vtt from './components/Vtt';

function App() {
  const [activeTab, setActiveTab] = useState('hub');

  const renderContent = () => {
    switch (activeTab) {
      case 'hub':
        return <Dashboard />;
      case 'rules':
        return <Rules />;
      case 'generators':
        return <Generators />;
      case 'vtt':
        return <Vtt />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      {/* Атмосферный фон с эффектами OSR */}
      <div className="osr-app-bg" />
      
      {/* Декоративные фоновые факелы, светящие по углам экрана */}
      <div className="torch-glow" style={{ top: '-10%', left: '-10%', width: '400px', height: '400px' }} />
      <div className="torch-glow" style={{ bottom: '-10%', right: '-10%', width: '400px', height: '400px', animationDelay: '-2s' }} />

      <div className="app-container">
        {/* Боковая панель навигации */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Основной контент страницы */}
        <main className="main-content">
          {renderContent()}
        </main>
      </div>
    </>
  );
}

export default App;
