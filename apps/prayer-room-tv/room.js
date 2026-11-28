(function () {
  "use strict";

  var byId = function (id) {
    return document.getElementById(id);
  };
  var zone = "America/Edmonton";
  var endpoint = "https://hbic.ca/api/display";
  var adhanSource =
    "https://hbic.ca/audio/adhan_madinah_marwan_qassas_short.mp3";
  var reciters = [
    {
      id: "saud-shuraim",
      title: "Sheikh Saud Al-Shuraim",
      arabic: "الشيخ سعود الشريم",
      art: "shuraim-makkah",
      position: "61% 53%",
      homeCover: "art/shuraim-makkah.webp",
      page: "https://www.mp3quran.net/ar/shur",
      audioRoot: "https://cdn.mp3quran.net/audio/saud-shuraim/r1/",
    },
    {
      id: "ahmad-nufais",
      title: "Ahmad Al Nufais",
      arabic: "أحمد النفيس",
      art: "mushaf-gold",
      position: "63% 53%",
      homeCover: "mushaf-stand.webp",
      page: "https://www.mp3quran.net/ar/nufais",
      audioRoot: "https://cdn.mp3quran.net/audio/ahmad-nufais/r1/",
    },
  ];
  var savedReciter = store("prayer-room-reciter");
  var artist = reciters.find(function (reciter) { return reciter.id === savedReciter; }) || reciters[0];

  var tracks = [
    { arabic: "سورة الكهف", name: "Al-Kahf", path: "018.mp3" },
    { arabic: "سورة البقرة", name: "Al-Baqarah", path: "002.mp3" },
    { arabic: "سورة يس", name: "Ya-Sin", path: "036.mp3" },
    { arabic: "سورة الملك", name: "Al-Mulk", path: "067.mp3" },
  ];

  var broadcaster = "https://aloula.sba.sa/live/";
  var broadcastSource = "https://cdn-globecast.akamaized.net/live/eds/";
  var videos = {
    makkah: {
      title: "Makkah · المسجد الحرام",
      page: broadcaster + "quran",
      channel: "UCos52azQNBgW63_9uDJoPDA",
      stream: broadcastSource + "saudi_quran/hls_roku/index.m3u8",
    },
    madinah: {
      title: "Madinah · المسجد النبوي",
      page: broadcaster + "sunna",
      channel: "UCROKYPep-UuODNwyipe6JMw",
      stream: broadcastSource + "saudi_sunnah/hls_roku/index.m3u8",
    },
    morning: { title: "Morning adhkar", id: "fD4uDIoCn3M" },
    evening: { title: "Evening adhkar", id: "rQnNno3Do60" },
    ruqyah: { title: "Ruqyah", id: "BVtCjMyJ320", external: true },
    series: { title: "Alfba’iyyat · Episode 5", id: "MUItSDvgKo0" },
  };
  var reminders = [
    "تقبّل الله منكم صالح الأعمال",
    "جعل الله أوقاتكم عامرةً بذكره",
    "رزقكم الله السكينة والطمأنينة",
  ];

  var prayerArabic = {
    fajr: "الفجر",
    dhuhr: "الظهر",
    asr: "العصر",
    maghrib: "المغرب",
    isha: "العشاء",
  };
  var sections = ["home", "listen", "apps"];
  var activeView = "home";
  function setView(view) {
    activeView = view;
    document.body.dataset.view = view;
    sections.forEach(function (section) {
      byId("view-" + section).hidden = section !== view;
      var tab = byId("nav-" + section);
      if (section === view) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    byId("nav-" + view).focus();
    window.scrollTo(0, 0);
  }
  sections.forEach(function (view) {
    byId("nav-" + view).onclick = function () {
      setView(view);
    };
  });
  byId("home-listen").onclick = function () {
    setView("listen");
  };
  var contrastButton = byId("contrast");
  function setContrast(reduced) {
    document.documentElement.classList.toggle("solid", reduced);
    contrastButton.setAttribute("aria-pressed", String(reduced));
  }
  setContrast(store("prayer-room-reduced-glass") === "yes");
  contrastButton.onclick = function () {
    var reduced = this.getAttribute("aria-pressed") !== "true";
    store("prayer-room-reduced-glass", reduced ? "yes" : "no");
    setContrast(reduced);
  };

  var snapshot,
    connected = false,
    refreshing = false,
    clockKey = "",
    scheduleKey = "";
  var recitation = byId("recitation"),
    adhan = byId("adhan");
  var settings = byId("options"),
    player = byId("player"),
    watch = byId("watch-player");
  var videoHost = byId("video-host"),
    broadcastButton = byId("broadcast-play");
  var streamPlayer,
    streamVideo,
    streamTimeout,
    watchRequest = 0,
    hlsPromise;
  var selectedTrack,
    pendingPosition = 0,
    lastSavedPosition = -1;
  var trackRequest = 0;
  var trackArtist = artist;
  var trackButtons = {};
  var armed = false,
    lastEvent = "",
    lastTick = Date.now(),
    enableRequest = 0;
  var previousFocus, previousFocusFallback;
  var gregorian, time, wallDate, publishedOffset, clockMinute, scheduleRetry;

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (_) {
      /* Private browser storage is optional. */
    }
    return null;
  }
  function write(id, value) {
    byId(id).textContent = value;
  }

  try {
    wallDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    gregorian = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    time = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch (_) {
    /* The API schedule remains usable without a local analog clock. */
  }

  for (var i = 0; i < 12; i++) {
    var mark = document.createElement("span");
    mark.className = i % 3 === 0 ? "tick major" : "tick";
    mark.style.transform = "rotate(" + i * 30 + "deg)";
    byId("analog").insertBefore(mark, byId("hour-hand"));
  }

  function offsetFromSchedule(s) {
    var date = s.scheduleDate || s.serviceDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    var offsets = s.prayers.map(function (prayer) {
      var match = /^(\d{1,2}):(\d{2}) (AM|PM)$/i.exec(prayer.adhan);
      if (!match) return null;
      var hour =
        (Number(match[1]) % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0);
      var wall =
        Date.parse(date + "T00:00:00Z") +
        (hour * 60 + Number(match[2])) * 60000;
      return wall - Date.parse(prayer.adhanDate);
    });
    // Alberta's published offset also works on TVs with older timezone data.
    return (offsets[0] === -21600000 || offsets[0] === -25200000) &&
      offsets.every(function (offset) {
        return offset === offsets[0];
      })
      ? offsets[0]
      : null;
  }

  var previousDial;
  function setDialHands(hour, minute, now) {
    var position = hour * 60 + minute;
    var epochMinute = Math.floor(now.getTime() / 60000);
    var consecutive = previousDial && epochMinute === previousDial.epoch + 1 &&
      (previousDial.position + 1) % 720 === position;
    // Keep the direction at 11:59. Resume and timezone corrections snap directly.
    var phase = consecutive ? previousDial.phase + 1 : position;
    byId("analog").classList.toggle("dial-advancing", Boolean(consecutive));
    byId("hour-hand").style.transform = "rotate(" + phase / 2 + "deg)";
    byId("minute-hand").style.transform = "rotate(" + phase * 6 + "deg)";
    previousDial = { position: position, phase: phase, epoch: epochMinute };
  }

  function clock(now) {
    var supplied =
      publishedOffset != null &&
      snapshot &&
      Date.parse(snapshot.expiresAt) > now;
    var minuteToken =
      Math.floor(now.getTime() / 60000) +
      ":" +
      (supplied ? publishedOffset : zone);
    if (minuteToken === clockMinute) return;
    clockMinute = minuteToken;
    var wall = supplied ? new Date(now.getTime() + publishedOffset) : null;
    if ((!wall || !wallDate) && !time) {
      write("clock-date", "Calgary clock unavailable");
      byId("analog").hidden = true;
      return;
    }
    var label = wall
      ? ("0" + wall.getUTCHours()).slice(-2) +
        ":" +
        ("0" + wall.getUTCMinutes()).slice(-2)
      : time.format(now);
    var dateLabel =
      wall && wallDate ? wallDate.format(wall) : gregorian.format(now);
    var key = dateLabel + " " + label,
      parts = label.match(/(\d{2}):(\d{2})/);
    if (!parts || clockKey === key) return;
    clockKey = key;
    byId("analog").hidden = false;
    var hour = Number(parts[1]) % 12,
      minute = Number(parts[2]);
    byId("analog").setAttribute("aria-label", "Calgary time " + label);
    setDialHands(hour, minute, now);
    write("clock-date", dateLabel);
    write(
      "wall-time",
      (hour || 12) + ":" + parts[2] + (Number(parts[1]) < 12 ? " AM" : " PM"),
    );
    var friday = /^Fri/i.test(dateLabel);
    var fridayPrompt = byId("friday-note");
    if (fridayPrompt) fridayPrompt.hidden = !friday;
    var day = wall
      ? wall.getUTCDate()
      : Number((dateLabel.match(/\d{1,2}/) || [0])[0]);
    write(
      "arabic-reminder",
      friday
        ? "جمعة مباركة، تقبّل الله طاعاتكم"
        : reminders[day % reminders.length],
    );
  }

  var countdownTarget = 0;

  function eventsFor(s) {
    if (!s) return [];
    var entries = s.prayers.filter(function (p) {
      return p.key !== "sunrise";
    });
    if (s.tomorrowFajrDate) {
      var tomorrow =
        s.nextPrayerDate === s.tomorrowFajrDate ? s.nextPrayerTime : null;
      if (!tomorrow && publishedOffset != null) {
        var wall = new Date(Date.parse(s.tomorrowFajrDate) + publishedOffset);
        var hour = wall.getUTCHours();
        tomorrow =
          (hour % 12 || 12) +
          ":" +
          ("0" + wall.getUTCMinutes()).slice(-2) +
          (hour < 12 ? " AM" : " PM");
      }
      entries.push({
        key: "fajr",
        name: "Fajr",
        adhanDate: s.tomorrowFajrDate,
        adhan: tomorrow || "",
        iqamah: s.tomorrowFajrIqamah || "",
        iqamahDate: s.tomorrowFajrIqamahDate,
        tomorrow: true,
      });
    }
    return entries;
  }

  function renderSchedule(now) {
    var valid = snapshot && Date.parse(snapshot.expiresAt) > now;
    var events = valid ? eventsFor(snapshot) : [];
    var next = events.find(function (prayer) {
      return (
        Date.parse(prayer.adhanDate) > now ||
        Date.parse(prayer.iqamahDate) > now
      );
    });
    var waitingForIqamah = next && Date.parse(next.adhanDate) <= now;
    var recent = events
      .filter(function (prayer) {
        return Date.parse(prayer.adhanDate) <= now;
      })
      .pop();
    countdownTarget = next
      ? Date.parse(waitingForIqamah ? next.iqamahDate : next.adhanDate)
      : 0;
    var status = valid
      ? connected && !snapshot.stale
        ? ""
        : "Saved schedule · Auto adhan paused"
      : refreshing
        ? "Loading Calgary prayer times…"
        : "Prayer times unavailable";
    var key = [
      valid ? snapshot.scheduleRevision : "",
      countdownTarget,
      status,
    ].join("|");
    if (key === scheduleKey) return;
    scheduleKey = key;
    document.body.dataset.schedule = valid ? "available" : "unavailable";
    write("schedule-status", status);
    write("next-name", next ? next.name : "Prayer times");
    write("next-ar", next ? prayerArabic[next.key] || "" : "");
    write(
      "next-label",
      waitingForIqamah
        ? "Until iqamah"
        : next && next.tomorrow
          ? "Until tomorrow’s adhan"
          : "Until adhan",
    );
    write("next-time", (next && next.adhan) || "—");
    write("next-iqamah", (next && next.iqamah) || "—");
    write("hijri-date", valid ? snapshot.hijriDate || "" : "");
    var rows = byId("prayer-rows");
    rows.textContent = "";
    (valid ? snapshot.prayers : []).forEach(function (p) {
      var row = document.createElement("li");
      if (next && next.adhanDate === p.adhanDate) row.classList.add("next");
      if (recent && recent.adhanDate === p.adhanDate) {
        row.classList.add("current");
        row.setAttribute("aria-current", "time");
      }
      var name = document.createElement("span"),
        adhanTime = document.createElement("strong");
      var iqamahTime = document.createElement("small");
      name.className = "prayer-name";
      name.textContent = p.name;
      adhanTime.textContent = p.adhan || "—";
      adhanTime.setAttribute(
        "aria-label",
        (p.key === "sunrise" ? "Sunrise " : "Adhan ") + adhanTime.textContent,
      );
      if (p.iqamah) iqamahTime.textContent = "Iqamah " + p.iqamah;
      row.appendChild(name);
      row.appendChild(adhanTime);
      row.appendChild(iqamahTime);
      rows.appendChild(row);
    });
  }

  function validSnapshot(s, now) {
    return (
      s &&
      s.availability === "available" &&
      s.timezone === zone &&
      Array.isArray(s.prayers) &&
      s.prayers.length === 6 &&
      Date.parse(s.expiresAt) > now
    );
  }

  function refresh() {
    if (refreshing) return;
    clearTimeout(scheduleRetry);
    refreshing = true;
    var request = new XMLHttpRequest();
    request.open("GET", endpoint);
    request.timeout = 10000;
    request.onloadend = function () {
      refreshing = false;
      connected = false;
      if (request.status === 200) {
        try {
          var result = JSON.parse(request.responseText).snapshot;
          if (validSnapshot(result, Date.now())) {
            snapshot = result;
            publishedOffset = offsetFromSchedule(snapshot);
            clock(new Date());
            connected = true;
            store("prayer-room-schedule", JSON.stringify(snapshot));
          }
        } catch (_) {
          /* Keep only a still-valid schedule on a network failure. */
        }
      }
      tick();
      if (
        !connected &&
        !validSnapshot(snapshot, Date.now()) &&
        !document.hidden
      ) {
        scheduleRetry = setTimeout(function () {
          if (!document.hidden && navigator.onLine !== false) refresh();
        }, 60000);
      }
    };
    request.send();
  }

  function play(media, completed, failed) {
    try {
      var result = media.play();
      if (result && typeof result.then === "function")
        result.then(completed, failed);
      else completed();
    } catch (_) {
      failed();
    }
  }

  function markArmed(value, message) {
    armed = value;
    byId("arm-adhan").setAttribute("aria-pressed", String(armed));
    write("arm-adhan", armed ? "Turn off adhan" : "Enable & preview adhan");
    write("adhan-status", message);
  }

  function checkAdhan(now) {
    var previous = lastTick;
    lastTick = now;
    if (
      !armed ||
      document.hidden ||
      !connected ||
      !snapshot ||
      snapshot.stale ||
      Date.parse(snapshot.expiresAt) <= now ||
      now - previous > 15000 ||
      now < previous
    )
      return;
    var event = eventsFor(snapshot).filter(function (p) {
      var at = Date.parse(p.adhanDate);
      return at > previous && at <= now;
    })[0];
    if (
      !event ||
      lastEvent === event.adhanDate ||
      store("prayer-room-last-adhan") === event.adhanDate
    )
      return;
    lastEvent = event.adhanDate;
    store("prayer-room-last-adhan", lastEvent);
    if (!recitation.paused) {
      recitation.pause();
      write("track-status", "Paused for adhan.");
    }
    if (!watch.hidden) {
      stopVideo();
      write(
        "watch-status",
        "Playback stopped for adhan. Select the channel again to resume.",
      );
    }
    if (adhan.readyState) adhan.currentTime = 0;
    play(
      adhan,
      function () {},
      function () {
        markArmed(false, "Playback was blocked. Enable sound again.");
      },
    );
  }

  function tick() {
    var now = Date.now();
    clock(new Date(now));
    renderSchedule(now);
    var remaining = Math.max(0, Math.ceil((countdownTarget - now) / 1000));
    var value = countdownTarget
      ? [
          Math.floor(remaining / 3600),
          Math.floor(remaining / 60) % 60,
          remaining % 60,
        ]
          .map(function (part) {
            return String(part).padStart(2, "0");
          })
          .join(":")
      : "—";
    if (byId("next-countdown").textContent !== value)
      write("next-countdown", value);
    checkAdhan(now);
  }

  function openDrawer(drawer, trigger, first, backup) {
    player.hidden = drawer !== player;
    settings.hidden = drawer !== settings;
    watch.hidden = drawer !== watch;
    byId("settings").setAttribute("aria-expanded", String(!settings.hidden));
    previousFocus = trigger;
    previousFocusFallback = backup;
    byId("scrim").hidden = false;
    first.focus();
  }
  function closeDrawer(drawer) {
    drawer.hidden = true;
    byId("scrim").hidden = true;
    byId("settings").setAttribute("aria-expanded", "false");
    if (drawer === player) {
      rememberTrack();
      trackRequest++;
      recitation.pause();
      selectedTrack = null;
      recitation.removeAttribute("src");
      recitation.load();
    }
    if (drawer === watch) stopVideo();
    var target =
      previousFocus && previousFocus.getClientRects().length
        ? previousFocus
        : previousFocusFallback;
    if (target) target.focus();
  }

  function stopVideo() {
    watchRequest++;
    clearTimeout(streamTimeout);
    if (streamPlayer) {
      streamPlayer.destroy();
      streamPlayer = null;
    }
    if (streamVideo) {
      streamVideo.pause();
      streamVideo.removeAttribute("src");
      streamVideo.load();
      streamVideo = null;
    }
    videoHost.textContent = "";
    videoHost.hidden = true;
    broadcastButton.hidden = true;
  }

  function loadHls() {
    if (!hlsPromise) {
      hlsPromise = new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.src = "hls.light.min.js";
        script.onload = function () {
          resolve(window.Hls);
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
      hlsPromise.catch(function () {
        hlsPromise = null;
      });
    }
    return hlsPromise;
  }

  function startBroadcast(source) {
    var request = watchRequest;
    var video = document.createElement("video");
    video.controls = true;
    video.playsInline = true;
    video.preload = "none";
    video.setAttribute("aria-label", source.title);
    streamVideo = video;
    videoHost.appendChild(video);
    videoHost.hidden = false;

    function error() {
      if (request !== watchRequest) return;
      stopVideo();
      write(
        "watch-status",
        "The stream couldn’t start. Open the broadcaster or try later.",
      );
    }
    function tryPlay() {
      if (request !== watchRequest) return;
      play(
        video,
        function () {},
        function () {
          if (request !== watchRequest) return;
          clearTimeout(streamTimeout);
          broadcastButton.hidden = false;
          write("watch-status", "Select Play broadcast to start.");
        },
      );
    }
    broadcastButton.onclick = tryPlay;
    video.addEventListener("error", error);
    video.addEventListener("playing", function () {
      if (request !== watchRequest) return;
      clearTimeout(streamTimeout);
      broadcastButton.hidden = true;
      if (document.activeElement === broadcastButton)
        byId("close-watch").focus();
      write("watch-status", "Live broadcast");
    });
    streamTimeout = setTimeout(error, 16000);
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = source.stream;
      tryPlay();
      return;
    }
    loadHls()
      .then(function (Hls) {
        if (request !== watchRequest) return;
        if (!Hls || !Hls.isSupported()) {
          error();
          return;
        }
        streamPlayer = new Hls({
          enableWorker: false,
          maxBufferLength: 12,
          backBufferLength: 6,
          capLevelToPlayerSize: true,
        });
        streamPlayer.on(Hls.Events.MANIFEST_PARSED, tryPlay);
        streamPlayer.on(Hls.Events.ERROR, function (_, detail) {
          if (detail.fatal) error();
        });
        streamPlayer.loadSource(source.stream);
        streamPlayer.attachMedia(video);
      })
      .catch(error);
  }

  function openWatch(key, button) {
    var source = videos[key];
    stopVideo();
    adhan.pause();
    recitation.pause();
    write("watch-channel-title", source.title);
    var youtube = source.id
      ? "https://www.youtube.com/watch?v=" + source.id
      : "https://www.youtube.com/channel/" + source.channel + "/live";
    byId("watch-primary").hidden = !source.page;
    if (source.page) byId("watch-primary").href = source.page;
    byId("watch-alternate").href = youtube;
    openDrawer(watch, button, byId("close-watch"));
    if (source.stream) {
      write("watch-status", "Connecting to the live channel…");
      startBroadcast(source);
    } else if (source.external || !/^https?:$/.test(location.protocol)) {
      write("watch-status", "Watch this recording on YouTube.");
    } else {
      var frame = document.createElement("iframe");
      frame.title = source.title;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.allowFullscreen = true;
      frame.allow = "autoplay; fullscreen; encrypted-media";
      frame.src =
        "https://www.youtube-nocookie.com/embed/" +
        source.id +
        "?autoplay=1&playsinline=1";
      videoHost.appendChild(frame);
      videoHost.hidden = false;
      write("watch-status", "Ahmad Al Nufais · YouTube");
    }
  }
  byId("close-watch").onclick = function () {
    closeDrawer(watch);
  };
  Object.keys(videos).forEach(function (key) {
    byId(key).onclick = function () {
      openWatch(key, this);
    };
  });

  // The original single-reciter release saved Nufais under the unqualified
  // keys. Continue to use those keys for his corresponding recordings only.
  function progressKey(reciter, key) {
    return "prayer-room-" + (reciter.id === "ahmad-nufais" ? "" : reciter.id + "-") + key;
  }

  function selectReciter(next, announce) {
    artist = next;
    var home = byId("home-listen");
    home.querySelector("strong").textContent = artist.title;
    home.querySelector(".channel-ar").textContent = artist.arabic;
    home.style.setProperty("--reciter-cover", 'url("' + artist.homeCover + '")');
    document.querySelector(".record-by").textContent = artist.title;
    document.querySelector(".record-reciter").textContent = artist.arabic;
    document.querySelector(".collection-footer a").href = artist.page;
    var alternate = reciters.find(function (entry) { return entry !== artist; });
    byId("change-reciter").setAttribute("aria-label", "Change reciter to " + alternate.title);
    if (announce) {
      store("prayer-room-reciter", artist.id);
      byId("reciter-status").textContent = artist.title + " selected";
    }
    showResume();
    document.dispatchEvent(new CustomEvent("prayer-room-reciter", {detail: artist}));
  }
  // The listening screen shares the same selected artist without an extra
  // catalog request, including when browser storage is unavailable.
  document.addEventListener("prayer-room-artist-ready", function () {
    document.dispatchEvent(new CustomEvent("prayer-room-reciter", {detail: artist}));
  });
  byId("change-reciter").onclick = function () {
    selectReciter(artist === reciters[0] ? reciters[1] : reciters[0], true);
  };
  function showResume() {
    var resume = byId("resume");
    var path = store(progressKey(artist, "last-track"));
    var item = tracks.find(function (track) { return track.path === path; });
    resume.hidden = !item;
    if (item) {
      resume.textContent = "Continue " + item.name;
      resume.onclick = function () {
        chooseTrack(item, this, trackButtons[item.path]);
      };
    }
  }
  function rememberTrack() {
    var position = Math.floor(recitation.currentTime);
    if (!selectedTrack || !isFinite(position) || position < 3 || recitation.ended) return;
    if (position !== lastSavedPosition) {
      store(progressKey(trackArtist, "position-" + selectedTrack.path), position);
      store(progressKey(trackArtist, "last-track"), selectedTrack.path);
      lastSavedPosition = position;
      showResume();
    }
  }
  function chooseTrack(track, trigger, backup) {
    trackArtist = artist;
    selectedTrack = track;
    pendingPosition = Number(store(progressKey(trackArtist, "position-" + track.path))) || 0;
    lastSavedPosition = -1;
    write("track-title", track.name);
    recitation.src = trackArtist.audioRoot + track.path;
    openDrawer(player, trigger, byId("toggle-play"), backup);
    startTrack();
  }
  recitation.addEventListener("loadedmetadata", function () {
    if (!selectedTrack || !recitation.currentSrc.endsWith("/" + selectedTrack.path)) return;
    if (pendingPosition > 0 && pendingPosition < recitation.duration - 2)
      recitation.currentTime = pendingPosition;
    pendingPosition = 0;
  });

  function audioState() {
    var control = byId("toggle-play");
    control.setAttribute("aria-label", recitation.paused ? "Play" : "Pause");
    control.dataset.state = recitation.paused ? "play" : "pause";
  }
  function updateProgress() {
    var duration = recitation.duration;
    var position = recitation.currentTime || 0;
    byId("progress").max = isFinite(duration) && duration > 0 ? duration : 1;
    byId("progress").value = position;
    var seconds = Math.floor(position % 60);
    var elapsed = Math.floor(position / 60) + ":" + ("0" + seconds).slice(-2);
    if (byId("elapsed").textContent !== elapsed) {
      write("elapsed", elapsed);
      if (Math.floor(position) % 10 === 0) rememberTrack();
    }
  }
  recitation.addEventListener("timeupdate", updateProgress);
  recitation.addEventListener("durationchange", updateProgress);
  recitation.addEventListener("emptied", updateProgress);
  function startTrack() {
    var request = ++trackRequest;
    adhan.pause();
    write("track-status", "Loading audio…");
    play(
      recitation,
      function () {
        if (request !== trackRequest) return;
        write("track-status", "MP3Quran");
        audioState();
      },
      function () {
        if (request !== trackRequest) return;
        write("track-status", "Audio didn’t start. Try Play again.");
        audioState();
      },
    );
  }
  recitation.addEventListener("pause", function () {
    audioState();
    rememberTrack();
  });
  recitation.addEventListener("playing", audioState);
  recitation.addEventListener("ended", function () {
    if (selectedTrack) store(progressKey(trackArtist, "position-" + selectedTrack.path), 0);
    store(progressKey(trackArtist, "last-track"), "");
    showResume();
    write("track-status", "Finished");
    audioState();
  });
  recitation.addEventListener("error", function () {
    write("track-status", "Audio is unavailable. Try again shortly.");
    audioState();
  });
  byId("toggle-play").onclick = function () {
    if (recitation.paused) startTrack();
    else recitation.pause();
  };
  byId("restart").onclick = function () {
    pendingPosition = 0;
    if (selectedTrack) store(progressKey(trackArtist, "position-" + selectedTrack.path), 0);
    if (recitation.readyState) recitation.currentTime = 0;
    startTrack();
  };
  byId("close-player").onclick = function () {
    closeDrawer(player);
  };
  byId("settings").onclick = function () {
    recitation.pause();
    openDrawer(settings, this, byId("arm-adhan"));
  };
  byId("close-settings").onclick = function () {
    closeDrawer(settings);
  };
  byId("arm-adhan").onclick = function () {
    var request = ++enableRequest;
    if (armed || !adhan.paused) {
      adhan.pause();
      markArmed(false, "Scheduled sound is off.");
      return;
    }
    if (!adhan.getAttribute("src")) adhan.src = adhanSource;
    if (adhan.readyState) adhan.currentTime = 0;
    recitation.pause();
    write("adhan-status", "Starting the preview…");
    play(
      adhan,
      function () {
        if (request === enableRequest)
          markArmed(true, "Adhan enabled while this screen is open.");
      },
      function () {
        if (request === enableRequest)
          markArmed(false, "Sound is blocked or unavailable on this device.");
      },
    );
  };
  byId("fullscreen").onclick = function () {
    var root = document.documentElement;
    var enter = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!enter) return;
    var result = enter.call(root);
    if (result && result.catch) result.catch(function () {});
  };
  if (
    !document.documentElement.requestFullscreen &&
    !document.documentElement.webkitRequestFullscreen
  )
    byId("fullscreen").hidden = true;

  tracks.forEach(function (track) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "tile";
    var arabic = document.createElement("span"),
      name = document.createElement("span");
    arabic.lang = "ar";
    arabic.dir = "rtl";
    arabic.className = "arabic";
    arabic.textContent = track.arabic;
    name.className = "english";
    name.textContent = track.name;
    var number = document.createElement("small");
    number.className = "surah-number";
    number.textContent = "Surah " + Number(track.path.slice(0, 3));
    button.appendChild(number);
    button.appendChild(arabic);
    button.appendChild(name);
    trackButtons[track.path] = button;
    button.onclick = function () {
      chooseTrack(track, button);
    };
    byId("library").appendChild(button);
  });

  selectReciter(artist, false);
  audioState();

  function moveFocus(key, area) {
    var candidates = area.querySelectorAll("button, a[href]");
    var current = document.activeElement;
    var rect = current.getBoundingClientRect();
    var x = (rect.left + rect.right) / 2,
      y = (rect.top + rect.bottom) / 2;
    var choice,
      distance = Infinity;
    for (var index = 0; index < candidates.length; index++) {
      var target = candidates[index];
      if (
        target === current ||
        target.disabled ||
        !target.getClientRects().length
      )
        continue;
      var box = target.getBoundingClientRect();
      var dx = (box.left + box.right) / 2 - x,
        dy = (box.top + box.bottom) / 2 - y;
      var horizontal = key === 37 || key === 39;
      var ahead = (horizontal ? dx : dy) * (key === 37 || key === 38 ? -1 : 1);
      var across = Math.abs(horizontal ? dy : dx);
      if (ahead < 8) continue;
      var inBeam = horizontal
        ? box.bottom > rect.top && box.top < rect.bottom
        : box.right > rect.left && box.left < rect.right;
      var score = (inBeam ? 0 : 10000) + ahead + across * 2.5;
      if (score < distance) {
        distance = score;
        choice = target;
      }
    }
    if (choice) choice.focus();
  }

  document.addEventListener("keydown", function (event) {
    var key = event.keyCode;
    var drawer = !settings.hidden
      ? settings
      : !watch.hidden
        ? watch
        : !player.hidden
          ? player
          : null;
    if ((key === 27 || key === 10009) && drawer) {
      event.preventDefault();
      closeDrawer(drawer);
    } else if ((key === 27 || key === 10009) && activeView !== "home") {
      event.preventDefault();
      setView("home");
    } else if (key === 9 && drawer) {
      var controls = Array.prototype.filter.call(
        drawer.querySelectorAll("button, a[href]"),
        function (button) {
          return !button.hidden && !button.disabled;
        },
      );
      if (controls.length) {
        var at = controls.indexOf(document.activeElement);
        event.preventDefault();
        controls[
          (at + (event.shiftKey ? -1 : 1) + controls.length) % controls.length
        ].focus();
      }
    } else if (key >= 37 && key <= 40) {
      event.preventDefault();
      if (document.activeElement === document.body) byId("makkah").focus();
      else moveFocus(key, drawer || document);
    }
  });

  try {
    var saved = JSON.parse(store("prayer-room-schedule"));
    if (validSnapshot(saved, Date.now())) {
      snapshot = saved;
      publishedOffset = offsetFromSchedule(snapshot);
    }
  } catch (_) {
    /* A corrupt cache gets replaced by the next successful request. */
  }
  refresh();
  tick();
  setInterval(function () {
    if (!document.hidden) tick();
  }, 1000);
  setInterval(function () {
    if (!document.hidden) refresh();
  }, 300000);
  window.addEventListener("offline", function () {
    connected = false;
    renderSchedule(Date.now());
  });
  window.addEventListener("online", refresh);
  document.addEventListener("visibilitychange", function () {
    lastTick = Date.now();
    if (!document.hidden) {
      refresh();
      tick();
    } else if (!watch.hidden) closeDrawer(watch);
  });
})();
