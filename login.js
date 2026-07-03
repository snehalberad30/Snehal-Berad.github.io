const firebaseConfig = {
  apiKey: "AIzaSyCf6oBdNpzCS52gGe7rSofmcvJImy1XUq8",
  authDomain: "eyeguard-6b9fa.firebaseapp.com",
  databaseURL: "https://eyeguard-6b9fa-default-rtdb.firebaseio.com",
  projectId: "eyeguard-6b9fa",
  storageBucket: "eyeguard-6b9fa.firebasestorage.app",
  messagingSenderId: "556403918869",
  appId: "1:556403918869:web:1a0c9dc7a6bec5336be61c"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const realtimeDB = firebase.database();
const auth = firebase.auth();

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const mobile = document.getElementById("mobile").value.trim();

    realtimeDB.ref("users").once("value")
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

        if (!foundUser) {
          alert("User not found! Please Sign Up first.");
          return;
        }

        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("username", foundUser.username);
        localStorage.setItem("email", foundUser.email || "");
        localStorage.setItem("mobile", foundUser.mobile || "");

        realtimeDB.ref("loginLogs").push({
          username: foundUser.username,
          mobile: foundUser.mobile,
          event: "User Login",
          loginType: "Manual",
          timestamp: new Date().toLocaleString()
        });

        window.location.href = "index.html";
      })
      .catch((error) => {
        alert("Firebase login error: " + error.message);
      });
  });
}

const googleLoginBtn = document.getElementById("googleLoginBtn");

if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", function () {
    const provider = new firebase.auth.GoogleAuthProvider();

    auth.signInWithPopup(provider)
      .then((result) => {
        const user = result.user;
        const username = user.displayName || "Google User";
        const email = user.email || "";

        let mobile = prompt("Enter your 10 digit emergency mobile number:");

        if (!mobile || mobile.length !== 10 || isNaN(mobile)) {
          alert("Valid 10 digit emergency mobile number is required.");
          return;
        }

        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("username", username);
        localStorage.setItem("email", email);
        localStorage.setItem("mobile", mobile);

        realtimeDB.ref("users/" + user.uid).set({
          username: username,
          email: email,
          mobile: mobile,
          loginProvider: "Google",
          uid: user.uid,
          photoURL: user.photoURL || "",
          createdAt: new Date().toLocaleString()
        });

        realtimeDB.ref("loginLogs").push({
          username: username,
          email: email,
          mobile: mobile,
          event: "Google Login",
          loginType: "Google",
          timestamp: new Date().toLocaleString()
        });

        window.location.href = "index.html";
      })
      .catch((error) => {
        alert("Google Login Error: " + error.message);
      });
  });
}