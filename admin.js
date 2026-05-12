const firebaseConfig = {
  apiKey: "AIzaSyCf6oBdNpzCS52gGe7rSofmcvJImy1XUq8",
  authDomain: "eyeguard-6b9fa.firebaseapp.com",
  databaseURL: "https://eyeguard-6b9fa-default-rtdb.firebaseio.com",
  projectId: "eyeguard-6b9fa",
  storageBucket: "eyeguard-6b9fa.firebasestorage.app",
  messagingSenderId: "556403918869",
  appId: "1:556403918869:web:1a0c9dc7a6bec5336be61c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = value;
}

function countData(path, elementId) {
  db.ref(path).once("value")
    .then((snapshot) => {
      setText(elementId, snapshot.numChildren());
    })
    .catch((error) => {
      console.log(`Error counting ${path}:`, error);
      setText(elementId, 0);
    });
}

function loadUsers() {
  const table = document.getElementById("usersTable");
  if (!table) return;

  table.innerHTML = "";

  db.ref("users").once("value").then((snapshot) => {
    snapshot.forEach((child) => {
      const user = child.val();

      table.innerHTML += `
        <tr>
          <td>${user.username || "-"}</td>
          <td>${user.email || "-"}</td>
          <td>${user.mobile || "-"}</td>
          <td>${user.createdAt || "-"}</td>
        </tr>
      `;
    });
  });
}

function loadDrowsinessLogs() {
  const table = document.getElementById("drowsinessTable");
  if (!table) return;

  table.innerHTML = "";

  db.ref("drowsinessLogs").once("value").then((snapshot) => {
    snapshot.forEach((child) => {
      const log = child.val();

      table.innerHTML += `
        <tr>
          <td>${log.user || "-"}</td>
          <td>${log.event || "-"}</td>
          <td>${log.severity || "-"}</td>
          <td>${log.timestamp || "-"}</td>
        </tr>
      `;
    });
  });
}

function loadLocationLogs() {
  const table = document.getElementById("locationTable");
  if (!table) return;

  table.innerHTML = "";

  db.ref("locationLogs").once("value").then((snapshot) => {
    snapshot.forEach((child) => {
      const log = child.val();

      table.innerHTML += `
        <tr>
          <td>${log.user || "-"}</td>
          <td>${log.latitude || "-"}</td>
          <td>${log.longitude || "-"}</td>
          <td><a href="${log.mapsLink || "#"}" target="_blank">Open Map</a></td>
          <td>${log.timestamp || "-"}</td>
        </tr>
      `;
    });
  });
}

function loadWeatherLogs() {
  const table = document.getElementById("weatherTable");
  if (!table) return;

  table.innerHTML = "";

  db.ref("weatherLogs").once("value").then((snapshot) => {
    snapshot.forEach((child) => {
      const log = child.val();

      table.innerHTML += `
        <tr>
          <td>${log.user || "-"}</td>
          <td>${log.weather || "-"}</td>
          <td>${log.temperature || "-"}°C</td>
          <td>${log.visibilityKm || "-"} km</td>
          <td>${log.timestamp || "-"}</td>
        </tr>
      `;
    });
  });
}

function loadEmergencyLogs() {
  const table = document.getElementById("emergencyTable");
  if (!table) return;

  table.innerHTML = "";

  db.ref("emergencyLogs").once("value").then((snapshot) => {
    snapshot.forEach((child) => {
      const log = child.val();

      table.innerHTML += `
        <tr>
          <td>${log.user || "-"}</td>
          <td>${log.phone || "-"}</td>
          <td>${log.event || "-"}</td>
          <td>${log.timestamp || "-"}</td>
        </tr>
      `;
    });
  });
}

function loadDrivingSessions() {
  const table = document.getElementById("drivingTable");
  if (!table) return;

  table.innerHTML = "";

  db.ref("drivingSessions").once("value").then((snapshot) => {
    snapshot.forEach((child) => {
      const log = child.val();

      table.innerHTML += `
        <tr>
          <td>${log.user || "-"}</td>
          <td>${log.event || "-"}</td>
          <td>${log.status || "-"}</td>
          <td>${log.totalDrivingMinutes || "-"}</td>
          <td>${log.timestamp || "-"}</td>
        </tr>
      `;
    });
  });
}

function loadDashboard() {
  countData("users", "userCount");
  countData("loginLogs", "loginCount");
  countData("drowsinessLogs", "drowsinessCount");
  countData("locationLogs", "locationCount");
  countData("weatherLogs", "weatherCount");
  countData("emergencyLogs", "emergencyCount");
  countData("drivingSessions", "drivingCount");

  loadUsers();
  loadDrowsinessLogs();
  loadLocationLogs();
  loadWeatherLogs();
  loadEmergencyLogs();
  loadDrivingSessions();
}

function adminLogout() {
  localStorage.removeItem("adminLoggedIn");
  window.location.href = "admin-login.html";
}

window.onload = loadDashboard;