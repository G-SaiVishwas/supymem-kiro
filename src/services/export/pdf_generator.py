"""
PDF Export Service for generating knowledge database exports.
"""

import io
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict

from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, ListFlowable, ListItem, HRFlowable
)
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.pagesizes import letter
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import (
    KnowledgeEntry, Decision, DecisionChallenge, Task, 
    Project, ProjectDocument, EngineerEntry, DailySummary,
    Team, Organization
)
from src.services.export.schemas import ExportRequest, ExportMetadata, ExportOptions
from src.services.export.templates import (
    get_styles, COLORS, PAGE_SIZE, MARGIN_LEFT, MARGIN_RIGHT,
    MARGIN_TOP, MARGIN_BOTTOM, CONTENT_WIDTH, STATUS_COLORS,
    PRIORITY_COLORS, CATEGORY_COLORS, TABLE_STYLE_DEFAULT
)
from src.config.logging import get_logger

logger = get_logger(__name__)


class PDFExportService:
    """Service for generating PDF exports of the knowledge database."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.styles = get_styles()
        self.metadata: Optional[ExportMetadata] = None
        self.toc_entries: List[Tuple[str, int]] = []
        self.current_page = 1
        
    async def generate_export(
        self,
        request: ExportRequest,
        user_id: Optional[str] = None
    ) -> bytes:
        """Generate a PDF export based on the request options."""
        logger.info("Starting PDF export", team_id=request.team_id)
        
        # Fetch all data
        data = await self._fetch_data(request)
        
        # Build metadata
        self.metadata = await self._build_metadata(request, data, user_id)
        
        # Generate PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=PAGE_SIZE,
            leftMargin=MARGIN_LEFT,
            rightMargin=MARGIN_RIGHT,
            topMargin=MARGIN_TOP,
            bottomMargin=MARGIN_BOTTOM,
            title=f"Supymem Knowledge Export - {self.metadata.team_name or request.team_id}",
            author="Supymem",
        )
        
        # Build document content
        story = []
        
        # Cover page
        story.extend(self._build_cover_page())
        story.append(PageBreak())
        
        # Table of contents (placeholder - will be updated)
        if request.options.include_toc:
            story.extend(self._build_toc_placeholder(request.options))
            story.append(PageBreak())
        
        # Summary statistics
        if request.options.include_statistics:
            story.extend(self._build_statistics_section(data))
            story.append(PageBreak())
        
        # Decisions section
        if request.options.include_decisions and data.get("decisions"):
            story.extend(self._build_decisions_section(data["decisions"], request))
            story.append(PageBreak())
        
        # Knowledge entries section
        if request.options.include_knowledge and data.get("knowledge"):
            story.extend(self._build_knowledge_section(data["knowledge"], request))
            story.append(PageBreak())
        
        # Tasks section
        if request.options.include_tasks and data.get("tasks"):
            story.extend(self._build_tasks_section(data["tasks"], request))
            story.append(PageBreak())
        
        # Projects section
        if request.options.include_projects and data.get("projects"):
            story.extend(self._build_projects_section(
                data["projects"], 
                data.get("documents", []),
                request
            ))
            story.append(PageBreak())
        
        # Daily summaries section
        if request.options.include_summaries and data.get("summaries"):
            story.extend(self._build_summaries_section(data["summaries"], request))
        
        # Remove trailing page break
        if story and isinstance(story[-1], PageBreak):
            story.pop()
        
        # Build PDF
        doc.build(story, onFirstPage=self._add_header_footer, onLaterPages=self._add_header_footer)
        
        buffer.seek(0)
        pdf_bytes = buffer.getvalue()
        
        logger.info("PDF export completed", size=len(pdf_bytes))
        return pdf_bytes
    
    async def _fetch_data(self, request: ExportRequest) -> Dict[str, Any]:
        """Fetch all required data from the database."""
        data = {}
        
        # Build date filters
        date_filters = []
        if request.date_from:
            date_filters.append(KnowledgeEntry.created_at >= datetime.combine(request.date_from, datetime.min.time()))
        if request.date_to:
            date_filters.append(KnowledgeEntry.created_at <= datetime.combine(request.date_to, datetime.max.time()))
        
        # Fetch decisions
        if request.options.include_decisions:
            query = select(Decision).where(Decision.team_id == request.team_id)
            if request.date_from:
                query = query.where(Decision.created_at >= datetime.combine(request.date_from, datetime.min.time()))
            if request.date_to:
                query = query.where(Decision.created_at <= datetime.combine(request.date_to, datetime.max.time()))
            query = query.order_by(Decision.created_at.desc())
            result = await self.db.execute(query)
            data["decisions"] = result.scalars().all()
            
            # Fetch challenges for each decision
            decision_ids = [d.id for d in data["decisions"]]
            if decision_ids:
                challenges_query = select(DecisionChallenge).where(
                    DecisionChallenge.decision_id.in_(decision_ids)
                )
                challenges_result = await self.db.execute(challenges_query)
                challenges = challenges_result.scalars().all()
                # Group by decision_id
                data["challenges"] = defaultdict(list)
                for c in challenges:
                    data["challenges"][c.decision_id].append(c)
        
        # Fetch knowledge entries
        if request.options.include_knowledge:
            query = select(KnowledgeEntry).where(
                and_(
                    KnowledgeEntry.team_id == request.team_id,
                    KnowledgeEntry.is_deleted == False
                )
            )
            if date_filters:
                query = query.where(and_(*date_filters))
            if request.categories:
                query = query.where(KnowledgeEntry.category.in_(request.categories))
            query = query.order_by(KnowledgeEntry.created_at.desc())
            result = await self.db.execute(query)
            data["knowledge"] = result.scalars().all()
        
        # Fetch tasks
        if request.options.include_tasks:
            query = select(Task).where(Task.team_id == request.team_id)
            if request.date_from:
                query = query.where(Task.created_at >= datetime.combine(request.date_from, datetime.min.time()))
            if request.date_to:
                query = query.where(Task.created_at <= datetime.combine(request.date_to, datetime.max.time()))
            query = query.order_by(Task.created_at.desc())
            result = await self.db.execute(query)
            data["tasks"] = result.scalars().all()
        
        # Fetch projects and documents (table may not exist)
        if request.options.include_projects:
            try:
                query = select(Project).order_by(Project.created_at.desc()).limit(50)
                result = await self.db.execute(query)
                data["projects"] = result.scalars().all()
                
                project_ids = [p.id for p in data["projects"]]
                if project_ids:
                    docs_query = select(ProjectDocument).where(
                        ProjectDocument.project_id.in_(project_ids)
                    )
                    docs_result = await self.db.execute(docs_query)
                    data["documents"] = docs_result.scalars().all()
            except Exception as e:
                logger.warning("Could not fetch projects", error=str(e))
                data["projects"] = []
                data["documents"] = []
        
        # Fetch daily summaries (table may not exist)
        if request.options.include_summaries:
            try:
                query = select(DailySummary).order_by(DailySummary.summary_date.desc()).limit(30)
                if request.date_from:
                    query = query.where(DailySummary.summary_date >= request.date_from)
                if request.date_to:
                    query = query.where(DailySummary.summary_date <= request.date_to)
                result = await self.db.execute(query)
                data["summaries"] = result.scalars().all()
            except Exception as e:
                logger.warning("Could not fetch summaries", error=str(e))
                data["summaries"] = []
        
        return data
    
    async def _build_metadata(
        self, 
        request: ExportRequest, 
        data: Dict[str, Any],
        user_id: Optional[str]
    ) -> ExportMetadata:
        """Build export metadata."""
        # Try to get team name
        team_name = None
        try:
            team_result = await self.db.execute(
                select(Team).where(Team.id == request.team_id)
            )
            team = team_result.scalar_one_or_none()
            if team:
                team_name = team.name
        except Exception:
            pass
        
        date_range = None
        if request.date_from or request.date_to:
            from_str = request.date_from.isoformat() if request.date_from else "beginning"
            to_str = request.date_to.isoformat() if request.date_to else "now"
            date_range = f"{from_str} to {to_str}"
        
        return ExportMetadata(
            team_id=request.team_id,
            team_name=team_name,
            generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            generated_by=user_id,
            total_entries=len(data.get("knowledge", [])),
            total_decisions=len(data.get("decisions", [])),
            total_tasks=len(data.get("tasks", [])),
            total_projects=len(data.get("projects", [])),
            date_range=date_range,
        )
    
    def _build_cover_page(self) -> List:
        """Build the cover page elements."""
        elements = []
        
        # Add spacing to center content vertically
        elements.append(Spacer(1, 2 * inch))
        
        # Main title
        elements.append(Paragraph(
            "SUPYMEM",
            self.styles['DocTitle']
        ))
        
        elements.append(Paragraph(
            "Knowledge Base Export",
            self.styles['DocSubtitle']
        ))
        
        elements.append(Spacer(1, 0.5 * inch))
        
        # Team info
        team_display = self.metadata.team_name or self.metadata.team_id
        elements.append(Paragraph(
            f"<b>Team:</b> {team_display}",
            self.styles['BodyText']
        ))
        
        elements.append(Spacer(1, 0.25 * inch))
        
        # Generation info
        elements.append(Paragraph(
            f"<b>Generated:</b> {self.metadata.generated_at}",
            self.styles['BodyText']
        ))
        
        if self.metadata.generated_by:
            elements.append(Paragraph(
                f"<b>Generated by:</b> {self.metadata.generated_by}",
                self.styles['BodyText']
            ))
        
        if self.metadata.date_range:
            elements.append(Paragraph(
                f"<b>Date Range:</b> {self.metadata.date_range}",
                self.styles['BodyText']
            ))
        
        elements.append(Spacer(1, 1 * inch))
        
        # Summary counts
        summary_data = [
            ["Knowledge Entries", "Decisions", "Tasks", "Projects"],
            [
                str(self.metadata.total_entries),
                str(self.metadata.total_decisions),
                str(self.metadata.total_tasks),
                str(self.metadata.total_projects),
            ]
        ]
        
        summary_table = Table(summary_data, colWidths=[CONTENT_WIDTH/4]*4)
        summary_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('TEXTCOLOR', (0, 0), (-1, 0), COLORS["medium"]),
            ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (-1, 1), 24),
            ('TEXTCOLOR', (0, 1), (-1, 1), COLORS["primary"]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
        ]))
        
        elements.append(summary_table)
        
        return elements
    
    def _build_toc_placeholder(self, options: ExportOptions) -> List:
        """Build table of contents."""
        elements = []
        
        elements.append(Paragraph("Table of Contents", self.styles['SectionHeader']))
        elements.append(Spacer(1, 0.25 * inch))
        
        toc_items = []
        page_num = 3  # Start after cover and TOC
        
        if options.include_statistics:
            toc_items.append(("1. Summary Statistics", page_num))
            page_num += 1
        
        if options.include_decisions:
            toc_items.append(("2. Decisions", page_num))
            page_num += 1
        
        if options.include_knowledge:
            toc_items.append(("3. Knowledge Entries", page_num))
            page_num += 1
        
        if options.include_tasks:
            toc_items.append(("4. Tasks", page_num))
            page_num += 1
        
        if options.include_projects:
            toc_items.append(("5. Projects & Documents", page_num))
            page_num += 1
        
        if options.include_summaries:
            toc_items.append(("6. Daily Summaries", page_num))
        
        for title, page in toc_items:
            elements.append(Paragraph(
                f"{title} {'.' * 50} {page}",
                self.styles['TOCEntry']
            ))
        
        return elements
    
    def _build_statistics_section(self, data: Dict[str, Any]) -> List:
        """Build the statistics section with charts."""
        elements = []
        
        elements.append(Paragraph("Summary Statistics", self.styles['SectionHeader']))
        elements.append(HRFlowable(width="100%", thickness=1, color=COLORS["primary"]))
        elements.append(Spacer(1, 0.25 * inch))
        
        # Knowledge by category pie chart
        knowledge = data.get("knowledge", [])
        if knowledge:
            category_counts = defaultdict(int)
            for entry in knowledge:
                category_counts[entry.category or "other"] += 1
            
            if category_counts:
                elements.append(Paragraph("Knowledge Entries by Category", self.styles['SubsectionHeader']))
                
                # Create pie chart
                drawing = Drawing(400, 200)
                pie = Pie()
                pie.x = 100
                pie.y = 25
                pie.width = 150
                pie.height = 150
                pie.data = list(category_counts.values())
                pie.labels = list(category_counts.keys())
                pie.slices.strokeWidth = 0.5
                
                # Set slice colors
                for i, category in enumerate(category_counts.keys()):
                    color = CATEGORY_COLORS.get(category, COLORS["medium"])
                    pie.slices[i].fillColor = color
                
                drawing.add(pie)
                elements.append(drawing)
                elements.append(Spacer(1, 0.25 * inch))
        
        # Tasks by status
        tasks = data.get("tasks", [])
        if tasks:
            status_counts = defaultdict(int)
            for task in tasks:
                status_counts[task.status or "pending"] += 1
            
            elements.append(Paragraph("Tasks by Status", self.styles['SubsectionHeader']))
            
            status_data = [["Status", "Count"]]
            for status, count in sorted(status_counts.items()):
                status_data.append([status.replace("_", " ").title(), str(count)])
            
            status_table = Table(status_data, colWidths=[3*inch, 1.5*inch])
            status_table.setStyle(TableStyle(TABLE_STYLE_DEFAULT))
            elements.append(status_table)
            elements.append(Spacer(1, 0.25 * inch))
        
        # Decisions by importance
        decisions = data.get("decisions", [])
        if decisions:
            importance_counts = defaultdict(int)
            for decision in decisions:
                importance_counts[decision.importance or "medium"] += 1
            
            elements.append(Paragraph("Decisions by Importance", self.styles['SubsectionHeader']))
            
            importance_data = [["Importance", "Count"]]
            for importance, count in sorted(importance_counts.items()):
                importance_data.append([importance.title(), str(count)])
            
            importance_table = Table(importance_data, colWidths=[3*inch, 1.5*inch])
            importance_table.setStyle(TableStyle(TABLE_STYLE_DEFAULT))
            elements.append(importance_table)
        
        return elements
    
    def _build_decisions_section(self, decisions: List[Decision], request: ExportRequest) -> List:
        """Build the decisions section."""
        elements = []
        
        elements.append(Paragraph("Decisions", self.styles['SectionHeader']))
        elements.append(HRFlowable(width="100%", thickness=1, color=COLORS["primary"]))
        elements.append(Spacer(1, 0.15 * inch))
        elements.append(Paragraph(
            f"Total: {len(decisions)} decisions",
            self.styles['Metadata']
        ))
        elements.append(Spacer(1, 0.25 * inch))
        
        for i, decision in enumerate(decisions):
            decision_elements = self._build_decision_card(decision, i + 1, request)
            elements.extend(decision_elements)
            elements.append(Spacer(1, 0.25 * inch))
        
        return elements
    
    def _build_decision_card(self, decision: Decision, index: int, request: ExportRequest) -> List:
        """Build a single decision card."""
        elements = []
        
        # Decision title with status
        status_color = STATUS_COLORS.get(decision.status, COLORS["medium"])
        title_text = f"{index}. {decision.title}"
        elements.append(Paragraph(title_text, self.styles['ItemTitle']))
        
        # Metadata line
        meta_parts = []
        if decision.status:
            meta_parts.append(f"Status: {decision.status}")
        if decision.importance:
            meta_parts.append(f"Importance: {decision.importance}")
        if decision.decided_by:
            meta_parts.append(f"Decided by: {decision.decided_by}")
        if decision.created_at:
            meta_parts.append(f"Date: {decision.created_at.strftime('%Y-%m-%d')}")
        
        if meta_parts:
            elements.append(Paragraph(" | ".join(meta_parts), self.styles['Metadata']))
        
        elements.append(Spacer(1, 0.1 * inch))
        
        # Summary
        if decision.summary:
            elements.append(Paragraph("<b>Summary:</b>", self.styles['BodyText']))
            elements.append(Paragraph(decision.summary, self.styles['Quote']))
        
        # Reasoning (for detailed export)
        if request.format.value == "detailed" and decision.reasoning:
            elements.append(Paragraph("<b>Reasoning:</b>", self.styles['BodyText']))
            elements.append(Paragraph(decision.reasoning, self.styles['BodyText']))
        
        # Context
        if request.format.value == "detailed" and decision.context:
            elements.append(Paragraph("<b>Context:</b>", self.styles['BodyText']))
            elements.append(Paragraph(decision.context, self.styles['BodyText']))
        
        # Alternatives considered
        if decision.alternatives_considered:
            elements.append(Paragraph("<b>Alternatives Considered:</b>", self.styles['BodyText']))
            alternatives = decision.alternatives_considered
            if isinstance(alternatives, list):
                for alt in alternatives:
                    if isinstance(alt, dict):
                        alt_text = alt.get("option", str(alt))
                        reason = alt.get("rejected_reason", "")
                        if reason:
                            alt_text += f" - Rejected: {reason}"
                    else:
                        alt_text = str(alt)
                    elements.append(Paragraph(f"• {alt_text}", self.styles['BodyText']))
        
        # Affected files
        if decision.affected_files:
            files = decision.affected_files if isinstance(decision.affected_files, list) else []
            if files:
                elements.append(Paragraph(
                    f"<b>Affected Files:</b> {', '.join(files[:5])}{'...' if len(files) > 5 else ''}",
                    self.styles['SmallText']
                ))
        
        # Tags
        if decision.tags:
            tags = decision.tags if isinstance(decision.tags, list) else []
            if tags:
                elements.append(Paragraph(
                    f"<b>Tags:</b> {', '.join(tags)}",
                    self.styles['SmallText']
                ))
        
        # Source URL
        if decision.source_url:
            elements.append(Paragraph(
                f"<b>Source:</b> {decision.source_url}",
                self.styles['SmallText']
            ))
        
        # Separator
        elements.append(HRFlowable(width="100%", thickness=0.5, color=COLORS["light"]))
        
        return elements
    
    def _build_knowledge_section(self, entries: List[KnowledgeEntry], request: ExportRequest) -> List:
        """Build the knowledge entries section."""
        elements = []
        
        elements.append(Paragraph("Knowledge Entries", self.styles['SectionHeader']))
        elements.append(HRFlowable(width="100%", thickness=1, color=COLORS["primary"]))
        elements.append(Spacer(1, 0.15 * inch))
        elements.append(Paragraph(
            f"Total: {len(entries)} entries",
            self.styles['Metadata']
        ))
        elements.append(Spacer(1, 0.25 * inch))
        
        # Group by category
        by_category = defaultdict(list)
        for entry in entries:
            by_category[entry.category or "other"].append(entry)
        
        for category, cat_entries in sorted(by_category.items()):
            elements.append(Paragraph(
                f"{category.replace('_', ' ').title()} ({len(cat_entries)})",
                self.styles['SubsectionHeader']
            ))
            
            for entry in cat_entries[:50]:  # Limit per category
                entry_elements = self._build_knowledge_entry(entry, request)
                elements.extend(entry_elements)
            
            if len(cat_entries) > 50:
                elements.append(Paragraph(
                    f"... and {len(cat_entries) - 50} more entries",
                    self.styles['Metadata']
                ))
            
            elements.append(Spacer(1, 0.15 * inch))
        
        return elements
    
    def _build_knowledge_entry(self, entry: KnowledgeEntry, request: ExportRequest) -> List:
        """Build a single knowledge entry."""
        elements = []
        
        # Metadata line
        meta_parts = []
        if entry.source:
            meta_parts.append(f"Source: {entry.source}")
        if entry.importance_score:
            meta_parts.append(f"Importance: {entry.importance_score:.1f}")
        if entry.created_at:
            meta_parts.append(entry.created_at.strftime('%Y-%m-%d %H:%M'))
        
        elements.append(Paragraph(" | ".join(meta_parts), self.styles['Metadata']))
        
        # Content (truncate for summary view)
        content = entry.content or ""
        if request.format.value == "summary" and len(content) > 300:
            content = content[:300] + "..."
        
        elements.append(Paragraph(content, self.styles['BodyText']))
        
        # Tags
        if entry.tags:
            tags = entry.tags if isinstance(entry.tags, list) else []
            if tags:
                elements.append(Paragraph(
                    f"Tags: {', '.join(tags)}",
                    self.styles['SmallText']
                ))
        
        # Extracted entities (for detailed view)
        if request.format.value == "detailed" and entry.extracted_entities:
            entities = entry.extracted_entities
            if isinstance(entities, dict):
                entity_parts = []
                if entities.get("people"):
                    entity_parts.append(f"People: {', '.join(entities['people'][:3])}")
                if entities.get("files"):
                    entity_parts.append(f"Files: {', '.join(entities['files'][:3])}")
                if entity_parts:
                    elements.append(Paragraph(" | ".join(entity_parts), self.styles['SmallText']))
        
        elements.append(Spacer(1, 0.1 * inch))
        
        return elements
    
    def _build_tasks_section(self, tasks: List[Task], request: ExportRequest) -> List:
        """Build the tasks section."""
        elements = []
        
        elements.append(Paragraph("Tasks", self.styles['SectionHeader']))
        elements.append(HRFlowable(width="100%", thickness=1, color=COLORS["primary"]))
        elements.append(Spacer(1, 0.15 * inch))
        elements.append(Paragraph(
            f"Total: {len(tasks)} tasks",
            self.styles['Metadata']
        ))
        elements.append(Spacer(1, 0.25 * inch))
        
        # Create tasks table
        table_data = [["Title", "Status", "Priority", "Assigned To", "Due Date"]]
        
        for task in tasks[:100]:  # Limit to 100 tasks
            title = task.title or "Untitled"
            if len(title) > 40:
                title = title[:40] + "..."
            
            table_data.append([
                title,
                (task.status or "pending").replace("_", " ").title(),
                (task.priority or "medium").title(),
                task.assigned_to or "-",
                task.due_date.strftime('%Y-%m-%d') if task.due_date else "-"
            ])
        
        if len(table_data) > 1:
            tasks_table = Table(
                table_data,
                colWidths=[2.5*inch, 1*inch, 0.8*inch, 1.2*inch, 1*inch]
            )
            tasks_table.setStyle(TableStyle(TABLE_STYLE_DEFAULT))
            elements.append(tasks_table)
        
        if len(tasks) > 100:
            elements.append(Spacer(1, 0.1 * inch))
            elements.append(Paragraph(
                f"... and {len(tasks) - 100} more tasks",
                self.styles['Metadata']
            ))
        
        # Detailed task descriptions (for detailed view)
        if request.format.value == "detailed":
            elements.append(Spacer(1, 0.25 * inch))
            elements.append(Paragraph("Task Details", self.styles['SubsectionHeader']))
            
            for task in tasks[:30]:  # Limit detailed view
                if task.description:
                    elements.append(Paragraph(f"<b>{task.title}</b>", self.styles['BodyText']))
                    elements.append(Paragraph(task.description, self.styles['Quote']))
                    elements.append(Spacer(1, 0.1 * inch))
        
        return elements
    
    def _build_projects_section(
        self, 
        projects: List[Project], 
        documents: List[ProjectDocument],
        request: ExportRequest
    ) -> List:
        """Build the projects section."""
        elements = []
        
        elements.append(Paragraph("Projects & Documents", self.styles['SectionHeader']))
        elements.append(HRFlowable(width="100%", thickness=1, color=COLORS["primary"]))
        elements.append(Spacer(1, 0.15 * inch))
        elements.append(Paragraph(
            f"Total: {len(projects)} projects, {len(documents)} documents",
            self.styles['Metadata']
        ))
        elements.append(Spacer(1, 0.25 * inch))
        
        # Group documents by project
        docs_by_project = defaultdict(list)
        for doc in documents:
            docs_by_project[doc.project_id].append(doc)
        
        for project in projects:
            elements.append(Paragraph(project.name, self.styles['SubsectionHeader']))
            
            # Project metadata
            meta_parts = []
            if project.status:
                meta_parts.append(f"Status: {project.status}")
            if project.project_type:
                meta_parts.append(f"Type: {project.project_type}")
            if project.created_at:
                meta_parts.append(f"Created: {project.created_at.strftime('%Y-%m-%d')}")
            
            if meta_parts:
                elements.append(Paragraph(" | ".join(meta_parts), self.styles['Metadata']))
            
            if project.description:
                elements.append(Paragraph(project.description, self.styles['BodyText']))
            
            # Project documents
            project_docs = docs_by_project.get(project.id, [])
            if project_docs:
                elements.append(Paragraph(f"Documents ({len(project_docs)}):", self.styles['BodyText']))
                for doc in project_docs[:10]:
                    doc_text = f"• {doc.title}"
                    if doc.document_type:
                        doc_text += f" ({doc.document_type})"
                    elements.append(Paragraph(doc_text, self.styles['SmallText']))
                    
                    # Include document content for detailed view
                    if request.format.value == "detailed" and doc.content:
                        content = doc.content
                        if len(content) > 500:
                            content = content[:500] + "..."
                        elements.append(Paragraph(content, self.styles['Quote']))
            
            elements.append(Spacer(1, 0.2 * inch))
        
        return elements
    
    def _build_summaries_section(self, summaries: List[DailySummary], request: ExportRequest) -> List:
        """Build the daily summaries section."""
        elements = []
        
        elements.append(Paragraph("Daily Summaries", self.styles['SectionHeader']))
        elements.append(HRFlowable(width="100%", thickness=1, color=COLORS["primary"]))
        elements.append(Spacer(1, 0.15 * inch))
        elements.append(Paragraph(
            f"Total: {len(summaries)} summaries",
            self.styles['Metadata']
        ))
        elements.append(Spacer(1, 0.25 * inch))
        
        for summary in summaries:
            # Date header
            date_str = summary.summary_date.strftime('%A, %B %d, %Y') if summary.summary_date else "Unknown Date"
            elements.append(Paragraph(date_str, self.styles['SubsectionHeader']))
            
            # Summary type
            if summary.summary_type:
                elements.append(Paragraph(
                    f"Type: {summary.summary_type.title()}",
                    self.styles['Metadata']
                ))
            
            # Main summary
            if summary.summary:
                elements.append(Paragraph(summary.summary, self.styles['BodyText']))
            
            # Work performed
            if summary.work_performed:
                work_items = summary.work_performed
                if isinstance(work_items, list) and work_items:
                    elements.append(Paragraph("<b>Work Performed:</b>", self.styles['BodyText']))
                    for item in work_items[:5]:
                        elements.append(Paragraph(f"• {item}", self.styles['SmallText']))
            
            # Key decisions
            if summary.key_decisions:
                decisions = summary.key_decisions
                if isinstance(decisions, list) and decisions:
                    elements.append(Paragraph("<b>Key Decisions:</b>", self.styles['BodyText']))
                    for decision in decisions[:5]:
                        elements.append(Paragraph(f"• {decision}", self.styles['SmallText']))
            
            # Blockers
            if summary.blockers:
                blockers = summary.blockers
                if isinstance(blockers, list) and blockers:
                    elements.append(Paragraph("<b>Blockers:</b>", self.styles['BodyText']))
                    for blocker in blockers:
                        elements.append(Paragraph(f"• {blocker}", self.styles['SmallText']))
            
            # Metrics
            metrics = []
            if summary.entries_processed:
                metrics.append(f"Entries: {summary.entries_processed}")
            if summary.todos_created:
                metrics.append(f"Todos Created: {summary.todos_created}")
            if summary.todos_completed:
                metrics.append(f"Todos Completed: {summary.todos_completed}")
            
            if metrics:
                elements.append(Paragraph(" | ".join(metrics), self.styles['Metadata']))
            
            elements.append(HRFlowable(width="100%", thickness=0.5, color=COLORS["light"]))
            elements.append(Spacer(1, 0.15 * inch))
        
        return elements
    
    def _add_header_footer(self, canvas, doc):
        """Add header and footer to each page."""
        canvas.saveState()
        
        # Header
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(COLORS["medium"])
        
        header_text = f"Supymem Knowledge Export - {self.metadata.team_name or self.metadata.team_id}"
        canvas.drawString(MARGIN_LEFT, PAGE_SIZE[1] - 0.5 * inch, header_text)
        
        # Header line
        canvas.setStrokeColor(COLORS["light"])
        canvas.setLineWidth(0.5)
        canvas.line(
            MARGIN_LEFT, 
            PAGE_SIZE[1] - 0.55 * inch, 
            PAGE_SIZE[0] - MARGIN_RIGHT, 
            PAGE_SIZE[1] - 0.55 * inch
        )
        
        # Footer
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(COLORS["medium"])
        
        # Page number
        page_num = canvas.getPageNumber()
        canvas.drawCentredString(PAGE_SIZE[0] / 2, 0.4 * inch, f"Page {page_num}")
        
        # Generation timestamp
        canvas.drawString(
            MARGIN_LEFT, 
            0.4 * inch, 
            f"Generated: {self.metadata.generated_at}"
        )
        
        # Footer line
        canvas.line(
            MARGIN_LEFT, 
            0.55 * inch, 
            PAGE_SIZE[0] - MARGIN_RIGHT, 
            0.55 * inch
        )
        
        canvas.restoreState()


async def generate_knowledge_export(
    db: AsyncSession,
    request: ExportRequest,
    user_id: Optional[str] = None
) -> bytes:
    """Convenience function to generate a PDF export."""
    service = PDFExportService(db)
    return await service.generate_export(request, user_id)

