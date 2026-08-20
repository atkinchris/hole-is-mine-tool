import { render } from "preact";
import "./style.css";
import { App } from "./App";

const root = document.getElementById("app");
if (!root) throw new Error("The page is missing its #app element");

render(<App />, root);
