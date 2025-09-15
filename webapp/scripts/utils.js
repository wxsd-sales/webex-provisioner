// --- Constants for Local Storage Keys ---
const ACCESS_TOKEN_KEY = "webex_access_token";
const TOKEN_EXPIRY_KEY = "webex_token_expiry";
const TOKEN_TYPE_KEY = "webex_token_type";

// Iterate over each button and add a click event listener
document.querySelectorAll(".template-button").forEach((button) => {
  button.addEventListener("click", function () {
    // Get the filename from the 'data-filename' attribute of the clicked button
    const filename = this.dataset.filename;

    if (!filename) {
      console.error("No data-filename attribute found on this button:", this);
      alert("Error: Could not determine file to download.");
      return;
    }

    // Construct the full URL to the file
    const fileUrl = "templates/" + filename;

    // Create a temporary anchor element
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = filename; // Suggest the filename for the download

    // Append to the body (required for Firefox to trigger download)
    document.body.appendChild(link);

    // Programmatically click the link to trigger the download
    link.click();

    // Clean up: remove the temporary link after clicking
    document.body.removeChild(link);

    console.log(`Attempting to download: ${filename} from ${fileUrl}`);
  });
});

/**
 * Parses the URL hash and searchParams for OAuth tokens and stores them in local storage.
 */
function getCredsFromUrl() {
  console.log("Getting Creds from URL");
  const hash = window.location.hash.substring(1); // Remove '#'
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(hash);

  const accessToken =
    hashParams.get("access_token") ?? searchParams.get("access_token");
  const expiresIn =
    hashParams.get("expires_in") ?? searchParams.get("expires_in");
  const tokenType =
    hashParams.get("token_type") ?? searchParams.get("token_type");

  if (accessToken) {
    const expiresSeconds = expiresIn ?? 60 * 1000; // Use URL Params or set to 60 minutes
    const expiry = Date.now() + parseInt(expiresSeconds) * 1000; // Convert seconds to milliseconds and add to current time
    // Clear the hash from the URL for a cleaner look
    const { protocol, host, pathname } = window.location;
    const cleanUrl = `${protocol}//${host}${pathname}`;
    window.history.replaceState({}, document.title, cleanUrl);
    return { accessToken, expiry, tokenType };
  } else {
    console.warn("No access_token or expires_in found in hash.");
  }
}

/**
 * Saves Access Token, Expiry and Type to local storage
 * @returns {?object} token
 * @property {string} accessToken - Access Token
 * @property {string} tokenExpiry - Token Expiry
 */
function saveCreds({ accessToken, expiry, tokenType }) {
  console.log("Saving Creds");
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
  localStorage.setItem(TOKEN_TYPE_KEY, tokenType);
}

/**
 * Clears Stored Access Token, Expiry and Type from local storage
 */
function clearStoredCreds() {
  console.log("Deleting Stored Creds");
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(TOKEN_TYPE_KEY);
}

/**
 * Gets access token and expiry from local storage if present
 * @returns {?object} token
 * @property {string} accessToken - Access Token
 * @property {string} tokenExpiry - Token Expiry
 */
function getStoredCreds() {
  console.log("Getting Stored Creds");
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  const tokenType = localStorage.getItem(TOKEN_TYPE_KEY);
  if (!accessToken || !tokenExpiry || !tokenType) {
    return
  }
  return {
    accessToken,
    expiry: parseInt(tokenExpiry, 10),
    tokenType,
  };
}

/**
 * Checks if the access token is expired.
 * @returns {boolean} True if token is valid, false otherwise.
 */
function tokenExpired({ expiry }) {
  if (!expiry) {
    return false;
  }

  console.log(
    "Current:",
    Date.now(),
    "Expiry:",
    expiry,
    "Expiry Date::",
    new Date(expiry)
  );

  // Check if current time is before the expiry time
  return Date.now() > expiry;
}

function validateCsv(csv, template) {}

function validateWorkspaces(newWorkspaces, existingWorkspaces) {}
