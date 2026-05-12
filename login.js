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

firebase.initializeApp(firebaseConfig);
const realtimeDB = firebase.database();

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const mobile = document.getElementById("mobile").value.trim();

    const usersRef = realtimeDB.ref("users");

    usersRef.once("value")
      .then((snapshot) => {
        let foundUser = null;

        snapshot.forEach((childSnapshot) => {
          const user = childSnapshot.val();

          if (
            user.username &&
            user.mobile &&
            user.username.toLowerCase() === username.toLowerCase() &&
            user.mobile === mobile
          ) {
            foundUser = user;
          }
        });

        if (foundUser) {
          localStorage.setItem("loggedIn", "true");
          localStorage.setItem("username", foundUser.username);
          localStorage.setItem("email", foundUser.email || "");
          localStorage.setItem("mobile", foundUser.mobile || "");

          realtimeDB.ref("loginLogs").push({
            username: foundUser.username,
            mobile: foundUser.mobile,
            event: "User Login",
            timestamp: new Date().toLocaleString()
          });

          window.location.href = "index.html";
        } else {
          alert("User not found! Please Sign Up first.");
        }
      })
      .catch((error) => {
        alert("Firebase login error: " + error.message);
      });
  });
}