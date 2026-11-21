export function youtubeVideoId(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0] || null;
    if (url.hostname.endsWith("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const match = url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/);
      return match?.[1] || null;
    }
  } catch { return null; }
  return null;
}