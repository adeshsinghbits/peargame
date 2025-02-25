import Hyperswarm from 'hyperswarm';
import b4a from 'b4a';
import crypto from 'hypercore-crypto';
import Corestore from 'corestore';

//profile
const store = new Corestore('./my-storage');
const profileFeed = store.get({ name: 'user-profile' });
let userProfile = { username: '', gamesPlayed: 0, wins: 0, losses: 0 };

async function loadUserProfile() {
  await profileFeed.ready();
  const entries = [];
  for await (const data of profileFeed.createReadStream()) {
    entries.push(JSON.parse(data.toString()));
  }
  if (entries.length > 0) {
    userProfile = entries[entries.length - 1];
  }
  updateProfileUI();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadUserProfile();
});

document.getElementById('save-username').addEventListener('click', async () => {
  const usernameInput = document.getElementById('username-input').value.trim();
  
  if (usernameInput) {
    userProfile.username = usernameInput;
    updateProfileUI();
    await profileFeed.append(JSON.stringify(userProfile));
  }
});


function updateProfileUI() {
  document.getElementById('username-display').textContent = userProfile.username || 'Not set';
  document.getElementById('games-played').textContent = userProfile.gamesPlayed;
  document.getElementById('wins').textContent = userProfile.wins;
  document.getElementById('losses').textContent = userProfile.losses;
}

//navigation
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

//lobby
let gameAccess = false;
let generatedTopic = null;
let swarm;
let peerConnection = null;

document.getElementById('generate-game-link').addEventListener('click', () => {
  generatedTopic = crypto.randomBytes(32);
  const gameLink = b4a.toString(generatedTopic, 'hex');
  document.getElementById('game-link-display').textContent = gameLink;
  swarm = new Hyperswarm();
  swarm.join(generatedTopic, { server: true, client: true });
  swarm.on('connection', (socket) => {
    console.log("Connected to a peer!");
    peerConnection = socket;
    document.getElementById('game-status').textContent = "Connected! Waiting for turn...";
  });
});

document.getElementById('join-game').addEventListener('click', () => {
  const joinLink = document.getElementById('join-game-link').value.trim();
  if (joinLink && generatedTopic && joinLink === b4a.toString(generatedTopic, 'hex')) {
    gameAccess = true;
    if (!swarm) {
      swarm = new Hyperswarm();
      const joinTopic = b4a.from(joinLink, 'hex');
      swarm.join(joinTopic, { client: true });
    }
    alert("Joined game successfully. You can now access the Game section.");
  } else {
    alert("Invalid game link. Please check and try again.");
  }
});

//game
let playerChoice = null;
let opponentChoice = null;
let playerScore = 0;
let opponentScore = 0;
let isPlayerTurn = true;

document.addEventListener("DOMContentLoaded", async () => {
  await loadUserProfile();
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

    // Save updated profile data to Corestore
    await profileFeed.append(JSON.stringify(userProfile));

    document.getElementById('game-status').textContent = `Opponent chose ${opponentChoice}. ${result}`;
    document.getElementById('player-score').textContent = playerScore;
    document.getElementById('opponent-score').textContent = opponentScore;
    updateProfileUI();

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
  document.querySelectorAll(".choices button").forEach(button => button.disabled = !isPlayerTurn);
}

function resetGame() {
  peerConnection = null;
  playerChoice = null;
  opponentChoice = null;
  playerScore = 0;
  opponentScore = 0;
  isPlayerTurn = true;
  updateGameUI();
}
