# My English Studio

Personal IELTS learning workspace for reading, vocabulary, and speaking practice.

## Two modes

- **GitHub Pages**: publishes the static learning interface. It uses the built-in sample articles when the local Obsidian service is unavailable.
- **Local mode**: run `./start.sh` to scan the Obsidian vault, watch Markdown changes, and save speaking reviews back to the vault.

## Local mode

```bash
./start.sh
```

Then open <http://127.0.0.1:4174/>.

## GitHub Pages

The repository includes a GitHub Actions workflow in `.github/workflows/pages.yml`. After pushing the repository, enable Pages in the repository settings and select **GitHub Actions** as the source.

GitHub Pages cannot access a local Obsidian vault. Keep using local mode when you need live vault sync.

## Publish Obsidian study notes

The public site loads exported study notes from `data/articles.json`. Clipping source files and speaking-review text are not included.

```bash
./publish.sh
```

This exports the current study notes, commits the generated data, and pushes `main` so GitHub Pages redeploys.
