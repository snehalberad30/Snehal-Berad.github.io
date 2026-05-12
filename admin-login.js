const adminLoginForm = document.getElementById("adminLoginForm");

if (adminLoginForm) {

  adminLoginForm.addEventListener("submit", function (e) {

    e.preventDefault();

    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value.trim();

    // Simple Admin Authentication
    if (username === "admin" && password === "EyeGuard@Admin2026") {

      localStorage.setItem("adminLoggedIn", "true");

      alert("Admin Login Successful!");

      window.location.href = "admin.html";

    } else {

      alert("Invalid Admin Username or Password!");

    }

  });

}