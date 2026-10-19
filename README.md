# suryascience.org

Personal site of Bibhuti Kumar Jha. Plain HTML, CSS and JavaScript with no build step, hosted on GitHub Pages.
Pages read JSON files from `data/`; small Python scripts in `tools/` refresh those files.

## Pages

| Page | File | Tabs |
| --- | --- | --- |
| Home | `index.html` | At a Glance (Solar Cycle 25 sunspots and AFT polar fields), My Updates |
| Research | `research.html` | Overview, Projects, Publications, Talks |
| About Me | `about.html` | Bio, Journey, Honours, Mentoring, Contact |
| Data and Tools | `data.html` | Datasets, Software, Notebooks and Tutorials, Visualizations |
| Photography | `photography.html` | Solar and Sky, Eclipses, Landscapes and Travel, Gear and Notes |

Every tab has its own link, e.g. `research.html#publications`. The old `aboutme.html`, `publications.html`
and `articles.html` redirect to the new pages.

Live parts load in the visitor's browser: today's Sun from NASA SDO, and the sunspot record and
Cycle 25 forecast from NOAA SWPC.

## Preview locally

```sh
python3 -m http.server 8000     # then open http://localhost:8000
```

## Refresh the data (Python, managed with uv)

Run from the site root. The first run creates `tools/.venv` automatically.

```sh
# Publications from NASA ADS (token: https://ui.adsabs.harvard.edu/user/settings/token)
export ADS_API_TOKEN=...
uv run --project tools tools/update_publications.py

# AFT polar fields for the Cycle 25 plot on Home (SwRI's file can't be read by browsers directly)
uv run --project tools tools/update_aft_polar.py

# Photo gallery: resize photos in photos/<album>/ and list them in data/gallery.json
uv run --project tools tools/update_gallery.py
```

Settings for all three (ADS query, AFT source, albums) are in `tools/config.toml`.

## Files you edit by hand

| File | What it holds |
| --- | --- |
| `data/profile.json` | Email, office address, profile links (ORCID, Scholar, LinkedIn), CV PDF path. Empty links are hidden. |
| `data/summaries.json` | Plain-language summary per paper, keyed by ADS bibcode. The ADS script lists papers that still need one. |
| `data/updates.json` | My Updates on Home: papers, talks, press, software. |
| `data/talks.json` | Talks. |
| `data/mentoring.json` | Mentoring tab: name, mentorship, current position. |
| `data/tools.json` | Datasets, software and notebooks. |
| `photos/captions.toml` | Photo titles, places, dates and the Photo of the Month. |

The Photo of the Month section on Home stays hidden until `photos/captions.toml` names one.
