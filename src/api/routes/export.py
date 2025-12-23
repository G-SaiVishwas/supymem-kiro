"""
API routes for exporting knowledge database as PDF.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import date, datetime
import io

from src.database.session import get_db
from src.services.auth.dependencies import get_current_user_optional, CurrentUser
from src.services.export import PDFExportService, ExportRequest, ExportOptions
from src.services.export.schemas import ExportFormat, ExportResponse
from src.config.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/export", tags=["export"])


@router.post("/pdf", response_class=StreamingResponse)
async def export_knowledge_pdf(
    request: ExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """
    Export the knowledge database as a PDF document.
    
    This endpoint generates a comprehensive PDF export containing:
    - Summary statistics with charts
    - Decisions with reasoning and alternatives
    - Knowledge entries grouped by category
    - Tasks with status and assignments
    - Projects and their documents
    - Daily summaries (optional)
    
    The export can be customized using the options parameter to include/exclude sections.
    """
    try:
        user_id = current_user.id if current_user else None
        
        logger.info(
            "PDF export requested",
            team_id=request.team_id,
            user_id=user_id,
            format=request.format.value
        )
        
        # Generate PDF
        service = PDFExportService(db)
        pdf_bytes = await service.generate_export(request, user_id)
        
        # Generate filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"supymem_export_{request.team_id}_{timestamp}.pdf"
        
        logger.info(
            "PDF export completed",
            filename=filename,
            size=len(pdf_bytes)
        )
        
        # Return as streaming response
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes)),
            }
        )
        
    except Exception as e:
        logger.error("PDF export failed", error=str(e), team_id=request.team_id)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate PDF export: {str(e)}"
        )


@router.get("/pdf")
async def export_knowledge_pdf_get(
    team_id: str = Query(..., description="Team ID to export data for"),
    date_from: Optional[date] = Query(None, description="Start date filter"),
    date_to: Optional[date] = Query(None, description="End date filter"),
    format: ExportFormat = Query(ExportFormat.DETAILED, description="Export detail level"),
    include_decisions: bool = Query(True, description="Include decisions section"),
    include_knowledge: bool = Query(True, description="Include knowledge entries"),
    include_tasks: bool = Query(True, description="Include tasks section"),
    include_projects: bool = Query(True, description="Include projects section"),
    include_summaries: bool = Query(False, description="Include daily summaries"),
    include_statistics: bool = Query(True, description="Include statistics section"),
    categories: Optional[str] = Query(None, description="Comma-separated category filter"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """
    Export the knowledge database as a PDF document (GET endpoint for direct browser access).
    
    This endpoint allows downloading the PDF directly from a browser URL.
    For more control over export options, use the POST endpoint.
    """
    # Parse categories
    category_list = None
    if categories:
        category_list = [c.strip() for c in categories.split(",") if c.strip()]
    
    # Build request
    request = ExportRequest(
        team_id=team_id,
        date_from=date_from,
        date_to=date_to,
        format=format,
        categories=category_list,
        options=ExportOptions(
            include_decisions=include_decisions,
            include_knowledge=include_knowledge,
            include_tasks=include_tasks,
            include_projects=include_projects,
            include_summaries=include_summaries,
            include_statistics=include_statistics,
        )
    )
    
    return await export_knowledge_pdf(request, db, current_user)


@router.get("/preview")
async def preview_export(
    team_id: str = Query(..., description="Team ID to preview export for"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
) -> dict:
    """
    Get a preview of what would be included in the export.
    
    Returns counts and sample data without generating the full PDF.
    """
    from sqlalchemy import select, func
    from src.database.models import KnowledgeEntry, Decision, Task, Project
    
    try:
        # Count entries
        knowledge_count = await db.scalar(
            select(func.count(KnowledgeEntry.id)).where(
                KnowledgeEntry.team_id == team_id,
                KnowledgeEntry.is_deleted == False
            )
        )
        
        decisions_count = await db.scalar(
            select(func.count(Decision.id)).where(Decision.team_id == team_id)
        )
        
        tasks_count = await db.scalar(
            select(func.count(Task.id)).where(Task.team_id == team_id)
        )
        
        projects_count = await db.scalar(select(func.count(Project.id)))
        
        # Get category breakdown
        from collections import defaultdict
        category_result = await db.execute(
            select(KnowledgeEntry.category, func.count(KnowledgeEntry.id))
            .where(
                KnowledgeEntry.team_id == team_id,
                KnowledgeEntry.is_deleted == False
            )
            .group_by(KnowledgeEntry.category)
        )
        categories = {row[0] or "other": row[1] for row in category_result.all()}
        
        return {
            "team_id": team_id,
            "counts": {
                "knowledge_entries": knowledge_count or 0,
                "decisions": decisions_count or 0,
                "tasks": tasks_count or 0,
                "projects": projects_count or 0,
            },
            "categories": categories,
            "estimated_pages": max(
                5,
                ((knowledge_count or 0) // 20) + 
                ((decisions_count or 0) // 5) + 
                ((tasks_count or 0) // 30) + 
                3
            ),
            "available_sections": [
                "statistics",
                "decisions",
                "knowledge",
                "tasks",
                "projects",
                "summaries"
            ]
        }
        
    except Exception as e:
        logger.error("Export preview failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate export preview: {str(e)}"
        )

