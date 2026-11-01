"use client";

import { HeartHandshake, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const fullFilm = "/media/videos/hbic-welcome-story.mp4?v=20261101-original";
const teaserFilm = "/media/videos/hbic-welcome-story-teaser.mp4?v=20261101-original";
const poster = "/media/videos/hbic-welcome-story-poster.jpg?v=20261101-original";

export function WelcomeFilm() {
  const [isWatching, setIsWatching] = useState(false);
  const [playbackMessage, setPlaybackMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    let inView = !("IntersectionObserver" in window);
    const updatePreview = () => {
      if (!inView || reducedMotion.matches || connection?.saveData || document.hidden || isWatching) preview.pause();
      else void preview.play().catch(() => undefined);
    };
    const observer = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting);
      updatePreview();
    }, { threshold: 0.05 }) : undefined;
    observer?.observe(preview);
    updatePreview();
    reducedMotion.addEventListener("change", updatePreview);
    document.addEventListener("visibilitychange", updatePreview);
    return () => {
      preview.pause();
      observer?.disconnect();
      reducedMotion.removeEventListener("change", updatePreview);
      document.removeEventListener("visibilitychange", updatePreview);
    };
  }, [isWatching]);

  const playFullFilm = () => {
    previewRef.current?.pause();
    setPlaybackMessage("");
    setIsWatching(true);
    // Keep play() inside the user gesture, including on Safari/iOS.
    void videoRef.current?.play().catch(() => {
      setPlaybackMessage("Select Play in the video controls to start the film with sound.");
    });
  };

  return (
    <section className="section welcome-film-section" aria-labelledby="welcome-film-title">
      <div className="welcome-film-copy">
        <span className="eyebrow">WELCOME TO HBIC</span>
        <h2 id="welcome-film-title">Built by community. Created for generations.</h2>
        <p>
          Discover the journey of Hazrat Bilal Islamic Centre, a growing home for worship,
          learning, youth and community in Calgary.
        </p>
        <div className="actions">
          <button className="button primary button-native" type="button" onClick={playFullFilm}>
            <Play size={19} strokeWidth={2.6} aria-hidden="true" />
            Watch Our Story
          </button>
          <a className="button secondary" href="/donate">
            <HeartHandshake size={19} strokeWidth={2.4} aria-hidden="true" />
            Support the Masjid
          </a>
        </div>
      </div>

      <div className={`welcome-cinema-card${isWatching ? " is-playing" : ""}`}>
        <div className="welcome-video-shell">
            <video
              ref={videoRef}
              className="welcome-video"
              style={isWatching ? undefined : { display: "none" }}
              src={fullFilm}
              poster={poster}
              controls
              playsInline
              preload="none"
              onPlaying={() => setPlaybackMessage("")}
              onError={() => setPlaybackMessage("The film could not load. Try the direct video link below.")}
              aria-label="Welcome to Hazrat Bilal Islamic Centre community film"
            />
          {!isWatching ? (
            <>
              <video
                ref={previewRef}
                className="welcome-video"
                src={teaserFilm}
                poster={poster}
                muted
                loop
                playsInline
                preload="none"
                aria-hidden="true"
              />
              <button
                className="welcome-play-overlay"
                type="button"
                onClick={playFullFilm}
                aria-label="Watch the full Hazrat Bilal Islamic Centre story film"
              >
                <span className="welcome-play-icon"><Play size={30} fill="currentColor" aria-hidden="true" /></span>
                <span>Watch Our Story</span>
              </button>
            </>
          ) : null}
        </div>
        {playbackMessage ? (
          <p className="welcome-film-status" role="status">
            {playbackMessage} <a href={fullFilm}>Open the film directly</a>.
          </p>
        ) : null}
        <div className="welcome-film-meta" aria-hidden="true">
          <span>3:27 community film</span>
          <span>Worship · Learning · Youth · Community</span>
        </div>
      </div>
    </section>
  );
}
