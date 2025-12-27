
const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", function(e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const mobile = document.getElementById("mobile").value;

  let users = JSON.parse(localStorage.getItem("users")) || [];

  // Login by NAME + MOBILE only
  let foundUser = users.find(user =>
    user.username === username &&
    user.mobile === mobile
  );

  if(foundUser) {
    // mark logged in
    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("username", foundUser.username);
    localStorage.setItem("email", foundUser.email);
    localStorage.setItem("mobile", foundUser.mobile);

    window.location.href = "index.html";
  } 
  else {
    alert("User not found! Please Sign Up.");
  }
});
