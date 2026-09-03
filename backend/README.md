# RazorGuard AI — Backend Service (Phase 3)

This directory contains the Python backend application, FastAPI endpoints, Phase 1 overlap detector, Phase 2 evidence & case management engine, Phase 3 network intelligence engine, and SQLite persistence store.

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run automated test suite (22 unit tests)
python -m pytest tests

# 3. Run interactive demo
python run_demo.py

# 4. Start local development server
uvicorn app.main:app --reload
```

Interactive OpenAPI documentation: `http://127.0.0.1:8000/docs`
