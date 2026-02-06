/**********************************
 *  PRODUCTION API CONFIG
 **********************************/
const API_URL = "https://mediqueue-xt8k.onrender.com";

/**********************************
 *  COMMON HELPERS
 **********************************/
function setLoading(btn, isLoading) {
  if (isLoading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerText;
    btn.innerText = "Logging in...";
  } else {
    btn.disabled = false;
    btn.innerText = btn.dataset.originalText || "Login";
  }
}

function showError(message) {
  const el = document.getElementById("errorMessage");
  if (el) {
    el.textContent = message;
    el.classList.remove("hidden");
  } else {
    alert(message);
  }
}

function showSuccess(message) {
  const el = document.getElementById("successMessage");
  if (el) {
    el.textContent = message;
    el.classList.remove("hidden");
  } else {
    alert(message);
  }
}

function validateEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

/**********************************
 *  PATIENT REGISTER
 **********************************/
async function registerPatient(name, email, password, confirmPassword, btn) {
  if (!name || !email || !password || !confirmPassword) {
    return showError("Please fill in all fields");
  }

  if (!validateEmail(email)) {
    return showError("Invalid email address");
  }

  if (password.length < 6) {
    return showError("Password must be at least 6 characters");
  }

  if (password !== confirmPassword) {
    return showError("Passwords do not match");
  }

  btn.disabled = true;
  btn.innerText = "Registering...";

  try {
    const res = await fetch(`${API_URL}/register/createuser`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Registration failed");
    }

    showSuccess("Registration successful! Redirecting...");

    setTimeout(() => {
      window.location.href = "login-patient.html";
    }, 1500);

  } catch (err) {
    showError(err.message);
    btn.disabled = false;
    btn.innerText = "Sign up";
  }
}

/**********************************
 *  PATIENT LOGIN
 **********************************/
async function loginPatient() {

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const btn = document.getElementById("patientLoginBtn");

  if (!email || !password) {
    alert("Email & Password required");
    return;
  }

  btn.disabled = true;
  btn.innerText = "Logging in...";

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Login failed");
      btn.disabled = false;
      btn.innerText = "Login";
      return;
    }

    localStorage.setItem("token", data.token);
    window.location.href = "../patient/Dashbord.html";

  } catch (err) {
    alert("Server error");
    btn.disabled = false;
    btn.innerText = "Login";
  }
}

/**********************************
 *  DOCTOR REGISTER
 **********************************/
async function registerDoctor(event) {
  event.preventDefault();

  const btn = event.target.querySelector("button");
  btn.disabled = true;

  const name = document.getElementById("doctorName").value;
  const email = document.getElementById("doctorRegEmail").value;
  const password = document.getElementById("doctorRegPassword").value;
  const confirm = document.getElementById("doctorConfirmPassword").value;
  const specialization = document.getElementById("doctorSpecialization").value;
  const licenseNumber = document.getElementById("doctorLicense").value;

  if (password !== confirm) {
    alert("Passwords do not match");
    btn.disabled = false;
    return;
  }

  try {
    const res = await fetch(`${API_URL}/doctors/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        email,
        password,
        specialization,
        licenseNumber
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Registration failed");
      btn.disabled = false;
      return;
    }

    alert("Registration successful. Wait for admin approval.");
    window.location.href = "login-doctor.html";

  } catch (err) {
    console.log(err);
    alert("Server error");
    btn.disabled = false;
  }
}

// ================= ADMIN LOGIN =================
async function loginAdmin(event) {
  event.preventDefault();

  const email = document.getElementById("adminEmail").value;
  const password = document.getElementById("adminPassword").value;
  const btn = document.getElementById("adminLoginBtn");

  setLoading(btn, true);

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Login failed");
      setLoading(btn, false);
      return;
    }

    if (data.user.role !== "admin") {
      alert("Not an admin account");
      setLoading(btn, false);
      return;
    }

    localStorage.setItem("adminToken", data.token);
    localStorage.setItem("adminUser", JSON.stringify(data.user));

    window.location.href = "../admin/dashboard-admin.html";

  } catch (err) {
    alert("Server error");
    setLoading(btn, false);
  }
}

/**********************************
 *  DOCTOR LOGIN
 **********************************/
async function loginDoctor(event) {
  event.preventDefault();

  const email = document.getElementById("doctorEmail").value;
  const password = document.getElementById("doctorPassword").value;
  const btn = document.getElementById("doctorLoginBtn");

  setLoading(btn, true);

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Login failed");
      setLoading(btn, false);
      return;
    }

    if (data.user.role !== "doctor") {
      alert("Not a doctor account");
      setLoading(btn, false);
      return;
    }

    localStorage.setItem("doctorToken", data.token);
    localStorage.setItem("doctorUser", JSON.stringify(data.user));

    window.location.href = "../doctor/doctordashboard.html";

  } catch (err) {
    alert("Server error");
    setLoading(btn, false);
  }
}
