import Hyperswarm from 'hyperswarm';
import b4a from 'b4a';
import crypto from 'hypercore-crypto';
import Hypercore from 'hypercore';
import Corestore from 'corestore';

const store = new Corestore('./storage');
const profileFeed = store.get({ name: 'profile-data' });

// Load existing profile data
async function loadProfile() {
  await profileFeed.ready();
  if (profileFeed.length > 0) {
    const latestData = await profileFeed.get(profileFeed.length - 1);
    const profile = JSON.parse(b4a.toString(latestData)); // Decode properly

    document.querySelector("#display-username").textContent = profile.username;
    document.querySelector("#display-email").textContent = profile.email;
    document.querySelector("#display-name").textContent = profile.name;
    document.querySelector("#username").textContent = profile.username;
    document.querySelector("#display-bio").textContent = profile.bio;
  }
}
loadProfile();

// Profile edit functionality
const editBtn = document.querySelector("#edit-profile-btn");
const editForm = document.querySelector("#edit-profile-form");

editBtn.addEventListener("click", () => {
  if (editForm.style.display === "none" || editForm.style.display === "") {
    editForm.style.display = "block";
  } else {
    editForm.style.display = "none";
  }
});

editForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const updatedProfile = {
    username: document.querySelector("#edit-username").value,
    email: document.querySelector("#edit-email").value,
    name: document.querySelector("#edit-name").value,
    bio: document.querySelector("#edit-bio").value,
  };

  try {
    const encodedProfile = b4a.from(JSON.stringify(updatedProfile)); // Encode correctly
    await profileFeed.append(encodedProfile);

    alert("Profile updated!");
    loadProfile();
    editForm.style.display = "none";
  } catch (err) {
    console.error("Error saving profile data:", err);
  }
});

// Elements
const navProfile = document.getElementById('nav-profile');
const navLobby = document.getElementById('nav-lobby');
const navGame = document.getElementById('nav-game');
const navHome = document.getElementById('nav-home');

const sectionProfile = document.getElementById('section-profile');
const sectionLobby = document.getElementById('section-lobby');
const sectionGame = document.getElementById('section-game');
const sectionHome = document.getElementById('section-main');

const gameStatus = document.getElementById('game-status');
const playerScoreEl = document.getElementById('player-score');
const opponentScoreEl = document.getElementById('opponent-score');

// Function to show active section
function showSection(section) {
  [sectionProfile, sectionLobby, sectionGame, sectionHome].forEach(s => s.classList.remove('active'));
  [navProfile, navLobby, navGame, navHome].forEach(n => n.classList.remove('active'));

  section.classList.add('active');

  if (section === sectionProfile) navProfile.classList.add('active');
  else if (section === sectionLobby) navLobby.classList.add('active');
  else if (section === sectionGame) navGame.classList.add('active');
  else if (section === sectionHome) navHome.classList.add('active');
}

// Event Listeners
navHome.addEventListener('click', () => showSection(sectionHome));
navProfile.addEventListener('click', () => showSection(sectionProfile));
navLobby.addEventListener('click', () => showSection(sectionLobby));
navGame.addEventListener('click', (e) => {
  if (!gameAccess) {
    alert("Access denied. Please join a game first!");
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
let playerScore = 0;
let opponentScore = 0;



// Handle Peer Connection
function setupPeerCommunication(socket) {
  peerConnection = socket;

  socket.on('data', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log("Received:", message);

      if (message.type === "choice") {
        opponentChoice = message.choice;
        checkGameResult();
      }
    } catch (err) {
      console.error("Error parsing peer message:", err);
    }
  });

  socket.on('close', () => {
    console.log("Peer disconnected.");
    peerConnection = null;
    gameAccess = false;
    gameStatus.textContent = "Disconnected from game.";
  });
}

// Generate Game
document.getElementById('generate-game-link').addEventListener('click', () => {
  const gameLink = b4a.toString(generatedTopic, 'hex');
  document.getElementById('game-link-display').textContent = gameLink;
  document.getElementById('join-game-link').value = gameLink;

  swarm.join(generatedTopic, { server: true });
  swarm.on('connection', (socket, details) => {
    console.log("New player joined:", details);
    setupPeerCommunication(socket);
  });

  gameAccess = true;
  alert("Game created. Share the link with a friend!");
});

// Join Game 
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

  alert("Joined game successfully!");
});

// Send Choice
function sendChoice(choice) {
  if (peerConnection) {
    peerConnection.write(JSON.stringify({ type: "choice", choice }));
    checkGameResult(choice);
  }
}

// Check Game Result
function checkGameResult(playerChoice) {
  if (!opponentChoice) return;

  let result;
  if (playerChoice === opponentChoice) {
    result = "Draw";
  } else if (
    (playerChoice === "rock" && opponentChoice === "scissors") ||
    (playerChoice === "paper" && opponentChoice === "rock") ||
    (playerChoice === "scissors" && opponentChoice === "paper")
  ) {
    result = "Win";
    playerScore++;
  } else {
    result = "Lose";
    opponentScore++;
  }

  playerScoreEl.textContent = playerScore;
  opponentScoreEl.textContent = opponentScore;
  gameStatus.textContent = `You chose ${playerChoice}, opponent chose ${opponentChoice}. Result: ${result}`;
  saveGameResult(result);
}

// Save Game Results to Hypercore
function saveGameResult(result) {
  const gameData = { timestamp: Date.now(), result };
  feed.append(gameData, (err) => {
    if (err) console.error("Error saving game result:", err);
    else console.log("Game result saved:", gameData);
  });
}

// Reset Game
function resetGame() {
  playerScore = 0;
  opponentScore = 0;
  playerScoreEl.textContent = playerScore;
  opponentScoreEl.textContent = opponentScore;
  gameStatus.textContent = "Waiting for opponent...";
}
