# Adding media mentions (news videos, articles)

Media mentions connect what a news video or article says to records in the graph. In the viewer they appear in the **★ Media mentions** filter and in a collapsed **Mentioned in media** section on each node's panel, with a link to the exact moment in the video.

A mention is always shown as a **claim made by the source**, never as a finding of this project or of the register.

## Two ways to contribute

- **Just send the link.** Open an [issue](../../../issues/new) with the video or article URL (and, if you can, the minutes where register names come up). Maintainers will add it.
- **Add it yourself** with the steps below. Using an AI coding agent (for example Claude Code or a similar tool) for steps 2–4 usually gives better results: it can read a long transcript in one go, compare caption spellings with the register (captions often misspell names), write the JSON and run the checks. Review its output before opening a pull request: every summary must be a fair paraphrase of what the source says, and every timestamp must point to the right moment.

## Overview

1. Get a transcript of the video (or the text of the article).
2. Find the moments that name brands, companies or people from the register.
3. Write one JSON file per source.
4. Rebuild the graph and check what matched.
5. Look at it in the viewer, then publish.

## 1. Get a transcript

Requirements: [yt-dlp](https://github.com/yt-dlp/yt-dlp) and Python 3.11+.

List the available captions:

```sh
yt-dlp --skip-download --list-subs "https://www.youtube.com/watch?v=VIDEO_ID"
```

Download the automatic captions in the video's own language (`-orig` is the original track, the other one may be a machine translation). Use the language code of the video: `de`, `en`, `nl`, `tr` …

```sh
cd web/public/data/highlights
yt-dlp --skip-download --write-auto-subs --write-subs \
  --sub-langs "de-orig,de" --sub-format json3 \
  -o "VIDEO_ID.%(ext)s" "https://www.youtube.com/watch?v=VIDEO_ID"
```

Turn the caption file into a readable transcript with a timestamp every 30 seconds:

```sh
python ../scraper/tools/transcript.py VIDEO_ID.de-orig.json3 youtube-VIDEO_ID.transcript.txt
```

The output looks like this:

```text
[14:08] … Platin Casino, eines der größten deutschen illegalen Casinos …
[14:39] …
```

Title, channel, date and length for the source block:

```sh
yt-dlp --skip-download --print "%(title)s | %(channel)s | %(upload_date)s | %(duration_string)s" \
  "https://www.youtube.com/watch?v=VIDEO_ID"
```

### If the video is blocked in your country

Some videos are not available in some countries ("not available on this country domain due to a legal complaint from the government"). yt-dlp then fails with that message. Run the same commands from a network where the video is available. Searching works the same way:

```sh
yt-dlp --flat-playlist --print "%(id)s | %(channel)s | %(title)s" "ytsearch20:casino secrets"
```

Automatic captions mishear names. Check every name against the register before using it (step 4).

## 2. Pick the moments

Read the transcript and note each moment where the source names something that can be in the register:

- **brands / domains**: `artemisbet`, `platincasino` (the part before the dot)
- **companies**: `Dama N.V.`, `Coinbar N.V.`
- **people**: as the register spells them, if possible

Search the viewer (or `web/public/data/graph.json`) for each one. The register spelling often differs from the captions, for example "Redline" in the captions is `Red Lane B.V.` in the register.

## 3. Write the highlight file

One file per source in the [`web/public/data/highlights/`](../web/public/data/highlights) folder, named `youtube-VIDEO_ID.json` (or `article-SHORTNAME.json`). Keep the transcript next to it as `youtube-VIDEO_ID.transcript.txt`.

```json
{
  "source": {
    "id": "youtube-VIDEO_ID",
    "kind": "video",
    "title": "Title of the video",
    "publisher": "Channel or outlet",
    "url": "https://www.youtube.com/watch?v=VIDEO_ID",
    "published": "2026-09-22",
    "language": "de",
    "note": "One or two sentences about the source. Summaries below paraphrase what it says; they are claims by the source, not findings of this project."
  },
  "mentions": [
    {
      "time": "14:08",
      "claim": "Platin Casino is described as closely linked to SoftSwiss; SoftSwiss says the operator is independent.",
      "domains": ["platincasino"],
      "companies": ["Dama"],
      "people": ["Name As In The Register"],
      "other": ["Names the source mentions that are not in the register"],
      "note": "Optional: e.g. 'Captions say \"Redline\"; the register company is Red Lane B.V.'"
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `time` | `MM:SS` or `H:MM:SS`. For YouTube links the viewer opens the video at this moment. Leave it out for articles. |
| `claim` | One or two neutral sentences in English: what the source says. Write "The video says…", not "X did…". Include the other side's answer when the source gives one. |
| `domains` | Brand names. `artemisbet` matches `artemisbet.com`, `artemisbet123.net`, … in company domains and foreign licences. |
| `companies` | Company names; the start of the register name is enough (`Dama` matches `Dama N.V.`). |
| `people` | Person names; order and accents do not matter (`Yazıcı Şeref` matches `Seref Yazici`). |
| `other` | Names that are not in the register (owners abroad, authorities, brands of other registers). Shown as "not found". |
| `note` | Optional remark, e.g. which spelling the register uses. |

You may list both the caption spelling and the register spelling; the one that is not found is shown as such.

### Rules

- Paraphrase; do not copy long quotes. Keep each claim short and neutral.
- Do not add accusations the source does not make.
- If the source names a person only by initials, do not write their full name in the file; link the company instead.
- Every claim needs a timestamp (videos) or a link to the passage (articles).

## 4. Rebuild and check

Build the graph; it reads `web/public/data/highlights/` by default (`--highlights PATH` uses another folder):

```sh
cd scraper
curacao-scraper build
cd ..
python scraper/tools/check_highlights.py
```

`check_highlights.py` prints, for every mention, what matched and which names were not found:

```text
== Casinos Secrets: Wer casht ab mit illegalen Casinos? (youtube-QIU0oeGzVJ0)
  [14:08] matched: Latiform B.V., Dama N.V.
  [24:25] matched: Red Lane B.V., Kartal Ugur
           not found: Redline
```

Fix spellings in the file and build again until every name that is in the register matches.

Then refresh the layout and open the viewer:

```sh
cd web
pnpm run layout
pnpm run dev            # open http://localhost:5173/?mentions=1
```

Check that the claim, the timestamp link and the matched nodes are right.

## 5. Publish

Commit the files in `web/public/data/highlights/` together with the rebuilt `web/public/data/` (run `build` and `pnpm run layout` first). The GitHub Pages workflow deploys the committed data as it is (`.github/workflows/pages.yml`). To try files without publishing them, keep them in another folder and build with `--highlights PATH`.

Commit the highlight file and its transcript together, with a message such as `feat(highlights): add mentions from <source title>`.
