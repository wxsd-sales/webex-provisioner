class Navigation {
  constructor() {
    // Find all modal elements with data-state attribute
    this.modals = Array.from(
      document.querySelectorAll(".modal-container[data-state]")
    );

    // Find all navigation buttons with data-state attribute
    this.navButtons = Array.from(
      document.querySelectorAll(".navigation")
    );

    this.logoutButton = document.getElementById("logoutButton");
    this.avatarImage = document.getElementById("avatarImage");
    this.avatarInitials = document.getElementById("avatarInitials");
    this.nameOrg = document.getElementById("nameOrg");

  
    // Build state list and mapping from data-state attributes
    this.states = {};
    this.stateToModal = {};

    this.baseStates = ['login', 'loading', 'selectOption', 'uploadFile','review', 'runJob']




    this.modals.forEach((modal) => {
      const state = modal.getAttribute("data-state");
      this.states[state] = state; // e.g., { login: 'login', ... }
      this.stateToModal[state] = modal;
    });

    console.log("Discovered states:", this.states);

    // Iterate over each button and add a click event listener
    this.navButtons.forEach((button) => {

      const nav = this;
      button.addEventListener("click", function () {
        // Get the filename from the 'data-filename' attribute of the clicked button
        const option = button.getAttribute("data-option");
        const direction = button.getAttribute("data-direction");

        console.log('Nav Button Clicked', option, direction)

        if (option) {
          nav.selectOption(option);
          return;
        }

        if(direction){
          nav.moveState(direction);
          return
        }

        
      });
    });

    // Default to first discovered state, or 'login'
    this.currentState = this.baseStates[0];
    this.selectedOption = null;
    this.combinedState = this.currentState + (this.selectedOption ?? '');
    this.uploadedFile = null;

    console.log("Current state:", this.currentState);

    this._updateModalVisibility();
  }

  login() {
    this._setState("selectedOption");
    this._removeAvatar();
  }

  logout() {
    console.log('Setting UI to login')
    this._setState("login");
  }

  setOption(option){
    this.selectOption(option);
  }


  workflowOptions() {
    this._setState("workflowOptions");
  }

  selectOption(option) {
    this.selectedOption = option;
    console.log("Current State:", this.currentState);
    const currentStateIndex = this.baseStates.indexOf(this.currentState);
    const nextState = this.baseStates[currentStateIndex + 1];
    console.log("Selected option:", option, "-CurrentStateIndex:", currentStateIndex, "- Next state:", nextState)
    this._setState(this.baseStates[currentStateIndex + 1]);
  }

  moveState(direction){
    console.log("Moving state in direction:", direction);
    console.log("Current state:", this.currentState);
    const currentStateIndex = this.baseStates.indexOf(this.currentState);
    console.log("Current State Index:", currentStateIndex)
    if(direction == 'next' && currentStateIndex < this.baseStates.length - 1 ){
      this._setState(this.baseStates[currentStateIndex + 1]);
    } else if( direction == 'back' && currentStateIndex > 0){
      this._setState(this.baseStates[currentStateIndex - 1]);
    }
  }

  uploadFile(file) {
    if (!this.selectedOption) {
      alert("Select an option first!");
      return;
    }
    this.uploadedFile = file;
    this._setState("uploadFile");
  }

  runJob() {
    if (!this.uploadedFile) {
      alert("Upload a file first!");
      return;
    }
    this._setState("runJob");
  }

  reset() {
    this.selectedOption = null;
    this.uploadedFile = null;
    this._setState("login");
  }

  setAvatar({thumbnail, initials}){
    if(thumbnail){
      console.log('Setting Thumbnail:', thumbnail)
      this.avatarImage.src = thumbnail;
    } else {
      console.log('Setting Innitials:', initials)

      this.avatarInitials.innerHTML = initials;
    }
  }


  _removeAvatar(){
    this.avatarImage.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    this.avatarInitials.innerHTML = "";
  }



  // Set state only if it exists in the discovered states
  _setState(state) {
    if(state == 'selectOption') this.selectedOption = null;
    
    const newState = this.selectedOption ? this.selectedOption + state : state;


    if ( this.baseStates.includes(state) ) {
      this.currentState = state;
      this.combinedState = newState;
      this._updateModalVisibility();
    } else {
      //console.warn(`State "${state}" not found among discovered states.`);
    }

    if(this.currentState == 'login'){

      this.logoutButton.classList.add("hidden");
       this.avatarInitials.classList.add("hidden");
       this.avatarImage.classList.add("hidden");
       this.avatarInitials.classList.add("hidden");
       this.nameOrg.classList.add("hidden");

    } else {

      this.logoutButton.classList.remove("hidden");
      this.nameOrg.classList.remove("hidden");

      if(this.avatarInitials.innerHTML == ""){
        console.log('Showing ')
        this.avatarInitials.classList.add("hidden");
        this.avatarImage.classList.remove("hidden");
      } else {
        this.avatarInitials.classList.remove("hidden");
        this.avatarImage.classList.add("hidden");
      }

      
    }
  }

  _updateModalVisibility() {
    //console.log("Updating modal visibility for state:", this.combinedState);
    Object.entries(this.stateToModal).forEach(([state, modal]) => {
      if( state == this.combinedState ){
        //console.log('Showing Modal:', state )
        modal.classList.remove("hidden");
      } else {
        //console.log('Hidding Modal:', state )
        modal.classList.add("hidden");
       
      }
    });
  }
}
