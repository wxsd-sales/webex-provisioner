# Webex Provisioner

This is an example web app that enables an admin to bulk provision Workspaces on a Webex Org from a list of Workspace Names and other details.

[![Web App Screenshot](/screenshots/webapp.png)](https://wxsd-sales.github.io/webex-provisioner/)

## Overview

This web app lets you easily you easily sign in with a Webex Admin account via OAuth and upload a bulk CSV file to bulk create Workspaces or generate Device Activation Codes.


## Setup

### Prerequisites & Dependencies: 

- Static Web Hosting Service (Local or Server) (Optional)
- Web Browser
- Webex Admin Account


### Installation Steps:

You have several options for running the app:

#### Open Directly in Your Browser:

Fastest way to preview the web app.

Steps:

1.	Navigate to the webapp directory.

2.	Double-click index.html or open it with your preferred web browser.


#### Run on a Local Web Server:
  	
Recommended for development and testing.

Option A: Using Python (no installation required on most systems)

* For Python 3.x:

    ```
    cd webapp
    python -m http.server 8000
    ```

* For Python 2.x:

    ```
    cd webapp
	python -m SimpleHTTPServer 8000
    ```


    Open http://localhost:8000 in your browser.

  	  

Option B: Using Node.js (with http-server)

1.	Install http-server globally (if you haven't already):npm install -g http-server

2.	Start the server from the webapp directory:

    ```
    cd webapp
    http-server -p 8000
    ```

3.	Open http://localhost:8000 in your browser.


    
## Demo


*For more demos & PoCs like this, check out our [Webex Labs site](https://collabtoolbox.cisco.com/webex-labs).


## License

All contents are licensed under the MIT license. Please see [license](LICENSE) for details.


## Disclaimer

Everything included is for demo and Proof of Concept purposes only. Use of the site is solely at your own risk. This site may contain links to third party content, which we do not warrant, endorse, or assume liability for. These demos are for Cisco Webex use cases, but are not Official Cisco Webex Branded demos.


## Questions
Please contact the WXSD team at [wxsd@external.cisco.com](mailto:wxsd@external.cisco.com?subject=RepoName) for questions. Or, if you're a Cisco internal employee, reach out to us on the Webex App via our bot (globalexpert@webex.bot). In the "Engagement Type" field, choose the "API/SDK Proof of Concept Integration Development" option to make sure you reach our team. 
