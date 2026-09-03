# RazorGuard AI — Backend Service (Phase 2)

This directory contains the Python backend application, FastAPI endpoints, detection logic, evidence engine, network graph builder, and SQLite persistence store for RazorGuard AI.

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run test suite
python -m pytest tests

# 3. Run interactive demo
python run_demo.py

# 4. Start local development server
uvicorn app.main:app --reload
```

Interactive OpenAPI docs: `http://127.0.0.1:8000/docs`
