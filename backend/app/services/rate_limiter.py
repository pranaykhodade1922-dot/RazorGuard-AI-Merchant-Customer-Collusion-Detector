import time
from typing import Dict, List
from fastapi import Request, HTTPException, status

class SimpleRateLimiter:
    """
    Lightweight sliding-window rate limiter for sensitive endpoints.
    """
    def __init__(self, max_requests: int = 30, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests_history: Dict[str, List[float]] = {}

    def check_rate_limit(self, client_ip: str, endpoint: str):
        now = time.time()
        key = f"{client_ip}:{endpoint}"
        
        if key not in self.requests_history:
            self.requests_history[key] = []

        # Retain timestamps within the sliding window
        window_start = now - self.window_seconds
        self.requests_history[key] = [t for t in self.requests_history[key] if t > window_start]

        if len(self.requests_history[key]) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={"error": "RATE_LIMIT_EXCEEDED", "message": f"Too many requests to {endpoint}. Please wait {self.window_seconds} seconds."}
            )

        self.requests_history[key].append(now)

# Global rate limit instances
detection_rate_limiter = SimpleRateLimiter(max_requests=20, window_seconds=60)
ml_rate_limiter = SimpleRateLimiter(max_requests=60, window_seconds=60)
