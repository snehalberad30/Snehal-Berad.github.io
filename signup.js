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

// Manual Signup
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", function(e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const mobile = document.getElementById("mobile").value.trim();

    if (!username || !email || !password || !mobile) {
      alert("Please fill all fields.");
      return;
    }

    if (mobile.length !== 10 || isNaN(mobile)) {
      alert("Please enter valid 10 digit mobile number.");
      return;
    }

    const usersRef = realtimeDB.ref("users");

    usersRef.once("value").then((snapshot) => {
      let existingUser = false;

      snapshot.forEach((childSnapshot) => {
        const user = childSnapshot.val();
        if (user.email === email || user.mobile === mobile) {
          existingUser = true;
        }
      });

      if (existingUser) {
        alert("User already exists. Please Login.");
        return;
      }

      return usersRef.push({
        username,
        email,
        password: btoa(password),
        mobile,
        loginProvider: "Manual",
        createdAt: new Date().toLocaleString()
      });
    }).then((result) => {
      if (result) {
        alert("Signup successful! Please Login.");
        window.location.href = "login.html";
      }
    }).catch((error) => {
      alert("Firebase error: " + error.message);
    });
  });
}

// Google Signup
const googleSignupBtn = document.getElementById("googleSignupBtn");

if (googleSignupBtn) {
  googleSignupBtn.addEventListener("click", function () {
    const provider = new firebase.auth.GoogleAuthProvider();

    auth.signInWithPopup(provider)
      .then((result) => {
        const user = result.user;

        const mobile = prompt("Enter your 10 digit emergency mobile number:");

        if (!mobile || mobile.length !== 10 || isNaN(mobile)) {
          alert("Valid emergency mobile number is required.");
          return;
        }

        return realtimeDB.ref("users/" + user.uid).set({
          username: user.displayName || "Google User",
          email: user.email || "",
          mobile: mobile,
          uid: user.uid,
          photoURL: user.photoURL || "",
          loginProvider: "Google",
          createdAt: new Date().toLocaleString()
        }).then(() => {
          localStorage.setItem("loggedIn", "true");
          localStorage.setItem("username", user.displayName || "Google User");
          localStorage.setItem("email", user.email || "");
          localStorage.setItem("mobile", mobile);

          return realtimeDB.ref("loginLogs").push({
            username: user.displayName || "Google User",
            email: user.email || "",
            event: "Google Signup",
            loginType: "Google",
            timestamp: new Date().toLocaleString()
          });
        });
      })
      .then(() => {
        window.location.href = "index.html";
      })
      .catch((error) => {
        alert("Google Signup Error: " + error.message);
      });
  });
}