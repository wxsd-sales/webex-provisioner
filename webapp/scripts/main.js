// --- Configuration ---

const WEBAPP_NAME = "Webex Provisioner";
const WEBEX_CLIENT_ID = "C2259fa2711278160440c28b1927e845cdc0e14daadc5595ec0b6ad513cab84ca";
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
const fileName = document.getElementById("fileName");
const createWorkspacesButton = document.getElementById("createWorkspaces");



const hostedWebApp = window.location.protocol.startsWith("http");

if (!hostedWebApp) webexLogin.classList.add("hidden");

let webex;
let workspaceNames = [];

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

/**
 * Handles files selected via input or drag-and-drop.
 * @param {FileList} files - The list of File objects.
 */
function handleFiles(files, uploadFile, replaceFile, nextButton, workflow) {
  if (files.length === 0) {
    fileListElement.innerHTML = "";
    uploadFile.classList.remove("hidden");
    replaceFile.classList.add("hidden");
    nextButton.classList.add("disabled");
    fileName.innerHTML = ""; // Clear previous filename
    return;
  }

  const file = files[0];

  console.log("File Obtained");

  console.log("uploadFile:", uploadFile);
  console.log("replaceFile:", replaceFile);

  // Read the file
  const reader = new FileReader();
  reader.onload = () => {
    const lines = reader.result.split("\r\n").map((line) => line.trim());

    console.log(JSON.stringify(lines));

    //if(line[0] != 'Workspace Name") // Handle

    const workspaces = lines.filter(
      (line) => line !== "" && line != "Workspace Name"
    );

    console.log("File Length:", workspaces.length);

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


function logout(){
  nav.logout();
  clearStoredCreds();
  webex?.logout();
}

// // File input change (for browse button)
// fileInput.addEventListener("change", (event) => {
//   handleFiles(event.target.files);
// });

// // Drag and drop events
// dropArea.addEventListener("dragover", (event) => {
//   event.preventDefault(); // Prevent default to allow drop
//   dropArea.classList.add("drag-over");
// });

// dropArea.addEventListener("dragleave", (event) => {
//   event.preventDefault();
//   dropArea.classList.remove("drag-over");
// });

// dropArea.addEventListener("drop", (event) => {
//   event.preventDefault();
//   dropArea.classList.remove("drag-over");
//   const files = event.dataTransfer.files;
//   fileInput.files = files; // Assign files to the input for consistency
//   handleFiles(files);
// });

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {

  updateWebAppName();
  updateCurrentYear();


  // nav.moveState("next");
  // nav.moveState("next");
  // nav.setOption("workspaces");
  // nav.moveState("next");

  // return


  const creds = getCredsFromUrl() ?? getStoredCreds();
  if (!creds) return;


  if (tokenExpired(creds)) {
    logout();
    alert("Access Token Expired. Please login again");
    return
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

  nav.moveState("next");

  const me = await webex.getMe();

  const orgId =
    me?.[0]?.["urn:scim:schemas:extension:cisco:webexidentity:2.0:User"]?.meta
      ?.organizationId;
  console.log("orgid", orgId);

  const photos = me?.[0]?.photos;
  const displayName = me?.[0]?.displayName;

  const thumbnail = photos?.find(({ type }) => type == "thumbnail")?.value;

  const splitName = displayName.split(' ')
  const initials = splitName?.[0]?.charAt(0)?.toUpperCase() + splitName?.[1]?.charAt(0)?.toUpperCase();

  nav.setAvatar({thumbnail, initials})

  const org = await webex.getOrg(orgId);
  const orgName = org?.displayName ?? "No Org Name";

  console.log("DisplayName", displayName);

  nameOrg.innerHTML = displayName + "<br>" + orgName;

  nameOrg.classList.remove("hidden");



  
  nav.moveState("next");
  // nav.setOption("workspaces");
  // nav.moveState("next");

  return;
});

function workspacesFound(count) {
  console.log(`Fetched so far: ${count}`);
}

async function test() {
  const auth = {
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
    type: localStorage.getItem(TOKEN_TYPE_KEY),
    clientId: WEBEX_CLIENT_ID,
    scopes: WEBEX_SCOPES,
  };

  webex = new Webex(auth, WEBEX_API_BASE_URL);

  const result = await webex.validateToken();

  console.log(JSON.stringify(result));

  return;

  const workspaces = await webex.listWorkspaces(
    { max: 1000 },
    workspacesFound,
    (allRooms) => console.log(`Complete! Total: ${allRooms.length}`) // onComplete
  );

  console.log(workspaces);
}

// Iterate over each file upload area and add listner
document.querySelectorAll(".file-upload-area").forEach((dropArea) => {
  const modal = dropArea.closest(".modal-container");

  console.log("modal:", modal.getAttribute("data-state"));

  const workflow = modal.getAttribute("data-state");

  const nodeList = dropArea.childNodes;
  console.log("nodeList:", nodeList);

  const fileInput = dropArea.querySelectorAll(".fileInput")[0];
  const uploadFile = dropArea.querySelectorAll(".uploadFile")[0];
  const replaceFile = dropArea.querySelectorAll(".replaceFile")[0];

  const uploadButton = dropArea.querySelectorAll(".upload-button")[0];
  const replaceButton = dropArea.querySelectorAll(".replace-button")[0];

  const nextButton = modal.querySelectorAll(".next")[0];

  uploadButton.addEventListener("click", () => fileInput.click());
  replaceButton.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (event) => {
    handleFiles(
      event.target.files,
      uploadFile,
      replaceFile,
      nextButton,
      workflow
    );
  });

  console.log("fileInput:", fileInput);
  console.log("uploadFile:", uploadFile);
  console.log("replaceFile:", replaceFile);
  console.log("nextButton:", nextButton);

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
    handleFiles(files, uploadFile, replaceFile, nextButton, workflow);
  });

  // button.addEventListener("click", function () {
  //   // Get the filename from the 'data-filename' attribute of the clicked button
  //   const filename = this.dataset.filename;

  //   if (!filename) {
  //     console.error("No data-filename attribute found on this button:", this);
  //     alert("Error: Could not determine file to download.");
  //     return;
  //   }

  //   // Construct the full URL to the file
  //   const fileUrl = "templates/" + filename;

  //   // Create a temporary anchor element
  //   const link = document.createElement("a");
  //   link.href = fileUrl;
  //   link.download = filename; // Suggest the filename for the download

  //   // Append to the body (required for Firefox to trigger download)
  //   document.body.appendChild(link);

  //   // Programmatically click the link to trigger the download
  //   link.click();

  //   // Clean up: remove the temporary link after clicking
  //   document.body.removeChild(link);

  //   console.log(`Attempting to download: ${filename} from ${fileUrl}`);
});
