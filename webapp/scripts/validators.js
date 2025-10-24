const createWorkspacePayload = {
  displayName: { required: true },
  orgId: { required: false },
  locationId: { required: false },
  workspaceLocationId: { required: false },
  floorId: { required: false },
  capacity: { required: false },
  type: {
    required: false,
    options: ["notSet", "focus", "huddle", "meetingRoom", "open"],
  },
  calling: {
    required: false,
    fields: {
      type: {
        required: true,
        options: [
          "freeCalling",
          "hybridCalling",
          "webexCalling",
          "webexEdgeForDevices",
          "thirdPartySipCalling",
        ],
        triggers: [
          {
            value: 'webexEdgeForDevices',
            require: ['../locationId'] // path relative to current field
          }
        ]
      },
      webexCalling: {
        required: false,
        fields: {
          phoneNumber: { required: true },
          extension: { required: true },
          locationId: { required: true },
          licenses: { required: true },
        },
      },
    },
  },
  calendar: {
    required: false,
    filds: {
      type: { required: true, options: ["microsoft"] },
      emailAddress: { required: true },
      resourceGroupId: { required: true },
    },
  },
  notes: { required: false },
  hotdeskingStatus: { required: false, options: ["on", "off"] },
  deviceHostedMeetings: {
    required: false,
    fields: {
      enabled: { required: false, options: [true, false] },
      siteUrl: { required: false },
    },
  },
  supportedDevices: {
    required: false,
    options: ["collaborationDevices", "phones"],
  },
  indoorNavigation: {},
};

function resolvePath(obj, path, root) {
  // path: ['address','city'] or ['..','age']
  // '..' means go up one object level
  let curr = obj;
  let currRoot = root || obj;
  for (const seg of path) {
    if (seg === "..") {
      curr = curr.__parent || currRoot;
    } else {
      if (curr && typeof curr === "object") curr = curr[seg];
      else return undefined;
    }
  }
  return curr;
}

// Attach __parent references for traversal (used only internally)
function attachParents(obj, parent = null) {
  if (obj && typeof obj === "object") {
    Object.defineProperty(obj, "__parent", {
      enumerable: false,
      value: parent,
      writable: true,
      configurable: true,
    });
    for (const key in obj) {
      attachParents(obj[key], obj);
    }
  }
}

// Main validator
function validateObject(
  inputObj,
  referenceObj,
  path = "",
  context = { inputRoot: null, validatedRoot: null }
) {
  const validated = {};
  const extras = {};
  const missingFields = [];
  if (context.inputRoot == null) context.inputRoot = inputObj;
  if (context.validatedRoot == null) context.validatedRoot = validated;

  // Attach __parent pointers for upward navigation
  attachParents(inputObj);

  for (const key in referenceObj) {
    const refField = referenceObj[key];
    const fullPath = path ? `${path}.${key}` : key;

    if (refField.fields) {
      if (
        inputObj.hasOwnProperty(key) &&
        typeof inputObj[key] === "object" &&
        inputObj[key] !== null
      ) {
        const { validated: nestedValidated, extras: nestedExtras } =
          validateObject(inputObj[key], refField.fields, fullPath, context);
        validated[key] = nestedValidated;
        if (Object.keys(nestedExtras).length) {
          extras[key] = nestedExtras;
        }
      } else if (refField.required) {
        missingFields.push(fullPath);
      }
    } else {
      if (inputObj.hasOwnProperty(key)) {
        // Options check
        if (
          refField.options &&
          typeof inputObj[key] === "string" &&
          !refField.options.includes(inputObj[key])
        ) {
          throw new Error(
            `Invalid value for field "${fullPath}". Allowed options: ${refField.options.join(
              ", "
            )}`
          );
        }
        validated[key] = inputObj[key];
        // Conditional logic: triggers
        if (refField.triggers && Array.isArray(refField.triggers)) {
          for (const trig of refField.triggers) {
            if (inputObj[key] === trig.value) {
              // For each "require" path, check existence in inputObj
              for (const reqPath of trig.require) {
                // Support relative paths
                // Convert path (e.g. "../age") to array
                const segs = reqPath.split("/").filter(Boolean);
                const requiredValue = resolvePath(
                  inputObj,
                  segs,
                  context.inputRoot
                );
                if (typeof requiredValue === "undefined") {
                  // For error message, resolve absolute path for reporting
                  let absPath = reqPath.startsWith("..")
                    ? reqPath.replace(/\//g, ".")
                    : path
                    ? `${path}.${reqPath}`
                    : reqPath;
                  missingFields.push(absPath);
                }
              }
            }
          }
        }
      } else if (refField.required) {
        missingFields.push(fullPath);
      }
    }
  }

  if (missingFields.length > 0) {
    throw new Error(`Missing required field(s): ${missingFields.join(", ")}`);
  }

  // Extras
  for (const key in inputObj) {
    if (!referenceObj.hasOwnProperty(key)) {
      extras[key] = inputObj[key];
    } else if (
      referenceObj[key].fields &&
      typeof inputObj[key] === "object" &&
      inputObj[key] !== null
    ) {
      const nestedExtras = validateObject(
        inputObj[key],
        referenceObj[key].fields,
        path ? `${path}.${key}` : key,
        context
      ).extras;
      if (Object.keys(nestedExtras).length) {
        extras[key] = nestedExtras;
      }
    }
  }

  // Remove __parent before returning
  if (validated && typeof validated === "object" && validated.__parent) {
    delete validated.__parent;
  }

  return { validated, extras };
}

const userInput = {
  name: "Alice",
  age: 30,
  email: "alice@example.com",
  address: {
    street: "123 Main St",
    city: "New York",
    country: "USA",
  },
  hobby: "cycling",
};

console.log("Testing Validators");
try {
  const { validated, extras } = validateObject(userInput, reference);

  console.log("Validated:", validated);
  console.log("Extras:", extras);

  // validated: {
  //   name: 'Alice',
  //   age: 30,
  //   email: 'alice@example.com',
  //   address: { street: '123 Main St', city: 'New York' }
  // }
  // extras: { hobby: 'cycling', address: { country: 'USA' } }
} catch (err) {
  console.log("validator error:", err);
  // Handle validation error
}
