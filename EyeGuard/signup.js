const signupForm = document.getElementById("signupForm");

signupForm.addEventListener("submit", function(e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const mobile = document.getElementById("mobile").value;

  let users = JSON.parse(localStorage.getItem("users")) || [];

  let newUser = {
    username: username,
    email: email,
    password: password,
    mobile: mobile
  };

  users.push(newUser);

  localStorage.setItem("users", JSON.stringify(users));

  alert("Signup successful! Please Login.");
  window.location.href = "login.html";
});
