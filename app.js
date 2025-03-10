import Hyperswarm from 'hyperswarm';
import b4a from 'b4a';
import crypto from 'hypercore-crypto';
import Hypercore from 'hypercore';
import Corestore from 'corestore';

const store = new Corestore('./storage');
const profileFeed = store.get({ name: 'profile-data' });

let opponentChoice = null; 

// Load existing profile data
async function loadProfile() {
  await profileFeed.ready();
  if (profileFeed.length > 0) {
    const latestData = await profileFeed.get(profileFeed.length - 1);
    const profile = JSON.parse(b4a.toString(latestData));

    document.querySelector("#display-username").textContent = profile.username;
    document.querySelector("#display-email").textContent = profile.email;
    document.querySelector("#display-name").textContent = profile.name;
    document.querySelector("#username").textContent = profile.username;
    document.querySelector("#display-bio").textContent = profile.bio;
    
    localStorage.setItem("username", profile.username);
  }
}
loadProfile();

// Profile Edit Functionality
document.querySelector("#edit-profile-btn").addEventListener("click", () => {
  const editForm = document.querySelector("#edit-profile-form");
  editForm.style.display = editForm.style.display === "none" ? "block" : "none";
});

document.querySelector("#edit-profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const updatedProfile = {
    username: document.querySelector("#edit-username").value,
    email: document.querySelector("#edit-email").value,
    name: document.querySelector("#edit-name").value,
    bio: document.querySelector("#edit-bio").value,
  };

  try {
    await profileFeed.append(b4a.from(JSON.stringify(updatedProfile)));
    alert("Profile updated!");
    loadProfile();
    document.querySelector("#edit-profile-form").style.display = "none";
  } catch (err) {
    console.error("Error saving profile:", err);
  }
});

// Navigation
const sections = {
  home: document.getElementById("section-main"),
  profile: document.getElementById("section-profile"),
  lobby: document.getElementById("section-lobby"),
  game: document.getElementById("section-game"),
};

const showSection = (section) => {
  Object.values(sections).forEach(s => s.classList.remove("active"));
  section.classList.add("active");
};
const navlist = {
  home: document.getElementById("nav-home"),
  profile: document.getElementById("nav-profile"),
  lobby: document.getElementById("nav-lobby"),
  game: document.getElementById("nav-game"),
};

const activeNav = (nav) => {
  Object.values(navlist).forEach(s => s.classList.remove("active"));
  nav.classList.add("active");
};



document.getElementById("nav-home").addEventListener("click", () => {showSection(sections.home), activeNav(navlist.home);}
);
document.getElementById("nav-profile").addEventListener("click", () => {showSection(sections.profile),  activeNav(navlist.profile)}
);
document.getElementById("nav-lobby").addEventListener("click", () => {showSection(sections.lobby), activeNav(navlist.lobby);}
);
document.getElementById("nav-game").addEventListener("click", (e) => {
  if (!gameAccess) {222
    alert("Access denied. Please join a game first!");
    e.preventDefault();
  } else {
    showSection(sections.game);
    activeNav(navlist.game);
  }
});

// P2P Game Logic
let gameAccess = false;
let generatedTopic = crypto.randomBytes(32);
let swarm = new Hyperswarm();
let peerConnection = null;
let playerScore = 0;
let opponentScore = 0;
let opponentUsername = "Unknown";

// Handle Peer Communication
function setupPeerCommunication(socket) {
  peerConnection = socket;

  socket.write(JSON.stringify({ type: "username", username: localStorage.getItem("username") || "Guest" }));

  socket.on("data", (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === "choice") {
        opponentChoice = message.choice;
        checkGameResult();
      }
      if (message.type === "username") {
        opponentUsername = message.username;
        document.getElementById("game-status").textContent = `Playing against ${opponentUsername}`;
      }
      if (message.type === "chat") {
        displayChatMessage(message.username, message.message);
      }
    } catch (err) {
      console.error("Error parsing peer message:", err);
    }
  });

  socket.on("close", () => {
    console.log("Peer disconnected.");
    peerConnection = null;
    gameAccess = false;
    document.getElementById("game-status").textContent = "Disconnected from game.";
  });
}

// Generate Game
document.getElementById("generate-game-link").addEventListener("click", () => {
  const gameLink = b4a.toString(generatedTopic, "hex");
  document.getElementById("game-link-display").textContent = gameLink;
  document.getElementById("join-game-link").value = gameLink;

  swarm.join(generatedTopic, { server: true });
  swarm.on("connection", (socket) => {
    console.log("New player joined.");
    setupPeerCommunication(socket);
  });

  gameAccess = true;
  alert("Game created. Share the link with a friend!");
});

// Join Game
document.getElementById("join-game").addEventListener("click", () => {
  const joinLink = document.getElementById("join-game-link").value.trim();
  if (!joinLink) {
    alert("Please enter a valid game link.");
    return;
  }

  gameAccess = true;
  swarm.join(b4a.from(joinLink, "hex"), { client: true });
  swarm.on("connection", (socket) => {
    console.log("Connected to peer.");
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

  document.getElementById("player-score").textContent = playerScore;
  document.getElementById("opponent-score").textContent = opponentScore;
  document.getElementById("game-status").textContent = `You chose ${playerChoice}, opponent chose ${opponentChoice}. Result: ${result}`;
}

// Chat 
const chatForm = document.getElementById("start-lobby-chat");
const chatInput = document.getElementById("chat-input");
const sendChatBtn = document.getElementById("send-chat");
const chatMessages = document.getElementById("chat-messages");

chatForm.addEventListener("click", () => {
  const chatBox = document.querySelector(".chat-box");
  chatBox.style.display = chatBox.style.display === "none" ? "block" : "none";
});

function displayChatMessage(username, message) {
  const chatEntry = document.createElement("p");
  chatEntry.innerHTML = `<strong>${username}:</strong> ${message}`;
  chatMessages.appendChild(chatEntry);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendChatBtn.addEventListener("click", () => {
  if (!peerConnection) {
    alert("Not connected to any peers!");
    return;
  }

  const message = chatInput.value.trim();
  if (message) {
    const chatData = {
      type: "chat",
      username: localStorage.getItem("username") || "Guest",
      message: message,
    };

    peerConnection.write(JSON.stringify(chatData));
    displayChatMessage("You", message);
    chatInput.value = "";
  }
});
