import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import { HowToPlay, Leaderboard, About } from './pages/OtherPages';
import DrawGuessGame from './pages/DrawGuessGame';
import ServerStatus from './pages/ServerStatus';
import GameTest from './pages/GameTest';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/how-to-play" element={<HowToPlay />} />
            <Route path="/server-status" element={<ServerStatus />} />
            <Route path="/game-test" element={<GameTest />} />
            <Route path="/draw-guess" element={<DrawGuessGame />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;