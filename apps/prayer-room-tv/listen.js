(function () {
  "use strict";
  function el(id) {
    return document.getElementById(id);
  }
  var screen = el("view-listen"),
    player = el("player"),
    audio = el("recitation");
  if (!screen || !el("stage-arabic") || !el("record-duration")) return;
  var artist = {
    arabic: "أحمد النفيس",
    title: "Ahmad Al Nufais",
    credit: "Qur’an recitation",
    art: "mushaf-gold",
    position: "63% 53%",
  };
  var editions = {
    "Al-Kahf": {
      arabic: "سورة الكهف",
      art: "mushaf-sunlight",
      position: "57% 54%",
      number: "18",
    },
    "Al-Baqarah": {
      arabic: "سورة البقرة",
      art: "mihrab",
      position: "53% 44%",
      number: "2",
    },
    "Ya-Sin": {
      arabic: "سورة يس",
      art: "mushaf-gold",
      position: "49% 55%",
      number: "36",
    },
    "Al-Mulk": {
      arabic: "سورة الملك",
      art: "madinah-blue",
      position: "49% 59%",
      number: "67",
    },
  };
  var devotions = {
    morning: {
      arabic: "أذكار الصباح",
      title: "Morning adhkar",
      art: "prayer-window",
      position: "54% 53%",
    },
    evening: {
      arabic: "أذكار المساء",
      title: "Evening adhkar",
      art: "madinah-blue",
      position: "82% 48%",
    },
    ruqyah: {
      arabic: "الرُّقية الشرعية",
      title: "Ruqyah",
      art: "mushaf-sunlight",
      position: "44% 69%",
    },
  };
  function setArt(node, entry) {
    node.style.setProperty(
      "--record-photo",
      'url("art/' + entry.art + '.webp")',
    );
    node.style.setProperty("--record-position", entry.position);
  }
  var current = artist,
    sceneIndex = 0,
    scenes = screen.querySelectorAll(".artist-scene i");
  setArt(scenes[0], artist);
  function focusEntry(entry) {
    if (current === entry) return;
    current = entry;
    var previous = scenes[sceneIndex];
    sceneIndex = 1 - sceneIndex;
    setArt(scenes[sceneIndex], entry);
    scenes[sceneIndex].classList.add("is-visible");
    previous.classList.remove("is-visible");
    el("stage-arabic").textContent = entry.arabic;
    el("stage-english").textContent = entry.title;
    el("stage-detail").textContent = entry.credit || "Ahmad Al Nufais";
  }
  function attachFocus(button, entry) {
    button.addEventListener("focus", function () {
      focusEntry(entry);
    });
    button.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "mouse") focusEntry(entry);
    });
  }
  Array.prototype.forEach.call(
    el("library").querySelectorAll(".tile"),
    function (button) {
      var english = button.querySelector(".english"),
        entry = editions[english.textContent];
      if (!entry) return;
      entry.title = english.textContent;
      var jacket = document.createElement("span");
      jacket.className = "listen-sleeve";
      setArt(jacket, entry);
      jacket.appendChild(button.querySelector(".arabic"));
      var number = button.querySelector(".surah-number");
      if (!number) {
        number = document.createElement("span");
        number.className = "surah-number";
        number.textContent = "Surah " + entry.number;
      }
      var caption = document.createElement("span");
      caption.className = "library-caption";
      caption.appendChild(english);
      caption.appendChild(number);
      button.appendChild(jacket);
      button.appendChild(caption);
      attachFocus(button, entry);
    },
  );
  Object.keys(devotions).forEach(function (key) {
    var button = el(key),
      entry = devotions[key];
    setArt(button, entry);
    attachFocus(button, entry);
  });
  el("nav-listen").addEventListener("focus", function () {
    focusEntry(artist);
  });
  var lastTrack = "";
  function updateTrack() {
    var title = el("track-title").textContent,
      entry = editions[title];
    if (!entry || lastTrack === title) return;
    lastTrack = title;
    setArt(player, entry);
    el("record-arabic").textContent = entry.arabic;
    el("record-number").textContent = "Surah " + entry.number;
  }
  new MutationObserver(updateTrack).observe(el("track-title"), {
    childList: true,
    characterData: true,
    subtree: true,
  });
  function durationText(value) {
    if (!isFinite(value) || value <= 0) return "—";
    return (
      Math.floor(value / 60) + ":" + ("0" + Math.floor(value % 60)).slice(-2)
    );
  }
  function syncDuration() {
    el("record-duration").textContent = durationText(audio.duration);
    var ready = isFinite(audio.duration) && audio.duration > 0;
    el("seek-back").disabled = !ready;
    el("seek-forward").disabled = !ready;
  }
  function move(seconds) {
    if (isFinite(audio.duration) && audio.duration > 0)
      audio.currentTime = Math.max(
        0,
        Math.min(audio.duration, audio.currentTime + seconds),
      );
  }
  el("seek-back").onclick = function () {
    move(-15);
  };
  el("seek-forward").onclick = function () {
    move(15);
  };
  audio.addEventListener("durationchange", syncDuration);
  audio.addEventListener("emptied", syncDuration);
  syncDuration();
})();
