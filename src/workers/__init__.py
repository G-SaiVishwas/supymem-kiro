"""
Background Workers

These workers consume events from Redis Streams and process them asynchronously.
This provides durability (messages survive restarts) and scalability (add more workers).

Workers:
- change_processor: Processes Git events (commits, PRs, etc.)
- notification_worker: Sends notifications via Slack, etc.
- task_monitor: Monitors task completion conditions
"""

from src.workers.change_processor import ChangeProcessorWorker
from src.workers.notification_worker import NotificationWorker
from src.workers.task_monitor import TaskMonitorWorker

__all__ = [
    "ChangeProcessorWorker",
    "NotificationWorker", 
    "TaskMonitorWorker"
]

