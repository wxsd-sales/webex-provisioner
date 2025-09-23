class Webex {
  #accessToken;
  #clientId;
  #scopes;
  #type;
  #apiBaseUrl = "https://webexapis.com";
  #apiVersion = "v1";
  #validToken = false;
  #baseUrlPlusVersion

  /**
   * Creates instance of Webex API Integration
   * @param {Object} auth - Required auth
   * @param {string} auth.accessToken - Access Token Type
   * @param {string} auth.scopes - Access Token Scopes
   * @param {?'Peronsal'|'Bearer'} auth.type - Access Token Type
   * @param {?string} required.clientId - Required ClienId
   * @param {?URL} baseUrl
   */
  constructor(auth = {}, baseUrl = "https://webexapis.com/v1") {
    const { accessToken, clientId, scopes, type } = auth;
    if (
      !accessToken ||
      typeof accessToken !== "string" ||
      !accessToken.trim()
    ) {
      throw new Error("Access token is required for Webex API requests.");
    }

    console.log('Webex Auth:', auth)

    this.#accessToken = accessToken;
    this.#clientId = clientId;
    this.#scopes = scopes ?? null;
    this.#type = type;
    this.#apiBaseUrl = /v\d+$/.test(baseUrl) ? baseUrl.replace(/\/v\d+$/, '') : baseUrl
    
    //baseUrl.split("/").slice(0, -1).join("");
    this.#apiVersion = /v\d+$/.test(baseUrl)  ? baseUrl.match(/v\d+$/)[0] : 'v1';

    this.#baseUrlPlusVersion = this.#apiBaseUrl + '/' + this.#apiVersion;

    console.log('BaseUrl', baseUrl, 'apiBaseUrl', this.#apiBaseUrl, 'apiVersion', this.#apiVersion)


    console.log('this.#accessToken', this.#accessToken)

  }

  async #fetchWithRetry(fullUrl, options = {}, retries = 3) {
    options.headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${this.#accessToken}`,
      "Content-Type": "application/json",
    };

    while (retries > 0) {
      const response = await fetch(fullUrl, options);
      if (response.status !== 429) {
        return response;
      }
      const retryAfter = response.headers.get("Retry-After");
      let waitTime = 1;
      if (retryAfter) {
        const parsed = parseInt(retryAfter, 10);
        if (!isNaN(parsed)) {
          waitTime = parsed;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
      retries -= 1;
    }
    throw new Error("Too many requests. Maximum retries exceeded.");
  }

  #extractNextLink(linkHeader) {
    if (!linkHeader) return null;
    // Multiple links: <url1>; rel="next", <url2>; rel="prev"
    const links = linkHeader.split(",");
    for (let link of links) {
      let [urlPart, relPart] = link.split(";").map((s) => s.trim());
      if (relPart && relPart === 'rel="next"') {
        // Remove angle brackets from the URL
        return urlPart.replace(/^<|>$/g, "");
      }
    }
    return null;
  }

  #extractArrayFromResponse(obj) {
    // Return the first property that's an array
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) return value;
    }
    // If none found, return empty array
    return [];
  }

  /**
   * GET with optional progress and completion callbacks for pagination.
   * @param {string} endpoint
   * @param {object} params
   * @param {function|null} onProgress  Called after each page with (currentItemCount)
   * @param {function|null} onComplete Called at end with (allItemsArray)
   * @returns {Promise<Array>} Combined array (also passed to onComplete, if provided)
   */
  async get(urlPath, params = {}, onProgress = null, onComplete = null) {
    let results = [];
    let urlParams = new URLSearchParams(params).toString();
    let fullUrl = `${urlPath}${urlParams ? `?${urlParams}` : ""}`;

    while (fullUrl) {
      const response = await this.#fetchWithRetry(fullUrl, { method: "GET" });
      const data = await response.json();

      const items = data?.items;

      if (! items) {
        results = results.concat(data);
        fullUrl = null;
        break;
      } 

      results = results.concat(items);

      if (typeof onProgress === "function") {
        try {
          onProgress(results.length);
        } catch (e) {
          // Ignore callback errors
        }
      }

      const linkHeader = response.headers.get("Link");
      const nextLink = this.#extractNextLink(linkHeader);
      fullUrl = nextLink || null;
    }

    if (typeof onComplete === "function") {
      try {
        onComplete(results);
      } catch (e) {
        // Ignore callback errors
      }
    }

    return results;
  }

  async post(url, data = {}) {
    const response = await this.#fetchWithRetry(url, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async put(url, data = {}) {
    const response = await this.#fetchWithRetry(url, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async delete(url) {
    const response = await this.#fetchWithRetry(url, { method: "DELETE" });
    return response.json();
  }

  // Get user details
  // async getMe() {
  //   return this.get("/people/me");
  // }

  async getMe() {
    return this.get(this.#apiBaseUrl + "/identity/scim/v2/Users/me");
  }

  async getOrg(orgId) {
    const result = await this.get(this.#baseUrlPlusVersion + "/identity/organizations/" + orgId);
    return result?.[0]
  }

  // List Locations
  async listLocations(params = {}, onProgress = null, onComplete = null) {
    return this.get(this.#baseUrlPlusVersion + "/locations", params, onProgress, onComplete);
  }

  // List Workspaces
  async listWorkspaces(params = {}, onProgress = null, onComplete = null) {
    return this.get(this.#baseUrlPlusVersion + "/workspaces", params, onProgress, onComplete);
  }

  // Create Workspace
  async createWorkspace(workspaceName) {
    if(!workspaceName) return null
    console.log('Creating Workspace:', workspaceName)
    return this.post(this.#baseUrlPlusVersion + "/workspaces", {displayName: workspaceName});
  }

  // Create Activation Code
  async createActivationCode(workspaceId) {
    return this.get(this.#baseUrlPlusVersion + "/rooms", params);
  }

  /**
   * Validates Access Token meets required scopes
   * @returns {Promise<boolean>}
   */
  async validateToken() {

    console.log('Validating Token')
    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.#accessToken}`,
      },
    };
    console.log('options', options)

    const response = await fetch(
      "https://idbroker.webex.com/idb/oauth2/v1/tokens/me?authtoken=true",
      options
    );
    console.log('Response:', response.status)
    if (response.status !== 200) {
      
      return false;
    }

    return true

    if (this.#type == "Peronsal") {
      console.log('Personal Token')
      this.#validToken = true;
      return true;
    }

    if (!this.#scopes && !this.#clientId) {
      console.log('Missing Scopes or ClientId')
      this.#validToken = true;
      return true;
    }

    const result = await response.json();
    const data = result?.data;

    console.log('data',data)

    const validToken = data.some(
      (auth) =>
        auth["client_id"] == this.#clientId &&
        this.#scopes.every((scope) => auth["oauth2scope"].includes(scope))
    );

    this.#validToken = validToken;

    return validToken;
  }

  async logout() {
    const options = {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.#accessToken}`,
      },
    };

    const response = await fetch(
      "https://idbroker.webex.com/idb/oauth2/v1/tokens/me?authtoken=true",
      options
    );

    return response;
  }
}
