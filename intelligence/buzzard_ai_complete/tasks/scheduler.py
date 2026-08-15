import asyncio
from dataclasses import dataclass
from typing import Callable, Awaitable

@dataclass
class ScheduledTask:
    name: str
    interval_seconds: int
    handler: Callable[[], Awaitable[None]]

async def run_forever(task: ScheduledTask):
    while True:
        await task.handler()
        await asyncio.sleep(task.interval_seconds)
