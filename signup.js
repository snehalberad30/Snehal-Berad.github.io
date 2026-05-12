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

const signupForm = document.getElementById("signupForm");

signupForm.addEventListener("submit", function(e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const mobile = document.getElementById("mobile").value.trim();

  if (username === "" || email === "" || password === "" || mobile === "") {
    alert("Please fill all fields.");
    return;
  }

  if (mobile.length !== 10 || isNaN(mobile)) {
    alert("Please enter valid 10 digit mobile number.");
    return;
  }

  const usersRef = realtimeDB.ref("users");

  usersRef.once("value")
    .then((snapshot) => {
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

      usersRef.push({
        username: username,
        email: email,
        password: btoa(password),
        mobile: mobile,
        createdAt: new Date().toLocaleString()
      })
      .then(() => {
        alert("Signup successful! User saved in Firebase. Please Login.");
        window.location.href = "login.html";
      })
      .catch((error) => {
        alert("Signup error: " + error.message);
      });
    })
    .catch((error) => {
      alert("Firebase error: " + error.message);
    });
});