"""Small helpers for YouTube URLs and workout timecodes."""

import re
from urllib.parse import parse_qs, urlparse

VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


def parse_youtube_url(raw_url: str) -> tuple[str, str]:
    """Validate a YouTube URL and return ``(canonical_url, video_id)``.

    Supports watch, youtu.be, shorts, embed, live and mobile links. Raises
    ``ValueError`` when the URL is not a recognizable YouTube video.
    """
    url = raw_url.strip()
    parsed = urlparse(url if "://" in url else f"https://{url}")
    host = (parsed.hostname or "").lower().removeprefix("www.").removeprefix("m.")

    video_id: str | None = None

    if host == "youtu.be":
        video_id = parsed.path.strip("/").split("/")[0]
    elif host in {"youtube.com", "youtube-nocookie.com"}:
        if parsed.path == "/watch":
            video_id = parse_qs(parsed.query).get("v", [None])[0]
        elif parsed.path.startswith(("/shorts/", "/embed/", "/live/", "/v/")):
            video_id = parsed.path.strip("/").split("/")[1]

    if not video_id or not VIDEO_ID_RE.match(video_id):
        raise ValueError("Enter a valid YouTube video URL")

    return f"https://www.youtube.com/watch?v={video_id}", video_id


def format_timestamp(seconds: int) -> str:
    """Format seconds as ``MM:SS`` or ``H:MM:SS`` for display."""
    seconds = max(0, int(seconds))
    hours, remainder = divmod(seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"
