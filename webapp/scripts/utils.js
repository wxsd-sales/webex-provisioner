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
function identifyCsvFileErrors(csvContent, requiredHeaders = ["displayName"]) {
  let validationMessages = [];

  // 1. Parse CSV content
  const lines = csvContent.trim().split("\n");
  if (lines.length === 0) {
    validationMessages.push("The CSV file is empty");
  }

  // 2. Validate column names (headers)
  //const headers = lines[0].split(",").map((header) => header.trim());

  const headers = splitCSVLine(lines[0]);
  console.log("headers", headers);

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

  console.log('csvText.trim()[0]', csvText.trim())
  // Split the CSV into lines, trim whitespace
  const lines = csvText.trim().split(/\r?\n?[\r\n]/);

  if (lines.length === 0) return [];
  console.log('Line[0]', lines[0], lines[1])

  // Split headers, handling simple quoted fields
  const headers = splitCSVLine(lines[0]).map((header) =>
    decapitalizeFirstLetter(header)
  );

  console.log('decapitalized headers', headers)

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    const rowObj = {};
    headers.forEach((header, idx) => {
      rowObj[header] =
        values[idx] !== undefined && values[idx] !== "" ? values[idx] : null;
    });
    rows.push(unFlattenObject(rowObj));
  }
  return rows;
}

// Helper to split a CSV line into fields, supporting quoted values with commas
function splitCSVLine(line) {
  line = line.replace(/(\r\n|\n|\r)/gm, "");
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
    // console.log("current", current)
    // console.log("result", result)

    //result.push(current);
  }
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

  const headers = Object.keys(flattenObject(jsonData[0]));
  const csvHeader = headers
    .map((header) => `"${header.replace(/"/g, '""')}"`)
    .join(",");

  const csvRows = jsonData.map((row) => {
    return headers
      .map((header) => {
        let flattenRowObj = flattenObject(row);
        let value = flattenRowObj[header];
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

function capitalizeFirstLetter(val) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function decapitalizeFirstLetter(val) {
  return String(val).charAt(0).toLowerCase() + String(val).slice(1);
}

function flattenObject(obj) {
  const result = {};

  for (var i in obj) {
    if (!obj.hasOwnProperty(i)) continue;

    if (typeof obj[i] == "object" && obj[i] !== null) {
      var flatObject = flattenObject(obj[i]);
      for (var x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;

        result[capitalizeFirstLetter(i) + "." + x] = flatObject[x];
      }
    } else {
      result[capitalizeFirstLetter(i)] = obj[i];
    }
  }
  return result;
}

function unFlattenObject(obj) {
  const result = {};

  for (var i in obj) {
    if (!obj.hasOwnProperty(i)) continue;

    var keys = i.split(".");
    var parent = result; // 'parent' refers to the object or array we are currently building into
    var lastKeyIndex = keys.length - 1;

    for (var j = 0; j < lastKeyIndex; j++) {
      var currentKeySegment = keys[j]; // The key or index for the current level
      var nextKeySegment = keys[j + 1]; // Look ahead to determine if the next level should be an array

      // Check if the next key segment is a numeric string (e.g., "0", "1", indicating an array index)
      const isNextKeySegmentNumeric = /^\d+$/.test(nextKeySegment);

      if (isNextKeySegmentNumeric) {
        // If the next segment is numeric, the current 'currentKeySegment' should lead to an array.
        // Ensure that 'parent[currentKeySegment]' is an array.
        if (!parent[currentKeySegment]) {
          parent[currentKeySegment] = [];
        } else if (!Array.isArray(parent[currentKeySegment])) {
          // Conflict: if it exists but is not an array, convert it to an array.
          // This might lead to data loss if parent[currentKeySegment] previously held an object
          // with other properties, but it prioritizes the array structure as requested.
          parent[currentKeySegment] = [];
        }
      } else {
        // If the next segment is not numeric, the current 'currentKeySegment' should lead to an object.
        // Ensure that 'parent[currentKeySegment]' is an object.
        if (!parent[currentKeySegment]) {
          parent[currentKeySegment] = {};
        } else if (Array.isArray(parent[currentKeySegment])) {
          // Conflict: if it exists but is an array, convert it to an object.
          // This might lead to data loss, prioritizing the object structure.
          parent[currentKeySegment] = {};
        }
      }

      // Move to the next level in the 'parent' reference
      parent = parent[currentKeySegment];
    }

    // Handle the last key segment and assign the final value
    var finalKeySegment = keys[lastKeyIndex];
    const isFinalKeySegmentNumeric = /^\d+$/.test(finalKeySegment);

    if (isFinalKeySegmentNumeric) {
      // If the last key segment is numeric, assign the value to an array index.
      // The 'parent' at this point should already be an array due to the preceding loop logic.
      parent[parseInt(finalKeySegment, 10)] = obj[i];
    } else {
      // If the last key segment is not numeric, assign the value to an object property.
      parent[finalKeySegment] = obj[i];
    }
  }

  return result;
}



const textCSV=`WorkspaceId,OrgId,DisplayName,SipAddress,Created,Calling.Type,Calendar.Type,HotdeskingStatus,DeviceHostedMeetings.Enabled,SupportedDevices,DevicePlatform,PlannedMaintenance.Mode,Health.Level,Test.0,Test.1\n
Y2lzY29zcGFyazovL3VybjpURUFNOnVzLXdlc3QtMl9yL1BMQUNFLzA3ZmJlNTFmLWI3MTQtNDVmYi1iZmE3LThkZTMyNThlYTY0OA==,Y2lzY29zcGFyazovL3VzL09SR0FOSVpBVElPTi8xZWJmMWI5Yy00NjQ4LTRkMjUtYWY4OS1iOGRhZjUyNDU4YmQ,My workspace 1,my_workspace_1499890@coe-sbx.rooms.webex.com,2025-10-01T15:36:13.583Z,freeCalling,none,off,FALSE,collaborationDevices,cisco,off,ok,first,second\n
Y2lzY29zcGFyazovL3VybjpURUFNOnVzLXdlc3QtMl9yL1BMQUNFL2YxZWE2M2Y5LWZkYTAtNDI3Ni04OGI2LWNlZGI4MGY0NmNmNQ==,Y2lzY29zcGFyazovL3VzL09SR0FOSVpBVElPTi8xZWJmMWI5Yy00NjQ4LTRkMjUtYWY4OS1iOGRhZjUyNDU4YmQ,My workspace 2,my_workspace_2854748@coe-sbx.rooms.webex.com,2025-10-01T15:36:14.362Z,freeCalling,none,off,FALSE,collaborationDevices,cisco,off,ok,first,second\n
Y2lzY29zcGFyazovL3VybjpURUFNOnVzLXdlc3QtMl9yL1BMQUNFLzY5MWNmYTVmLTg4YTgtNDQwYy1hYzgxLWNjYjVkMzU0NjlmOQ==,Y2lzY29zcGFyazovL3VzL09SR0FOSVpBVElPTi8xZWJmMWI5Yy00NjQ4LTRkMjUtYWY4OS1iOGRhZjUyNDU4YmQ,My workspace 3,my_workspace_3242936@coe-sbx.rooms.webex.com,2025-10-01T15:36:15.428Z,freeCalling,none,off,FALSE,collaborationDevices,cisco,off,ok,first,second
Y2lzY29zcGFyazovL3VybjpURUFNOnVzLXdlc3QtMl9yL1BMQUNFLzcxOGRlN2ZjLWRmZTEtNDRhMS04NjNhLTNlNmNiNDFkMWQ0Yg==,Y2lzY29zcGFyazovL3VzL09SR0FOSVpBVElPTi8xZWJmMWI5Yy00NjQ4LTRkMjUtYWY4OS1iOGRhZjUyNDU4YmQ,My workspace 4,my_workspace_4518424@coe-sbx.rooms.webex.com,2025-10-01T15:36:16.507Z,freeCalling,none,off,FALSE,collaborationDevices,cisco,off,ok,first,second
Y2lzY29zcGFyazovL3VybjpURUFNOnVzLXdlc3QtMl9yL1BMQUNFLzUxYjZkYTY5LWMxYzQtNGFkNC1iZTdlLWU0YTUyZDBmMThkOQ==,Y2lzY29zcGFyazovL3VzL09SR0FOSVpBVElPTi8xZWJmMWI5Yy00NjQ4LTRkMjUtYWY4OS1iOGRhZjUyNDU4YmQ,My workspace 5,my_workspace_5615544@coe-sbx.rooms.webex.com,2025-10-01T15:36:17.601Z,freeCalling,none,off,FALSE,collaborationDevices,cisco,off,ok,first,second
Y2lzY29zcGFyazovL3VybjpURUFNOnVzLXdlc3QtMl9yL1BMQUNFLzFkYzRhYjU4LThkYjMtNGQ3ZS04NmQ3LTZjNTljYmI0MGZjZQ==,Y2lzY29zcGFyazovL3VzL09SR0FOSVpBVElPTi8xZWJmMWI5Yy00NjQ4LTRkMjUtYWY4OS1iOGRhZjUyNDU4YmQ,My workspace 6,my_workspace_6441493@coe-sbx.rooms.webex.com,2025-10-01T15:36:18.370Z,freeCalling,none,off,FALSE,collaborationDevices,cisco,off,ok,first,second
Y2lzY29zcGFyazovL3VybjpURUFNOnVzLXdlc3QtMl9yL1BMQUNFL2JkM2NjMDZjLTA4MDYtNGE0Ni04Zjc3LTI3NTA5NjNlZDhmNQ==,Y2lzY29zcGFyazovL3VzL09SR0FOSVpBVElPTi8xZWJmMWI5Yy00NjQ4LTRkMjUtYWY4OS1iOGRhZjUyNDU4YmQ,My workspace 7,my_workspace_7040517@coe-sbx.rooms.webex.com,2025-10-01T15:36:19.429Z,freeCalling,none,off,FALSE,collaborationDevices,cisco,off,ok,first,second
Y2lzY29zcGFyazovL3VybjpURUFNOnVzLXdlc3QtMl9yL1BMQUNFLzY1OWYzYTk1LWY0OGYtNGNlNi05MjM4LTMwMDI0NGUzNWQ3Zg==,Y2lzY29zcGFyazovL3VzL09SR0FOSVpBVElPTi8xZWJmMWI5Yy00NjQ4LTRkMjUtYWY4OS1iOGRhZjUyNDU4YmQ,My workspace 8,my_workspace_8089290@coe-sbx.rooms.webex.com,2025-10-01T15:36:20.292Z,freeCalling,none,off,FALSE,collaborationDevices,cisco,off,ok,first,second
Y2lzY29zcGFyazovL3VybjpURUFNOnVzLXdlc3QtMl9yL1BMQUNFL2NkOTM5MWM5LWE4NWYtNGVjNi1iNmQ0LTBkNDU4YmFkNzQwZg==,Y2lzY29zcGFyazovL3VzL09SR0FOSVpBVElPTi8xZWJmMWI5Yy00NjQ4LTRkMjUtYWY4OS1iOGRhZjUyNDU4YmQ,My workspace 9,my_workspace_9896727@coe-sbx.rooms.webex.com,2025-10-01T15:36:21.066Z,freeCalling,none,off,FALSE,collaborationDevices,cisco,off,ok,first,second`;



const parsed = parseCSV(textCSV);
console.log(parsed);