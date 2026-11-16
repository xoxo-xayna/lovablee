/* Parzon sign-in gate: Firebase Authentication runs before the dashboard (app.js) loads. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const $ = (s) => document.querySelector(s);
let mode = "signin";
let appLoaded = false;
let signingUp = false;

const MESSAGES = {
  "auth/invalid-credential": "That email or password is not right.",
  "auth/wrong-password": "That email or password is not right.",
  "auth/user-not-found": "No account with that email. Create one instead.",
  "auth/email-already-in-use": "That email already has an account. Sign in instead.",
  "auth/weak-password": "Use at least 6 characters for your password.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-password": "Enter your password.",
  "auth/too-many-requests": "Too many tries. Wait a minute and try again.",
  "auth/network-request-failed": "No internet connection. Check it and try again.",
  "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups and try again.",
  "auth/popup-closed-by-user": "The Google window was closed before finishing.",
  "auth/cancelled-popup-request": "The Google window was closed before finishing.",
  "auth/configuration-not-found": "Sign-in is not switched on in Firebase yet. Open Firebase → Authentication → Get started, then turn on Email/Password and Google.",
  "auth/operation-not-allowed": "This sign-in method is turned off in Firebase. Turn it on in Firebase → Authentication → Sign-in method.",
  "auth/unauthorized-domain": "This website is not on your Firebase allowed list. Add it in Firebase → Authentication → Settings → Authorized domains.",
  "auth/operation-not-supported-in-this-environment": "Sign-in needs Parzon to be opened from a website link, not a file on your computer."
};
const msg = (e) => MESSAGES[e && e.code] || "Something went wrong. Please try again.";

function setMode(m) {
  mode = m;
  $("#authCard").dataset.mode = m;
  $("#authTitle").textContent = m === "signup" ? "Create your account" : "Welcome back";
  $("#authSub").textContent = m === "signup" ? "Join Parzon to share posts, stories and reels." : "Sign in to see what your people are sharing.";
  $("#authSubmit").textContent = m === "signup" ? "Create account" : "Sign in";
  $("#authName").required = m === "signup";
  $("#authPass").autocomplete = m === "signup" ? "new-password" : "current-password";
  $("#googleLabel").textContent = m === "signup" ? "Sign up with Google" : "Sign in with Google";
  $("#authSwitch").innerHTML = m === "signup"
    ? 'Already have an account? <button type="button" data-mode="signin">Sign in</button>'
    : 'New to Parzon? <button type="button" data-mode="signup">Create an account</button>';
  note("");
}
function note(text, ok) { const n = $("#authNote"); n.textContent = text; n.className = "auth-note" + (ok ? " ok" : "") + (text ? " show" : ""); }
function busy(on) { document.querySelectorAll("#authCard button, #authCard input").forEach((el) => { el.disabled = on; }); }

$("#authCard").addEventListener("click", (e) => {
  const b = e.target.closest("[data-mode]");
  if (b) setMode(b.dataset.mode);
});

$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#authEmail").value.trim(), pass = $("#authPass").value, name = $("#authName").value.trim();
  busy(true); note("");
  try {
    if (mode === "signup") {
      signingUp = true;
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name) await updateProfile(cred.user, { displayName: name });
      enter(cred.user);
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
    }
  } catch (err) { note(msg(err)); }
  signingUp = false;
  busy(false);
});

$("#googleBtn").addEventListener("click", async () => {
  busy(true); note("");
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (err) { note(msg(err)); }
  busy(false);
});

$("#forgotBtn").addEventListener("click", async () => {
  const email = $("#authEmail").value.trim();
  if (!email) { note("Type your email above first, then tap Forgot password."); $("#authEmail").focus(); return; }
  try { await sendPasswordResetEmail(auth, email); note("Check your inbox for a link to reset your password.", true); }
  catch (err) { note(msg(err)); }
});

window.parzonSignOut = async () => { await signOut(auth); location.hash = ""; location.reload(); };

function enter(user) {
  if (appLoaded) return;
  appLoaded = true;
  window.PARZON_USER = { uid: user.uid, name: user.displayName || (user.email || "").split("@")[0] || "You", email: user.email || "" };
  document.body.classList.remove("locked");
  $("#auth").hidden = true;
  const s = document.createElement("script");
  s.src = "app.js";
  document.body.appendChild(s);
}

onAuthStateChanged(auth, (user) => {
  $("#authLoading").hidden = true;
  if (user) {
    // Wait briefly after sign-up so the chosen name is saved first.
    if (signingUp && !user.displayName) return;
    enter(user);
  } else {
    $("#authCard").hidden = false;
    if (location.protocol === "file:") note("Sign-in needs Parzon to be opened from a website link, not a file on your computer.");
  }
});

setMode("signin");
