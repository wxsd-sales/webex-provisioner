class Action {
  element;
  actionText;
  actionIcon;
  title;
  nav;

  /**
   * Adds Action to review or job screen
   * @param {String} title action text
   * @param {String = 'spinner' | 'error' | 'warning' | 'success' "} [icon = 'spinner'] - icon
   */
  constructor(title, icon, nav) {
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
    this.element.appendChild(this.actionText);
    this.element.appendChild(this.actionIcon);
  }

  appendText(text) {
    console.log(
      "Appending Text:",
      text,
      "Typeof:",
      typeof text,
      "Is Array:",
      Array.isArray(text)
    );
    this.actionText.innerHTML =
      this.actionText.innerHTML +
      "<br>" +
      (Array.isArray(text) ? text.join("<br>") : text);
    return this;
  }

  success() {
    this.actionIcon.className = "success";
    return this;
  }

  spinner() {
    this.actionIcon.className = "spinner";
    return this;
  }

  error() {
    this.actionIcon.className = "error";
    return this;
  }

  warning() {
    this.actionIcon.className = "warning";
    return this;
  }

  loading() {
    this.actionIcon.className = "loading";
    return this;
  }

  setText(text) {
    this.actionText.innerHTML =
      this.title + "<br>" + (Array.isArray(text) ? text.join("<br>") : text);

    return this;
  }

  remove() {
    this.nav.removeAction(this);
    //this.nav.actions = this.nav.actions.filter((action) => action == this);

    this.element.remove();
  }
}
