
# MultiPlayer RPS Game - peargame

Team Game App is a single-page desktop application that enables real-time multiplayer rock–paper–scissors (RPS) gameplay. Built using Pear technologies, it leverages peer-to-peer networking to allow players to generate or join game sessions securely, manage their profiles, and track game statistics.

## Features

- **Multiplayer Rock–Paper–Scissors:**
  - Engage in real-time RPS matches with peers.
  - Automatic turn management and score tracking.
  
- **Lobby System:**
  - Generate a unique game link for starting a session.
  - Join an existing game session using a shared link.
  - Secure access control to protect the game section until a valid session is joined.
  
- **User Profile & Data Management:**
  - Set and update your username.
  - View game statistics including games played, wins, and losses.
  - Persistent data management (simulated with localStorage for demonstration).

- **Peer-to-Peer (P2P) Networking:**
  - Real-time communication powered by Hyperswarm.
  - NAT traversal through hole punching.

- **Collaboration & Data Synchronization:**
  - Utilize Pear collaboration technologies for seamless data exchange.
  - Employ Pear data management techniques for reliable user data handling.

## Tech Stack

- **P2P Networking:**
  - [Hyperswarm](https://github.com/hyperswarm/hyperswarm) for managing peer connections.
  - Hole punching for NAT traversal.

- **Pear Technologies:**
  - **Pear by Holepunch:** Establishes secure, real-time P2P connections.
  - **Pear Networking:** Facilitates efficient data transfer between peers.
  - **Pear Data Management:** Provides robust mechanisms for data storage and retrieval.
  - **Pear Collaboration:** Enables synchronized interactions among multiple peers.

- **Other Libraries:**
  - `hypercore-crypto` for cryptographic operations.
  - `corestore` for data storage (simulated with localStorage in this demo).
  - `b4a` for byte array operations.


## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/adeshsinghbits/peargame.git
   cd peargame
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the application:**
   
   > ```bash
   > pear run -d .
   > ```

## Usage

1. **Profile Setup:**
   - Navigate to the **Profile** section.
   - Enter your username and save to view your game statistics.

2. **Lobby:**
   - Go to the **Lobby** section.
   - Click **Generate Game Link** to create a unique session link.
   - Share the generated link with your teammates.
   - Enter a valid game link in the **Join Game** field to gain access to the game section.

3. **Gameplay:**
   - Once a valid game link is joined, the **Game** section is unlocked.
   - Use the provided controls to play rock–paper–scissors in real time.

## License

This project is licensed under the [Apache-2.0 License](LICENSE).
```