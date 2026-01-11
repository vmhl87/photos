lines = open("meta").read().split('\n')

meta = {
        "title": "",
        "settings": "",
        "date": "",
        "caption": "",
        "tags": [],
        "dimensions": [1, 1],
}

import sys
import json

meta["dimensions"] = json.loads('[' + sys.argv[1] + ']')

mode = "none"

for line in lines:
    if line.startswith("title:"):
        mode = "title"
        line = line[7:]

    elif line.startswith("settings:"):
        mode = "settings"
        line = line[10:]

    elif line.startswith("date:"):
        mode = "date"
        line = line[6:]

    elif line.startswith("caption:"):
        mode = "caption"
        line = line[9:]

    elif line.startswith("tags:"):
        mode = "tags"
        line = line[6:]

    if mode != "tags":
        meta[mode] = meta[mode] + line + '\n'

    else:
        tags = line.split(' ')
        for t in tags:
            if len(t):
                meta["tags"].append(t)

meta["title"] = meta["title"].strip()
meta["settings"] = meta["settings"].strip()
meta["date"] = meta["date"].strip()
meta["caption"] = meta["caption"].strip()

import datetime

if meta["date"] in ["auto", "local", "today"]:
    meta["date"] = datetime.datetime.now().strftime("%-d %b %Y")

open("meta.json", "w").write(json.dumps(meta, indent=4))
