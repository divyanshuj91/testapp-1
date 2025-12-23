import { auth, db, storage } from '../shared/firebase_config.js';
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, query, where, orderBy, onSnapshot, increment, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

console.log("User Panel App Initialized");

// Global Auth State Listener
onAuthStateChanged(auth, async (user) => {
    const isTestUser = localStorage.getItem('civic_test_user') === 'true';

    if (user || isTestUser) {
        const uid = user ? user.uid : "TEST_USER";
        console.log("User is logged in:", uid);

        // Start Global Listeners
        listenToUserCredits(uid);

        // If on Profile Page, load data
        if (window.location.pathname.includes('profile.html')) {
            if (isTestUser) {
                loadTestProfile();
            } else {
                loadProfileData(uid);
            }
        }
    } else {
        console.log("User is logged out");
        // Redirect to login if on protected pages (index, camera, profile)
        const path = window.location.pathname;
        if (path.includes('index.html') || path.includes('camera.html') || path.includes('profile.html')) {
            window.location.href = 'login.html';
        }
    }
});

function listenToUserCredits(uid) {
    // Elements to update
    const headerCredits = document.getElementById('header-credits');
    const profileCredits = document.getElementById('profile-credits');
    // Also check for the redeem page header if app.js is ever used there
    const availableCoins = document.getElementById('available-coins');

    if (!headerCredits && !profileCredits && !availableCoins) return;

    if (uid === 'TEST_USER') {
        updateCreditUI(999);
        return;
    }

    onSnapshot(doc(db, "users", uid), (doc) => {
        if (doc.exists()) {
            const credits = doc.data().credits || 0;
            updateCreditUI(credits);
        }
    });
}

function updateCreditUI(amount) {
    const headerCredits = document.getElementById('header-credits');
    const profileCredits = document.getElementById('profile-credits');
    const lockedCredits = document.getElementById('profile-locked'); // Assuming locked is relevant

    if (headerCredits) headerCredits.textContent = `${amount} Credits`;
    if (profileCredits) profileCredits.textContent = amount;

    // Note: Locked credits might need a separate field in DB, ignoring for global sync simple case 
    // or we can add it to the listener if needed.
}

function loadTestProfile() {
    // Mock Data for Tester
    document.getElementById('profile-name').textContent = "Tester Account";
    document.getElementById('profile-role').textContent = "BETA TESTER";
    // Credits updated by listenToUserCredits
    document.getElementById('profile-avatar').textContent = "T";
    const reportsEl = document.getElementById('profile-reports');
    if (reportsEl) reportsEl.textContent = "0";
}

async function loadProfileData(uid) {
    try {
        const userDocRef = doc(db, "users", uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
            const data = userSnap.data();

            // Update UI elements
            const nameEl = document.getElementById('profile-name');
            const roleEl = document.getElementById('profile-role');
            const creditsEl = document.getElementById('profile-credits');
            const lockedEl = document.getElementById('profile-locked');
            const avatarEl = document.getElementById('profile-avatar');
            // Assuming reports count might be stored on user or tallied dynamically. 
            // For now, let's look for a field or default to 0.
            const reportsEl = document.getElementById('profile-reports');

            if (nameEl) nameEl.textContent = data.name || "Anonymous";
            if (roleEl) roleEl.textContent = data.role ? data.role.toUpperCase() : "CITIZEN";
            if (creditsEl) creditsEl.textContent = data.credits || 0;
            if (lockedEl) lockedEl.textContent = data.lockedCredits || 0;

            // Set Avatar Initials
            if (avatarEl && data.name) {
                avatarEl.textContent = data.name.charAt(0).toUpperCase();
            }
            // Setup Edit Modal
            setupEditProfile(uid, data.name);

            // Listen for User's Reports
            listenForReports(uid);

            

        } else {
            console.log("No such document!");
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

// Logout Logic
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        // Clear Test Flag
        localStorage.removeItem('civic_test_user');

        signOut(auth).then(() => {
            console.log("Signed out successfully");
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error("Sign out error", error);
            // Force redirect even if error (e.g. if only test user logged out)
            window.location.href = 'login.html';
        });
    });
}


// Camera & Report Logic
const cameraInput = document.getElementById('camera-input');
const cameraPlaceholder = document.querySelector('.camera-placeholder');
const reportForm = document.getElementById('report-form');
let selectedFile = null;
let currentLocation = null;

if (cameraInput && cameraPlaceholder) {
    cameraPlaceholder.addEventListener('click', () => {
        cameraInput.click();
    });

    cameraInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedFile = file;
            // Preview logic
            const reader = new FileReader();
            reader.onload = (e) => {
                cameraPlaceholder.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:18px;">`;
            };
            reader.readAsDataURL(file);
        }
    });
}

// Geolocation
const locationText = document.getElementById('location-text');
if (locationText) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                locationText.textContent = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
                locationText.style.color = '#4CAF50';
            },
            (error) => {
                locationText.textContent = "Location access denied";
                console.error("Error getting location:", error);
            }
        );
    } else {
        locationText.textContent = "Geolocation not supported";
    }
}

// Handle Form Submission
if (reportForm) {
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";

        // 1. Get Data from Form
        const name = document.getElementById('report-name').value;
        const category = document.getElementById('report-category').value;
        const address = document.getElementById('report-address').value;
        const contact = document.getElementById('report-contact').value;
        const description = document.getElementById('report-desc').value;

        // 2. Validation
        // Photo proof is now optional as per request
        /*
        if (!selectedFile && !localStorage.getItem('civic_test_user')) {
             alert("Please upload a photo proof.");
             submitBtn.disabled = false;
             submitBtn.textContent = "Submit Report";
             return;
        }
        */

        try {
            // MOCK SUBMISSION FOR TESTER (Bypass Firebase)
            if (localStorage.getItem('civic_test_user') === 'true') {
                console.log("Tester Mode: Mocking submission...");
                await new Promise(resolve => setTimeout(resolve, 1500)); // Fake network delay

                // Show Success Modal
                const modal = document.getElementById('success-modal');
                modal.classList.remove('hidden');

                document.getElementById('close-modal-btn').addEventListener('click', () => {
                    modal.classList.add('hidden');
                    window.location.href = 'index.html';
                });
                return; // Stop here, don't try real Firebase
            }

            let imageUrl = "https://via.placeholder.com/300"; // Default for test

            // 3. Upload Image (Skip if tester without file)
            if (selectedFile) {
                const storageRef = ref(storage, `reports/${Date.now()}_${selectedFile.name}`);
                const snapshot = await uploadBytes(storageRef, selectedFile);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            // 4. Create Firestore Document
            // Handle User ID (Real or Tester)
            const user = auth.currentUser;
            const uid = user ? user.uid : (localStorage.getItem('civic_test_user') ? 'TEST_USER_ID' : 'ANON');

            await addDoc(collection(db, "reports"), {
                reporterName: name,
                category: category,
                address: address,
                contact: contact,
                description: description,
                imageUrl: imageUrl,
                location: currentLocation || { lat: 0, lng: 0 },
                status: 'Pending',
                reporterId: uid,
                timestamp: serverTimestamp(), // Server time
                createdAt: new Date().toISOString() // Client time backup
            });

            // 5. Success Popup
            const modal = document.getElementById('success-modal');
            modal.classList.remove('hidden');

            document.getElementById('close-modal-btn').addEventListener('click', () => {
                modal.classList.add('hidden');
                window.location.href = 'index.html';
            });

        } catch (error) {
            console.error("Error submitting report:", error);
            alert("Failed to submit report: " + error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Report";
        }
    });
}


// --- MISSING FUNCTIONS RESTORED ---

// 1. Home Page & Profile Reports Listener
function listenForReports(uid) {
    const reportsContainer = document.querySelector('.active-reports'); // For Home Page
    const profileReportsCount = document.getElementById('profile-reports'); // For Profile Stats

    if (!reportsContainer && !profileReportsCount) return;

    const q = query(collection(db, "reports"), where("reporterId", "==", uid), orderBy("timestamp", "desc"));

    onSnapshot(q, (snapshot) => {
        // Update Count on Profile
        if (profileReportsCount) {
            profileReportsCount.textContent = snapshot.size;
        }

        // Update Home Page List
        if (reportsContainer) {
            if (snapshot.empty) {
                reportsContainer.innerHTML = `
                    <h3>Your Active Reports</h3>
                    <div class="empty-state">
                        <p>No active reports. Spot an issue?</p>
                    </div>`;
                return;
            }

            let html = '<h3>Your Active Reports</h3>';
            snapshot.forEach((doc) => {
                const r = doc.data();
                const statusColor = r.status === 'Confirmed' ? '#3DD598' : (r.status === 'Rejected' ? '#FC5A5A' : '#FFB547');

                html += `
                    <div class="report-card" style="background: var(--bg-card); padding: 15px; border-radius: 16px; margin-bottom: 12px; display: flex; gap: 15px; align-items: center;">
                        <div style="width: 50px; height: 50px; border-radius: 10px; overflow: hidden; background: #333; flex-shrink: 0;">
                            <img src="${r.imageUrl || 'assets/placeholder.jpg'}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div style="flex: 1;">
                            <h4 style="margin: 0; color: var(--text-white); font-weight: 600;">${r.category}</h4>
                            <p style="margin: 4px 0 0; color: var(--text-grey); font-size: 0.85rem;">${r.timestamp ? new Date(r.timestamp.toDate()).toLocaleDateString() : 'Just now'}</p>
                        </div>
                        <div>
                            <span style="background: ${statusColor}20; color: ${statusColor}; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 500;">
                                ${r.status || 'Pending'}
                            </span>
                        </div>
                    </div>
                `;
            });
            reportsContainer.innerHTML = html;
        }
    });
}

// 2. Load Reports for Home Page explicitly (if not covered by profile logic)
// We need to call listenForReports on Home Page too
const path = window.location.pathname;
if (path.includes('index.html') || path.endsWith('/')) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            listenForReports(user.uid);
            // Also load user name for greeting
            const nameEl = document.querySelector('.welcome-card h2');
            if (nameEl) {
                getDoc(doc(db, "users", user.uid)).then(snap => {
                    if (snap.exists()) nameEl.textContent = `Welcome, ${snap.data().name.split(' ')[0]}!`;
                });
            }
        }
    });
}

// 3. Setup Edit Profile Stub
function setupEditProfile(uid, currentName) {
    const editBtn = document.getElementById('edit-profile-btn');
    const modal = document.getElementById('edit-modal');
    const form = document.getElementById('edit-profile-form');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const nameInput = document.getElementById('edit-name');

    if (!editBtn || !modal) return;

    editBtn.addEventListener('click', () => {
        nameInput.value = currentName || '';
        modal.classList.remove('hidden');
    });

    cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = nameInput.value;
        if (newName) {
            await updateDoc(doc(db, "users", uid), { name: newName });
            modal.classList.add('hidden');
            location.reload();
        }
    });
}
