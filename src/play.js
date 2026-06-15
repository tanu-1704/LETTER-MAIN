import { letters, wordPuzzles, Voices } from "./letters.js";

/* =========================
   GAME STATE
========================= */

let selectedLetter = null;
let unlockedLetters = {}; // Game resets on refresh!

let currentGuess = "";
let attempts = 0;
let maxAttempts = 6;
let guesses = [];
let keyboardState = {};
let currentPuzzle = null;

/* =========================
   KEYBOARD
========================= */

const keyboard = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["ENTER","Z","X","C","V","B","N","M","⌫"]
];

/* =========================
   ENVELOPES
========================= */

function renderEnvelopes() {
  const container = document.getElementById("envelopes");
  container.innerHTML = "";

  letters.forEach(letter => {
    const isAvailable = letter.day === 1 || unlockedLetters[letter.day - 1];
    const isUnlocked = unlockedLetters[letter.day];

    const envelope = document.createElement("div");
    envelope.className =
      "envelope " + (isUnlocked ? "unlocked " + letter.color : "locked");

    if (isAvailable && !isUnlocked) {
      envelope.onclick = () => startGame(letter);
      envelope.style.cursor = "pointer";
    }

    if (isUnlocked) {
      envelope.onclick = () => openLetter(letter);
    }

    const icon = isUnlocked ? "✉️" : isAvailable ? "🎮" : "🔒";

    envelope.innerHTML = `
      <div class="envelope-left">
        <div class="envelope-icon">${icon}</div>
        <div>
          <div class="envelope-title">Day ${letter.day}</div>
          <div class="envelope-subtitle">
            ${isUnlocked ? "Click to read" : "Play to unlock"}
          </div>
        </div>
      </div>
      ${isUnlocked ? `<div class="heart-small">❤️</div>` : ""}
    `;

    container.appendChild(envelope);
  });

  document.getElementById("dayCounter").textContent =
    `${Object.keys(unlockedLetters).length} of ${letters.length} unlocked`;
}

/* =========================
   GAME START
========================= */

function startGame(letter) {
  selectedLetter = letter;
  currentPuzzle = wordPuzzles[letter.day];

  currentGuess = "";
  attempts = 0;
  guesses = [];
  keyboardState = {};

  document.getElementById("gameDay").textContent = letter.day;
  document.getElementById("hintSection").textContent = currentPuzzle.hint;
  document.getElementById("gameCard").className =
    "game-card " + letter.color;

  document.getElementById("attemptCount").textContent = "0";
  document.getElementById("gameMessage").textContent = "";

  renderKeyboard();
  renderGuesses();

  document.getElementById("mainView").style.display = "none";
  document.getElementById("gameView").classList.add("active");
}

/* =========================
   KEYBOARD
========================= */

function renderKeyboard() {
  const container = document.getElementById("keyboard");
  container.innerHTML = "";

  keyboard.forEach(row => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "keyboard-row";

    row.forEach(key => {
      const btn = document.createElement("button");
      btn.className = "key" + (key.length > 1 ? " wide" : "");
      btn.textContent = key;

      if (keyboardState[key]) {
        btn.classList.add(keyboardState[key]);
      }

      btn.onclick = () => handleKeyPress(key);

      rowDiv.appendChild(btn);
    });

    container.appendChild(rowDiv);
  });
}

/* =========================
   GUESSES
========================= */

function renderGuesses() {
  const container = document.getElementById("guessesContainer");
  container.innerHTML = "";

  for (let i = 0; i < maxAttempts; i++) {
    const row = document.createElement("div");
    row.className = "word-display";

    const len = currentPuzzle.word.length;

    for (let j = 0; j < len; j++) {
      const box = document.createElement("div");
      box.className = "letter-box";

      if (guesses[i]) {
        box.textContent = guesses[i].letters[j];
        box.classList.add(guesses[i].states[j]);
      } else if (i === attempts && currentGuess[j]) {
        box.textContent = currentGuess[j];
      }

      row.appendChild(box);
    }

    container.appendChild(row);
  }
}

/* =========================
   INPUT
========================= */

function handleKeyPress(key) {
  if (attempts >= maxAttempts) return;

  const msg = document.getElementById("gameMessage");
  msg.textContent = "";

  if (key === "⌫") {
    currentGuess = currentGuess.slice(0, -1);

  } else if (key === "ENTER") {

    if (currentGuess.length === currentPuzzle.word.length) {
      submitGuess();
    } else {
      msg.textContent = "Not enough letters!";
      msg.className = "message error";
    }

  } else {
    if (currentGuess.length < currentPuzzle.word.length) {
      currentGuess += key;
    }
  }

  renderGuesses();
}

/* =========================
   WORD CHECK
========================= */

function submitGuess() {
  const target = currentPuzzle.word;
  const states = [];
  const letterCount = {};

  for (let i = 0; i < target.length; i++) {
    letterCount[target[i]] = (letterCount[target[i]] || 0) + 1;
  }

  for (let i = 0; i < currentGuess.length; i++) {
    states[i] = "absent";
  }

  for (let i = 0; i < currentGuess.length; i++) {
    if (currentGuess[i] === target[i]) {
      states[i] = "correct";
      letterCount[currentGuess[i]]--;
    }
  }

  for (let i = 0; i < currentGuess.length; i++) {
    if (
      states[i] === "absent" &&
      letterCount[currentGuess[i]] > 0
    ) {
      states[i] = "present";
      letterCount[currentGuess[i]]--;
    }
  }

  guesses.push({
    letters: currentGuess.split(""),
    states
  });

  for (let i = 0; i < currentGuess.length; i++) {
    const letter = currentGuess[i];
    const state = states[i];

    if (
      !keyboardState[letter] ||
      state === "correct" ||
      (state === "present" && keyboardState[letter] !== "correct")
    ) {
      keyboardState[letter] = state;
    }
  }

  attempts++;
  document.getElementById("attemptCount").textContent = attempts;

  const msg = document.getElementById("gameMessage");

  if (currentGuess === target) {
    msg.textContent = "🎉 Correct! Letter unlocked!";
    msg.className = "message success";

    unlockedLetters[selectedLetter.day] = true;
    // localStorage save removed so it locks on refresh!

    setTimeout(() => {
      closeGame();
      openLetter(selectedLetter);
    }, 1200);

  } else if (attempts >= maxAttempts) {
    msg.textContent = `Word was: ${target}`;
    msg.className = "message error";

    setTimeout(closeGame, 2000);
  }

  currentGuess = "";
  renderKeyboard();
  renderGuesses();
}

/* =========================
   LETTER + VOICE NOTE
========================= */

function openLetter(letter) {

  document.getElementById("letterTitle").textContent = letter.title;
  document.getElementById("letterDay").textContent =
    `Day ${letter.day} of ${letters.length}`;
  document.getElementById("letterText").innerHTML = letter.content;

  document.getElementById("letterCard").className =
    "letter-card " + letter.color;

  const container = document.getElementById("voiceContainer");

  container.innerHTML = `
    <div class="voice-note">

      <div class="voice-note-title">
        🎧 You and Your Baatein 
        
      </div>

      <div class="cassette">

        <div class="cassette-window">
          <div class="reel left"></div>
          <div class="tape-line"></div>
          <div class="reel right"></div>
        </div>

        <audio id="audioPlayer" src="${letter.voice}"></audio>

        <input type="range" id="progressBar" value="0" step="1">

        <div class="cassette-controls">
          <button class="cassette-btn" onclick="toggleAudio()">▶ / ⏸</button>
        </div>

      </div>
    </div>
  `;

  document.getElementById("mainView").style.display = "none";
  document.getElementById("letterView").classList.add("active");

  setupAudio();
}

/* =========================
   AUDIO SYSTEM
========================= */

function setupAudio() {
  const audio = document.getElementById("audioPlayer");
  const bar = document.getElementById("progressBar");
  const cassette = document.querySelector(".cassette");

  if (!audio || !bar) return;

  audio.addEventListener("loadedmetadata", () => {
    bar.max = Math.floor(audio.duration || 0);
  });

  audio.addEventListener("timeupdate", () => {
    bar.value = Math.floor(audio.currentTime);
  });

  bar.addEventListener("input", () => {
    audio.currentTime = bar.value;
  });

  audio.addEventListener("play", () => {
    cassette?.classList.remove("paused");
  });

  audio.addEventListener("pause", () => {
    cassette?.classList.add("paused");
  });
}

window.toggleAudio = function () {
  const audio = document.getElementById("audioPlayer");
  if (!audio) return;

  if (audio.paused) audio.play();
  else audio.pause();
};

/* =========================
   CLOSE
========================= */

function closeGame() {
  document.getElementById("mainView").style.display = "block";
  document.getElementById("gameView").classList.remove("active");
  renderEnvelopes();
}

function closeLetter() {
  document.getElementById("mainView").style.display = "block";
  document.getElementById("letterView").classList.remove("active");
  
  // Extra safety: Stop audio when closing the letter
  const audio = document.getElementById("audioPlayer");
  if (audio && !audio.paused) {
      audio.pause();
  }
}

/* =========================
   KEYBOARD INPUT
========================= */

document.addEventListener("keydown", e => {
  if (!document.getElementById("gameView").classList.contains("active")) return;

  const key = e.key.toUpperCase();

  if (key === "BACKSPACE") handleKeyPress("⌫");
  else if (key === "ENTER") handleKeyPress("ENTER");
  else if (key.length === 1 && key >= "A" && key <= "Z")
    handleKeyPress(key);
});

/* =========================
   INIT
========================= */

renderEnvelopes();

/* =========================
   VOICE VAULT
========================= */
function openVault() {
  document.getElementById("mainView").style.display = "none";
  document.getElementById("vaultView").classList.add("active");

  const vaultList = document.getElementById("vaultList");
  vaultList.innerHTML = ""; // Clear it out

  // 1. Load the original 8 game days
  letters.forEach(letter => {
    if (letter.voice) {
      const item = document.createElement("div");
      item.className = "vault-item";
      
      const cleanTitle = letter.title.replace(`Day ${letter.day}: `, "");
      
      item.innerHTML = `
        <div class="vault-item-title">Day ${letter.day}: ${cleanTitle}</div>
        <audio controls src="${letter.voice}"></audio>
      `;
      vaultList.appendChild(item);
    }
  });

  // 2. Load the extra numbered voice notes
  bonusVoiceNotes.forEach(note => {
    const item = document.createElement("div");
    item.className = "vault-item";
    
    item.innerHTML = `
      <div class="vault-item-title">✨ Extra: ${note.title}</div>
      <audio controls src="${note.voice}"></audio>
    `;
    vaultList.appendChild(item);
  });
}



function closeVault() {
  document.getElementById("mainView").style.display = "block";
  document.getElementById("vaultView").classList.remove("active");

  // This prevents the audio from continuing to play after she closes the vault!
  const audios = document.querySelectorAll("#vaultList audio");
  audios.forEach(a => a.pause());
}
/* expose */
window.openVault = openVault;
window.closeVault = closeVault;
window.closeGame = closeGame;
window.openLetter = openLetter;
window.closeLetter = closeLetter;
