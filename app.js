/* =========================================================
   COLLEGE AUTOMATIC BELL SYSTEM
   app.js
   Firebase + Authentication + Realtime Database
   ========================================================= */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    get,
    set,
    update,
    remove,
    push,
    onValue,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";


/* =========================================================
   FIREBASE CONFIGURATION
   =========================================================

   WE WILL REPLACE THESE VALUES AFTER CREATING
   YOUR FIREBASE PROJECT.

   Do NOT put your password here.
   ========================================================= */

const firebaseConfig = {

    apiKey: "YOUR_API_KEY",

    authDomain:
        "YOUR_PROJECT.firebaseapp.com",

    databaseURL:
        "https://YOUR_PROJECT-default-rtdb.firebaseio.com",

    projectId:
        "YOUR_PROJECT_ID",

    storageBucket:
        "YOUR_PROJECT.firebasestorage.app",

    messagingSenderId:
        "YOUR_MESSAGING_SENDER_ID",

    appId:
        "YOUR_APP_ID"
};


/* =========================================================
   FIREBASE INITIALIZATION
   ========================================================= */

let firebaseApp;
let auth;
let database;

try {

    firebaseApp = initializeApp(firebaseConfig);

    auth = getAuth(firebaseApp);

    database = getDatabase(firebaseApp);

} catch (error) {

    console.error(
        "Firebase initialization error:",
        error
    );

}


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let currentUser = null;

let currentUserData = null;

let schedules = {};

let holidays = {};

let vacations = {};

let specialSchedules = {};

let settings = {};

let activeScheduleId = null;

let selectedScheduleId = null;

let toastTimer = null;

let confirmCallback = null;


/* =========================================================
   DEFAULT BELL EVENTS
   =========================================================

   These are your current college timings.

   You can change them later from the dashboard.

   duration is in seconds.
   ========================================================= */

const DEFAULT_BELLS = [

    {
        id: "bell_1030",
        time: "10:30",
        name: "Lecture Start",
        type: "short",
        duration: 4,
        enabled: true
    },

    {
        id: "bell_1130",
        time: "11:30",
        name: "Lecture / Break",
        type: "long",
        duration: 8,
        enabled: true
    },

    {
        id: "bell_1230",
        time: "12:30",
        name: "Lunch Break Start",
        type: "long",
        duration: 8,
        enabled: true
    },

    {
        id: "bell_1300",
        time: "13:00",
        name: "Break Over",
        type: "long",
        duration: 8,
        enabled: true
    },

    {
        id: "bell_1400",
        time: "14:00",
        name: "Lecture Change",
        type: "short",
        duration: 4,
        enabled: true
    },

    {
        id: "bell_1500",
        time: "15:00",
        name: "Short Break Start",
        type: "long",
        duration: 8,
        enabled: true
    },

    {
        id: "bell_1510",
        time: "15:10",
        name: "Break Over",
        type: "long",
        duration: 8,
        enabled: true
    },

    {
        id: "bell_1710",
        time: "17:10",
        name: "College End",
        type: "long",
        duration: 8,
        enabled: true
    }

];


/* =========================================================
   APPLICATION START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeInterface();

        startClock();

        setupFirebaseAuthentication();

    }
);


/* =========================================================
   INITIALIZE INTERFACE
   ========================================================= */

function initializeInterface() {

    setupNavigation();

    setupLogin();

    setupLogout();

    setupScheduleForm();

    setupHolidayForm();

    setupVacationForm();

    setupSpecialForm();

    setupSettings();

    setupQuickActions();

    setupMobileMenu();

    setupToast();

    setupConfirmationModal();

}


/* =========================================================
   FIREBASE AUTHENTICATION
   ========================================================= */

function setupFirebaseAuthentication() {

    if (!auth) {

        showLoginMessage(
            "Firebase configuration is not completed yet."
        );

        return;

    }


    onAuthStateChanged(
        auth,
        async (user) => {

            if (user) {

                currentUser = user;

                await loadAdministrator(user);

            } else {

                currentUser = null;

                currentUserData = null;

                showLoginPage();

            }

        }
    );

}


/* =========================================================
   LOAD ADMINISTRATOR
   ========================================================= */

async function loadAdministrator(user) {

    try {

        const adminRef =
            ref(
                database,
                `admins/${user.uid}`
            );

        const snapshot =
            await get(adminRef);


        if (
            !snapshot.exists() ||
            snapshot.val().enabled !== true
        ) {

            await signOut(auth);

            showLoginMessage(
                "This account is not authorized."
            );

            return;

        }


        currentUserData =
            snapshot.val();


        showApplication();


        updateAdminInformation();


        startRealtimeDatabaseListeners();

    } catch (error) {

        console.error(
            "Administrator verification error:",
            error
        );

        showLoginMessage(
            "Unable to verify administrator account."
        );

    }

}


/* =========================================================
   LOGIN
   ========================================================= */

function setupLogin() {

    const form =
        document.getElementById(
            "loginForm"
        );


    if (!form) return;


    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const email =
                document.getElementById(
                    "loginEmail"
                ).value.trim();


            const password =
                document.getElementById(
                    "loginPassword"
                ).value;


            if (!email || !password) {

                showLoginMessage(
                    "Enter email and password."
                );

                return;

            }


            const button =
                document.getElementById(
                    "loginButton"
                );


            button.disabled = true;

            button.textContent =
                "Signing in...";


            try {

                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );

                let message =
                    "Login failed.";


                if (
                    error.code ===
                    "auth/invalid-credential"
                ) {

                    message =
                        "Invalid email or password.";

                }

                if (
                    error.code ===
                    "auth/user-not-found"
                ) {

                    message =
                        "Administrator account not found.";

                }

                if (
                    error.code ===
                    "auth/wrong-password"
                ) {

                    message =
                        "Incorrect password.";

                }


                showLoginMessage(
                    message
                );

            } finally {

                button.disabled = false;

                button.textContent =
                    "Login";

            }

        }
    );

}


/* =========================================================
   LOGOUT
   ========================================================= */

function setupLogout() {

    const button =
        document.getElementById(
            "logoutButton"
        );


    if (!button) return;


    button.addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

            } catch (error) {

                console.error(
                    error
                );

            }

        }
    );

}


/* =========================================================
   SHOW LOGIN
   ========================================================= */

function showLoginPage() {

    const login =
        document.getElementById(
            "loginPage"
        );

    const app =
        document.getElementById(
            "appPage"
        );


    if (login)
        login.classList.remove(
            "hidden"
        );


    if (app)
        app.classList.add(
            "hidden"
        );

}


/* =========================================================
   SHOW APPLICATION
   ========================================================= */

function showApplication() {

    const login =
        document.getElementById(
            "loginPage"
        );

    const app =
        document.getElementById(
            "appPage"
        );


    if (login)
        login.classList.add(
            "hidden"
        );


    if (app)
        app.classList.remove(
            "hidden"
        );

}


/* =========================================================
   LOGIN MESSAGE
   ========================================================= */

function showLoginMessage(message) {

    const element =
        document.getElementById(
            "loginMessage"
        );


    if (element)
        element.textContent =
            message;

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

    const buttons =
        document.querySelectorAll(
            ".menu-item"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.page;


                    if (!page) return;


                    buttons.forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                    button.classList.add(
                        "active"
                    );


                    document
                        .querySelectorAll(
                            ".content-page"
                        )
                        .forEach(
                            section =>
                                section.classList.remove(
                                    "active-page"
                                )
                        );


                    const target =
                        document.getElementById(
                            page
                        );


                    if (target)
                        target.classList.add(
                            "active-page"
                        );


                    updatePageTitle(
                        page
                    );

                }
            );

        }
    );

}


/* =========================================================
   PAGE TITLES
   ========================================================= */

function updatePageTitle(pageId) {

    const titles = {

        dashboardPage: [
            "Dashboard",
            "College Automatic Bell Control"
        ],

        schedulePage: [
            "Schedules",
            "Manage automatic bell schedules"
        ],

        holidayPage: [
            "Holidays",
            "Manage college holidays"
        ],

        vacationPage: [
            "Vacations",
            "Manage vacation periods"
        ],

        specialPage: [
            "Special / Exam",
            "Manage special schedules"
        ],

        settingsPage: [
            "Settings",
            "System configuration"
        ]

    };


    const data =
        titles[pageId];


    if (!data) return;


    const title =
        document.getElementById(
            "pageTitle"
        );


    const subtitle =
        document.getElementById(
            "pageSubtitle"
        );


    if (title)
        title.textContent =
            data[0];


    if (subtitle)
        subtitle.textContent =
            data[1];

}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {

    const button =
        document.getElementById(
            "mobileMenuButton"
        );


    const sidebar =
        document.querySelector(
            ".sidebar"
        );


    if (!button || !sidebar)
        return;


    button.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "mobile-open"
            );

        }
    );

}


/* =========================================================
   REALTIME DATABASE LISTENERS
   ========================================================= */

function startRealtimeDatabaseListeners() {

    if (!database) return;


    /* SCHEDULES */

    onValue(
        ref(database, "schedules"),
        snapshot => {

            schedules =
                snapshot.val() || {};

            renderSchedules();

            updateDashboard();

        }
    );


    /* HOLIDAYS */

    onValue(
        ref(database, "holidays"),
        snapshot => {

            holidays =
                snapshot.val() || {};

            renderHolidays();

        }
    );


    /* VACATIONS */

    onValue(
        ref(database, "vacations"),
        snapshot => {

            vacations =
                snapshot.val() || {};

            renderVacations();

        }
    );


    /* SPECIAL SCHEDULES */

    onValue(
        ref(database, "specialSchedules"),
        snapshot => {

            specialSchedules =
                snapshot.val() || {};

            renderSpecialSchedules();

        }
    );


    /* SETTINGS */

    onValue(
        ref(database, "settings"),
        snapshot => {

            settings =
                snapshot.val() || {};

            loadSettingsIntoForm();

            updateDashboard();

        }
    );


    /* CONTROLLER */

    onValue(
        ref(database, "controller"),
        snapshot => {

            const data =
                snapshot.val() || {};

            updateControllerStatus(
                data
            );

        }
    );


    /* ACTIVE SCHEDULE */

    onValue(
        ref(database, "activeSchedule"),
        snapshot => {

            activeScheduleId =
                snapshot.val() || null;

            renderSchedules();

            updateDashboard();

        }
    );

}


/* =========================================================
   SCHEDULE FORM
   ========================================================= */

function setupScheduleForm() {

    const addButton =
        document.getElementById(
            "addScheduleButton"
        );


    const closeButton =
        document.getElementById(
            "closeScheduleForm"
        );


    const cancelButton =
        document.getElementById(
            "cancelScheduleButton"
        );


    const form =
        document.getElementById(
            "scheduleForm"
        );


    if (addButton) {

        addButton.addEventListener(
            "click",
            () => {

                openScheduleForm();

            }
        );

    }


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeScheduleForm
        );

    }


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeScheduleForm
        );

    }


    if (form) {

        form.addEventListener(
            "submit",
            saveSchedule
        );

    }

}


/* =========================================================
   OPEN SCHEDULE FORM
   ========================================================= */

function openScheduleForm(schedule = null) {

    const panel =
        document.getElementById(
            "scheduleFormPanel"
        );


    const title =
        document.getElementById(
            "scheduleFormTitle"
        );


    const id =
        document.getElementById(
            "scheduleId"
        );


    const name =
        document.getElementById(
            "scheduleName"
        );


    const type =
        document.getElementById(
            "scheduleType"
        );


    const start =
        document.getElementById(
            "startDate"
        );


    const end =
        document.getElementById(
            "endDate"
        );


    const priority =
        document.getElementById(
            "schedulePriority"
        );


    const description =
        document.getElementById(
            "scheduleDescription"
        );


    if (!panel) return;


    panel.classList.remove(
        "hidden"
    );


    if (schedule) {

        title.textContent =
            "Edit Schedule";


        id.value =
            schedule.id || "";


        name.value =
            schedule.name || "";


        type.value =
            schedule.type || "regular";


        start.value =
            schedule.startDate || "";


        end.value =
            schedule.endDate || "";


        priority.value =
            schedule.priority || "normal";


        description.value =
            schedule.description || "";


        setSelectedDays(
            schedule.days || []
        );


    } else {

        title.textContent =
            "Create New Schedule";


        id.value =
            "";


        name.value =
            "";


        type.value =
            "regular";


        start.value =
            getToday();


        end.value =
            getOneYearLater();


        priority.value =
            "normal";


        description.value =
            "";


        setSelectedDays(
            [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday"
            ]
        );

    }


    panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


/* =========================================================
   CLOSE SCHEDULE FORM
   ========================================================= */

function closeScheduleForm() {

    const panel =
        document.getElementById(
            "scheduleFormPanel"
        );


    if (panel)
        panel.classList.add(
            "hidden"
        );

}


/* =========================================================
   GET SELECTED DAYS
   ========================================================= */

function getSelectedDays() {

    const select =
        document.getElementById(
            "scheduleDays"
        );


    if (!select)
        return [];


    return Array
        .from(select.selectedOptions)
        .map(option => option.value);

}


/* =========================================================
   SET SELECTED DAYS
   ========================================================= */

function setSelectedDays(days) {

    const select =
        document.getElementById(
            "scheduleDays"
        );


    if (!select)
        return;


    Array
        .from(select.options)
        .forEach(
            option => {

                option.selected =
                    days.includes(
                        option.value
                    );

            }
        );

}


/* =========================================================
   SAVE SCHEDULE
   ========================================================= */

async function saveSchedule(event) {

    event.preventDefault();


    if (!currentUser) {

        showToast(
            "Error",
            "You are not logged in.",
            "error"
        );

        return;

    }


    const scheduleIdInput =
        document.getElementById(
            "scheduleId"
        );


    const existingId =
        scheduleIdInput.value.trim();


    const id =
        existingId ||
        push(
            ref(database, "schedules")
        ).key;


    const oldSchedule =
        schedules[id] || {};


    const schedule = {

        id: id,

        name:
            document
                .getElementById(
                    "scheduleName"
                )
                .value
                .trim(),

        type:
            document
                .getElementById(
                    "scheduleType"
                )
                .value,

        startDate:
            document
                .getElementById(
                    "startDate"
                )
                .value,

        endDate:
            document
                .getElementById(
                    "endDate"
                )
                .value,

        days:
            getSelectedDays(),

        priority:
            document
                .getElementById(
                    "schedulePriority"
                )
                .value,

        description:
            document
                .getElementById(
                    "scheduleDescription"
                )
                .value
                .trim(),

        enabled:
            oldSchedule.enabled === true,

        bells:
            oldSchedule.bells ||
            cloneDefaultBells(),

        createdBy:
            oldSchedule.createdBy ||
            currentUser.uid,

        updatedBy:
            currentUser.uid,

        updatedAt:
            serverTimestamp()

    };


    if (!schedule.name) {

        showToast(
            "Error",
            "Enter a schedule name.",
            "error"
        );

        return;

    }


    if (!schedule.startDate ||
        !schedule.endDate) {

        showToast(
            "Error",
            "Select start and end dates.",
            "error"
        );

        return;

    }


    if (schedule.days.length === 0) {

        showToast(
            "Error",
            "Select at least one day.",
            "error"
        );

        return;

    }


    try {

        await set(
            ref(
                database,
                `schedules/${id}`
            ),
            schedule
        );


        closeScheduleForm();


        showToast(
            "Schedule Saved",
            "Schedule saved successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Save schedule error:",
            error
        );

        showToast(
            "Error",
            "Unable to save schedule.",
            "error"
        );

    }

}


/* =========================================================
   CLONE DEFAULT BELLS
   ========================================================= */

function cloneDefaultBells() {

    return DEFAULT_BELLS.map(
        bell => ({
            ...bell
        })
    );

}


/* =========================================================
   RENDER SCHEDULES
   ========================================================= */

function renderSchedules() {

    const container =
        document.getElementById(
            "scheduleList"
        );


    if (!container)
        return;


    const entries =
        Object
            .values(schedules)
            .filter(Boolean);


    if (entries.length === 0) {

        container.innerHTML = `

            <div class="empty-state">

                <div>📅</div>

                <p>
                    No schedules available
                </p>

                <small>
                    Create your first schedule
                </small>

            </div>

        `;

        return;

    }


    entries.sort(
        (a, b) =>
            String(a.name || "")
                .localeCompare(
                    String(b.name || "")
                )
    );


    container.innerHTML =
        entries
            .map(
                schedule =>
                    scheduleCard(
                        schedule
                    )
            )
            .join("");


    attachScheduleButtons();

}


/* =========================================================
   SCHEDULE CARD
   ========================================================= */

function scheduleCard(schedule) {

    const active =
        activeScheduleId ===
        schedule.id;


    const days =
        Array.isArray(schedule.days)
            ? schedule.days
                .map(
                    day =>
                        capitalize(day)
                )
                .join(", ")
            : "No days";


    const bellCount =
        schedule.bells
            ? Object.keys(
                schedule.bells
            ).length
            : 0;


    return `

        <div
            class="schedule-item ${
                active ? "active" : ""
            }"
            data-id="${escapeHtml(
                schedule.id
            )}"
        >

            <div class="schedule-main">

                <div class="schedule-title">

                    ${escapeHtml(
                        schedule.name ||
                        "Unnamed Schedule"
                    )}

                    ${
                        active
                            ? `
                                <span
                                    class="schedule-active-badge"
                                >
                                    RUNNING
                                </span>
                              `
                            : ""
                    }

                </div>

                <div class="schedule-meta">

                    Type:
                    ${capitalize(
                        schedule.type ||
                        "regular"
                    )}

                    •

                    Days:
                    ${escapeHtml(days)}

                    •

                    ${schedule.startDate || "--"}
                    →
                    ${schedule.endDate || "--"}

                    •

                    ${bellCount} bell events

                </div>

            </div>


            <div class="schedule-actions">

                <button
                    class="list-button"
                    data-action="bells"
                    data-id="${escapeHtml(
                        schedule.id
                    )}"
                    title="Manage bell events"
                >
                    🔔
                </button>


                <button
                    class="list-button"
                    data-action="edit"
                    data-id="${escapeHtml(
                        schedule.id
                    )}"
                    title="Edit schedule"
                >
                    ✏️
                </button>


                <button
                    class="list-button"
                    data-action="activate"
                    data-id="${escapeHtml(
                        schedule.id
                    )}"
                    title="${
                        active
                            ? "Deactivate"
                            : "Activate"
                    }"
                >
                    ${
                        active
                            ? "⏹️"
                            : "▶️"
                    }
                </button>


                <button
                    class="list-button delete"
                    data-action="delete"
                    data-id="${escapeHtml(
                        schedule.id
                    )}"
                    title="Delete schedule"
                >
                    🗑️
                </button>

            </div>

        </div>

    `;

}


/* =========================================================
   SCHEDULE BUTTONS
   ========================================================= */

function attachScheduleButtons() {

    document
        .querySelectorAll(
            "[data-action]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.id;

                        const action =
                            button.dataset.action;


                        handleScheduleAction(
                            action,
                            id
                        );

                    }
                );

            }
        );

}


/* =========================================================
   SCHEDULE ACTION
   ========================================================= */

async function handleScheduleAction(
    action,
    id
) {

    const schedule =
        schedules[id];


    if (!schedule)
        return;


    if (action === "edit") {

        openScheduleForm(
            schedule
        );

        return;

    }


    if (action === "bells") {

        await manageBellEvents(
            schedule
        );

        return;

    }


    if (action === "activate") {

        await toggleSchedule(
            schedule
        );

        return;

    }


    if (action === "delete") {

        confirmAction(
            "Delete Schedule",
            `Delete "${schedule.name}"?`,
            async () => {

                await deleteSchedule(
                    id
                );

            }
        );

    }

}


/* =========================================================
   ACTIVATE / DEACTIVATE SCHEDULE
   ========================================================= */

async function toggleSchedule(
    schedule
) {

    try {

        if (
            activeScheduleId ===
            schedule.id
        ) {

            await set(
                ref(
                    database,
                    "activeSchedule"
                ),
                null
            );


            await update(
                ref(
                    database,
                    `schedules/${schedule.id}`
                ),
                {
                    enabled: false
                }
            );


            showToast(
                "Schedule Stopped",
                "Schedule is no longer running.",
                "success"
            );


        } else {

            await set(
                ref(
                    database,
                    "activeSchedule"
                ),
                schedule.id
            );


            const updates = {};

            Object.keys(
                schedules
            ).forEach(
                id => {

                    updates[
                        `schedules/${id}/enabled`
                    ] =
                        id === schedule.id;

                }
            );


            await update(
                ref(database),
                updates
            );


            showToast(
                "Schedule Activated",
                `${schedule.name} is now running.`,
                "success"
            );

        }

    } catch (error) {

        console.error(
            "Activate schedule error:",
            error
        );

        showToast(
            "Error",
            "Unable to change schedule status.",
            "error"
        );

    }

}


/* =========================================================
   DELETE SCHEDULE
   ========================================================= */

async function deleteSchedule(id) {

    try {

        if (
            activeScheduleId === id
        ) {

            await set(
                ref(
                    database,
                    "activeSchedule"
                ),
                null
            );

        }


        await remove(
            ref(
                database,
                `schedules/${id}`
            )
        );


        showToast(
            "Deleted",
            "Schedule deleted.",
            "success"
        );


    } catch (error) {

        console.error(
            error
        );

        showToast(
            "Error",
            "Unable to delete schedule.",
            "error"
        );

    }

}


/* =========================================================
   MANAGE BELL EVENTS
   =========================================================

   Because the current HTML does not yet have a separate
   bell-event editor, this function provides a simple
   administrator editor using browser prompts.

   We can later replace this with a professional table UI.
   ========================================================= */

async function manageBellEvents(
    schedule
) {

    let bells =
        normalizeBells(
            schedule.bells
        );


    while (true) {

        const list =
            bells
                .map(
                    (bell, index) =>
                        `${index + 1}. ${
                            bell.time
                        } - ${
                            bell.name
                        } - ${
                            bell.duration
                        } sec`
                )
                .join("\n");


        const choice =
            prompt(
                `Bell events for "${schedule.name}"\n\n` +
                `${list || "No bell events"}\n\n` +
                `Enter:\n` +
                `1 = Add bell\n` +
                `2 = Edit bell\n` +
                `3 = Delete bell\n` +
                `4 = Save and exit\n` +
                `5 = Cancel`
            );


        if (choice === null ||
            choice === "5") {

            return;

        }


        if (choice === "1") {

            const time =
                prompt(
                    "Bell time (HH:MM):",
                    "10:30"
                );


            if (!validTime(time))
                continue;


            const name =
                prompt(
                    "Bell name:",
                    "Lecture Start"
                );


            const duration =
                Number(
                    prompt(
                        "Duration in seconds:",
                        "4"
                    )
                );


            if (
                !Number.isFinite(
                    duration
                ) ||
                duration <= 0
            ) {

                alert(
                    "Invalid duration."
                );

                continue;

            }


            bells.push({

                id:
                    `bell_${Date.now()}`,

                time:
                    time,

                name:
                    name ||
                    "Bell",

                type:
                    duration >= 7
                        ? "long"
                        : "short",

                duration:
                    duration,

                enabled:
                    true

            });


            bells.sort(
                (a, b) =>
                    a.time.localeCompare(
                        b.time
                    )
            );

            continue;

        }


        if (choice === "2") {

            const number =
                Number(
                    prompt(
                        "Enter bell number to edit:"
                    )
                );


            const index =
                number - 1;


            if (
                !bells[index]
            ) {

                alert(
                    "Invalid bell number."
                );

                continue;

            }


            const bell =
                bells[index];


            const time =
                prompt(
                    "Time:",
                    bell.time
                );


            const name =
                prompt(
                    "Name:",
                    bell.name
                );


            const duration =
                Number(
                    prompt(
                        "Duration in seconds:",
                        String(
                            bell.duration
                        )
                    )
                );


            if (
                !validTime(time) ||
                !Number.isFinite(
                    duration
                ) ||
                duration <= 0
            ) {

                alert(
                    "Invalid values."
                );

                continue;

            }


            bell.time =
                time;

            bell.name =
                name ||
                "Bell";

            bell.duration =
                duration;

            bell.type =
                duration >= 7
                    ? "long"
                    : "short";


            bells.sort(
                (a, b) =>
                    a.time.localeCompare(
                        b.time
                    )
            );

            continue;

        }


        if (choice === "3") {

            const number =
                Number(
                    prompt(
                        "Enter bell number to delete:"
                    )
                );


            const index =
                number - 1;


            if (
                !bells[index]
            ) {

                alert(
                    "Invalid bell number."
                );

                continue;

            }


            bells.splice(
                index,
                1
            );

            continue;

        }


        if (choice === "4") {

            try {

                await update(
                    ref(
                        database,
                        `schedules/${schedule.id}`
                    ),
                    {
                        bells:
                            bells,
                        updatedBy:
                            currentUser.uid,
                        updatedAt:
                            serverTimestamp()
                    }
                );


                showToast(
                    "Bell Schedule Saved",
                    "Bell events updated successfully.",
                    "success"
                );

            } catch (error) {

                console.error(
                    error
                );

                showToast(
                    "Error",
                    "Unable to save bell events.",
                    "error"
                );

            }

            return;

        }

    }

}


/* =========================================================
   NORMALIZE BELLS
   ========================================================= */

function normalizeBells(bells) {

    if (Array.isArray(bells)) {

        return bells.map(
            bell => ({
                ...bell
            })
        );

    }


    if (
        bells &&
        typeof bells === "object"
    ) {

        return Object
            .values(bells)
            .map(
                bell => ({
                    ...bell
                })
            );

    }


    return [];

}


/* =========================================================
   HOLIDAY FORM
   ========================================================= */

function setupHolidayForm() {

    const add =
        document.getElementById(
            "addHolidayButton"
        );


    const close =
        document.getElementById(
            "closeHolidayForm"
        );


    const cancel =
        document.getElementById(
            "cancelHolidayButton"
        );


    const form =
        document.getElementById(
            "holidayForm"
        );


    if (add) {

        add.addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "holidayFormPanel"
                    )
                    .classList.remove(
                        "hidden"
                    );

            }
        );

    }


    if (close) {

        close.addEventListener(
            "click",
            closeHolidayForm
        );

    }


    if (cancel) {

        cancel.addEventListener(
            "click",
            closeHolidayForm
        );

    }


    if (form) {

        form.addEventListener(
            "submit",
            saveHoliday
        );

    }

}


/* =========================================================
   CLOSE HOLIDAY FORM
   ========================================================= */

function closeHolidayForm() {

    const panel =
        document.getElementById(
            "holidayFormPanel"
        );


    if (panel)
        panel.classList.add(
            "hidden"
        );

}


/* =========================================================
   SAVE HOLIDAY
   ========================================================= */

async function saveHoliday(event) {

    event.preventDefault();


    const name =
        document
            .getElementById(
                "holidayName"
            )
            .value
            .trim();


    const date =
        document
            .getElementById(
                "holidayDate"
            )
            .value;


    if (!name || !date) {

        showToast(
            "Error",
            "Enter holiday name and date.",
            "error"
        );

        return;

    }


    const id =
        push(
            ref(
                database,
                "holidays"
            )
        ).key;


    try {

        await set(
            ref(
                database,
                `holidays/${id}`
            ),
            {

                id: id,

                name: name,

                date: date,

                createdBy:
                    currentUser.uid,

                createdAt:
                    serverTimestamp()

            }
        );


        event.target.reset();

        closeHolidayForm();


        showToast(
            "Holiday Added",
            "Holiday saved successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            error
        );

        showToast(
            "Error",
            "Unable to save holiday.",
            "error"
        );

    }

}


/* =========================================================
   RENDER HOLIDAYS
   ========================================================= */

function renderHolidays() {

    const container =
        document.getElementById(
            "holidayList"
        );


    if (!container)
        return;


    const list =
        Object
            .values(holidays)
            .filter(Boolean)
            .sort(
                (a, b) =>
                    String(a.date)
                        .localeCompare(
                            String(b.date)
                        )
            );


    if (list.length === 0) {

        container.innerHTML = `

            <div class="empty-state">

                <div>🗓️</div>

                <p>
                    No holidays added
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        list.map(
            holiday => `

                <div
                    class="holiday-item"
                >

                    <div
                        class="holiday-main"
                    >

                        <div
                            class="holiday-title"
                        >
                            ${escapeHtml(
                                holiday.name
                            )}
                        </div>

                        <div
                            class="holiday-meta"
                        >
                            ${formatDate(
                                holiday.date
                            )}
                        </div>

                    </div>


                    <div
                        class="holiday-actions"
                    >

                        <button
                            class="list-button delete"
                            data-delete-holiday="${escapeHtml(
                                holiday.id
                            )}"
                        >
                            🗑️
                        </button>

                    </div>

                </div>

            `
        )
        .join("");


    document
        .querySelectorAll(
            "[data-delete-holiday]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset
                                .deleteHoliday;


                        confirmAction(
                            "Delete Holiday",
                            "Delete this holiday?",
                            () =>
                                deleteHoliday(
                                    id
                                )
                        );

                    }
                );

            }
        );

}


/* =========================================================
   DELETE HOLIDAY
   ========================================================= */

async function deleteHoliday(id) {

    try {

        await remove(
            ref(
                database,
                `holidays/${id}`
            )
        );


        showToast(
            "Deleted",
            "Holiday deleted.",
            "success"
        );

    } catch (error) {

        console.error(
            error
        );

        showToast(
            "Error",
            "Unable to delete holiday.",
            "error"
        );

    }

}


/* =========================================================
   VACATION FORM
   ========================================================= */

function setupVacationForm() {

    const add =
        document.getElementById(
            "addVacationButton"
        );


    const close =
        document.getElementById(
            "closeVacationForm"
        );


    const cancel =
        document.getElementById(
            "cancelVacationButton"
        );


    const form =
        document.getElementById(
            "vacationForm"
        );


    if (add) {

        add.addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "vacationFormPanel"
                    )
                    .classList.remove(
                        "hidden"
                    );

            }
        );

    }


    if (close) {

        close.addEventListener(
            "click",
            closeVacationForm
        );

    }


    if (cancel) {

        cancel.addEventListener(
            "click",
            closeVacationForm
        );

    }


    if (form) {

        form.addEventListener(
            "submit",
            saveVacation
        );

    }

}


/* =========================================================
   CLOSE VACATION
   ========================================================= */

function closeVacationForm() {

    const panel =
        document.getElementById(
            "vacationFormPanel"
        );


    if (panel)
        panel.classList.add(
            "hidden"
        );

}


/* =========================================================
   SAVE VACATION
   ========================================================= */

async function saveVacation(event) {

    event.preventDefault();


    const name =
        document
            .getElementById(
                "vacationName"
            )
            .value
            .trim();


    const type =
        document
            .getElementById(
                "vacationType"
            )
            .value;


    const start =
        document
            .getElementById(
                "vacationStart"
            )
            .value;


    const end =
        document
            .getElementById(
                "vacationEnd"
            )
            .value;


    if (!name || !start || !end) {

        showToast(
            "Error",
            "Complete all vacation fields.",
            "error"
        );

        return;

    }


    const id =
        push(
            ref(
                database,
                "vacations"
            )
        ).key;


    try {

        await set(
            ref(
                database,
                `vacations/${id}`
            ),
            {

                id: id,

                name: name,

                type: type,

                startDate: start,

                endDate: end,

                enabled: true,

                createdBy:
                    currentUser.uid,

                createdAt:
                    serverTimestamp()

            }
        );


        event.target.reset();

        closeVacationForm();


        showToast(
            "Vacation Added",
            "Vacation period saved.",
            "success"
        );

    } catch (error) {

        console.error(
            error
        );

        showToast(
            "Error",
            "Unable to save vacation.",
            "error"
        );

    }

}


/* =========================================================
   RENDER VACATIONS
   ========================================================= */

function renderVacations() {

    const container =
        document.getElementById(
            "vacationList"
        );


    if (!container)
        return;


    const list =
        Object
            .values(vacations)
            .filter(Boolean)
            .sort(
                (a, b) =>
                    String(a.startDate)
                        .localeCompare(
                            String(b.startDate)
                        )
            );


    if (list.length === 0) {

        container.innerHTML = `

            <div class="empty-state">

                <div>🏖️</div>

                <p>
                    No vacation periods added
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        list.map(
            vacation => `

                <div
                    class="vacation-item"
                >

                    <div
                        class="vacation-main"
                    >

                        <div
                            class="vacation-title"
                        >
                            ${escapeHtml(
                                vacation.name
                            )}
                        </div>

                        <div
                            class="vacation-meta"
                        >

                            ${capitalize(
                                vacation.type
                            )}

                            •

                            ${formatDate(
                                vacation.startDate
                            )}

                            →

                            ${formatDate(
                                vacation.endDate
                            )}

                        </div>

                    </div>


                    <div
                        class="vacation-actions"
                    >

                        <button
                            class="list-button delete"
                            data-delete-vacation="${escapeHtml(
                                vacation.id
                            )}"
                        >
                            🗑️
                        </button>

                    </div>

                </div>

            `
        )
        .join("");


    document
        .querySelectorAll(
            "[data-delete-vacation]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset
                                .deleteVacation;


                        confirmAction(
                            "Delete Vacation",
                            "Delete this vacation period?",
                            () =>
                                deleteVacation(
                                    id
                                )
                        );

                    }
                );

            }
        );

}


/* =========================================================
   DELETE VACATION
   ========================================================= */

async function deleteVacation(id) {

    try {

        await remove(
            ref(
                database,
                `vacations/${id}`
            )
        );


        showToast(
            "Deleted",
            "Vacation deleted.",
            "success"
        );

    } catch (error) {

        console.error(
            error
        );

        showToast(
            "Error",
            "Unable to delete vacation.",
            "error"
        );

    }

}


/* =========================================================
   SPECIAL SCHEDULE FORM
   ========================================================= */

function setupSpecialForm() {

    const add =
        document.getElementById(
            "addSpecialButton"
        );


    const close =
        document.getElementById(
            "closeSpecialForm"
        );


    const cancel =
        document.getElementById(
            "cancelSpecialButton"
        );


    const form =
        document.getElementById(
            "specialForm"
        );


    if (add) {

        add.addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "specialFormPanel"
                    )
                    .classList.remove(
                        "hidden"
                    );

            }
        );

    }


    if (close) {

        close.addEventListener(
            "click",
            closeSpecialForm
        );

    }


    if (cancel) {

        cancel.addEventListener(
            "click",
            closeSpecialForm
        );

    }


    if (form) {

        form.addEventListener(
            "submit",
            saveSpecialSchedule
        );

    }

}


/* =========================================================
   CLOSE SPECIAL FORM
   ========================================================= */

function closeSpecialForm() {

    const panel =
        document.getElementById(
            "specialFormPanel"
        );


    if (panel)
        panel.classList.add(
            "hidden"
        );

}


/* =========================================================
   SAVE SPECIAL SCHEDULE
   ========================================================= */

async function saveSpecialSchedule(
    event
) {

    event.preventDefault();


    const name =
        document
            .getElementById(
                "specialName"
            )
            .value
            .trim();


    const date =
        document
            .getElementById(
                "specialDate"
            )
            .value;


    const priority =
        document
            .getElementById(
                "specialPriority"
            )
            .value;


    if (!name || !date) {

        showToast(
            "Error",
            "Enter name and date.",
            "error"
        );

        return;

    }


    const id =
        push(
            ref(
                database,
                "specialSchedules"
            )
        ).key;


    try {

        await set(
            ref(
                database,
                `specialSchedules/${id}`
            ),
            {

                id: id,

                name: name,

                date: date,

                priority: priority,

                enabled: true,

                overrideHoliday:
                    priority ===
                    "override",

                bells:
                    cloneDefaultBells(),

                createdBy:
                    currentUser.uid,

                createdAt:
                    serverTimestamp()

            }
        );


        event.target.reset();

        closeSpecialForm();


        showToast(
            "Special Schedule Added",
            "Special schedule saved.",
            "success"
        );

    } catch (error) {

        console.error(
            error
        );

        showToast(
            "Error",
            "Unable to save special schedule.",
            "error"
        );

    }

}


/* =========================================================
   RENDER SPECIAL SCHEDULES
   ========================================================= */

function renderSpecialSchedules() {

    const container =
        document.getElementById(
            "specialList"
        );


    if (!container)
        return;


    const list =
        Object
            .values(
                specialSchedules
            )
            .filter(Boolean)
            .sort(
                (a, b) =>
                    String(a.date)
                        .localeCompare(
                            String(b.date)
                        )
            );


    if (list.length === 0) {

        container.innerHTML = `

            <div class="empty-state">

                <div>📝</div>

                <p>
                    No special schedules
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        list.map(
            item => `

                <div
                    class="special-item"
                >

                    <div
                        class="special-main"
                    >

                        <div
                            class="special-title"
                        >
                            ${escapeHtml(
                                item.name
                            )}
                        </div>

                        <div
                            class="special-meta"
                        >

                            ${formatDate(
                                item.date
                            )}

                            •

                            ${
                                item.overrideHoliday
                                    ? "Holiday Override"
                                    : "High Priority"
                            }

                        </div>

                    </div>


                    <div
                        class="special-actions"
                    >

                        <button
                            class="list-button"
                            data-special-bells="${escapeHtml(
                                item.id
                            )}"
                            title="Manage bells"
                        >
                            🔔
                        </button>


                        <button
                            class="list-button delete"
                            data-delete-special="${escapeHtml(
                                item.id
                            )}"
                            title="Delete"
                        >
                            🗑️
                        </button>

                    </div>

                </div>

            `
        )
        .join("");


    document
        .querySelectorAll(
            "[data-special-bells]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const item =
                            specialSchedules[
                                button.dataset
                                    .specialBells
                            ];


                        if (item)
                            manageSpecialBells(
                                item
                            );

                    }
                );

            }
        );


    document
        .querySelectorAll(
            "[data-delete-special]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset
                                .deleteSpecial;


                        confirmAction(
                            "Delete Special Schedule",
                            "Delete this special schedule?",
                            () =>
                                deleteSpecialSchedule(
                                    id
                                )
                        );

                    }
                );

            }
        );

}


/* =========================================================
   SPECIAL BELL EDITOR
   ========================================================= */

async function manageSpecialBells(
    item
) {

    const schedule = {

        ...item,

        id: item.id,

        name: item.name,

        bells:
            item.bells ||
            cloneDefaultBells()

    };


    let bells =
        normalizeBells(
            schedule.bells
        );


    const list =
        bells
            .map(
                (bell, index) =>
                    `${index + 1}. ${
                        bell.time
                    } - ${
                        bell.name
                    } - ${
                        bell.duration
                    } sec`
            )
            .join("\n");


    const newDuration =
        prompt(
            `Special schedule: ${item.name}\n\n` +
            `${list}\n\n` +
            `Enter a bell number to edit duration/time, or Cancel.`
        );


    if (newDuration === null)
        return;


    const index =
        Number(newDuration) - 1;


    if (!bells[index]) {

        alert(
            "Invalid bell number."
        );

        return;

    }


    const bell =
        bells[index];


    const time =
        prompt(
            "Bell time:",
            bell.time
        );


    if (!validTime(time))
        return;


    const duration =
        Number(
            prompt(
                "Bell duration in seconds:",
                String(
                    bell.duration
                )
            )
        );


    if (
        !Number.isFinite(
            duration
        ) ||
        duration <= 0
    ) {

        alert(
            "Invalid duration."
        );

        return;

    }


    bell.time =
        time;

    bell.duration =
        duration;

    bell.type =
        duration >= 7
            ? "long"
            : "short";


    try {

        await update(
            ref(
                database,
                `specialSchedules/${item.id}`
            ),
            {
                bells:
                    bells,
                updatedBy:
                    currentUser.uid,
                updatedAt:
                    serverTimestamp()
            }
        );


        showToast(
            "Saved",
            "Special bell event updated.",
            "success"
        );

    } catch (error) {

        console.error(
            error
        );

        showToast(
            "Error",
            "Unable to update special bell.",
            "error"
        );

    }

}


/* =========================================================
   DELETE SPECIAL SCHEDULE
   ========================================================= */

async function deleteSpecialSchedule(
    id
) {

    try {

        await remove(
            ref(
                database,
                `specialSchedules/${id}`
            )
        );


        showToast(
            "Deleted",
            "Special schedule deleted.",
            "success"
        );

    } catch (error) {

        console.error(
            error
        );

        showToast(
            "Error",
            "Unable to delete special schedule.",
            "error"
        );

    }

}


/* =========================================================
   SETTINGS
   ========================================================= */

function setupSettings() {

    const form =
        document.getElementById(
            "bellSettingsForm"
        );


    const sync =
        document.getElementById(
            "settingsSyncTimeButton"
        );


    if (form) {

        form.addEventListener(
            "submit",
            saveSettings
        );

    }


    if (sync) {

        sync.addEventListener(
            "click",
            synchronizeControllerTime
        );

    }

}


/* =========================================================
   LOAD SETTINGS
   ========================================================= */

function loadSettingsIntoForm() {

    const shortDuration =
        document.getElementById(
            "shortBellDuration"
        );


    const longDuration =
        document.getElementById(
            "longBellDuration"
        );


    const timezone =
        document.getElementById(
            "timezone"
        );


    const offline =
        document.getElementById(
            "offlineMode"
        );


    if (shortDuration) {

        shortDuration.value =
            settings.shortBellDuration ||
            4;

    }


    if (longDuration) {

        longDuration.value =
            settings.longBellDuration ||
            8;

    }


    if (timezone) {

        timezone.value =
            settings.timezone ||
            "Asia/Kolkata";

    }


    if (offline) {

        offline.value =
            settings.offlineMode ||
            "enabled";

    }

}


/* =========================================================
   SAVE SETTINGS
   ========================================================= */

async function saveSettings(
    event
) {

    event.preventDefault();


    const shortDuration =
        Number(
            document
                .getElementById(
                    "shortBellDuration"
                )
                .value
        );


    const longDuration =
        Number(
            document
                .getElementById(
                    "longBellDuration"
                )
                .value
        );


    const timezone =
        document
            .getElementById(
                "timezone"
            )
            .value;


    const offlineMode =
        document
            .getElementById(
                "offlineMode"
            )
            .value;


    if (
        !Number.isFinite(
            shortDuration
        ) ||
        shortDuration < 1
    ) {

        showToast(
            "Error",
            "Invalid short duration.",
            "error"
        );

        return;

    }


    if (
        !Number.isFinite(
            longDuration
        ) ||
        longDuration < 1
    ) {

        showToast(
            "Error",
            "Invalid long duration.",
            "error"
        );

        return;

    }


    try {

        await update(
            ref(
                database,
                "settings"
            ),
            {

                shortBellDuration:
                    shortDuration,

                longBellDuration:
                    longDuration,

                timezone:
                    timezone,

                offlineMode:
                    offlineMode,

                updatedBy:
                    currentUser.uid,

                updatedAt:
                    serverTimestamp()

            }
        );


        showToast(
            "Settings Saved",
            "Bell settings updated.",
            "success"
        );

    } catch (error) {

        console.error(
            error
        );

        showToast(
            "Error",
            "Unable to save settings.",
            "error"
        );

    }

}


/* =========================================================
   QUICK ACTIONS
   ========================================================= */

function setupQuickActions() {

    const bell =
        document.getElementById(
            "manualBellButton"
        );


    const refresh =
        document.getElementById(
            "refreshScheduleButton"
        );


    const sync =
        document.getElementById(
            "syncTimeButton"
        );


    if (bell) {

        bell.addEventListener(
            "click",
            manualBellTest
        );

    }


    if (refresh) {

        refresh.addEventListener(
            "click",
            syncSchedule
        );

    }


    if (sync) {

        sync.addEventListener(
            "click",
            synchronizeControllerTime
        );

    }

}


/* =========================================================
   MANUAL BELL TEST
   ========================================================= */

async function manualBellTest() {

    const duration =
        Number(
            settings.shortBellDuration ||
            4
        );


    try {

        await set(
            ref(
                database,
                "commands/manualBell"
            ),
            {

                command:
                    "RING",

                duration:
                    duration,

                createdBy:
                    currentUser.uid,

                createdAt:
                    serverTimestamp()

            }
        );


        showToast(
            "Bell Command Sent",
            `Test bell: ${duration} seconds.`,
            "success"
        );

    } catch (error) {

        console.error(
            error
        );

        showToast(
            "Error",
            "Unable to send bell command.",
            "error"
        );

    }

}


/* =========================================================
   SYNC SCHEDULE
   ========================================================= */

async function syncSchedule() {

    try {

        await set(
            ref(
                database,
                "commands/syncSchedule"
            ),
            {

                command:
                    "SYNC",

                requestedBy:
                    currentUser.uid,

                requestedAt:
                    serverTimestamp()

            }
        );


        showToast(
            "Sync Requested",
            "ESP8266 schedule synchronization requested.",
            "success"
        );

    } catch (error) {

        console.error(
            error
        );

        showToast(
            "Error",
            "Unable to request synchronization.",
            "error"
        );

    }

}


/* =========================================================
   SYNCHRONIZE CONTROLLER TIME
   ========================================================= */

async function synchronizeControllerTime() {

    try {

        await set(
            ref(
                database,
                "commands/syncTime"
            ),
            {

                command:
                    "SYNC_TIME",

                requestedBy:
                    currentUser.uid,

                requestedAt:
                    serverTimestamp()

            }
        );


        showToast(
            "Time Sync Requested",
            "ESP8266 will synchronize its clock.",
            "success"
        );

    } catch (error) {

        console.error(
            error
        );

        showToast(
            "Error",
            "Unable to request time synchronization.",
            "error"
        );

    }

}


/* =========================================================
   CONTROLLER STATUS
   ========================================================= */

function updateControllerStatus(
    data
) {

    const status =
        document.getElementById(
            "controllerStatus"
        );


    const connection =
        document.getElementById(
            "connectionStatus"
        );


    const connectionText =
        document.getElementById(
            "connectionText"
        );


    const internet =
        document.getElementById(
            "internetStatus"
        );


    const timeSource =
        document.getElementById(
            "timeSource"
        );


    const syncStatus =
        document.getElementById(
            "syncStatus"
        );


    const settingsSync =
        document.getElementById(
            "settingsSyncStatus"
        );


    const lastSeen =
        Number(
            data.lastSeen ||
            0
        );


    const now =
        Date.now();


    const online =
        lastSeen > 0 &&
        Math.abs(
            now - lastSeen
        ) < 120000;


    if (status) {

        status.textContent =
            online
                ? "Online"
                : "Offline";


        status.classList.toggle(
            "online",
            online
        );

        status.classList.toggle(
            "offline",
            !online
        );

    }


    if (connection) {

        connection.classList.toggle(
            "online",
            online
        );

        connection.classList.toggle(
            "offline",
            !online
        );

    }


    if (connectionText) {

        connectionText.textContent =
            online
                ? "ESP8266 Online"
                : "ESP8266 Offline";

    }


    if (internet) {

        internet.textContent =
            data.wifiConnected === true
                ? "Online"
                : "Offline";

    }


    if (timeSource) {

        timeSource.textContent =
            data.timeSource ||
            "NTP";

    }


    if (syncStatus) {

        syncStatus.textContent =
            data.timeSynchronized === true
                ? "Synchronized"
                : "Waiting";

    }


    if (settingsSync) {

        settingsSync.textContent =
            data.timeSynchronized === true
                ? "Synchronized"
                : "Waiting";

    }


    updateDashboard();
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {

    const count =
        document.getElementById(
            "activeScheduleCount"
        );


    const activeBox =
        document.getElementById(
            "activeScheduleBox"
        );


    const mode =
        document.getElementById(
            "systemMode"
        );


    const modeBadge =
        document.getElementById(
            "systemModeBadge"
        );


    if (count) {

        count.textContent =
            activeScheduleId
                ? "1"
                : "0";

    }


    if (mode) {

        mode.textContent =
            activeScheduleId
                ? "Automatic"
                : "Standby";

    }


    if (modeBadge) {

        modeBadge.textContent =
            activeScheduleId
                ? "SYSTEM RUNNING"
                : "SYSTEM READY";

        modeBadge.style.background =
            activeScheduleId
                ? "#dcfce7"
                : "#dbeafe";

        modeBadge.style.color =
            activeScheduleId
                ? "#15803d"
                : "#1d4ed8";

    }


    if (!activeBox)
        return;


    if (
        !activeScheduleId ||
        !schedules[
            activeScheduleId
        ]
    ) {

        activeBox.innerHTML = `

            <div class="empty-state">

                <div>📅</div>

                <p>
                    No schedule selected
                </p>

                <small>
                    Activate a schedule from Schedules
                </small>

            </div>

        `;

        return;

    }


    const schedule =
        schedules[
            activeScheduleId
        ];


    const bells =
        normalizeBells(
            schedule.bells
        );


    activeBox.innerHTML = `

        <div
            style="
                width:100%;
            "
        >

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:10px;
                    margin-bottom:15px;
                "
            >

                <strong>
                    ${escapeHtml(
                        schedule.name
                    )}
                </strong>

                <span
                    class="schedule-active-badge"
                >
                    RUNNING
                </span>

            </div>


            <div
                style="
                    display:flex;
                    flex-direction:column;
                    gap:7px;
                    max-height:220px;
                    overflow:auto;
                "
            >

                ${
                    bells
                        .map(
                            bell => `

                                <div
                                    style="
                                        display:flex;
                                        justify-content:space-between;
                                        align-items:center;
                                        padding:9px 10px;
                                        background:#f8fafc;
                                        border-radius:8px;
                                        font-size:11px;
                                    "
                                >

                                    <span>
                                        🔔
                                        ${
                                            bell.time
                                        }
                                        —
                                        ${
                                            escapeHtml(
                                                bell.name
                                            )
                                        }
                                    </span>

                                    <strong>
                                        ${
                                            bell.duration
                                        } sec
                                    </strong>

                                </div>

                            `
                        )
                        .join("")
                }

            </div>

        </div>

    `;

}


/* =========================================================
   CURRENT CLOCK
   ========================================================= */

function startClock() {

    updateClock();


    setInterval(
        updateClock,
        1000
    );

}


function updateClock() {

    const now =
        new Date();


    const dateElement =
        document.getElementById(
            "currentDate"
        );


    const timeElement =
        document.getElementById(
            "currentTime"
        );


    const dateText =
        now.toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );


    const timeText =
        now.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
            }
        );


    if (dateElement)
        dateElement.textContent =
            dateText;


    if (timeElement)
        timeElement.textContent =
            timeText;

}


/* =========================================================
   UPDATE ADMIN INFORMATION
   ========================================================= */

function updateAdminInformation() {

    const name =
        document.getElementById(
            "adminName"
        );


    if (!name)
        return;


    name.textContent =
        currentUserData?.name ||
        currentUser?.email ||
        "Administrator";

}


/* =========================================================
   TOAST
   ========================================================= */

function setupToast() {

    const close =
        document.getElementById(
            "closeToast"
        );


    if (close) {

        close.addEventListener(
            "click",
            hideToast
        );

    }

}


function showToast(
    title,
    message,
    type = "success"
) {

    const toast =
        document.getElementById(
            "toast"
        );


    const titleElement =
        document.getElementById(
            "toastTitle"
        );


    const messageElement =
        document.getElementById(
            "toastMessage"
        );


    const icon =
        document.getElementById(
            "toastIcon"
        );


    if (!toast)
        return;


    if (titleElement)
        titleElement.textContent =
            title;


    if (messageElement)
        messageElement.textContent =
            message;


    if (icon) {

        icon.textContent =
            type === "error"
                ? "!"
                : "✓";

        icon.style.background =
            type === "error"
                ? "#fee2e2"
                : "#dcfce7";

        icon.style.color =
            type === "error"
                ? "#b91c1c"
                : "#15803d";

    }


    toast.classList.remove(
        "hidden"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            hideToast,
            4000
        );

}


function hideToast() {

    const toast =
        document.getElementById(
            "toast"
        );


    if (toast)
        toast.classList.add(
            "hidden"
        );

}


/* =========================================================
   CONFIRMATION MODAL
   ========================================================= */

function setupConfirmationModal() {

    const cancel =
        document.getElementById(
            "confirmCancel"
        );


    const okay =
        document.getElementById(
            "confirmOK"
        );


    if (cancel) {

        cancel.addEventListener(
            "click",
            closeConfirmModal
        );

    }


    if (okay) {

        okay.addEventListener(
            "click",
            async () => {

                if (
                    typeof confirmCallback ===
                    "function"
                ) {

                    await confirmCallback();

                }

                closeConfirmModal();

            }
        );

    }

}


function confirmAction(
    title,
    message,
    callback
) {

    const modal =
        document.getElementById(
            "confirmModal"
        );


    const titleElement =
        document.getElementById(
            "confirmTitle"
        );


    const messageElement =
        document.getElementById(
            "confirmMessage"
        );


    if (!modal)
        return;


    confirmCallback =
        callback;


    titleElement.textContent =
        title;


    messageElement.textContent =
        message;


    modal.classList.remove(
        "hidden"
    );

}


function closeConfirmModal() {

    const modal =
        document.getElementById(
            "confirmModal"
        );


    if (modal)
        modal.classList.add(
            "hidden"
        );


    confirmCallback =
        null;

}


/* =========================================================
   UTILITY FUNCTIONS
   ========================================================= */

function getToday() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


function getOneYearLater() {

    const date =
        new Date();


    date.setFullYear(
        date.getFullYear() + 1
    );


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


function formatDate(
    dateString
) {

    if (!dateString)
        return "--";


    const date =
        new Date(
            `${dateString}T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateString;

    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function validTime(time) {

    if (
        typeof time !==
        "string"
    ) {

        return false;

    }


    return /^([01]\d|2[0-3]):([0-5]\d)$/
        .test(
            time
        );

}


function capitalize(value) {

    if (!value)
        return "";


    return String(value)
        .charAt(0)
        .toUpperCase() +
        String(value)
            .slice(1);

}


function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   END OF APPLICATION
   ========================================================= */
