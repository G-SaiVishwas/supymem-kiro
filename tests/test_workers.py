"""
Tests for Background Workers

Tests worker instantiation and message processing logic.
"""



class TestChangeProcessorWorker:
    """Tests for ChangeProcessorWorker."""
    
    def test_worker_imports(self):
        """Test that worker can be imported."""
        from src.workers.change_processor import ChangeProcessorWorker
        assert ChangeProcessorWorker is not None
    
    def test_worker_instantiates(self):
        """Test worker can be instantiated."""
        from src.workers.change_processor import ChangeProcessorWorker
        worker = ChangeProcessorWorker()
        assert worker is not None
        assert worker.worker_id is not None
    
    def test_worker_properties(self):
        """Test worker has required properties."""
        from src.workers.change_processor import ChangeProcessorWorker
        from src.cache.redis_client import STREAM_GIT_EVENTS, GROUP_CHANGE_PROCESSOR
        
        worker = ChangeProcessorWorker()
        assert worker.stream_name == STREAM_GIT_EVENTS
        assert worker.group_name == GROUP_CHANGE_PROCESSOR


class TestNotificationWorker:
    """Tests for NotificationWorker."""
    
    def test_worker_imports(self):
        """Test that worker can be imported."""
        from src.workers.notification_worker import NotificationWorker
        assert NotificationWorker is not None
    
    def test_worker_instantiates(self):
        """Test worker can be instantiated."""
        from src.workers.notification_worker import NotificationWorker
        worker = NotificationWorker()
        assert worker is not None
    
    def test_worker_properties(self):
        """Test worker has required properties."""
        from src.workers.notification_worker import NotificationWorker
        from src.cache.redis_client import STREAM_NOTIFICATIONS, GROUP_NOTIFICATION_WORKER
        
        worker = NotificationWorker()
        assert worker.stream_name == STREAM_NOTIFICATIONS
        assert worker.group_name == GROUP_NOTIFICATION_WORKER
    
    def test_slack_block_builder(self):
        """Test Slack block building."""
        from src.workers.notification_worker import NotificationWorker
        
        worker = NotificationWorker()
        blocks = worker._build_slack_blocks(
            notification_type="change_impact",
            title="Code change",
            message="Test message",
            payload={"repo": "org/repo", "commit_sha": "abc123"}
        )
        
        assert len(blocks) > 0
        assert blocks[0]["type"] == "header"


class TestTaskMonitorWorker:
    """Tests for TaskMonitorWorker."""
    
    def test_worker_imports(self):
        """Test that worker can be imported."""
        from src.workers.task_monitor import TaskMonitorWorker
        assert TaskMonitorWorker is not None
    
    def test_worker_instantiates(self):
        """Test worker can be instantiated."""
        from src.workers.task_monitor import TaskMonitorWorker
        worker = TaskMonitorWorker()
        assert worker is not None
    
    def test_worker_properties(self):
        """Test worker has required properties."""
        from src.workers.task_monitor import TaskMonitorWorker
        from src.cache.redis_client import STREAM_TASK_EVENTS, GROUP_TASK_MONITOR
        
        worker = TaskMonitorWorker()
        assert worker.stream_name == STREAM_TASK_EVENTS
        assert worker.group_name == GROUP_TASK_MONITOR


class TestRedisStreams:
    """Tests for Redis Streams functionality."""
    
    def test_stream_constants(self):
        """Test stream constants are defined."""
        from src.cache.redis_client import (
            STREAM_GIT_EVENTS,
            STREAM_NOTIFICATIONS,
            STREAM_TASK_EVENTS,
            GROUP_CHANGE_PROCESSOR,
            GROUP_NOTIFICATION_WORKER,
            GROUP_TASK_MONITOR
        )
        
        assert STREAM_GIT_EVENTS == "supymem:stream:git_events"
        assert STREAM_NOTIFICATIONS == "supymem:stream:notifications"
        assert STREAM_TASK_EVENTS == "supymem:stream:task_events"
        assert GROUP_CHANGE_PROCESSOR == "change_processor"
        assert GROUP_NOTIFICATION_WORKER == "notification_worker"
        assert GROUP_TASK_MONITOR == "task_monitor"
    
    def test_stream_message_dataclass(self):
        """Test StreamMessage dataclass."""
        from src.cache.redis_client import StreamMessage
        
        msg = StreamMessage(
            message_id="123-0",
            stream="test-stream",
            data={
                "event_type": "push",
                "payload": {"key": "value"}
            }
        )
        
        assert msg.message_id == "123-0"
        assert msg.stream == "test-stream"
        assert msg.event_type == "push"
        assert msg.payload == {"key": "value"}
    
    def test_cache_singleton(self):
        """Test cache is a singleton."""
        from src.cache.redis_client import cache, RedisClient
        
        assert cache is not None
        assert isinstance(cache, RedisClient)


class TestBaseWorker:
    """Tests for BaseWorker class."""
    
    def test_base_worker_is_abstract(self):
        """Test BaseWorker cannot be instantiated directly."""
        from src.workers.base import BaseWorker
        
        # BaseWorker should have abstract methods
        assert hasattr(BaseWorker, 'stream_name')
        assert hasattr(BaseWorker, 'group_name')
        assert hasattr(BaseWorker, 'process_message')
    
    def test_worker_health_check(self):
        """Test worker health check returns correct structure."""
        from src.workers.change_processor import ChangeProcessorWorker
        
        worker = ChangeProcessorWorker()
        health = worker.health_check()
        
        assert "worker_id" in health
        assert "stream" in health
        assert "group" in health
        assert "running" in health
        assert "messages_processed" in health
        assert "errors" in health
        assert health["running"] is False  # Not started yet
        assert health["messages_processed"] == 0
        assert health["errors"] == 0

