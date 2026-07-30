# Backend

## Tech Stack
- Framework: Django Ninja (Python)
- Package Manager: uv
- Linter/Formatter: Ruff
- Testing: pytest + playwright (for e2e)

## Commands
- Initialize/Install dependencies: `uv sync`
- Run development server: `uv run python manage.py runserver`
- Run Ruff linter: `uv run ruff check .`
- Run Ruff formatter: `uv run ruff format .`
- Run unit tests: `uv run pytest ../../tests/unit/`
- Run integration tests: `uv run pytest ../../tests/integration/`
- Run e2e tests: `uv run pytest ../../tests/e2e/`
