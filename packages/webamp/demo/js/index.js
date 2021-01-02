/* global SENTRY_DSN */

import * as Sentry from "@sentry/browser";
import ReactDOM from "react-dom";
import isButterchurnSupported from "butterchurn/lib/isSupported.min";
import { getWebampConfig } from "./webampConfig";

import {
  WebampLazy,
  DISABLE_MARQUEE,
  TOGGLE_REPEAT,
  TOGGLE_SHUFFLE,
  SET_EQ_AUTO,
  SET_DUMMY_VIZ_DATA,
} from "./Webamp";

import { disableMarquee, skinUrl as configSkinUrl } from "./config";
import DemoDesktop from "./DemoDesktop";
import enableMediaSession from "./mediaSession";

const DEFAULT_DOCUMENT_TITLE = document.title;

let screenshot = false;
let skinUrl = configSkinUrl;
if ("URLSearchParams" in window) {
  const params = new URLSearchParams(location.search);
  screenshot = params.get("screenshot");
  skinUrl = params.get("skinUrl") || skinUrl;
}

function supressDragAndDrop(e) {
  e.preventDefault();
  e.dataTransfer.effectAllowed = "none";
  e.dataTransfer.dropEffect = "none";
}

window.addEventListener("dragenter", supressDragAndDrop);
window.addEventListener("dragover", supressDragAndDrop);
window.addEventListener("drop", supressDragAndDrop);

try {
  Sentry.init({
    dsn: SENTRY_DSN,
    /* global COMMITHASH */
    release: typeof COMMITHASH !== "undefined" ? COMMITHASH : "DEV",
  });
} catch (e) {
  // Archive.org tries to rewrite the DSN to point to a archive.org version
  // since it looks like a URL. When this happens, Sentry crashes.
  console.error(e);
}

async function main() {
  const about = document.getElementsByClassName("about")[0];
  if (screenshot) {
    about.style.visibility = "hidden";
  }
  if (!WebampLazy.browserIsSupported()) {
    document.getElementById("browser-compatibility").style.display = "block";
    document.getElementById("app").style.visibility = "hidden";
    return;
  }
  about.classList.add("loaded");

  if (isButterchurnSupported()) {
    document.getElementById("butterchurn-share").style.display = "flex";
  }

  const webamp = new WebampLazy(getWebampConfig(screenshot, skinUrl));

  if (disableMarquee || screenshot) {
    webamp.store.dispatch({ type: DISABLE_MARQUEE });
  }
  if (screenshot) {
    window.document.body.style.backgroundColor = "#000";
    webamp.store.dispatch({ type: TOGGLE_REPEAT });
    webamp.store.dispatch({ type: TOGGLE_SHUFFLE });
    webamp.store.dispatch({ type: SET_EQ_AUTO, value: true });
    webamp.store.dispatch({
      type: SET_DUMMY_VIZ_DATA,
      data: {
        0: 11.75,
        8: 11.0625,
        16: 8.5,
        24: 7.3125,
        32: 6.75,
        40: 6.4375,
        48: 6.25,
        56: 5.875,
        64: 5.625,
        72: 5.25,
        80: 5.125,
        88: 4.875,
        96: 4.8125,
        104: 4.375,
        112: 3.625,
        120: 1.5625,
      },
    });
  }

  webamp.onTrackDidChange((track) => {
    document.title =
      track == null
        ? DEFAULT_DOCUMENT_TITLE
        : `${track.metaData.title} - ${track.metaData.artist} \u00B7 ${DEFAULT_DOCUMENT_TITLE}`;
  });

  enableMediaSession(webamp);

  // Expose a file input in the DOM for testing.
  const fileInput = document.createElement("input");
  fileInput.id = "webamp-file-input";
  fileInput.style.display = "none";
  fileInput.type = "file";
  fileInput.value = null;
  fileInput.addEventListener("change", (e) => {
    const firstFile = e.target.files[0];
    if (firstFile == null) {
      return;
    }
    const url = URL.createObjectURL(firstFile);
    webamp.setSkinFromUrl(url);
  });
  document.body.appendChild(fileInput);

  // Expose webamp instance for debugging and integration tests.
  window.__webamp = webamp;

  await webamp.renderWhenReady(document.getElementById("app"));

  if (!screenshot) {
    ReactDOM.render(
      <DemoDesktop webamp={webamp} />,
      document.getElementById("demo-desktop")
    );
  }
}

main();
