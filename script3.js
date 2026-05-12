// ================= FIREBASE REALTIME DATABASE SETUP =================

const firebaseConfig = {
  apiKey: "AIzaSyCf6oBdNpzCS52gGe7rSofmcvJImy1XUq8",
  authDomain: "eyeguard-6b9fa.firebaseapp.com",
  databaseURL: "https://eyeguard-6b9fa-default-rtdb.firebaseio.com",
  projectId: "eyeguard-6b9fa",
  storageBucket: "eyeguard-6b9fa.firebasestorage.app",
  messagingSenderId: "556403918869",
  appId: "1:556403918869:web:1a0c9dc7a6bec5336be61c"
};

// Avoid duplicate Firebase initialization
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const realtimeDB = firebase.database();

function saveToFirebase(path, data) {
  realtimeDB.ref(path).push({
    ...data,
    user: localStorage.getItem("username") || "Unknown User",
    timestamp: new Date().toLocaleString()
  })
  .then(() => console.log(path + " saved"))
  .catch((error) => console.log("Firebase Error:", error));
}

// ================= MAIN VARIABLES =================

const video = document.getElementById("video");
const statusText = document.getElementById("status");
let stream;

let drowsinessSaved = false;
let drivingSessionStart = null;
let detectionInterval = null;

// Alarm sound
var sound = new Howl({ src: ["alarm.mp3"] });

// Voice alert
let synth = window.speechSynthesis;

// Eye closure variables
let closedEyeFrames = 0;
const frameThreshold = 10;
let alarmPlaying = false;

// Overlay Canvas
const overlay = document.getElementById("overlay");
const overlayCtx = overlay ? overlay.getContext("2d") : null;

// Multi-language setup
let lang = "en";

const texts = {
  eyesOpen: {
    en: "Eyes open🌟👀",
    mr: "डोळे उघडे.",
    hi: "आंखें खुली हैं",
    fr: "Yeux ouverts",
    es: "Ojos abiertos",
    de: "Augen offen"
  },
  eyesClosed: {
    en: "Eyes closed! Alarm!👁️‍🗨️❌",
    mr: "डोळे बंद! अलार्म!",
    hi: "आंखें बंद! अलार्म!",
    fr: "Yeux fermés! Alarme!",
    es: "¡Ojos cerrados! Alarma!",
    de: "Augen geschlossen! Alarm!"
  },
  faceNotFound: {
    en: "Face not found!",
    mr: "चेहरा सापडला नाही!",
    hi: "चेहरा नहीं मिला!",
    fr: "Visage non trouvé!",
    es: "¡Cara no encontrada!",
    de: "Gesicht nicht gefunden!"
  },
  wakeUp: {
    en: "Please open your eyes!",
    mr: "कृपया डोळे उघडा!",
    hi: "कृपया आंखें खोलें!",
    fr: "Veuillez ouvrir les yeux!",
    es: "¡Por favor abre los ojos!",
    de: "Bitte öffnen Sie die Augen!"
  }
};

// ================= LOAD FACE API MODELS =================

async function loadModels() {
  try {
    statusText.textContent = "Loading models...⏱️";

    await faceapi.nets.tinyFaceDetector.loadFromUri("libs/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("libs/models");

    statusText.textContent = "Models loaded ⏳ Click Start Camera👁️ ";
  } catch (error) {
    console.error("Model loading error:", error);
    statusText.textContent = "Error loading face models!";
  }
}

// ================= START CAMERA =================

async function startCamera() {
  try {
    if (stream) {
      statusText.textContent = "Camera already started. Detecting...👀⚡";
      return;
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }
    });

    video.srcObject = stream;
    statusText.textContent = "Camera started. Detecting...👀⚡";

    drivingSessionStart = new Date();

    saveToFirebase("drivingSessions", {
      event: "Driving Session Started",
      status: "Camera Started"
    });

    startFaceDetection();

  } catch (err) {
    console.error("Error starting camera:", err);
    statusText.textContent = "Error accessing camera.";
  }
}

// ================= STOP CAMERA =================

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    stream = null;

    statusText.textContent = "Camera stopped 🛑📸";

    if (detectionInterval) {
      clearInterval(detectionInterval);
      detectionInterval = null;
    }

    if (drivingSessionStart) {
      const endTime = new Date();
      const totalMinutes = Math.round((endTime - drivingSessionStart) / 60000);

      saveToFirebase("drivingSessions", {
        event: "Driving Session Ended",
        status: "Camera Stopped",
        totalDrivingMinutes: totalMinutes
      });

      drivingSessionStart = null;
    }

    if (overlayCtx) {
      overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    }

    closedEyeFrames = 0;
    drowsinessSaved = false;
    stopAlarmAndVoice();
  }
}

// ================= VOICE HELPERS =================

function getMarathiVoice() {
  let voices = synth.getVoices();
  return voices.find(v => v.lang === "mr-IN") ||
         voices.find(v => v.lang.startsWith("hi"));
}

function getMaleVoice() {
  let voices = synth.getVoices();
  return voices.find(v => v.name.includes("Male") ||
                          v.name.includes("Google US English"));
}

// ================= FACE DETECTION LOOP =================

async function startFaceDetection() {
  const options = new faceapi.TinyFaceDetectorOptions();

  if (detectionInterval) {
    clearInterval(detectionInterval);
  }

  detectionInterval = setInterval(async () => {
    try {
      if (!video || !video.srcObject) return;

      const detections = await faceapi
        .detectSingleFace(video, options)
        .withFaceLandmarks();

      if (overlayCtx) {
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
      }

      if (!detections) {
        statusText.textContent = texts.faceNotFound[lang] || texts.faceNotFound.en;
        closedEyeFrames = 0;
        drowsinessSaved = false;
        stopAlarmAndVoice();
        return;
      }

      const landmarks = detections.landmarks;
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();

      const eyeOpen = isEyeOpen(leftEye) && isEyeOpen(rightEye);

      if (overlayCtx) {
        const box = detections.detection.box;
        overlayCtx.lineWidth = 3;
        overlayCtx.strokeStyle = eyeOpen ? "lime" : "red";
        overlayCtx.strokeRect(box.x, box.y, box.width, box.height);
      }

      if (!eyeOpen) {
        closedEyeFrames++;

        if (closedEyeFrames >= frameThreshold) {
          statusText.textContent = texts.eyesClosed[lang] || texts.eyesClosed.en;
          statusText.classList.add("alert");
          startAlarmAndVoice();

          if (!drowsinessSaved) {
            saveToFirebase("drowsinessLogs", {
              event: "Drowsiness Detected",
              alertType: "Eye Closed Alert",
              duration: "2 seconds",
              severity: "High",
              status: "Alarm Triggered"
            });

            drowsinessSaved = true;
          }

          // Old blockchain code kept same
          const now = new Date().toLocaleString();

          if (typeof saveAlertToBlockchain === "function") {
            saveAlertToBlockchain(
              "Snehal",
              "Drowsiness",
              "High",
              now,
              "Pune",
              true
            );
          }
        }
      } else {
        closedEyeFrames = 0;
        drowsinessSaved = false;
        statusText.textContent = texts.eyesOpen[lang] || texts.eyesOpen.en;
        statusText.classList.remove("alert");
        stopAlarmAndVoice();
      }

    } catch (error) {
      console.error("Face detection error:", error);
    }
  }, 200);
}

// ================= EYE OPEN FUNCTION =================

function isEyeOpen(eye) {
  const vertical = Math.abs(eye[1].y - eye[5].y);
  const horizontal = Math.abs(eye[0].x - eye[3].x);
  return vertical / horizontal > 0.25;
}

// ================= ALARM + VOICE =================

function startAlarmAndVoice() {
  if (alarmPlaying) return;

  alarmPlaying = true;

  if (!sound.playing()) {
    sound.play();
  }

  let utter = new SpeechSynthesisUtterance(
    texts.wakeUp[lang] || texts.wakeUp.en
  );

  let voices = synth.getVoices();

  let voiceForLang =
    voices.find(v => v.lang.toLowerCase().startsWith(lang)) ||
    getMaleVoice();

  if (voiceForLang) {
    utter.voice = voiceForLang;
  }

  utter.lang =
    lang === "mr" ? "mr-IN" :
    lang === "hi" ? "hi-IN" :
    lang === "fr" ? "fr-FR" :
    lang === "es" ? "es-ES" :
    lang === "de" ? "de-DE" : "en-US";

  utter.rate = 1;
  utter.pitch = 1;

  utter.onend = () => {
    if (alarmPlaying) {
      synth.speak(utter);
    }
  };

  synth.speak(utter);
}

function stopAlarmAndVoice() {
  alarmPlaying = false;
  sound.stop();

  if (synth && synth.speaking) {
    synth.cancel();
  }
}

// ================= BUTTON EVENTS =================

const startBtn = document.getElementById("startBtn");
if (startBtn) {
  startBtn.addEventListener("click", startCamera);
}

const stopBtn = document.getElementById("stopBtn");
if (stopBtn) {
  stopBtn.addEventListener("click", stopCamera);
}

window.onload = () => {
  loadModels();

  if (synth) {
    synth.onvoiceschanged = () => getMarathiVoice();
  }
};

// ================= DARK MODE =================

const themeToggle = document.getElementById("themeToggle");

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
  });
}

// ================= LANGUAGE SELECT =================

const langSelect = document.getElementById("langSelect");

if (langSelect) {
  langSelect.addEventListener("change", () => {
    lang = langSelect.value;
    alert("Language switched to: " + lang);

    stopAlarmAndVoice();

    if (closedEyeFrames >= frameThreshold) {
      startAlarmAndVoice();
    }
  });
}

// ================= EMERGENCY CALL BUTTON =================

const emergencyBtn = document.getElementById("emergencyBtn");

if (emergencyBtn) {
  emergencyBtn.addEventListener("click", () => {
    const emergencyNumber = localStorage.getItem("mobile");
    const emergencyDisplay = document.getElementById("emergencyDisplay");

    if (emergencyNumber) {
      if (emergencyDisplay) {
        emergencyDisplay.textContent = "Call Emergency: " + emergencyNumber;
      }

      window.location.href = "tel:" + emergencyNumber;

      let emergencyLogs = JSON.parse(
        localStorage.getItem("emergencyLogs") || "[]"
      );

      emergencyLogs.push({
        timestamp: new Date().toISOString(),
        user: localStorage.getItem("username"),
        phone: emergencyNumber
      });

      localStorage.setItem("emergencyLogs", JSON.stringify(emergencyLogs));

      saveToFirebase("emergencyLogs", {
        event: "Emergency Call Triggered",
        phone: emergencyNumber,
        status: "Call Button Clicked"
      });

    } else {
      if (emergencyDisplay) {
        emergencyDisplay.textContent = "No emergency number provided!";
      }
    }
  });
}

// ================= SEND LIVE LOCATION =================

const sendLocationBtn = document.getElementById("sendLocationBtn");

if (sendLocationBtn) {
  sendLocationBtn.addEventListener("click", () => {
    const statusDiv = document.getElementById("locationStatus");

    if (!navigator.geolocation) {
      if (statusDiv) {
        statusDiv.textContent = "Geolocation not supported by your browser!";
      }
      return;
    }

    if (statusDiv) {
      statusDiv.textContent = "Fetching your live location...";
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        const mapsLink = `https://www.google.com/maps?q=${lat},${lon}`;

        if (statusDiv) {
          statusDiv.innerHTML = `
            📍 Your Location:<br>
            <a href="${mapsLink}" target="_blank">${mapsLink}</a>
          `;
        }

        saveToFirebase("locationLogs", {
          event: "Live Location Shared",
          latitude: lat,
          longitude: lon,
          mapsLink: mapsLink,
          accuracy: pos.coords.accuracy
        });

        const emergencyNumber = localStorage.getItem("mobile");

        if (emergencyNumber) {
          const whatsappURL =
            `https://wa.me/${emergencyNumber}?text=` +
            encodeURIComponent(`EMERGENCY! My live location is: ${mapsLink}`);

          window.open(whatsappURL, "_blank");
        } else {
          if (statusDiv) {
            statusDiv.textContent = "No emergency number found in localStorage!";
          }
        }
      },
      () => {
        if (statusDiv) {
          statusDiv.textContent = "Location access denied!";
        }
      },
      { enableHighAccuracy: true, timeout: 3000 }
    );
  });
}

// ================= VOICE RECOGNITION =================

window.SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const resultBox = document.getElementById("result");

if (window.SpeechRecognition) {
  const recognition = new SpeechRecognition();

  recognition.lang = "en-US";
  recognition.continuous = false;

  const voiceBtn = document.getElementById("voiceBtn");

  if (voiceBtn) {
    voiceBtn.onclick = () => {
      recognition.start();

      if (resultBox) {
        resultBox.innerText = "Listening...";
      }
    };
  }

  recognition.onresult = (event) => {
    const command = event.results[0][0].transcript.toLowerCase();

    if (resultBox) {
      resultBox.innerText = "You said: " + command;
    }

    if (command.includes("start camera") || command.includes("start detection")) {
      document.getElementById("startBtn")?.click();
    }
    else if (command.includes("stop camera") || command.includes("stop detection")) {
      document.getElementById("stopBtn")?.click();
    }
    else if (command.includes("send location")) {
      document.getElementById("sendLocationBtn")?.click();
    }
    else if (command.includes("call emergency")) {
      document.getElementById("emergencyBtn")?.click();
    }
    else if (command.includes("view map")) {
      document.getElementById("mapBtn")?.click();
    }
    else {
      if (resultBox) {
        resultBox.innerText = "Unknown command!";
      }
    }
  };

  recognition.onerror = (event) => {
    if (resultBox) {
      resultBox.innerText = "Voice recognition error: " + event.error;
    }
  };

} else {
  if (resultBox) {
    resultBox.innerText = "Voice recognition not supported in this browser.";
  }
}

// ================= VIEW MAP BUTTON =================

const mapBtn = document.getElementById("mapBtn");

if (mapBtn) {
  mapBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const mapsLink = `https://www.google.com/maps?q=${lat},${lon}`;

        window.open(mapsLink, "_blank");

        saveToFirebase("locationLogs", {
          event: "Map Viewed",
          latitude: lat,
          longitude: lon,
          mapsLink: mapsLink
        });
      },
      () => {
        alert("Please allow GPS permission!");
      },
      { enableHighAccuracy: true, timeout: 3000 }
    );
  });
}

// ================= LIVE SPEED TRACKER =================

let lastPosition = null;
let lastTime = null;

function calculateSpeed(position) {
  const currentTime = Date.now();

  if (lastPosition && lastTime) {
    const lat1 = lastPosition.coords.latitude;
    const lon1 = lastPosition.coords.longitude;
    const lat2 = position.coords.latitude;
    const lon2 = position.coords.longitude;

    const distance = getDistance(lat1, lon1, lat2, lon2);
    const timeHours = (currentTime - lastTime) / (1000 * 60 * 60);

    const speed = distance / timeHours;

    const speedBox = document.getElementById("speedBox");

    if (speedBox && isFinite(speed)) {
      speedBox.innerText = "Speed: " + speed.toFixed(2) + " km/h";
    }
  }

  lastPosition = position;
  lastTime = currentTime;
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    calculateSpeed,
    (error) => {
      console.log("Speed tracking location error:", error.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    }
  );
}

// ================= DRIVING TIME TRACKER =================

let drivingStartTime = Date.now();

setInterval(() => {
  const drivingTime = (Date.now() - drivingStartTime) / (1000 * 60 * 60);

  if (drivingTime >= 2) {
    alert("⚠ You have been driving for 2 hours. Please take a break!");

    drivingStartTime = Date.now();

    saveToFirebase("drivingSessions", {
      event: "Break Alert",
      message: "Driving exceeded 2 hours"
    });
  }
}, 60000);

// ================= WEATHER FETCH FUNCTION =================

function startFastWeather() {
  const statusDiv = document.getElementById("weather");

  if (typeof WEATHER_API_KEY === "undefined" || !WEATHER_API_KEY) {
    if (statusDiv) {
      statusDiv.textContent = "Weather API key missing!";
    }
    console.log("Please define WEATHER_API_KEY in your code.");
    return;
  }

  if (!navigator.geolocation) {
    if (statusDiv) {
      statusDiv.textContent = "Geolocation not supported!";
    }
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      fetchWeatherFast(pos.coords);
    },
    (err) => {
      console.warn("Location denied or unavailable:", err);

      if (statusDiv) {
        statusDiv.textContent = "Location access denied! Using default location.";
      }

      const defaultCoords = {
        latitude: 19.0760,
        longitude: 72.8777
      };

      fetchWeatherFast(defaultCoords);
    },
    {
      enableHighAccuracy: false,
      maximumAge: 10000,
      timeout: 3000
    }
  );
}

async function fetchWeatherFast(coords) {
  if (!coords) return;

  const url =
    `https://api.openweathermap.org/data/2.5/weather?lat=${coords.latitude}&lon=${coords.longitude}&appid=${WEATHER_API_KEY}&units=metric`;

  try {
    let response = await fetch(url);
    let data = await response.json();

    if (!response.ok) {
      console.log("Weather API error:", data);
      return;
    }

    document.getElementById("weather").textContent = data.weather[0].description;
    document.getElementById("temp").textContent = data.main.temp + "°C";
    document.getElementById("humidity").textContent = data.main.humidity + "%";
    document.getElementById("visibility").textContent = (data.visibility / 1000) + " km";

    document.getElementById("roadWarning").innerHTML =
      data.visibility < 2000
        ? "⚠ Low Visibility! Drive Carefully."
        : "✔ Visibility Good.";

    saveToFirebase("weatherLogs", {
      event: "Weather Checked",
      weather: data.weather[0].description,
      temperature: data.main.temp,
      humidity: data.main.humidity,
      visibility: data.visibility,
      visibilityKm: data.visibility / 1000,
      roadStatus: data.visibility < 2000 ? "Low Visibility" : "Visibility Good"
    });

  } catch (err) {
    console.log("Weather fetch error:", err);
  }
}

const checkRoadBtn = document.getElementById("checkRoadBtn");

if (checkRoadBtn) {
  checkRoadBtn.addEventListener("click", startFastWeather);
}