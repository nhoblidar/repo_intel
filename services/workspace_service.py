"""
WorkspaceService — all database operations for workspaces, members,
chat history, and architecture snapshots.
"""
import secrets
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, delete, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.models.models import (
    Workspace, WorkspaceMember, ChatSession,
    ChatMessage, QueryLog, ArchSnapshot, AuditLog
)


class WorkspaceService:

    # ── Create / upsert ──────────────────────────────────────────────────
    @staticmethod
    async def upsert(db: AsyncSession, owner_id: UUID, data: dict) -> Workspace:
        """
        Create or update a workspace for owner_id + repo_key.
        'data' is the dict returned by /analyze.
        """
        repo_key = data["repo_key"]

        result = await db.execute(
            select(Workspace).where(
                Workspace.owner_id == owner_id,
                Workspace.repo_key == repo_key,
            )
        )
        ws = result.scalar_one_or_none()

        if ws:
            # Update existing
            ws.description       = data.get("description")
            ws.language          = data.get("language")
            ws.stars             = data.get("stars", 0)
            ws.forks             = data.get("forks", 0)
            ws.file_count        = data.get("file_count", 0)
            ws.ai_summary        = data.get("summary")
            ws.last_indexed_at   = datetime.now(timezone.utc)
            ws.chroma_collection = repo_key.replace("/", "_").replace("-", "_").replace(".", "_")
        else:
            ws = Workspace(
                owner_id          = owner_id,
                repo_key          = repo_key,
                repo_name         = data.get("name", repo_key),
                repo_url          = f"https://github.com/{repo_key}",
                description       = data.get("description"),
                language          = data.get("language"),
                stars             = data.get("stars", 0),
                forks             = data.get("forks", 0),
                file_count        = data.get("file_count", 0),
                ai_summary        = data.get("summary"),
                share_token       = secrets.token_hex(12),
                last_indexed_at   = datetime.now(timezone.utc),
                chroma_collection = repo_key.replace("/", "_").replace("-", "_").replace(".", "_"),
            )
            db.add(ws)

        await db.flush()    # get the ID without committing
        return ws

    # ── Read ─────────────────────────────────────────────────────────────
    @staticmethod
    async def get_by_id(db: AsyncSession, workspace_id: UUID) -> Optional[Workspace]:
        result = await db.execute(
            select(Workspace)
            .options(selectinload(Workspace.members))
            .where(Workspace.id == workspace_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_share_token(db: AsyncSession, token: str) -> Optional[Workspace]:
        result = await db.execute(
            select(Workspace).where(Workspace.share_token == token)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_for_user(db: AsyncSession, user_id: UUID) -> list[Workspace]:
        """All workspaces owned by user OR where user is an accepted member."""
        owned = await db.execute(
            select(Workspace).where(Workspace.owner_id == user_id)
            .order_by(Workspace.updated_at.desc())
        )
        member_ws_ids = await db.execute(
            select(WorkspaceMember.workspace_id).where(
                WorkspaceMember.user_id == user_id,
                WorkspaceMember.status == "accepted",
            )
        )
        member_ids = [r[0] for r in member_ws_ids]

        shared = await db.execute(
            select(Workspace).where(Workspace.id.in_(member_ids))
            .order_by(Workspace.updated_at.desc())
        )
        return list(owned.scalars().all()) + list(shared.scalars().all())

    # ── Invite / membership ───────────────────────────────────────────────
    @staticmethod
    async def invite_member(
        db: AsyncSession,
        workspace_id: UUID,
        invited_by: UUID,
        email: str,
        role: str = "viewer",
    ) -> WorkspaceMember:
        member = WorkspaceMember(
            workspace_id  = workspace_id,
            invited_email = email,
            role          = role,
            invited_by    = invited_by,
            status        = "pending",
        )
        db.add(member)
        await db.flush()
        return member

    @staticmethod
    async def accept_invite(db: AsyncSession, token: str, user_id: UUID) -> Optional[WorkspaceMember]:
        """Accept an invite by share token — link user to workspace."""
        ws = await WorkspaceService.get_by_share_token(db, token)
        if not ws:
            return None

        result = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == ws.id,
                WorkspaceMember.user_id.is_(None),
            )
        )
        member = result.scalar_one_or_none()
        if member:
            member.user_id     = user_id
            member.status      = "accepted"
            member.accepted_at = datetime.now(timezone.utc)
            await db.flush()
        return member

    @staticmethod
    async def list_members(db: AsyncSession, workspace_id: UUID) -> list[WorkspaceMember]:
        result = await db.execute(
            select(WorkspaceMember)
            .options(selectinload(WorkspaceMember.user))
            .where(WorkspaceMember.workspace_id == workspace_id)
        )
        return list(result.scalars().all())


class ChatService:

    @staticmethod
    async def get_or_create_session(
        db: AsyncSession,
        workspace_id: UUID,
        user_id: UUID,
    ) -> ChatSession:
        """Return the most recent session or create a new one."""
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.workspace_id == workspace_id,
                ChatSession.user_id == user_id,
            ).order_by(ChatSession.updated_at.desc()).limit(1)
        )
        session = result.scalar_one_or_none()
        if not session:
            session = ChatSession(workspace_id=workspace_id, user_id=user_id)
            db.add(session)
            await db.flush()
        return session

    @staticmethod
    async def save_message(
        db: AsyncSession,
        session_id: UUID,
        role: str,
        content: str,
        sources: list[str] | None = None,
        model: str | None = None,
        duration_ms: int | None = None,
    ) -> ChatMessage:
        msg = ChatMessage(
            session_id  = session_id,
            role        = role,
            content     = content,
            sources     = sources or [],
            model       = model,
            duration_ms = duration_ms,
        )
        db.add(msg)
        await db.flush()
        return msg

    @staticmethod
    async def get_history(
        db: AsyncSession,
        session_id: UUID,
        limit: int = 50,
    ) -> list[ChatMessage]:
        result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def list_sessions(db: AsyncSession, workspace_id: UUID, user_id: UUID) -> list[ChatSession]:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.workspace_id == workspace_id,
                ChatSession.user_id == user_id,
            ).order_by(ChatSession.updated_at.desc())
        )
        return list(result.scalars().all())


class AnalyticsService:

    @staticmethod
    async def log_query(
        db: AsyncSession,
        workspace_id: UUID | None,
        user_id: UUID | None,
        question: str,
        answer: str,
        sources: list[str],
        model: str,
        duration_ms: int,
    ):
        log = QueryLog(
            workspace_id = workspace_id,
            user_id      = user_id,
            question     = question,
            answer_len   = len(answer),
            sources      = sources,
            model        = model,
            duration_ms  = duration_ms,
        )
        db.add(log)
        await db.flush()

    @staticmethod
    async def workspace_stats(db: AsyncSession, workspace_id: UUID) -> dict:
        """Query count + top questions for a workspace."""
        count = await db.execute(
            select(func.count()).where(QueryLog.workspace_id == workspace_id)
        )
        recent = await db.execute(
            select(QueryLog)
            .where(QueryLog.workspace_id == workspace_id)
            .order_by(QueryLog.created_at.desc())
            .limit(10)
        )
        return {
            "total_queries": count.scalar(),
            "recent":        [r.question for r in recent.scalars().all()],
        }


class ArchService:

    @staticmethod
    async def save_snapshot(
        db: AsyncSession,
        workspace_id: UUID,
        nodes: list,
        edges: list,
        generated_by: str = "heuristic",
    ) -> ArchSnapshot:
        # Bump version
        result = await db.execute(
            select(func.max(ArchSnapshot.version)).where(
                ArchSnapshot.workspace_id == workspace_id
            )
        )
        current_max = result.scalar() or 0

        snap = ArchSnapshot(
            workspace_id = workspace_id,
            nodes        = nodes,
            edges        = edges,
            version      = current_max + 1,
            generated_by = generated_by,
        )
        db.add(snap)
        await db.flush()
        return snap

    @staticmethod
    async def latest(db: AsyncSession, workspace_id: UUID) -> Optional[ArchSnapshot]:
        result = await db.execute(
            select(ArchSnapshot)
            .where(ArchSnapshot.workspace_id == workspace_id)
            .order_by(ArchSnapshot.version.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()


class AuditService:

    @staticmethod
    async def log(
        db: AsyncSession,
        action: str,
        user_id: UUID | None = None,
        workspace_id: UUID | None = None,
        metadata: dict | None = None,
        ip_address: str | None = None,
    ):
        entry = AuditLog(
            action       = action,
            user_id      = user_id,
            workspace_id = workspace_id,
            meta         = metadata or {},
            ip_address   = ip_address,
        )
        db.add(entry)
        # Don't flush — caller commits
