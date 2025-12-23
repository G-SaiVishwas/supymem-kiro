"""
Base Worker Class

Provides common functionality for all background workers:
- Redis Stream consumption
- Message acknowledgment
- Graceful shutdown
- Error handling with retries
- Health checks
"""

import asyncio
import signal
import os
from abc import ABC, abstractmethod
from typing import Optional
from datetime import datetime

from src.cache.redis_client import (
    cache, 
    StreamMessage
)
from src.config.logging import get_logger

logger = get_logger(__name__)


class BaseWorker(ABC):
    """
    Abstract base class for background workers.
    
    Subclasses must implement:
    - stream_name: The Redis stream to consume from
    - group_name: The consumer group name
    - process_message: Handler for each message
    """
    
    def __init__(self, worker_id: Optional[str] = None):
        self.worker_id = worker_id or f"{self.__class__.__name__}-{os.getpid()}"
        self._running = False
        self._shutdown_event = asyncio.Event()
        self._messages_processed = 0
        self._errors = 0
        self._started_at: Optional[datetime] = None
    
    @property
    @abstractmethod
    def stream_name(self) -> str:
        """The Redis stream to consume from."""
        pass
    
    @property
    @abstractmethod
    def group_name(self) -> str:
        """The consumer group name."""
        pass
    
    @abstractmethod
    async def process_message(self, message: StreamMessage) -> bool:
        """
        Process a single message from the stream.
        
        Args:
            message: The StreamMessage to process
            
        Returns:
            True if processed successfully, False to retry
        """
        pass
    
    async def start(self):
        """Start the worker."""
        logger.info(
            "Starting worker",
            worker_id=self.worker_id,
            stream=self.stream_name,
            group=self.group_name
        )
        
        # Connect to Redis
        await cache.connect()
        
        # Create consumer group if needed
        await cache.stream_create_group(
            stream=self.stream_name,
            group=self.group_name
        )
        
        self._running = True
        self._started_at = datetime.utcnow()
        
        # Setup signal handlers for graceful shutdown
        for sig in (signal.SIGTERM, signal.SIGINT):
            asyncio.get_event_loop().add_signal_handler(
                sig,
                lambda: asyncio.create_task(self.shutdown())
            )
        
        # Main processing loop
        await self._run_loop()
    
    async def shutdown(self):
        """Gracefully shutdown the worker."""
        logger.info("Shutting down worker", worker_id=self.worker_id)
        self._running = False
        self._shutdown_event.set()
    
    async def _run_loop(self):
        """Main processing loop."""
        while self._running:
            try:
                # First, claim any pending messages from crashed workers
                pending_messages = await cache.stream_claim_pending(
                    stream=self.stream_name,
                    group=self.group_name,
                    consumer=self.worker_id,
                    min_idle_time=60000,  # 1 minute
                    count=5
                )
                
                for msg in pending_messages:
                    await self._handle_message(msg)
                
                # Read new messages
                messages = await cache.stream_read(
                    stream=self.stream_name,
                    group=self.group_name,
                    consumer=self.worker_id,
                    count=10,
                    block=5000  # 5 second block
                )
                
                for msg in messages:
                    await self._handle_message(msg)
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(
                    "Error in worker loop",
                    worker_id=self.worker_id,
                    error=str(e)
                )
                self._errors += 1
                await asyncio.sleep(1)  # Brief pause before retry
        
        # Cleanup
        await cache.disconnect()
        logger.info(
            "Worker stopped",
            worker_id=self.worker_id,
            messages_processed=self._messages_processed,
            errors=self._errors
        )
    
    async def _handle_message(self, message: StreamMessage):
        """Handle a single message with error handling."""
        try:
            success = await self.process_message(message)
            
            if success:
                # Acknowledge the message
                await cache.stream_ack(
                    stream=self.stream_name,
                    group=self.group_name,
                    message_id=message.message_id
                )
                self._messages_processed += 1
                
                logger.debug(
                    "Message processed",
                    worker_id=self.worker_id,
                    message_id=message.message_id,
                    event_type=message.event_type
                )
            else:
                # Don't ack - will be redelivered or claimed later
                logger.warning(
                    "Message processing returned false, will retry",
                    message_id=message.message_id
                )
                
        except Exception as e:
            self._errors += 1
            logger.error(
                "Error processing message",
                worker_id=self.worker_id,
                message_id=message.message_id,
                error=str(e)
            )
            # Message will be redelivered after min_idle_time
    
    def health_check(self) -> dict:
        """Return health status of the worker."""
        uptime = None
        if self._started_at:
            uptime = (datetime.utcnow() - self._started_at).total_seconds()
        
        return {
            "worker_id": self.worker_id,
            "stream": self.stream_name,
            "group": self.group_name,
            "running": self._running,
            "messages_processed": self._messages_processed,
            "errors": self._errors,
            "uptime_seconds": uptime
        }

