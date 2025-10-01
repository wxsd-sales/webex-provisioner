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
    return;
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

async function loadCsvFileFromServer(filePath, fileName) {
  try {
    // 1. Fetch the CSV file content from the server
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();

    // 2. Create a Blob from the CSV text content
    // The 'type' should match the MIME type of a CSV file.
    const blob = new Blob([csvText], { type: "text/csv" });

    // 3. Create a File object from the Blob
    // The File constructor takes a Blob, a filename, and an optional options object.
    const file = new File([blob], fileName, {
      type: "text/csv",
      lastModified: new Date().getTime(),
    });

    // --- IMPORTANT: Direct assignment to input.files is NOT allowed for security reasons ---
    // The following lines are for demonstration of how you *might* handle the created File object,
    // but it CANNOT be assigned to the 'files' property of an <input type="file"> element.
    // For example, you can process the file directly:
    console.log("File object created:", file);
    console.log("File name:", file.name);
    console.log("File size:", file.size, "bytes");
    console.log("File type:", file.type);

    // Example: Read the content of the created File object
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = (e) => {
        resolve(e.target.result);
      };

      reader.onerror = (e) => {
        reject(e.target.error);
      };

      reader.readAsText(file);
    });
  } catch (error) {
    return null;
  }
}

/**
 * Processes a CSV file and validates the headers and content.
 * @param {string} csvContent - The CSV content to process.
 * @param {string[]} requiredHeaders - The required headers to validate.
 * @returns {string[]} An array of validation messages.
 */
function identifyCsvFileErrors(csvContent, requiredHeaders = ["Name"]) {
  let validationMessages = [];

  // 1. Parse CSV content
  const lines = csvContent.trim().split("\n");
  if (lines.length === 0) {
    validationMessages.push("The CSV file is empty");
  }

  // 2. Validate column names (headers)
  //const headers = lines[0].split(",").map((header) => header.trim());

  const headers = splitCSVLine(lines[0]);
  console.log("headers", headers)

  requiredHeaders.forEach((header) => {
    if (!headers.includes(header)) {
      validationMessages.push("Missing Column header: " + header);
    }
  });


  // 3. Check for duplicates in the first column (assuming it's the 'ID' column as per expectedHeaders)
  const firstColumnValues = [];
  const seenValues = new Set(); // Using a Set for efficient duplicate checking [2, 3, 4]
  const duplicateRows = new Map(); // To store rows where duplicates are found

  // Start from the second line (index 1) to skip headers
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",").map((cell) => cell.trim());
    if (row.length > 0 && row[0] !== "") {
      // Ensure the row is not empty and the first cell is not empty
      const value = row[0];
      if (seenValues.has(value)) {
        if (!duplicateRows.has(value)) {
          duplicateRows.set(value, [i]); // Store the current row index (1-based)
        }
        duplicateRows.get(value).push(i);
      }
      seenValues.add(value);
      firstColumnValues.push(value);
    }
  }

  if (duplicateRows.size > 0) {
    duplicateRows.forEach((rows, value) => {
      validationMessages.push(
        `Duplicate value "${value}" found in the first column (Name) at rows: ${rows
          .map((r) => r + 1)
          .join(", ")}.`
      );
    });
  }

  return validationMessages;
}

function parseCSV(csvText) {
  // Split the CSV into lines, trim whitespace
  const lines = csvText.trim().split(/\r?\n/);

  if (lines.length === 0) return [];

  // Split headers, handling simple quoted fields
  const headers = splitCSVLine(lines[0]);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    const rowObj = {};
    headers.forEach((header, idx) => {
      rowObj[header] =
        values[idx] !== undefined && values[idx] !== "" ? values[idx] : null;
    });
    rows.push(rowObj);
  }
  return rows;
}

// Helper to split a CSV line into fields, supporting quoted values with commas
function splitCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function checkConflicts(existingWorkspaces, newWorkspaces) {
  const conflicts = [];

  const existingWorkspacesSet = new Set(existingWorkspaces);

  for (const workspace of newWorkspaces) {
    if (existingWorkspacesSet.has(workspace)) {
      conflicts.push(workspace);
    }
  }

  return conflicts;
}

function downloadJsonAsCsv(jsonData, filename = "data.csv") {
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    console.warn("Input JSON data must be a non-empty array of objects.");
    return;
  }

  const headers = Object.keys(jsonData[0]);
  const csvHeader = headers
    .map((header) => `"${header.replace(/"/g, '""')}"`)
    .join(",");

  const csvRows = jsonData.map((row) => {
    return headers
      .map((header) => {
        let value = row[header];
        if (value === null || value === undefined) {
          value = "";
        } else if (typeof value === "object") {
          value = JSON.stringify(value);
        } else {
          value = String(value);
        }
        if (
          value.includes(",") ||
          value.includes("\n") ||
          value.includes('"')
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",");
  });

  const csvString = [csvHeader, ...csvRows].join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
