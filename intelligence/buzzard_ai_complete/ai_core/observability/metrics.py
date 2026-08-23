from __future__ import annotations

import threading
from typing import Any


class _Counter:
    def __init__(self, name: str, labels: tuple[str, ...] = ()) -> None:
        self.name = name
        self.labels = labels
        self._values: dict[tuple[tuple[str, str], ...], float] = {}
        self._lock = threading.Lock()

    def inc(self, amount: float = 1.0, **label_values: str) -> None:
        key = tuple(sorted(label_values.items()))
        with self._lock:
            self._values[key] = self._values.get(key, 0.0) + amount

    def get(self, **label_values: str) -> float:
        key = tuple(sorted(label_values.items()))
        with self._lock:
            return self._values.get(key, 0.0)

    def collect(self) -> list[dict[str, Any]]:
        with self._lock:
            return [
                {"name": self.name, "labels": dict(key), "value": value}
                for key, value in self._values.items()
            ]


class MetricsRegistry:
  def __init__(self) -> None:
    self._counters: dict[str, _Counter] = {}
    self._lock = threading.Lock()

  def counter(self, name: str, labels: tuple[str, ...] = ()) -> _Counter:
    with self._lock:
      if name not in self._counters:
        self._counters[name] = _Counter(name, labels)
      return self._counters[name]

  def collect_all(self) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    with self._lock:
      for counter in self._counters.values():
        items.extend(counter.collect())
    return items

  def to_prometheus(self) -> str:
    lines: list[str] = []
    for item in self.collect_all():
      label_str = ""
      if item["labels"]:
        pairs = ",".join(f'{k}="{v}"' for k, v in item["labels"].items())
        label_str = f"{{{pairs}}}"
      lines.append(f'{item["name"]}{label_str} {item["value"]}')
    return "\n".join(lines) + ("\n" if lines else "")


_metrics = MetricsRegistry()


def get_metrics_registry() -> MetricsRegistry:
  return _metrics


def reset_metrics_for_tests() -> None:
  global _metrics
  _metrics = MetricsRegistry()
