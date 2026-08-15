import asyncio
from typing import Awaitable, Iterable, Any

async def run_concurrently(tasks: Iterable[Awaitable[Any]]):
    return await asyncio.gather(*tasks, return_exceptions=True)

def run(coro):
    return asyncio.run(coro)
