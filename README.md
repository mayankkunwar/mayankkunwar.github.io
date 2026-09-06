# Mayank Singh Kunwar — CV

Personal CV website for [GitHub Pages](https://pages.github.com/).

**Live URL (after setup):** `https://mayankkunwar.github.io`

## How to publish

### Option A — User site (recommended)

1. Create a new GitHub repository named **exactly**:
   ```
   mayankkunwar.github.io
   ```
   (must match your GitHub username)

2. Upload the files from this folder (`index.html` and this `README.md`) to the repository root.

3. In the repo: **Settings → Pages → Source → Deploy from a branch → `main` / root**

4. Wait 1–2 minutes. Open:
   ```
   https://mayankkunwar.github.io
   ```

### Option B — Project site

1. Create any repo, e.g. `cv` or `portfolio`
2. Push these files
3. Enable Pages on the `main` branch
4. Site will be at: `https://mayankkunwar.github.io/cv/` (or your repo name)

## Local preview

Open `index.html` in a browser, or run:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`

## Customize

- Edit contact links, experience, or skills directly in `index.html`
- Colors are controlled by CSS variables at the top of the `<style>` block
