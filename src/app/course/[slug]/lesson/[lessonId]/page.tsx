"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type YouTubePlayer = {
  getCurrentTime(): number;
  getPlayerState(): number;
  getPlaybackRate(): number;
  setPlaybackRate(rate: number): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  pauseVideo(): void;
  destroy(): void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (element: string, options: { events: { onReady: (event: { target: YouTubePlayer }) => void; onStateChange: (event: { data: number; target: YouTubePlayer }) => void } }) => YouTubePlayer;
      PlayerState: { PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function youtubePlayerUrl(sourceUrl: string) {
  const url = new URL(sourceUrl, window.location.origin);
  url.searchParams.set("enablejsapi", "1");
  url.searchParams.set("controls", "0");
  url.searchParams.set("disablekb", "1");
  url.searchParams.set("origin", window.location.origin);
  return url.toString();
}

type Lesson = {
  id: number;
  title: string;
  description: string | null;
  hasVideo: boolean;
  slideUrls: string[];
  documentUrl?: string | null;
  isPdfDocument?: boolean | null;
  estimatedReadTime: number;
};

type CourseData = {
  course: { title: string; description: string | null; category: string; price: number };
  lesson: Lesson | null;
  video: { kind: "youtube" | "file"; sourceUrl: string; title: string; durationSeconds: number } | null;
  exam: { id: number; title: string } | null;
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("The server returned an invalid response. Please refresh and try again.");
  }
}

export default function LessonPage() {
  const params = useParams<{ slug: string; lessonId: string }>();
  const slug = params.slug;
  const lessonId = Number(params.lessonId ?? 0);
  const router = useRouter();
  const [data, setData] = useState<CourseData | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [persistedSeconds, setPersistedSeconds] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [error, setError] = useState("");
  const [progressReady, setProgressReady] = useState(false);
  const isFocusedRef = useRef(false);
  const isVideoPlayingRef = useRef(false);
  const maxWatchedTimeRef = useRef(0);
  const activeSecondsSinceHeartbeatRef = useRef(0);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const htmlVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/courses/${slug}?lessonId=${encodeURIComponent(String(lessonId))}`)
      .then(async (response) => {
        const body = await readJsonResponse<Partial<CourseData> & { error?: string }>(response);
        if (!response.ok || !body.course) throw new Error(body.error || "Lesson could not be loaded.");
        setData(body as CourseData);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Lesson could not be loaded."));
  }, [slug]);

  useEffect(() => {
    if (!data?.lesson) return;
    fetch(`/api/courses/${slug}/lessons/${data.lesson.id}/progress`)
      .then(async (response) => {
        const body = await readJsonResponse<{ viewedSeconds?: number; error?: string }>(response);
        if (!response.ok) throw new Error(body.error || "Unable to load lesson progress.");
        setElapsedSeconds(Math.max(0, body.viewedSeconds || 0));
        setPersistedSeconds(Math.max(0, body.viewedSeconds || 0));
        setProgressReady(true);
      })
      .catch((progressError: unknown) => {
        setError(progressError instanceof Error ? progressError.message : "Unable to load lesson progress.");
        setProgressReady(true);
      });
  }, [data?.lesson, slug]);

  useEffect(() => {
    const updateFocus = () => {
      const focused = document.visibilityState === "visible" && document.hasFocus();
      isFocusedRef.current = focused;
      setIsFocused(focused);
      if (!focused) {
        isVideoPlayingRef.current = false;
        setIsVideoPlaying(false);
        htmlVideoRef.current?.pause();
        youtubePlayerRef.current?.pauseVideo();
      }
    };
    updateFocus();
    document.addEventListener("visibilitychange", updateFocus);
    window.addEventListener("focus", updateFocus);
    window.addEventListener("blur", updateFocus);
    return () => {
      document.removeEventListener("visibilitychange", updateFocus);
      window.removeEventListener("focus", updateFocus);
      window.removeEventListener("blur", updateFocus);
    };
  }, []);

  useEffect(() => {
    if (!data?.video || data.video.kind !== "youtube") return;
    let active = true;
    let poll: number | undefined;
    const connect = () => {
      if (!active || !window.YT?.Player) return;
      youtubePlayerRef.current = new window.YT.Player("skillduck-lesson-youtube", {
        events: {
          onReady: ({ target }) => {
            if (active) youtubePlayerRef.current = target;
          },
          onStateChange: ({ data: state, target }) => {
            const playing = Boolean(window.YT && state === window.YT.PlayerState.PLAYING && isFocusedRef.current);
            isVideoPlayingRef.current = playing;
            setIsVideoPlaying(playing);
            if (state === window.YT?.PlayerState.PLAYING && !isFocusedRef.current) target.pauseVideo();
          },
        },
      });
      poll = window.setInterval(() => {
        const player = youtubePlayerRef.current;
        if (!player || !window.YT || player.getPlayerState() !== window.YT.PlayerState.PLAYING) return;
        if (!isFocusedRef.current) {
          player.pauseVideo();
          return;
        }
        const currentTime = player.getCurrentTime();
        if (player.getPlaybackRate() !== 1) player.setPlaybackRate(1);
        if (currentTime > maxWatchedTimeRef.current + 0.75) {
          player.seekTo(maxWatchedTimeRef.current, true);
          return;
        }
        maxWatchedTimeRef.current = Math.max(maxWatchedTimeRef.current, currentTime);
      }, 250);
    };

    if (window.YT?.Player) {
      connect();
    } else {
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        connect();
      };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      active = false;
      if (poll) window.clearInterval(poll);
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = null;
      isVideoPlayingRef.current = false;
      setIsVideoPlaying(false);
    };
  }, [data?.video]);

  useEffect(() => {
    if (!data?.lesson) return;
    const timer = window.setInterval(() => {
      if (!isFocusedRef.current || (data.lesson?.hasVideo && !isVideoPlayingRef.current)) return;
      activeSecondsSinceHeartbeatRef.current += 1;
      setElapsedSeconds((current) => Math.min(current + 1, data.lesson ? data.lesson.estimatedReadTime * 2 : 1800));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [data?.lesson]);

  useEffect(() => {
    if (!data?.lesson) return;
    const saveProgress = () => {
      const deltaSeconds = Math.min(15, activeSecondsSinceHeartbeatRef.current);
      if (deltaSeconds <= 0) return;
      void fetch(`/api/courses/${slug}/lessons/${data.lesson?.id}/progress`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deltaSeconds }),
      }).then(async (response) => {
        const body = await readJsonResponse<{ viewedSeconds?: number; acceptedSeconds?: number; error?: string }>(response);
        if (!response.ok) throw new Error(body.error || "Unable to save lesson progress.");
        activeSecondsSinceHeartbeatRef.current = Math.max(0, activeSecondsSinceHeartbeatRef.current - (body.acceptedSeconds || 0));
        if (typeof body.viewedSeconds === "number") {
          setPersistedSeconds(body.viewedSeconds);
          setElapsedSeconds((current) => Math.max(current, body.viewedSeconds || 0));
        }
      }).catch((progressError: unknown) => setError(progressError instanceof Error ? progressError.message : "Unable to save lesson progress."));
    };

    const interval = window.setInterval(saveProgress, 10000);
    return () => window.clearInterval(interval);
  }, [data?.lesson, slug]);

  const targetSeconds = data?.lesson?.estimatedReadTime ?? 0;
  const requiredSeconds = Math.ceil(targetSeconds * 0.8);
  const canContinue = progressReady && requiredSeconds > 0 && persistedSeconds >= requiredSeconds;

  async function continueToExam() {
    if (!data?.lesson) {
      setError("This lesson is unavailable right now.");
      return;
    }

    const response = await fetch(`/api/courses/${slug}/watch`, { method: "POST" });
    const body = await readJsonResponse<{ error?: string; examId?: number }>(response);
    if (!response.ok) {
      setError(body.error || "You must complete the lesson before taking the exam.");
      return;
    }
    if (!body.examId) {
      setError("This course has already been completed or its assessment is unavailable.");
      return;
    }

    router.push(`/exam?examId=${body.examId}`);
  }

  if (!data || !data.lesson) {
    return <main className="course-view"><p>{error || "Loading lesson..."}</p></main>;
  }

  if (lessonId && data.lesson.id !== lessonId) {
    return <main className="course-view"><p className="login-error">This lesson does not match the selected course.</p></main>;
  }

  return (
    <main className="course-view lesson-page">
      <p className="eyebrow">LESSON</p>
      <h2>{data.lesson.title}</h2>
      {data.lesson.description ? <p className="course-lead">{data.lesson.description}</p> : null}

      <div className="lesson-status">
        <span>{elapsedSeconds}s / {requiredSeconds}s required</span>
        <span>{data.lesson.hasVideo && !isVideoPlaying ? "Play video while this tab is focused" : canContinue ? "80% complete — ready for MCQ" : isFocused ? "Viewing progress" : "Return to this focused tab to continue"}</span>
      </div>

      <div className="watch-progress">
        <span style={{ width: `${requiredSeconds ? Math.min(100, (elapsedSeconds / requiredSeconds) * 100) : 0}%` }} />
      </div>

      {!data.lesson.hasVideo && (data.lesson.isPdfDocument || data.lesson.documentUrl || data.lesson.slideUrls.length > 0) ? (
        <div className="slide-viewer">
          {data.lesson.isPdfDocument && data.lesson.documentUrl ? (
            <div className="pdf-reader">
              <iframe title={data.lesson.title} src={data.lesson.documentUrl} loading="lazy" />
            </div>
          ) : data.lesson.slideUrls.map((url, index) => (
            <div className="slide-card" key={`${url}-${index}`}>
              {url.toLowerCase().endsWith(".pdf") ? (
                <embed src={url} title={`Slide ${index + 1}`} />
              ) : /\.(png|jpe?g|webp)$/i.test(url) ? (
                <img src={url} alt={`Slide ${index + 1}`} loading="lazy" decoding="async" />
              ) : <a className="resource-link" href={url}>Download lesson file {index + 1}</a>}
            </div>
          ))}
        </div>
      ) : null}

      {data.lesson.hasVideo && data.video?.kind === "youtube" ? (
        <div className="video-frame">
          <iframe id="skillduck-lesson-youtube" title={data.video.title} src={youtubePlayerUrl(data.video.sourceUrl)} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      ) : null}
      {data.lesson.hasVideo && data.video?.kind === "file" ? (
        <div className="video-frame">
          <video
            ref={htmlVideoRef}
            preload="metadata"
            src={data.video.sourceUrl}
            title={data.video.title}
            onPlay={(event) => {
              if (!isFocusedRef.current) {
                event.currentTarget.pause();
                return;
              }
              isVideoPlayingRef.current = true;
              setIsVideoPlaying(true);
            }}
            onPause={() => { isVideoPlayingRef.current = false; setIsVideoPlaying(false); }}
            onSeeking={(event) => {
              const video = event.currentTarget;
              if (video.currentTime > maxWatchedTimeRef.current + 0.25) video.currentTime = maxWatchedTimeRef.current;
            }}
            onRateChange={(event) => { if (event.currentTarget.playbackRate !== 1) event.currentTarget.playbackRate = 1; }}
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              if (video.seeking) return;
              if (video.currentTime > maxWatchedTimeRef.current + 0.5) {
                video.currentTime = maxWatchedTimeRef.current;
                return;
              }
              if (isFocusedRef.current && isVideoPlayingRef.current) {
                maxWatchedTimeRef.current = Math.max(maxWatchedTimeRef.current, video.currentTime);
              }
            }}
          />
          <button
            type="button"
            className="course-action"
            onClick={() => {
              const video = htmlVideoRef.current;
              if (!video) return;
              if (video.paused) void video.play().catch(() => setError("The video could not start. Please try again."));
              else video.pause();
            }}
          >
            {isVideoPlaying ? "Pause lesson video" : "Play lesson video"}
          </button>
        </div>
      ) : null}

      {error ? <p className="login-error">{error}</p> : null}

      <div className="lesson-actions">
        <button type="button" className="course-action" onClick={() => router.push(`/course/${slug}`)}>Back to course</button>
        <button type="button" className="course-action" onClick={continueToExam} disabled={!canContinue}>
          {canContinue ? "Continue to MCQ test" : "Review 80% to unlock assessment"}
        </button>
      </div>
    </main>
  );
}
