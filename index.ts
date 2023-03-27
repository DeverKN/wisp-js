// Import stylesheets
import './style.css';
import { init } from './wisp/engine/engine';

// Write TypeScript code!
const appDiv: HTMLElement = document.getElementById('app');
appDiv.innerHTML = `<h1>TypeScript Starter</h1>`;

// class ScopedStrict extends HTMLScriptElement {
//   constructor() {
//     // Always call super first in constructor
//     super();

//     // Element functionality written in here
//     this.innerHTML = `console.log("test")`
//     console.log(this.innerHTML)
//   }
// }

// customElements.define("scoped-script", ScopedStrict, { extends: "script" });

init();
