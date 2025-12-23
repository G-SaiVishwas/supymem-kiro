import json
import time
from typing import Any, Optional, List, Dict
from dataclasses import dataclass

import redis.asyncio as redis

from src.config.settings import get_settings
from src.config.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


# ============================================================================
# STREAM CONSTANTS
# ============================================================================

# Stream names
STREAM_GIT_EVENTS = "supymem:stream:git_events"
STREAM_NOTIFICATIONS = "supymem:stream:notifications"
STREAM_TASK_EVENTS = "supymem:stream:task_events"

# Consumer groups
GROUP_CHANGE_PROCESSOR = "change_processor"
GROUP_NOTIFICATION_WORKER = "notification_worker"
GROUP_TASK_MONITOR = "task_monitor"


@dataclass
class StreamMessage:
    """Represents a message from a Redis Stream."""
    message_id: str
    stream: str
    data: Dict[str, Any]
    
    @property
    def event_type(self) -> str:
        return self.data.get("event_type", "unknown")
    
    @property
    def payload(self) -> Dict[str, Any]:
        return self.data.get("payload", {})


class RedisClient:
    def __init__(self):
        self.client: Optional[redis.Redis] = None

    async def connect(self):
        """Connect to Redis."""
        self.client = redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
        # Test connection
        await self.client.ping()
        logger.info("Connected to Redis")

    async def disconnect(self):
        """Disconnect from Redis."""
        if self.client:
            await self.client.close()
            logger.info("Disconnected from Redis")

    async def get(self, key: str) -> Optional[Any]:
        """Get a value from cache."""
        if not self.client:
            return None
        value = await self.client.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return None

    async def set(
        self,
        key: str,
        value: Any,
        expire: Optional[int] = None
    ) -> bool:
        """Set a value in cache with optional TTL (seconds)."""
        if not self.client:
            return False
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        await self.client.set(key, value, ex=expire)
        return True

    async def delete(self, key: str) -> bool:
        """Delete a key from cache."""
        if not self.client:
            return False
        await self.client.delete(key)
        return True

    async def exists(self, key: str) -> bool:
        """Check if a key exists."""
        if not self.client:
            return False
        return await self.client.exists(key) > 0

    async def increment(self, key: str, amount: int = 1) -> int:
        """Increment a counter."""
        if not self.client:
            return 0
        return await self.client.incrby(key, amount)

    async def lpush(self, key: str, *values: Any) -> int:
        """Push values to the left of a list."""
        if not self.client:
            return 0
        serialized = [json.dumps(v) if isinstance(v, (dict, list)) else v for v in values]
        return await self.client.lpush(key, *serialized)

    async def rpop(self, key: str) -> Optional[Any]:
        """Pop a value from the right of a list."""
        if not self.client:
            return None
        value = await self.client.rpop(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return None

    async def lrange(self, key: str, start: int = 0, end: int = -1) -> list:
        """Get a range of values from a list."""
        if not self.client:
            return []
        values = await self.client.lrange(key, start, end)
        result = []
        for v in values:
            try:
                result.append(json.loads(v))
            except json.JSONDecodeError:
                result.append(v)
        return result

    async def publish(self, channel: str, message: Any) -> int:
        """Publish a message to a channel."""
        if not self.client:
            return 0
        if isinstance(message, (dict, list)):
            message = json.dumps(message)
        return await self.client.publish(channel, message)

    async def set_hash(self, name: str, mapping: dict) -> bool:
        """Set multiple hash fields."""
        if not self.client:
            return False
        serialized = {k: json.dumps(v) if isinstance(v, (dict, list)) else v for k, v in mapping.items()}
        await self.client.hset(name, mapping=serialized)
        return True

    async def get_hash(self, name: str) -> dict:
        """Get all hash fields."""
        if not self.client:
            return {}
        result = await self.client.hgetall(name)
        deserialized = {}
        for k, v in result.items():
            try:
                deserialized[k] = json.loads(v)
            except json.JSONDecodeError:
                deserialized[k] = v
        return deserialized

    # ========================================================================
    # REDIS STREAMS OPERATIONS
    # ========================================================================

    async def stream_add(
        self,
        stream: str,
        event_type: str,
        payload: Dict[str, Any],
        maxlen: int = 10000
    ) -> str:
        """
        Add a message to a Redis Stream.
        
        Args:
            stream: Stream name
            event_type: Type of event (e.g., 'push', 'pr_merged')
            payload: Event data
            maxlen: Maximum stream length (oldest messages trimmed)
            
        Returns:
            Message ID assigned by Redis
        """
        if not self.client:
            raise RuntimeError("Redis client not connected")
        
        message = {
            "event_type": event_type,
            "payload": json.dumps(payload),
            "timestamp": str(int(time.time() * 1000))
        }
        
        message_id = await self.client.xadd(
            stream,
            message,
            maxlen=maxlen
        )
        
        logger.debug(
            "Stream message added",
            stream=stream,
            event_type=event_type,
            message_id=message_id
        )
        
        return message_id

    async def stream_create_group(
        self,
        stream: str,
        group: str,
        start_id: str = "0"
    ) -> bool:
        """
        Create a consumer group for a stream.
        
        Args:
            stream: Stream name
            group: Consumer group name
            start_id: Where to start reading ("0" = beginning, "$" = new only)
            
        Returns:
            True if created, False if already exists
        """
        if not self.client:
            return False
        
        try:
            await self.client.xgroup_create(
                stream,
                group,
                id=start_id,
                mkstream=True  # Create stream if doesn't exist
            )
            logger.info(
                "Consumer group created",
                stream=stream,
                group=group
            )
            return True
        except redis.ResponseError as e:
            if "BUSYGROUP" in str(e):
                # Group already exists
                return False
            raise

    async def stream_read(
        self,
        stream: str,
        group: str,
        consumer: str,
        count: int = 10,
        block: int = 5000
    ) -> List[StreamMessage]:
        """
        Read messages from a stream as a consumer in a group.
        
        Uses XREADGROUP for exactly-once processing with acknowledgment.
        
        Args:
            stream: Stream name
            group: Consumer group name
            consumer: Consumer name (unique per worker instance)
            count: Max messages to read
            block: Block timeout in milliseconds (0 = no block)
            
        Returns:
            List of StreamMessage objects
        """
        if not self.client:
            return []
        
        try:
            # Read pending messages first, then new ones
            result = await self.client.xreadgroup(
                groupname=group,
                consumername=consumer,
                streams={stream: ">"},  # ">" = only new messages
                count=count,
                block=block
            )
            
            if not result:
                return []
            
            messages = []
            for stream_name, stream_messages in result:
                for message_id, data in stream_messages:
                    # Deserialize payload
                    parsed_data = {}
                    for k, v in data.items():
                        if k == "payload":
                            try:
                                parsed_data[k] = json.loads(v)
                            except json.JSONDecodeError:
                                parsed_data[k] = v
                        else:
                            parsed_data[k] = v
                    
                    messages.append(StreamMessage(
                        message_id=message_id,
                        stream=stream_name,
                        data=parsed_data
                    ))
            
            return messages
            
        except redis.ResponseError as e:
            if "NOGROUP" in str(e):
                # Group doesn't exist, create it
                await self.stream_create_group(stream, group)
                return []
            raise

    async def stream_ack(
        self,
        stream: str,
        group: str,
        message_id: str
    ) -> bool:
        """
        Acknowledge a message as processed.
        
        Must be called after successfully processing a message.
        
        Args:
            stream: Stream name
            group: Consumer group name
            message_id: Message ID to acknowledge
            
        Returns:
            True if acknowledged
        """
        if not self.client:
            return False
        
        result = await self.client.xack(stream, group, message_id)
        return result > 0

    async def stream_claim_pending(
        self,
        stream: str,
        group: str,
        consumer: str,
        min_idle_time: int = 60000,
        count: int = 10
    ) -> List[StreamMessage]:
        """
        Claim pending messages that have been idle too long.
        
        Use this to recover messages from crashed consumers.
        
        Args:
            stream: Stream name
            group: Consumer group name
            consumer: Consumer claiming the messages
            min_idle_time: Minimum idle time in ms before claiming
            count: Max messages to claim
            
        Returns:
            List of claimed StreamMessage objects
        """
        if not self.client:
            return []
        
        try:
            # Get pending messages info
            pending = await self.client.xpending_range(
                stream,
                group,
                min="-",
                max="+",
                count=count
            )
            
            if not pending:
                return []
            
            # Filter by idle time and claim
            message_ids = [
                p["message_id"] 
                for p in pending 
                if p["time_since_delivered"] >= min_idle_time
            ]
            
            if not message_ids:
                return []
            
            # Claim the messages
            result = await self.client.xclaim(
                stream,
                group,
                consumer,
                min_idle_time,
                message_ids
            )
            
            messages = []
            for message_id, data in result:
                parsed_data = {}
                for k, v in data.items():
                    if k == "payload":
                        try:
                            parsed_data[k] = json.loads(v)
                        except json.JSONDecodeError:
                            parsed_data[k] = v
                    else:
                        parsed_data[k] = v
                
                messages.append(StreamMessage(
                    message_id=message_id,
                    stream=stream,
                    data=parsed_data
                ))
            
            if messages:
                logger.info(
                    "Claimed pending messages",
                    stream=stream,
                    count=len(messages)
                )
            
            return messages
            
        except redis.ResponseError:
            return []

    async def stream_info(self, stream: str) -> Dict[str, Any]:
        """Get stream information."""
        if not self.client:
            return {}
        
        try:
            info = await self.client.xinfo_stream(stream)
            return {
                "length": info.get("length", 0),
                "first_entry": info.get("first-entry"),
                "last_entry": info.get("last-entry"),
                "groups": info.get("groups", 0)
            }
        except redis.ResponseError:
            return {}

    async def stream_group_info(
        self,
        stream: str
    ) -> List[Dict[str, Any]]:
        """Get consumer group information."""
        if not self.client:
            return []
        
        try:
            groups = await self.client.xinfo_groups(stream)
            return [
                {
                    "name": g.get("name"),
                    "consumers": g.get("consumers", 0),
                    "pending": g.get("pending", 0),
                    "last_delivered_id": g.get("last-delivered-id")
                }
                for g in groups
            ]
        except redis.ResponseError:
            return []


# Singleton instance
cache = RedisClient()


# ============================================================================
# CONVENIENCE FUNCTIONS FOR PUBLISHING EVENTS
# ============================================================================

async def publish_git_event(
    event_type: str,
    org: str,
    repo: str,
    payload: Dict[str, Any]
) -> str:
    """
    Publish a Git event to the stream.
    
    Args:
        event_type: Type of event (push, pull_request, etc.)
        org: Organization/owner name
        repo: Repository name
        payload: Full event payload
        
    Returns:
        Message ID
    """
    full_payload = {
        "org": org,
        "repo": repo,
        "event_id": payload.get("event_id"),
        **payload
    }
    
    return await cache.stream_add(
        stream=STREAM_GIT_EVENTS,
        event_type=event_type,
        payload=full_payload
    )


async def publish_notification(
    notification_type: str,
    recipient_id: str,
    payload: Dict[str, Any]
) -> str:
    """
    Publish a notification event to the stream.
    
    Args:
        notification_type: Type of notification
        recipient_id: User ID or email to notify
        payload: Notification data
        
    Returns:
        Message ID
    """
    full_payload = {
        "recipient_id": recipient_id,
        **payload
    }
    
    return await cache.stream_add(
        stream=STREAM_NOTIFICATIONS,
        event_type=notification_type,
        payload=full_payload
    )


async def publish_task_event(
    event_type: str,
    team_id: str,
    payload: Dict[str, Any]
) -> str:
    """
    Publish a task event to the stream.
    
    Args:
        event_type: Type of event (task_created, task_completed, etc.)
        team_id: Team ID
        payload: Task event data
        
    Returns:
        Message ID
    """
    full_payload = {
        "team_id": team_id,
        **payload
    }
    
    return await cache.stream_add(
        stream=STREAM_TASK_EVENTS,
        event_type=event_type,
        payload=full_payload
    )
