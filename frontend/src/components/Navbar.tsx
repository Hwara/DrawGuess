import React from 'react';

const Navbar: React.FC = () => {
    return (
        <nav className="navbar">
            <div className="nav-container">
                <a href="/" className="nav-logo">
                    🎮 DrawGuess
                </a>
                <ul className="nav-links">
                    <li><a href="/">홈</a></li>
                    <li><a href="/draw-guess">DrawGuess 게임</a></li>
                    <li><a href="/how-to-play">게임 방법</a></li>
                    <li><a href="/server-status">서버 상태</a></li>
                    <li><a href="/game-test">게임 테스트</a></li>
                    <li><a href="/leaderboard">순위표</a></li>
                    <li><a href="/about">소개</a></li>
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;