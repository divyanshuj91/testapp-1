import { auth, db } from '../shared/firebase_config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    fetchSignInMethodsForEmail,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// State
let isLogin = true;
let isForgot = false;
let step = 1;
let generatedOtp = null;
let currentEmail = "";
let currentPassword = "";

// DOM Elements
const headerTitle = document.getElementById('header-title');
const headerSubtitle = document.getElementById('header-subtitle');
const errorContainer = document.getElementById('error-container');
const errorText = document.getElementById('error-text');

const formMain = document.getElementById('form-main');
const formOtp = document.getElementById('form-otp');
const formForgot = document.getElementById('form-forgot');

const fieldNameContainer = document.getElementById('field-name-container');
const forgotLinkContainer = document.getElementById('forgot-link-container');

const inputName = document.getElementById('name');
const inputEmail = document.getElementById('email');
const inputPassword = document.getElementById('password');
const inputOtp = document.getElementById('otp-input');
const inputForgotEmail = document.getElementById('forgot-email');

const btnMainSubmit = document.getElementById('btn-main-submit');
const btnToggleMode = document.getElementById('btn-toggle-mode');
const footerText = document.getElementById('footer-text');
const btnGoToForgot = document.getElementById('btn-go-to-forgot');
const btnBackToLogin = document.getElementById('btn-back-to-login');
const btnBackToSignup = document.getElementById('btn-back-to-signup');
const btnTogglePassword = document.getElementById('btn-toggle-password');
const emailValidIcon = document.getElementById('email-valid-icon');

// Helper Functions
const showError = (msg) => {
    errorText.textContent = msg;
    errorContainer.classList.remove('hidden');
    setTimeout(() => {
        errorContainer.classList.add('hidden');
    }, 5000);
};

const setLoading = (isLoading, btn, defaultText) => {
    if (isLoading) {
        btn.disabled = true;
        btn.textContent = "Processing...";
    } else {
        btn.disabled = false;
        btn.textContent = defaultText;
    }
};

const updateUI = () => {
    // Hide all forms initially
    formMain.classList.add('hidden');
    formOtp.classList.add('hidden');
    formForgot.classList.add('hidden');
    errorContainer.classList.add('hidden');

    if (isForgot) {
        // Forgot Password View
        formForgot.classList.remove('hidden');
        headerTitle.textContent = "Reset Password";
        headerSubtitle.textContent = "Enter your email to receive a reset link";
        document.getElementById('auth-footer').classList.add('hidden');
    } else if (step === 2) {
        // OTP View
        formOtp.classList.remove('hidden');
        headerTitle.textContent = "Verify Email";
        headerSubtitle.textContent = `OTP sent to ${currentEmail}`;
        document.getElementById('auth-footer').classList.add('hidden');
    } else {
        // Main Login/Register View
        formMain.classList.remove('hidden');
        document.getElementById('auth-footer').classList.remove('hidden');

        if (isLogin) {
            headerTitle.textContent = "Welcome Back";
            headerSubtitle.textContent = "Sign in to your professional workspace";
            btnMainSubmit.textContent = "Sign In";
            fieldNameContainer.classList.add('hidden');
            forgotLinkContainer.classList.remove('hidden');
            footerText.textContent = "Don't have an account?";
            btnToggleMode.textContent = "Create Account";
        } else {
            headerTitle.textContent = "Join Civic Loop";
            headerSubtitle.textContent = "Create an account to get started";
            btnMainSubmit.textContent = "Get OTP & Join";
            fieldNameContainer.classList.remove('hidden');
            forgotLinkContainer.classList.add('hidden');
            footerText.textContent = "Already have an account?";
            btnToggleMode.textContent = "Log In";
        }
    }
};

// Logic: Check Email Validity
const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Handlers

// 1. Toggle Login/Register
btnToggleMode.addEventListener('click', () => {
    isLogin = !isLogin;
    step = 1;
    updateUI();
});

// 2. Go to Forgot Password
btnGoToForgot.addEventListener('click', () => {
    isForgot = true;
    updateUI();
});

// 3. Back to Login (from Forgot)
btnBackToLogin.addEventListener('click', () => {
    isForgot = false;
    isLogin = true;
    updateUI();
});

// 4. Back to Signup (from OTP)
btnBackToSignup.addEventListener('click', () => {
    step = 1;
    updateUI();
});

// 5. Email Input Listener
inputEmail.addEventListener('input', (e) => {
    const val = e.target.value;
    currentEmail = val;
    const isValid = validateEmail(val);

    emailValidIcon.innerHTML = '';
    if (val.length > 0) {
        if (isValid) {
            emailValidIcon.innerHTML = '<i class="ri-check-line text-green-500 text-xl"></i>';
            inputEmail.classList.add('border-green-500');
            inputEmail.classList.remove('border-red-500');
        } else {
            emailValidIcon.innerHTML = '<i class="ri-close-line text-red-500 text-xl"></i>';
            inputEmail.classList.add('border-red-500');
            inputEmail.classList.remove('border-green-500');
        }
    } else {
        inputEmail.classList.remove('border-green-500', 'border-red-500');
    }
});

// 6. Toggle Password
btnTogglePassword.addEventListener('click', () => {
    const type = inputPassword.getAttribute('type') === 'password' ? 'text' : 'password';
    inputPassword.setAttribute('type', type);
    btnTogglePassword.innerHTML = type === 'password'
        ? '<i class="ri-eye-off-line text-lg"></i>'
        : '<i class="ri-eye-line text-lg"></i>';
});

// 7. MAIN FORM SUBMIT (Login or Send OTP)
formMain.addEventListener('submit', async (e) => {
    e.preventDefault();
    currentEmail = inputEmail.value;
    currentPassword = inputPassword.value;
    const name = inputName.value;

    if (isLogin) {
        // LOGIN LOGIC
        setLoading(true, btnMainSubmit, "Sign In");
        try {
            // Bypass for tester
            if (currentEmail === 'test@civicloop.com') {
                console.log("Tester Login Bypass");
                localStorage.setItem('civic_test_user', 'true');
                window.location.href = 'index.html';
                return;
            }

            await signInWithEmailAndPassword(auth, currentEmail, currentPassword);
            window.location.href = 'index.html';
        } catch (err) {
            console.error(err);
            showError("❌ Invalid Email or Password");
        } finally {
            setLoading(false, btnMainSubmit, "Sign In");
        }

    } else {
        // REGISTER LOGIC -> SEND OTP
        if (!validateEmail(currentEmail)) { showError("Please enter a valid email first."); return; }
        if (currentPassword.length < 6) { showError("⚠️ Password must be at least 6 characters"); return; }
        if (!name) { showError("Please enter your name."); return; }

        setLoading(true, btnMainSubmit, "Get OTP & Join");

        try {
            // Check if user exists
            const methods = await fetchSignInMethodsForEmail(auth, currentEmail);
            if (methods && methods.length > 0) {
                alert("⚠️ Account already exists with this email!\nPlease Log In.");
                isLogin = true;
                updateUI();
                setLoading(false, btnMainSubmit, "Sign In");
                return;
            }

            // Generate OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            generatedOtp = otp;
            console.log("Generated OTP:", otp); // For debugging purposes

            // Prepare Email Params
            const templateParams = { to_email: currentEmail, to_name: name, otp: otp };

            // Send Email (Using EmailJS)
            try {
                if (window.emailjs) {
                    await emailjs.send('service_4cagrf9', 'template_ilvzvo4', templateParams);

                    console.log("OTP Email Sent");
                } else {
                    console.error("EmailJS not loaded");
                    alert("EmailJS library not loaded!");
                    return;
                }
            } catch (emailErr) {
                console.error("EmailJS Error:", emailErr);
                let errMsg = "Unknown Error";

                if (emailErr.text) errMsg = emailErr.text;
                else if (emailErr.message) errMsg = emailErr.message;
                else {
                    const stringified = JSON.stringify(emailErr);
                    if (stringified === '{}') {
                        errMsg = "Network Error or AdBlocker preventing request. Try disabling AdBlocker.";
                    } else {
                        errMsg = stringified;
                    }
                }

                alert("Failed to send email: " + errMsg);
                setLoading(false, btnMainSubmit, "Get OTP & Join");
                return;
            }

            // Move to Step 2
            step = 2;
            updateUI();

        } catch (err) {
            console.error("Auth Logic Error:", err);
            // Show exact error to help debugging (e.g. Firebase config missing)
            showError("Error: " + err.message);
        } finally {
            setLoading(false, btnMainSubmit, "Get OTP & Join");
        }
    }
});

// 8. OTP SUBMIT
formOtp.addEventListener('submit', async (e) => {
    e.preventDefault();
    const enteredOtp = inputOtp.value;
    const btn = document.getElementById('btn-otp-submit');

    setLoading(true, btn, "Verify & Complete");

    // In a real app, strict check. Here we check against generatedOtp variable.
    if (enteredOtp !== generatedOtp) {
        showError("❌ Incorrect OTP!");
        setLoading(false, btn, "Verify & Complete");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, currentEmail, currentPassword);
        const user = userCredential.user;

        await updateProfile(user, { displayName: inputName.value });

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: inputName.value,
            email: currentEmail,
            createdAt: new Date().toISOString(),
            groups: [],
            role: "user",
            credits: 100
        });

        alert("✅ Account Created Successfully!");
        window.location.href = 'index.html';

    } catch (err) {
        console.error(err);
        showError(err.message);
        step = 1;
        updateUI();
    } finally {
        setLoading(false, btn, "Verify & Complete");
    }
});

// 9. FORGOT PASSWORD SUBMIT
formForgot.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = inputForgotEmail.value;
    const btn = document.getElementById('btn-forgot-submit');

    if (!validateEmail(email)) { showError("Please enter a valid email."); return; }

    setLoading(true, btn, "Send Reset Link");

    try {
        await sendPasswordResetEmail(auth, email);
        alert(`✅ Password reset link sent to ${email}.\n\nCheck your INBOX and SPAM folder!`);
        isForgot = false;
        isLogin = true;
        updateUI();
    } catch (err) {
        console.error("Reset Error:", err);
        showError("Error: " + err.message);
    } finally {
        setLoading(false, btn, "Send Reset Link");
    }
});

// Initialize
updateUI();
