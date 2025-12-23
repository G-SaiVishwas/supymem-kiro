"""
Pydantic schemas for PDF export options and configuration.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from enum import Enum


class ExportFormat(str, Enum):
    """Export detail level."""
    DETAILED = "detailed"
    SUMMARY = "summary"


class ExportSection(str, Enum):
    """Sections that can be included in the export."""
    DECISIONS = "decisions"
    KNOWLEDGE = "knowledge"
    TASKS = "tasks"
    PROJECTS = "projects"
    SUMMARIES = "summaries"


class ExportOptions(BaseModel):
    """Options for customizing the PDF export."""
    include_decisions: bool = Field(default=True, description="Include decisions section")
    include_knowledge: bool = Field(default=True, description="Include knowledge entries section")
    include_tasks: bool = Field(default=True, description="Include tasks section")
    include_projects: bool = Field(default=True, description="Include projects section")
    include_summaries: bool = Field(default=False, description="Include daily summaries section")
    include_statistics: bool = Field(default=True, description="Include summary statistics")
    include_toc: bool = Field(default=True, description="Include table of contents")


class ExportRequest(BaseModel):
    """Request body for PDF export endpoint."""
    team_id: str = Field(..., description="Team ID to export data for")
    date_from: Optional[date] = Field(default=None, description="Start date filter")
    date_to: Optional[date] = Field(default=None, description="End date filter")
    categories: Optional[List[str]] = Field(default=None, description="Filter by specific categories")
    format: ExportFormat = Field(default=ExportFormat.DETAILED, description="Export detail level")
    options: ExportOptions = Field(default_factory=ExportOptions, description="Export options")


class ExportMetadata(BaseModel):
    """Metadata included in the export."""
    team_id: str
    team_name: Optional[str] = None
    generated_at: str
    generated_by: Optional[str] = None
    total_entries: int = 0
    total_decisions: int = 0
    total_tasks: int = 0
    total_projects: int = 0
    date_range: Optional[str] = None


class ExportResponse(BaseModel):
    """Response from export endpoint (when not streaming)."""
    success: bool
    message: str
    file_size: Optional[int] = None
    filename: Optional[str] = None

