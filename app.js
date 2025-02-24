import Hyperswarm from 'hyperswarm';
import b4a from 'b4a';
import crypto from 'hypercore-crypto';
import Corestore from 'corestore';

// ----------------------
// PROFILE SECTION LOGIC
// ----------------------
const store = new Corestore('./my-storage');
let userProfile = { username: '', gamesPlayed: 0, wins: 0, losses: 0 };

async function loadUserProfile() {
  const savedProfile = localStorage.getItem('userProfile');
  if (savedProfile) {
    userProfile = JSON.parse(savedProfile);
  }
  updateProfileUI();
}

function saveUserProfile() {
  localStorage.setItem('userProfile', JSON.stringify(userProfile));
  updateProfileUI();
}

function updateProfileUI() {
  document.getElementById('username-display').textContent = userProfile.username || 'Not set';
  document.getElementById('games-played').textContent = userProfile.gamesPlayed;
  document.getElementById('wins').textContent = userProfile.wins;
  document.getElementById('losses').textContent = userProfile.losses;
}

// ----------------------
// NAVIGATION HANDLING
// ----------------------
const navProfile = document.getElementById('nav-profile');
const navLobby = document.getElementById('nav-lobby');
const navGame = document.getElementById('nav-game');
const sectionProfile = document.getElementById('section-profile');
const sectionLobby = document.getElementById('section-lobby');
const sectionGame = document.getElementById('section-game');
const navHome = document.getElementById('nav-home');
const  sectionHome = document.getElementById('section-main');

function showSection(section) {
  sectionProfile.classList.remove('active');
  sectionLobby.classList.remove('active');
  sectionGame.classList.remove('active');
  navProfile.classList.remove('active');
  navLobby.classList.remove('active');
  navGame.classList.remove('active');
  sectionHome.classList.remove('active');
  navHome.classList.remove('active')

  
  section.classList.add('active');
  if (section === sectionProfile) {
    navProfile.classList.add('active');
  } else if (section === sectionLobby) {
    navLobby.classList.add('active');
  } else if (section === sectionGame) {
    navGame.classList.add('active');
  } else if (section === sectionHome)  {
    navHome.classList.add('active');
  }
}

navHome.addEventListener('click', () => showSection(sectionHome));
navProfile.addEventListener('click', () => showSection(sectionProfile));
navLobby.addEventListener('click', () => showSection(sectionLobby));
// Protect the Game section: only allow if gameAccess is true.
navGame.addEventListener('click', (e) => {
  if (!gameAccess) {
    alert("Access denied. Please generate and join a game first in the Lobby.");
    e.preventDefault();
    return;
  }
  showSection(sectionGame);
});

// ----------------------
// LOBBY SECTION LOGIC
// ----------------------
let gameAccess = false;
let generatedTopic = null;
let swarm; // Will hold our Hyperswarm instance for game connections
let peerConnection = null;

// Generate game link in Lobby
document.getElementById('generate-game-link').addEventListener('click', () => {
  generatedTopic = crypto.randomBytes(32);
  const gameLink = b4a.toString(generatedTopic, 'hex');
  document.getElementById('game-link-display').textContent = gameLink;
  
  // Initialize swarm as both server and client.
  swarm = new Hyperswarm();
  swarm.join(generatedTopic, { server: true, client: true });
  
  // When a connection is established, store the connection.
  swarm.on('connection', (socket) => {
    console.log("Connected to a peer!");
    peerConnection = socket;
    document.getElementById('game-status').textContent = "Connected! Waiting for turn...";
  });
  
});

// Join game using the provided game link.
document.getElementById('join-game').addEventListener('click', () => {
  const joinLink = document.getElementById('join-game-link').value.trim();
  if (joinLink) {
    // For this demo, we require the join link to match the generated link.
    if (generatedTopic && joinLink === b4a.toString(generatedTopic, 'hex')) {
      gameAccess = true;
      // If the swarm isn't already initialized, initialize as client.
      if (!swarm) {
        swarm = new Hyperswarm();
        const joinTopic = b4a.from(joinLink, 'hex');
        swarm.join(joinTopic, { client: true });
      }
      alert("Joined game successfully. You can now access the Game section.");
    } else {
      alert("Invalid game link. Please check and try again.");
    }
  }
});

// ----------------------
// GAME SECTION LOGIC
// ----------------------
let playerChoice = null;
let opponentChoice = null;
let playerScore = 0;
let opponentScore = 0;
let isPlayerTurn = true;

document.addEventListener("DOMContentLoaded", () => {
  loadUserProfile();
  updateGameUI();
});

window.sendChoice = function(choice) {
  if (peerConnection && isPlayerTurn) {
    playerChoice = choice;
    peerConnection.write(JSON.stringify({ type: "choice", choice }));
    isPlayerTurn = false;
    updateGameUI();
    document.getElementById('game-status').textContent = "Waiting for opponent's move...";
  } else {
    alert("No peer connection yet or not your turn.");
  }
};

function checkGameResult() {
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
      saveUserProfile();
    } else {
      result = "You lose!";
      opponentScore++;
      userProfile.gamesPlayed++;
      userProfile.losses++;
      saveUserProfile();
    }
    
    document.getElementById('game-status').textContent = `Opponent chose ${opponentChoice}. ${result}`;
    document.getElementById('player-score').textContent = playerScore;
    document.getElementById('opponent-score').textContent = opponentScore;
    playerChoice = null;
    opponentChoice = null;
    
    setTimeout(() => {
      isPlayerTurn = true;
      if (peerConnection) peerConnection.write(JSON.stringify({ type: "turn" }));
      updateGameUI();
    }, 1000);
  }
}

function updateGameUI() {
  const buttons = document.querySelectorAll(".choices button");
  buttons.forEach(button => button.disabled = !isPlayerTurn);
}

function resetGame() {
  peerConnection = null;
  playerChoice = null;
  opponentChoice = null;
  playerScore = 0;
  opponentScore = 0;
  isPlayerTurn = true;
  document.getElementById('player-score').textContent = playerScore;
  document.getElementById('opponent-score').textContent = opponentScore;
  updateGameUI();
}

// Handle incoming messages from peers.
if (swarm) {
  swarm.on('connection', (socket) => {
    socket.on('data', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === "choice") {
        opponentChoice = message.choice;
        checkGameResult();
        updateGameUI();
      } else if (message.type === "turn") {
        isPlayerTurn = true;
        updateGameUI();
      }
    });
    socket.on('close', () => {
      console.log("Peer disconnected. Waiting for new connection...");
      document.getElementById('game-status').textContent = "Opponent disconnected. Waiting for new player...";
      resetGame();
    });
  });
}
