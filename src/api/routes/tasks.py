import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.database.models import Task
from src.services.automation import condition_monitor
from src.services.analytics import activity_tracker
from src.config.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    priority: str = Field(default="medium", pattern="^(low|medium|high|urgent)$")
    team_id: str = Field(default="default")
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(pending|in_progress|completed|failed)$")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|urgent)$")
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: str
    priority: str
    team_id: str
    assigned_to: Optional[str]
    created_by: Optional[str]
    source: Optional[str]
    due_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]


@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    task: TaskCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new task."""
    task_id = str(uuid.uuid4())
    now = datetime.utcnow()

    db_task = Task(
        id=task_id,
        title=task.title,
        description=task.description,
        status="pending",
        priority=task.priority,
        team_id=task.team_id,
        assigned_to=task.assigned_to,
        source="api",
        due_date=task.due_date,
        created_at=now,
        updated_at=now,
    )

    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)

    logger.info("Task created", task_id=task_id, title=task.title)

    return TaskResponse(
        id=db_task.id,
        title=db_task.title,
        description=db_task.description,
        status=db_task.status,
        priority=db_task.priority,
        team_id=db_task.team_id,
        assigned_to=db_task.assigned_to,
        created_by=db_task.created_by,
        source=db_task.source,
        due_date=db_task.due_date,
        created_at=db_task.created_at,
        updated_at=db_task.updated_at,
        completed_at=db_task.completed_at,
    )


@router.get("/tasks", response_model=List[TaskResponse])
async def list_tasks(
    team_id: str = "default",
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """List tasks with optional filters."""
    query = select(Task).where(Task.team_id == team_id)

    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)
    if assigned_to:
        query = query.where(Task.assigned_to == assigned_to)

    query = query.order_by(Task.created_at.desc()).limit(limit)

    result = await db.execute(query)
    tasks = result.scalars().all()

    return [
        TaskResponse(
            id=t.id,
            title=t.title,
            description=t.description,
            status=t.status,
            priority=t.priority,
            team_id=t.team_id,
            assigned_to=t.assigned_to,
            created_by=t.created_by,
            source=t.source,
            due_date=t.due_date,
            created_at=t.created_at,
            updated_at=t.updated_at,
            completed_at=t.completed_at,
        )
        for t in tasks
    ]


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a task by ID."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return TaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        team_id=task.team_id,
        assigned_to=task.assigned_to,
        created_by=task.created_by,
        source=task.source,
        due_date=task.due_date,
        created_at=task.created_at,
        updated_at=task.updated_at,
        completed_at=task.completed_at,
    )


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Update a task."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_status = task.status
    update_data = task_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    # Set completed_at if status is completed
    is_completing = update_data.get("status") == "completed" and old_status != "completed"
    if is_completing and not task.completed_at:
        update_data["completed_at"] = datetime.utcnow()

    for key, value in update_data.items():
        setattr(task, key, value)

    await db.commit()
    await db.refresh(task)

    logger.info("Task updated", task_id=task_id, status=task.status)

    # If task was just completed, trigger automation and activity tracking
    if is_completing:
        # Track activity in background
        background_tasks.add_task(
            activity_tracker.track_task_completed,
            user_identifier=task.assigned_to or "unknown",
            team_id=task.team_id,
            task_id=task_id,
            task_title=task.title
        )
        
        # Check automation rules in background
        background_tasks.add_task(
            condition_monitor.check_task_completed,
            team_id=task.team_id,
            user_identifier=task.assigned_to or "unknown",
            task_title=task.title,
            task_type=task.category
        )

    return TaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        team_id=task.team_id,
        assigned_to=task.assigned_to,
        created_by=task.created_by,
        source=task.source,
        due_date=task.due_date,
        created_at=task.created_at,
        updated_at=task.updated_at,
        completed_at=task.completed_at,
    )


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a task."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.delete(task)
    await db.commit()

    logger.info("Task deleted", task_id=task_id)

    return {"message": "Task deleted successfully"}
