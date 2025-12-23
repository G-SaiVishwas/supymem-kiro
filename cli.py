#!/usr/bin/env python3
"""
Supymem-Kiro CLI - Management and administration tool.
"""
import asyncio
import click
from datetime import datetime
from rich.console import Console
from rich.table import Table
from rich import print as rprint

console = Console()


@click.group()
def cli():
    """Supymem-Kiro CLI - Management and administration tool."""
    pass


@cli.group()
def db():
    """Database management commands."""
    pass


@db.command()
def migrate():
    """Run database migrations."""
    console.print("[bold blue]Running database migrations...[/bold blue]")
    import subprocess
    result = subprocess.run(["alembic", "upgrade", "head"], capture_output=True, text=True)
    if result.returncode == 0:
        console.print("[bold green]✓ Migrations completed successfully[/bold green]")
    else:
        console.print(f"[bold red]✗ Migration failed:[/bold red]\n{result.stderr}")


@db.command()
@click.option('--message', '-m', required=True, help='Migration message')
def create_migration(message):
    """Create a new migration."""
    console.print(f"[bold blue]Creating migration: {message}[/bold blue]")
    import subprocess
    result = subprocess.run(
        ["alembic", "revision", "--autogenerate", "-m", message],
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        console.print("[bold green]✓ Migration created successfully[/bold green]")
        console.print(result.stdout)
    else:
        console.print(f"[bold red]✗ Failed to create migration:[/bold red]\n{result.stderr}")


@db.command()
def seed():
    """Seed database with demo data."""
    console.print("[bold blue]Seeding database with demo data...[/bold blue]")
    import subprocess
    result = subprocess.run(["python", "scripts/seed_demo_data.py"], capture_output=True, text=True)
    if result.returncode == 0:
        console.print("[bold green]✓ Database seeded successfully[/bold green]")
    else:
        console.print(f"[bold red]✗ Seeding failed:[/bold red]\n{result.stderr}")


@cli.group()
def cache():
    """Cache management commands."""
    pass


@cache.command()
def clear():
    """Clear all cache."""
    async def _clear():
        from src.cache.advanced_cache import cache
        await cache.clear()
        console.print("[bold green]✓ Cache cleared successfully[/bold green]")
    
    asyncio.run(_clear())


@cache.command()
def stats():
    """Show cache statistics."""
    async def _stats():
        from src.cache.advanced_cache import cache
        stats = cache.stats()
        
        table = Table(title="Cache Statistics")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")
        
        l1_stats = stats.get("l1", {})
        table.add_row("L1 Size", str(l1_stats.get("size", 0)))
        table.add_row("L1 Max Size", str(l1_stats.get("max_size", 0)))
        table.add_row("L1 Hits", str(l1_stats.get("hits", 0)))
        table.add_row("L1 Misses", str(l1_stats.get("misses", 0)))
        table.add_row("L1 Hit Rate", l1_stats.get("hit_rate", "0%"))
        
        console.print(table)
    
    asyncio.run(_stats())


@cli.group()
def user():
    """User management commands."""
    pass


@user.command()
@click.option('--email', required=True, help='User email')
@click.option('--name', required=True, help='User name')
@click.option('--password', required=True, help='User password')
def create(email, name, password):
    """Create a new user."""
    async def _create():
        from src.database.session import get_db
        from src.database.models import User
        from src.services.auth.service import AuthService
        
        async for db in get_db():
            auth_service = AuthService(db)
            try:
                user = await auth_service.create_user(
                    email=email,
                    name=name,
                    password=password
                )
                console.print(f"[bold green]✓ User created successfully[/bold green]")
                console.print(f"ID: {user.id}")
                console.print(f"Email: {user.email}")
                console.print(f"Name: {user.name}")
            except Exception as e:
                console.print(f"[bold red]✗ Failed to create user:[/bold red] {str(e)}")
            break
    
    asyncio.run(_create())


@user.command()
@click.option('--email', required=True, help='User email')
def make_admin(email):
    """Make user a superadmin."""
    async def _make_admin():
        from src.database.session import get_db
        from src.database.models import User
        from sqlalchemy import select
        
        async for db in get_db():
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            
            if not user:
                console.print(f"[bold red]✗ User not found:[/bold red] {email}")
                break
            
            user.is_superadmin = True
            await db.commit()
            console.print(f"[bold green]✓ User {email} is now a superadmin[/bold green]")
            break
    
    asyncio.run(_make_admin())


@cli.group()
def vector():
    """Vector store management commands."""
    pass


@vector.command()
def info():
    """Show vector store information."""
    async def _info():
        from src.vectors.qdrant_client import vector_store
        
        try:
            # Get collection info
            info = vector_store.client.get_collection(vector_store.collection_name)
            
            table = Table(title="Vector Store Information")
            table.add_column("Property", style="cyan")
            table.add_column("Value", style="green")
            
            table.add_row("Collection", vector_store.collection_name)
            table.add_row("Vector Size", str(info.config.params.vectors.size))
            table.add_row("Distance", str(info.config.params.vectors.distance))
            table.add_row("Points Count", str(info.points_count))
            table.add_row("Indexed", str(info.status))
            
            console.print(table)
        except Exception as e:
            console.print(f"[bold red]✗ Failed to get vector store info:[/bold red] {str(e)}")
    
    asyncio.run(_info())


@vector.command()
@click.confirmation_option(prompt='Are you sure you want to recreate the collection?')
def recreate():
    """Recreate vector store collection (WARNING: deletes all data)."""
    async def _recreate():
        from src.vectors.qdrant_client import vector_store
        
        try:
            # Delete collection
            vector_store.client.delete_collection(vector_store.collection_name)
            console.print("[yellow]Collection deleted[/yellow]")
            
            # Recreate
            await vector_store.initialize()
            console.print("[bold green]✓ Collection recreated successfully[/bold green]")
        except Exception as e:
            console.print(f"[bold red]✗ Failed to recreate collection:[/bold red] {str(e)}")
    
    asyncio.run(_recreate())


@cli.command()
def health():
    """Check system health."""
    async def _health():
        from src.vectors.qdrant_client import vector_store
        from src.cache.redis_client import redis_client
        from src.database.session import get_db
        
        table = Table(title="System Health Check")
        table.add_column("Component", style="cyan")
        table.add_column("Status", style="green")
        table.add_column("Details", style="yellow")
        
        # Check database
        try:
            async for db in get_db():
                await db.execute("SELECT 1")
                table.add_row("Database", "✓ Healthy", "Connection successful")
                break
        except Exception as e:
            table.add_row("Database", "✗ Unhealthy", str(e))
        
        # Check Redis
        try:
            await redis_client.ping()
            table.add_row("Redis", "✓ Healthy", "Connection successful")
        except Exception as e:
            table.add_row("Redis", "✗ Unhealthy", str(e))
        
        # Check Qdrant
        try:
            vector_store.client.get_collections()
            table.add_row("Qdrant", "✓ Healthy", "Connection successful")
        except Exception as e:
            table.add_row("Qdrant", "✗ Unhealthy", str(e))
        
        console.print(table)
    
    asyncio.run(_health())


@cli.command()
def version():
    """Show version information."""
    table = Table(title="Supymem-Kiro Version")
    table.add_column("Property", style="cyan")
    table.add_column("Value", style="green")
    
    table.add_row("Version", "0.1.0")
    table.add_row("Edition", "Enhanced")
    table.add_row("Python", "3.11+")
    
    console.print(table)


if __name__ == '__main__':
    cli()
