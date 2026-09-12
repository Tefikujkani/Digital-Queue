from __future__ import annotations

from fastapi import HTTPException


def api_error(status: int, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail=message)
