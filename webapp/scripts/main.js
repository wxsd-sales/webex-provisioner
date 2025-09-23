// --- Configuration ---

const WEBAPP_NAME = "Webex Provisioner";
const WEBEX_CLIENT_ID =
  "C2259fa2711278160440c28b1927e845cdc0e14daadc5595ec0b6ad513cab84ca";
const WEBEX_SCOPES = [
  "spark:kms",
  "spark-admin:workspaces_read",
  "spark-admin:workspaces_write",
  "identity:placeonetimepassword_create",
  "identity:organizations_read",
  "identity:people_rw",
];
const WEBEX_REDIRECT_URI = window.location.origin + window.location.pathname;
const WEBEX_OAUTH_BASE_URL = "https://webexapis.com/v1/authorize";
const WEBEX_API_BASE_URL = "https://webexapis.com/v1";

const nav = new Navigation();
nav.onStateChange(processStateChange);

// --- DOM Elements ---

//const loginModal = document.getElementById("loginModal");
const webexLogin = document.getElementById("webexLogin");
const avatarImage = document.getElementById("avatarImage");
const avatarInitials = document.getElementById("avatarInitials");
const nameOrg = document.getElementById("nameOrg");
const fileUploadModal = document.getElementById("fileUploadModal");
const loginButton = document.getElementById("loginButton");
const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");
const uploadFile = document.getElementById("uploadFile");
const replaceFile = document.getElementById("replaceFile");
// const fileName = document.getElementById("fileName");
const createWorkspacesButton = document.getElementById("createWorkspaces");

const hostedWebApp = window.location.protocol.startsWith("http");
if (!hostedWebApp) webexLogin.classList.add("hidden");

let webex;
let workspaceNames = [];
let jobfile;

// --- Helper Functions ---

/**
 * Initiates the Webex OAuth login flow.
 */
function startWebexLogin() {
  console.log("Starting Webex Login");
  const authUrl =
    WEBEX_OAUTH_BASE_URL +
    "?" +
    `client_id=${WEBEX_CLIENT_ID}&` +
    `response_type=token&` +
    `redirect_uri=${encodeURIComponent(WEBEX_REDIRECT_URI)}&` +
    `scope=${encodeURIComponent(WEBEX_SCOPES.join(" "))}`;
  window.location.href = authUrl;
}

function updateWebAppName() {
  const webappNames = document.getElementsByClassName("webapp-name");
  for (const webappName of webappNames) {
    webappName.innerHTML = WEBAPP_NAME;
  }
}

function updateCurrentYear() {
  const currentYear = document.getElementById("currentYear");
  currentYear.innerHTML = new Date().getFullYear();
}

function processStateChange(state) {
  console.log("Stage Changed:", state);

  switch (state) {
    case "workspacesreview":
      processWorkspacesReview();
      break;
    case "workspacesrunJob":
      processWorkspacesRunJob();
      break;
    default:
      break;
  }
}

/**
 * Handles files selected via input or drag-and-drop.
 * @param {FileList} files - The list of File objects.
 */
function handleFiles(files, uploadFile, replaceFile, nextButton, fileName) {
  if (files.length === 0) {
    fileListElement.innerHTML = "";
    uploadFile.classList.remove("hidden");
    replaceFile.classList.add("hidden");
    nextButton.classList.add("disabled");
    fileName.innerHTML = ""; // Clear previous filename
    jobfile = null;
    nav.disableNext();
    return;
  }

  const file = files[0];

  console.log("File Obtained");
  console.log("uploadFile:", uploadFile);
  console.log("replaceFile:", replaceFile);

  // Read the file
  const reader = new FileReader();
  reader.onload = () => {
    jobfile = reader.result;
    nav.enableNext();

    uploadFile.classList.add("hidden");
    replaceFile.classList.remove("hidden");
    nextButton.classList.remove("disabled");
    const { name, size, type } = file;
    fileName.innerHTML = name;

    //fileContentDisplay.textContent = reader.result;
  };
  reader.onerror = () => {
    showMessage("Error reading the file. Please try again.", "error");
  };
  reader.readAsText(file);
}

// --- Event Listeners ---

// Login button click
loginButton.addEventListener("click", startWebexLogin);

// // Logout button click
logoutButton.addEventListener("click", logout);

function logout() {
  nav.logout();
  clearStoredCreds();
  webex?.logout();
}

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
  updateWebAppName();
  updateCurrentYear();

  const creds = getCredsFromUrl() ?? getStoredCreds();
  if (!creds) return;

  if (tokenExpired(creds)) {
    logout();
    alert("Access Token Expired. Please login again");
    return;
  }

  const auth = {
    accessToken: creds.accessToken,
    type: creds.tokenType,
    clientId: WEBEX_CLIENT_ID,
    scopes: WEBEX_SCOPES,
  };

  webex = new Webex(auth, WEBEX_API_BASE_URL);

  // const validToken = await webex.validateToken();
  // if(!validToken){
  //   logout();
  //   alert("Access Not Valid. Please check scopes and try again");
  //   return
  // }

  saveCreds(creds);
  nav.enableNext();
  nav.next();

  const me = await webex.getMe();

  const orgId =
    me?.[0]?.["urn:scim:schemas:extension:cisco:webexidentity:2.0:User"]?.meta
      ?.organizationId;

  const photos = me?.[0]?.photos;
  const displayName = me?.[0]?.displayName;
  const thumbnail = photos?.find(({ type }) => type == "thumbnail")?.value;
  const splitName = displayName.split(" ");
  const initials =
    splitName?.[0]?.charAt(0)?.toUpperCase() +
    splitName?.[1]?.charAt(0)?.toUpperCase();

  nav.setAvatar({ thumbnail, initials });

  const org = await webex.getOrg(orgId);
  const orgName = org?.displayName ?? "No Org Name";

  console.log("DisplayName", displayName);

  nameOrg.innerHTML = displayName + "<br>" + orgName;

  nameOrg.classList.remove("hidden");

  nav.next();

  //test();
});

async function processWorkspacesReview() {
  console.log("Processing Workspaces Review");

  const checkFile = nav.addAction("Checking File").loading();

  console.log("checkfile", checkFile);

  const validCsv = processCsvFile(jobfile, ["Workspace Name"]);

  // Check File
  if (validCsv) {
    checkFile.appendText("File looks good!").success();
  } else {
    checkFile.appendText("File invalid!").error();
    return;
  }

  const job = parseCSV(jobfile);

  const checkWorkspaces = nav
    .addAction("Querying Existing Workspaces")
    .loading();

  const workspaces = await webex.listWorkspaces(
    {},
    (found) => {
      console.log("Workspaces");
    },
    (workspaces) => {
      checkWorkspaces
        .appendText("Workspaces Found: " + workspaces.length)
        .success();
    }
  );

  console.log(workspaces);

  const checkingConflicts = nav.addAction("Checking Conflicts").loading();

  const existingWorkspaceNames = workspaces.map(
    (workspace) => workspace.displayName
  );
  const newWorksapcesNames = job.map((row) => row["Workspace Name"]);
  console.log("job", job);

  const conflicts = checkConflicts(existingWorkspaceNames, newWorksapcesNames);

  console.log("conflicts", conflicts);

  if (conflicts.length > 0) {
    checkingConflicts
      .appendText("Conflicts Found: " + conflicts.length)
      .error();
  } else {
    checkingConflicts.appendText("No Conflicts").success();
  }

  nav.enableNext();
}

async function processWorkspacesRunJob() {
  console.log("Processing Workspaces RunJob");

  const job = parseCSV(jobfile);

  const results = [];

  const createWorkspaces = nav.addAction("Creating Workspaces");

  for (let i = 0; i < job.length; i++) {
    createWorkspaces.setText("Created:  " + i + "/" + job.length);
    const workspaceName = job[i]["Workspace Name"];
    const newWorkspace = await webex.createWorkspace(workspaceName);
    if (newWorkspace) {
      const id = newWorkspace.id;
      results.push({ id, ...job[i] });
    }
  }

  createWorkspaces.setText("Created:  " + results.length + "/" + job.length);

  createWorkspaces.success();

  console.log(results);

  downloadJsonAsCsv(results, "workspaces.csv");

  return;

  const checkWorkspaces = nav.addAction("Querying Existing Workspaces");

  const workspaces = await webex.listWorkspaces(
    {},
    (found) => {
      console.log("Workspaces");
    },
    (workspaces) => {
      nav.updateAction(
        checkWorkspaces,
        "Workspaces Found: " + workspaces.length,
        "success"
      );
    }
  );

  console.log(workspaces);

  const checkingConflicts = nav.addAction("Checking Conflicts");

  const existingWorkspaceNames = workspaces.map(
    (workspace) => workspace.displayName
  );
  const newWorksapcesNames = job.map((row) => row["Workspace Name"]);
  console.log("job", job);

  const conflicts = checkConflicts(existingWorkspaceNames, newWorksapcesNames);

  console.log("conflicts", conflicts);

  if (conflicts.length > 0) {
    nav.updateAction(
      checkingConflicts,
      "Conflicts Found: " + conflicts.length,
      "error"
    );
  } else {
    nav.updateAction(checkingConflicts, "No Conflicts", "success");
  }

  nav.enableNext();
}

async function test() {
  console.log("Testing");
  //nav.enableNext();
  //nav.next();
  //nav.enableNext();
  nav.setOption("workspaces");

  jobfile = await loadCsvFileFromServer(
    "templates/template1.csv",
    "example.csv"
  );

  nav.enableNext();

  //nav.addAction("No Conflicts", "error");

  nav.next();

  setTimeout(() => {
    nav.next();
  }, 1000);
}

function workspacesFound(count) {
  console.log(`Fetched so far: ${count}`);
}

document.querySelectorAll(".jobReview").forEach((dropArea) => {});

// Iterate over each file upload area and add listner
document.querySelectorAll(".file-upload-area").forEach((dropArea) => {
  const modal = dropArea.closest(".modal-container");
  const workflow = modal.getAttribute("data-state");
  const nextButton = modal.querySelectorAll(".next")[0];
  const filename = dropArea.querySelectorAll(".filename")[0];
  const fileInput = dropArea.querySelectorAll(".fileInput")[0];
  const uploadFile = dropArea.querySelectorAll(".uploadFile")[0];
  const replaceFile = dropArea.querySelectorAll(".replaceFile")[0];
  const uploadButton = dropArea.querySelectorAll(".upload-button")[0];
  const replaceButton = dropArea.querySelectorAll(".replace-button")[0];

  uploadButton.addEventListener("click", () => fileInput.click());
  replaceButton.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (event) => {
    handleFiles(
      event.target.files,
      uploadFile,
      replaceFile,
      nextButton,
      filename
    );
  });

  // Drag and drop events
  dropArea.addEventListener("dragover", (event) => {
    event.preventDefault(); // Prevent default to allow drop
    dropArea.classList.add("drag-over");
  });

  dropArea.addEventListener("dragleave", (event) => {
    event.preventDefault();
    dropArea.classList.remove("drag-over");
  });

  dropArea.addEventListener("drop", (event) => {
    event.preventDefault();
    dropArea.classList.remove("drag-over");
    const files = event.dataTransfer.files;
    fileInput.files = files; // Assign files to the input for consistency
    handleFiles(files, uploadFile, replaceFile, nextButton, filename);
  });
});
