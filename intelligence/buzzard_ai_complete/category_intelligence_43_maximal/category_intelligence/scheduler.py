class CategoryMonitoringScheduler:
    """
    Provider-neutral scheduler. Frequency is configurable by source/category.
    Production scheduling can be backed by Celery, a queue, Kubernetes CronJobs,
    or another worker system.
    """
    def __init__(self, registry):
        self.registry = registry
        self.jobs = {}

    def configure(self, category_id, interval_minutes, sources):
        self.jobs[category_id] = {
            "interval_minutes": int(interval_minutes),
            "sources": sources,
            "enabled": True
        }

    def snapshot(self):
        return self.jobs
