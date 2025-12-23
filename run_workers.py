#!/usr/bin/env python
"""
Worker Runner Script

Runs all background workers for Supymem.

Usage:
    # Run all workers
    python run_workers.py
    
    # Run specific worker
    python run_workers.py --worker change_processor
    python run_workers.py --worker notification
    python run_workers.py --worker task_monitor
    
    # Run with custom worker count
    python run_workers.py --workers 3
"""

import asyncio
import argparse
import signal
import sys
from typing import Type

from src.workers.base import BaseWorker
from src.workers.change_processor import ChangeProcessorWorker
from src.workers.notification_worker import NotificationWorker
from src.workers.task_monitor import TaskMonitorWorker
from src.cache.redis_client import cache
from src.config.logging import get_logger

logger = get_logger(__name__)


WORKER_CLASSES = {
    "change_processor": ChangeProcessorWorker,
    "notification": NotificationWorker,
    "task_monitor": TaskMonitorWorker,
}


async def run_worker(worker_class: Type[BaseWorker], worker_id: str):
    """Run a single worker instance."""
    worker = worker_class(worker_id=worker_id)
    
    try:
        await worker.start()
    except asyncio.CancelledError:
        logger.info(f"Worker {worker_id} cancelled")
    except Exception as e:
        logger.error(f"Worker {worker_id} failed", error=str(e))
        raise


async def run_all_workers(worker_count: int = 1):
    """Run all worker types."""
    logger.info(
        "Starting all workers",
        worker_count=worker_count,
        workers=list(WORKER_CLASSES.keys())
    )
    
    tasks = []
    
    for worker_name, worker_class in WORKER_CLASSES.items():
        for i in range(worker_count):
            worker_id = f"{worker_name}-{i}"
            task = asyncio.create_task(
                run_worker(worker_class, worker_id),
                name=worker_id
            )
            tasks.append(task)
    
    # Wait for all workers (they run forever until cancelled)
    try:
        await asyncio.gather(*tasks)
    except asyncio.CancelledError:
        logger.info("Workers cancelled")


async def run_single_worker(worker_name: str, worker_count: int = 1):
    """Run a single worker type."""
    if worker_name not in WORKER_CLASSES:
        logger.error(
            f"Unknown worker: {worker_name}",
            available=list(WORKER_CLASSES.keys())
        )
        sys.exit(1)
    
    worker_class = WORKER_CLASSES[worker_name]
    
    logger.info(
        "Starting worker",
        worker=worker_name,
        count=worker_count
    )
    
    tasks = []
    for i in range(worker_count):
        worker_id = f"{worker_name}-{i}"
        task = asyncio.create_task(
            run_worker(worker_class, worker_id),
            name=worker_id
        )
        tasks.append(task)
    
    try:
        await asyncio.gather(*tasks)
    except asyncio.CancelledError:
        logger.info("Workers cancelled")


def main():
    parser = argparse.ArgumentParser(description="Run Supymem background workers")
    parser.add_argument(
        "--worker",
        type=str,
        choices=list(WORKER_CLASSES.keys()),
        help="Specific worker to run (runs all if not specified)"
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Number of worker instances per type (default: 1)"
    )
    
    args = parser.parse_args()
    
    # Setup shutdown handler
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    shutdown_event = asyncio.Event()
    
    def shutdown_handler(sig):
        logger.info(f"Received signal {sig.name}, shutting down...")
        shutdown_event.set()
        
        # Cancel all running tasks
        for task in asyncio.all_tasks(loop):
            if not task.done():
                task.cancel()
    
    # Register signal handlers
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, lambda s=sig: shutdown_handler(s))
        except NotImplementedError:
            # Windows doesn't support add_signal_handler
            signal.signal(sig, lambda s, f: shutdown_handler(signal.Signals(s)))
    
    try:
        if args.worker:
            loop.run_until_complete(
                run_single_worker(args.worker, args.workers)
            )
        else:
            loop.run_until_complete(
                run_all_workers(args.workers)
            )
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
    finally:
        # Cleanup
        try:
            loop.run_until_complete(cache.disconnect())
        except Exception:
            pass
        loop.close()
        logger.info("Workers stopped")


if __name__ == "__main__":
    main()

