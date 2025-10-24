class Action {
  element;
  actionText;
  actionIcon;
  actionNoteList;
  title;
  nav;

  /**
   * Adds Action to review or job screen
   * @param {String} title action text
   * @param {String = 'loading' | 'error' | 'warning' | 'success' "} [icon = 'loading'] - icon
   */
  constructor(title, icon, nav) {
    console.log('Creating Action:', title)
    this.nav = nav;
    this.title = title;
    const allowedIcons = ["loading", "error", "warning", "success"];
    icon = icon ?? allowedIcons.includes(icon) ? icon : "loading" ?? "loading";
    this.element = document.createElement("div");
    this.element.classList.add("actionItem");
    this.actionText = document.createElement("span");
    this.actionText.innerHTML = title;
    this.actionText.classList.add("actionText");
    this.actionIcon = document.createElement("span");
    this.actionIcon.classList.add(icon);
    this.actionNoteList = document.createElement("ul");
    this.actionNoteList.classList.add("actionNotes");
    this.actionLeft = document.createElement("div");

    this.actionLeft.classList.add("actionLeft");
    this.actionLeft.appendChild(this.actionText);
    this.actionLeft.appendChild(this.actionNoteList);

    this.element.appendChild(this.actionLeft);
    this.element.appendChild(this.actionIcon);
  }

  appendText(text) {
    console.log('Action:', this.title,' - Appending Text:', text)
    const items = Array.isArray(text) ? text : [text];

    items.forEach((item) => {
      this.actionNoteList.appendChild(document.createElement("li")).innerHTML =
        item;
    });

    return this;
  }

  setText(text) {
    console.log('Action:', this.title,' - Setting Text:', text)
    while (this.actionNoteList.firstChild) {
      this.actionNoteList.removeChild(this.actionNoteList.firstChild);
    }

    return this.appendText(text);
  }

  _setIcon(icon){
    console.log('Action:', this.title,' - Setting Icon:', icon)
    this.actionIcon.className = icon;
    return this;
  }

  success() {
    return this._setIcon("success");
  }

  spinner() {
    return this._setIcon("spinner");
  }

  error() {
    return this._setIcon("error");
  }

  warning() {
    return this._setIcon("warning");
  }

  loading() {
    return this._setIcon("loading");
  }

  remove() {
    this.nav.removeAction(this);
    //this.nav.actions = this.nav.actions.filter((action) => action == this);

    this.element.remove();
  }
}
