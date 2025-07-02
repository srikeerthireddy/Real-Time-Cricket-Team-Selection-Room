# 🏏 Real-Time Cricket Team Selection Room

A real-time multiplayer web application that simulates a turn-based cricket team selection experience, powered by **Node.js**, **Express.js**, and **Socket.IO**.

## 📌 Project Overview

This project demonstrates:

* Real-time communication using WebSockets
* Multi-user synchronization in a shared room
* Turn-based logic with timers
* Event-driven architecture

### 🕹 Scenario

1. Users create or join a room.
2. The host starts the selection process.
3. A random turn order is generated.
4. Each user gets **10 seconds** per turn to pick a player.
5. If time runs out, the system auto-selects a player.
6. Selected players are removed from the common pool.
7. All actions are synchronized and broadcast to every user in real-time.
8. The process continues until each user has **5 players**.

---

## 🎮 Live Demo

🔗 [Live Demo Link](https://real-time-cricket-team-selection-ro.vercel.app/)

🔗 [Backend Link](https://real-time-cricket-team-selection-room-bvmw.onrender.com/)


---

## ⚙ Tech Stack

| Layer      | Technologies                           |
| ---------- | -------------------------------------- |
| Backend    | Node.js, Express.js, Socket.IO         |
| Frontend   | React |
| Real-Time | Socket.IO |

---

## 🗂 Key Features

✅ Create and Join Rooms

✅ Random Turn Order Generation

✅ Turn Timer with Auto-Selection

✅ Real-Time Broadcast of Picks

✅ Live Room Updates via WebSocket

✅ Selection Ends with Team Summary

✅ Basic Room Routing via Socket.IO

---

## 🚀 Getting Started

### 📥 Clone the Repository

```bash
git clone https://github.com/yourusername/cricket-team-selection-room.git
cd Real-Time-Cricket-Team-Selection-Room
```
## Run Backend

### 📌 Install Backend Dependencies
```bash
cd backend
npm install
```

### ▶ Run the Server

```bash
node server.js
```
> By default, the server will run at: `http://localhost:5000`

## Run Frontend

### 📌 Install Backend Dependencies
```bash
cd frontend
cd cricket-frontend
npm install
```

### ▶ Run the Server

```bash
node start
```

> By default, the server will run at: `http://localhost:3000`

### 🖥 Open the App

1. Open your browser at: `http://localhost:3000`
2. Create a new room.
3. Share the room code with other users.
4. Join the same room from multiple tabs or devices.
5. Click **Start Selection** to begin.



## ⚡ How It Works

| Event             | Description                                        |
| ----------------- | -------------------------------------------------- |
| `join-room`       | Users connect to a room via WebSocket              |
| `start-selection` | Host starts selection and turn order is randomized |
| `select-player`   | A user selects a player on their turn              |
| `player-selected` | Broadcasts the selected player to all users        |
| `auto-selected`   | Automatically selects a player if user times out   |
| `selection-ended` | Broadcasts final team selections to all users      |

---

## 📂 Project Structure

```
.Real-Time-Cricket-Team-Selection-Room
├── backend
|   ├── server.js      
│   ├── socketHandler.js
├── Frontend
|   ├── App.jsx
|   ├── App.css
|
└── README.md
```


## ✨ Bonus Features (Included)
* ✅ User Reconnection Handling


## 🛠 Future Improvements

* Docker Support
* Redis Persistence
* User Authentication & Login
* Persistent Room Storage with Redis
* Player Statistics & Roles


## 📬 Contact

If you have any questions or suggestions, feel free to open an issue or reach out.
Through :
- [Linkedin](https://www.linkedin.com/in/sri-keerthi-y) - sri-keerthi-y
- Email: srikeerthi.k@kalvium.community

