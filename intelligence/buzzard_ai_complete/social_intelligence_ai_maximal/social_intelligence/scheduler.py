class SocialMonitoringScheduler:
    """
    Provider-neutral scheduling layer. Production workers can use Celery,
    Kubernetes CronJobs, queues, or another scheduler.
    """
    def __init__(self):
        self.jobs={}

    def configure(self, platform, interval_minutes, sources, enabled=True):
        self.jobs[platform]={
            "interval_minutes":int(interval_minutes),
            "sources":sources,
            "enabled":enabled
        }

    def snapshot(self):
        return self.jobs
