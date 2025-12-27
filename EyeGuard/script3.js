const video = document.getElementById('video');
const statusText = document.getElementById('status');
let stream;

// Alarm sound
var sound = new Howl({ src: ['alarm.mp3'] });

// Voice alert
let synth = window.speechSynthesis;

// Eye closure variables
let closedEyeFrames = 0;
const frameThreshold = 10; // 10 frames × 200ms = 2 sec
let alarmPlaying = false;

// Overlay Canvas
const overlay = document.getElementById("overlay");
const overlayCtx = overlay ? overlay.getContext("2d") : null;

// Multi-language setup
let lang = "en"; // default English

// Texts for multi-language support
const texts = {
  eyesOpen: { en: "Eyes open🌟👀", mr: "डोळे उघडे.", hi: "आंखें खुली हैं", fr: "Yeux ouverts", es: "Ojos abiertos", de: "Augen offen" },
  eyesClosed: { en: "Eyes closed! Alarm!👁️‍🗨️❌", mr: "डोळे बंद! अलार्म!", hi: "आंखें बंद! अलार्म!", fr: "Yeux fermés! Alarme!", es: "¡Ojos cerrados! Alarma!", de: "Augen geschlossen! Alarm!" },
  faceNotFound: { en: "Face not found!", mr: "चेहरा सापडला नाही!", hi: "चेहरा नहीं मिला!", fr: "Visage non trouvé!", es: "¡Cara no encontrada!", de: "Gesicht nicht gefunden!" },
  wakeUp: { en: "Please open your eyes!", mr: "कृपया डोळे उघडा!", hi: "कृपया आंखें खोलें!", fr: "Veuillez ouvrir les yeux!", es: "¡Por favor abre los ojos!", de: "Bitte öffnen Sie die Augen!" }
};

// Load face-api models
async function loadModels() {
  statusText.textContent = "Loading models...⏱️";
  await faceapi.nets.tinyFaceDetector.loadFromUri('libs/models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('libs/models');
  statusText.textContent = "Models loaded ⏳ Click Start Camera👁️ ";
}

// Start camera
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    video.srcObject = stream;
    statusText.textContent = "Camera started. Detecting...👀⚡";
    startFaceDetection();
  } catch (err) {
    console.error("Error starting camera:", err);
    statusText.textContent = "Error accessing camera.";
  }
}

// Stop camera
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    statusText.textContent = "Camera stopped 🛑📸";

    if (overlayCtx) overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    stopAlarmAndVoice();
  }
}

// Marathi voice
function getMarathiVoice() {
  let voices = synth.getVoices();
  return voices.find(v => v.lang === "mr-IN") || voices.find(v => v.lang.startsWith("hi"));
}

// Face Detection Loop
async function startFaceDetection() {
  const options = new faceapi.TinyFaceDetectorOptions();
  setInterval(async () => {
    const detections = await faceapi
      .detectSingleFace(video, options)
      .withFaceLandmarks();

    if (overlayCtx) overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

    if (!detections) {
      statusText.textContent = texts.faceNotFound[lang] || texts.faceNotFound["en"];
      closedEyeFrames = 0;
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
        statusText.textContent = texts.eyesClosed[lang] || texts.eyesClosed["en"];
        statusText.classList.add("alert");
        startAlarmAndVoice();
      }
    } else {
      closedEyeFrames = 0;
      statusText.textContent = texts.eyesOpen[lang] || texts.eyesOpen["en"];
      statusText.classList.remove("alert");
      stopAlarmAndVoice();
    }

  }, 200);
}

function isEyeOpen(eye) {
  const vertical = Math.abs(eye[1].y - eye[5].y);
  const horizontal = Math.abs(eye[0].x - eye[3].x);
  return vertical / horizontal > 0.25;
}

// Alarm + Voice
function startAlarmAndVoice() {
  if (alarmPlaying) return;

  alarmPlaying = true;
  if (!sound.playing()) sound.play();

  let utter = new SpeechSynthesisUtterance(texts.wakeUp[lang] || texts.wakeUp["en"]);
  let voices = synth.getVoices();
  let voiceForLang = voices.find(v => v.lang.toLowerCase().startsWith(lang)) || getMaleVoice();
  if (voiceForLang) utter.voice = voiceForLang;

  utter.lang = lang === "mr" ? "mr-IN" :
               lang === "hi" ? "hi-IN" :
               lang === "fr" ? "fr-FR" :
               lang === "es" ? "es-ES" :
               lang === "de" ? "de-DE" : "en-US";

  utter.rate = 1;
  utter.pitch = 1;

  utter.onend = () => {
    if (alarmPlaying) synth.speak(utter);
  };

  synth.speak(utter);
}

function stopAlarmAndVoice() {
  alarmPlaying = false;
  sound.stop();
  if (synth.speaking) synth.cancel();
}

function getMaleVoice() {
  let voices = synth.getVoices();
  return voices.find(v => v.name.includes("Male") || v.name.includes("Google US English"));
}

document.getElementById('startBtn').addEventListener('click', startCamera);
document.getElementById('stopBtn').addEventListener('click', stopCamera);

window.onload = () => {
  loadModels();
  synth.onvoiceschanged = () => getMarathiVoice();
};

// Dark Mode
const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
  });
}

// Language select
const langSelect = document.getElementById("langSelect");
if (langSelect) {
  langSelect.addEventListener("change", () => {
    lang = langSelect.value;
    alert("Language switched to: " + lang);

    stopAlarmAndVoice();
    if (closedEyeFrames >= frameThreshold) startAlarmAndVoice();
  });
}

// Emergency Call Button
document.getElementById("emergencyBtn").addEventListener("click", () => {
  const emergencyNumber = localStorage.getItem("mobile");
  const emergencyDisplay = document.getElementById("emergencyDisplay");

  if(emergencyNumber) {
    emergencyDisplay.textContent = "Call Emergency: " + emergencyNumber;
    window.location.href = "tel:" + emergencyNumber;

    let emergencyLogs = JSON.parse(localStorage.getItem("emergencyLogs") || "[]");
    emergencyLogs.push({
      timestamp: new Date().toISOString(),
      user: localStorage.getItem("username"),
      phone: emergencyNumber
    });
    localStorage.setItem("emergencyLogs", JSON.stringify(emergencyLogs));
  } else {
    emergencyDisplay.textContent = "No emergency number provided!";
  }
});

// ===== FAST SEND LIVE LOCATION =====
document.getElementById("sendLocationBtn").addEventListener("click", () => {
    const statusDiv = document.getElementById("locationStatus");

    if (!navigator.geolocation) {
        statusDiv.textContent = "Geolocation not supported by your browser!";
        return;
    }

    statusDiv.textContent = "Fetching your live location...";

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            const mapsLink = `https://www.google.com/maps?q=${lat},${lon}`;

            statusDiv.innerHTML = `
                📍 Your Location:<br>
                <a href="${mapsLink}" target="_blank">${mapsLink}</a>
            `;

            const emergencyNumber = localStorage.getItem("mobile");

            if (emergencyNumber) {
                const whatsappURL =
                    `https://wa.me/${emergencyNumber}?text=` +
                    encodeURIComponent(`EMERGENCY! My live location is: ${mapsLink}`);

                // Open WhatsApp instantly
                window.open(whatsappURL, "_blank");
            } else {
                statusDiv.textContent = "No emergency number found in localStorage!";
            }
        },
        (err) => {
            statusDiv.textContent = "Location access denied!";
        },
        { enableHighAccuracy: true, timeout: 3000 } // FAST fetch, 3 seconds timeout
    );
});


// Voice Recognition
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = "en-US";
recognition.continuous = false;

const resultBox = document.getElementById("result");

document.getElementById("voiceBtn").onclick = () => {
    recognition.start();
    resultBox.innerText = "Listening...";
};

recognition.onresult = (event) => {
    const command = event.results[0][0].transcript.toLowerCase();
    resultBox.innerText = "You said: " + command;

    if (command.includes("start camera") || command.includes("start detection")) {
        document.getElementById("startBtn").click();
    } 
    else if (command.includes("stop camera") || command.includes("stop detection")) {
        document.getElementById("stopBtn").click();
    }
    else if (command.includes("send location")) {
        document.getElementById("sendLocationBtn").click();
    }
    else if (command.includes("call emergency")) {
        document.getElementById("emergencyBtn").click();
    }
    else if (command.includes("view map")) {
        document.getElementById("mapBtn").click();
    }
    else {
        resultBox.innerText = "Unknown command!";
    }
};

recognition.onerror = (event) => {
    resultBox.innerText = "Voice recognition error: " + event.error;
};

// 
//  SUPER FAST VIEW MAP BUTTON (ONLY THIS ONE KEPT)
document.getElementById("mapBtn").addEventListener("click", () => {
    if (!navigator.geolocation) {
        alert("Geolocation not supported");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            window.open(`https://www.google.com/maps?q=${lat},${lon}`, "_blank");
        },
        () => {
            alert("Please allow GPS permission!");
        },
        { enableHighAccuracy: true, timeout: 3000 }
    );
});

// 1. LIVE SPEED TRACKER 
let lastPosition = null;
let lastTime = null;

function calculateSpeed(position) {
    const currentTime = Date.now();

    if (lastPosition && lastTime) {
        const lat1 = lastPosition.coords.latitude;
        const lon1 = lastPosition.coords.longitude;
        const lat2 = position.coords.latitude;
        const lon2 = position.coords.longitude;

        const distance = getDistance(lat1, lon1, lat2, lon2); // km
        const timeHours = (currentTime - lastTime) / (1000 * 60 * 60);

        const speed = distance / timeHours; // km/h

        document.getElementById("speedBox").innerText = 
            "Speed: " + speed.toFixed(2) + " km/h";
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

navigator.geolocation.watchPosition(calculateSpeed);

// 2. DRIVING TIME TRACKER
let drivingStartTime = Date.now();

setInterval(() => {
    const drivingTime = (Date.now() - drivingStartTime) / (1000 * 60 * 60);

    if (drivingTime >= 2) {  
        alert("⚠ You have been driving for 2 hours. Please take a break!");
        drivingStartTime = Date.now();
    }
}, 60000);
// ---------------- REAL WEATHER FETCH FUNCTION -----------------

// ---------------- REAL WEATHER FETCH FUNCTION -----------------

let cachedCoords = null;

function startFastWeather() {
    const statusDiv = document.getElementById("weather");

    if (!navigator.geolocation) {
        statusDiv.textContent = "Geolocation not supported!";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            fetchWeatherFast(pos.coords);
        },
        (err) => {
            console.warn("Location denied or unavailable:", err);
            statusDiv.textContent = "Location access denied! Using default location.";

            const defaultCoords = { latitude: 19.0760, longitude: 72.8777 };
            fetchWeatherFast(defaultCoords);
        },
        { enableHighAccuracy: false, maximumAge: 10000, timeout: 3000 }
    );
}


async function fetchWeatherFast(coords) {
    if (!coords) return;

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.latitude}&lon=${coords.longitude}&appid=${WEATHER_API_KEY}&units=metric`;

    try {
        let response = await fetch(url);
        let data = await response.json();

        document.getElementById("weather").textContent = data.weather[0].description;
        document.getElementById("temp").textContent = data.main.temp + "°C";
        document.getElementById("humidity").textContent = data.main.humidity + "%";
        document.getElementById("visibility").textContent = (data.visibility / 1000) + " km";

        document.getElementById("roadWarning").innerHTML =
            data.visibility < 2000 ? "⚠ Low Visibility! Drive Carefully." : "✔ Visibility Good.";

    } catch (err) {
        console.log("Weather fetch error:", err);
    }
}


document.getElementById("checkRoadBtn").addEventListener("click", startFastWeather);
