import Hyperswarm from 'hyperswarm';
import b4a from 'b4a';
import crypto from 'hypercore-crypto';
import Hypercore from 'hypercore';
import Hyperbee from 'hyperbee';

// Profile Setup
const feed = new Hypercore('./my-storage');
const db = new Hyperbee(feed, { keyEncoding: 'utf-8', valueEncoding: 'json' });
let userProfile = { username: '', gamesPlayed: 0, wins: 0, losses: 0 };

async function loadUserProfile() {
  await db.ready();
  const storedProfile = await db.get('user-profile');
  if (storedProfile && storedProfile.value) {
    userProfile = storedProfile.value;
  }
  updateProfileUI();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadUserProfile();
});

// Navigation Handling
const navProfile = document.getElementById('nav-profile');
const navLobby = document.getElementById('nav-lobby');
const navGame = document.getElementById('nav-game');
const sectionProfile = document.getElementById('section-profile');
const sectionLobby = document.getElementById('section-lobby');
const sectionGame = document.getElementById('section-game');
const navHome = document.getElementById('nav-home');
const sectionHome = document.getElementById('section-main');

function showSection(section) {
  [sectionProfile, sectionLobby, sectionGame, sectionHome].forEach(s => s.classList.remove('active'));
  [navProfile, navLobby, navGame, navHome].forEach(n => n.classList.remove('active'));
  section.classList.add('active');
  if (section === sectionProfile) navProfile.classList.add('active');
  else if (section === sectionLobby) navLobby.classList.add('active');
  else if (section === sectionGame) navGame.classList.add('active');
  else if (section === sectionHome) navHome.classList.add('active');
}

navHome.addEventListener('click', () => showSection(sectionHome));
navProfile.addEventListener('click', () => showSection(sectionProfile));
navLobby.addEventListener('click', () => showSection(sectionLobby));
navGame.addEventListener('click', (e) => {
  if (!gameAccess) {
    alert("Access denied. Please generate and join a game first in the Lobby.");
    e.preventDefault();
    return;
  }
  showSection(sectionGame);
});

// P2P Game Logic
let gameAccess = false;
let generatedTopic = crypto.randomBytes(32);
let swarm = new Hyperswarm();
let peerConnection = null;

function setupPeerCommunication(socket) {
  peerConnection = socket;
  socket.on('data', (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === "choice") {
        opponentChoice = message.choice;
        checkGameResult();
      }
      if (message.type === "turn") {
        isPlayerTurn = true;
        updateGameUI();
      }
    } catch (err) {
      console.error("Error parsing peer message:", err);
    }
  });
  socket.on('close', () => {
    console.log("Peer disconnected.");
    peerConnection = null;
    gameAccess = false;
    document.getElementById('game-status').textContent = "Disconnected from game.";
  });
}

document.getElementById('generate-game-link').addEventListener('click', () => {
  const gameLink = b4a.toString(generatedTopic, 'hex');
  document.getElementById('game-link-display').textContent = gameLink;
  document.getElementById('join-game-link').value = gameLink;
});

document.getElementById('join-game').addEventListener('click', async () => {
  const joinLink = document.getElementById('join-game-link').value.trim();
  if (!joinLink) {
    alert("Please enter a valid game link.");
    return;
  }
  gameAccess = true;
  const joinTopic = b4a.from(joinLink, 'hex');
  swarm.join(joinTopic, { client: true });
  swarm.on('connection', (socket, details) => {
    console.log("Connected to peer:", details);
    setupPeerCommunication(socket);
  });
  alert("Joined game successfully. You can now access the Game section.");
});

// Game Play Logic
let playerChoice = null;
let opponentChoice = null;
let playerScore = 0;
let opponentScore = 0;
let isPlayerTurn = true;

window.sendChoice = function(choice) {
  if (peerConnection && isPlayerTurn) {
    playerChoice = choice;
    peerConnection.write(JSON.stringify({ type: "choice", choice }));
    isPlayerTurn = false;
    document.getElementById('game-status').textContent = "Waiting for opponent's move...";
  } else {
    alert("No peer connection yet or not your turn.");
  }
};

async function checkGameResult() {
  if (playerChoice && opponentChoice) {
    let result;
    if (playerChoice === opponentChoice) {
      result = "It's a tie!";
    } else if (
      (playerChoice === "rock" && opponentChoice === "scissors") ||
      (playerChoice === "paper" && opponentChoice === "rock") ||
      (playerChoice === "scissors" && opponentChoice === "paper")
    ) {
      result = "You win!";
      playerScore++;
      userProfile.gamesPlayed++;
      userProfile.wins++;
    } else {
      result = "You lose!";
      opponentScore++;
      userProfile.gamesPlayed++;
      userProfile.losses++;
    }
    await db.put('user-profile', userProfile);
    document.getElementById('game-status').textContent = `Opponent chose ${opponentChoice}. ${result}`;
    document.getElementById('player-score').textContent = playerScore;
    document.getElementById('opponent-score').textContent = opponentScore;
    updateProfileUI();
  }
}

function updateProfileUI() {
  document.getElementById('username-display').textContent = userProfile.username || 'Not set';
  document.getElementById('games-played').textContent = userProfile.gamesPlayed;
  document.getElementById('wins').textContent = userProfile.wins;
  document.getElementById('losses').textContent = userProfile.losses;
}