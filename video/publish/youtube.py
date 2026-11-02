"""Write the YouTube title, description and tags for a video, ready to paste.

Usage: python publish/youtube.py scripts/stormdrain.json out/stormdrain/
Writes out/<name>/youtube.txt from the script's "youtube" block.
"""
import json
import sys
from pathlib import Path

script_path, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
yt = json.loads(script_path.read_text()).get("youtube")
if not yt:
    sys.exit(f"{script_path} has no \"youtube\" block (title, description, tags)")
text = f"TITLE\n{yt['title']}\n\nDESCRIPTION\n{yt['description']}\n\nTAGS\n{', '.join(yt['tags'])}\n"
out_dir.mkdir(parents=True, exist_ok=True)
(out_dir / "youtube.txt").write_text(text)
print(f"youtube.txt: {len(yt['title'])}-char title, {len(yt['tags'])} tags, {len(', '.join(yt['tags']))} chars of tags")
