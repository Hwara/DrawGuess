// App.tsx에서 수정할 부분

// 기존 import 수정
import { HowToPlay, About } from './pages/OtherPages'; // Leaderboard 제거
import { Leaderboard } from './pages/Leaderboard'; // 새로운 Leaderboard import

// 나머지 import들은 그대로...
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import GameTest from './pages/GameTest';
import DrawGuessGame from './pages/DrawGuessGame';
import ServerStatus from './pages/ServerStatus';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/how-to-play" element={<HowToPlay />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/about" element={<About />} />
          <Route path="/game-test" element={<GameTest />} />
          <Route path="/draw-guess" element={<DrawGuessGame />} />
          <Route path="/server-status" element={<ServerStatus />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;