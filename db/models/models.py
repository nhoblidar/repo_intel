"""
RepoIntel — SQLAlchemy ORM models
Maps 1:1 to db/migrations/001_initial_schema.sql
"""
import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer,
    String, Text, BigInteger, JSON
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, INET, JSONB
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


# ─── USERS ────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    github_id     = Column(BigInteger, unique=True, nullable=True)
    github_login  = Column(Text, unique=True, nullable=False)
    github_email  = Column(Text, nullable=True)
    avatar_url    = Column(Text, nullable=True)
    name          = Column(Text, nullable=True)
    plan          = Column(Text, nullable=False, default="free")
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    workspaces    = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")
    memberships   = relationship("WorkspaceMember", foreign_keys="WorkspaceMember.user_id", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    api_keys      = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id":           str(self.id),
            "github_login": self.github_login,
            "github_email": self.github_email,
            "avatar_url":   self.avatar_url,
            "name":         self.name,
            "plan":         self.plan,
            "created_at":   self.created_at.isoformat() if self.created_at else None,
        }


# ─── WORKSPACES ───────────────────────────────────────────
class Workspace(Base):
    __tablename__ = "workspaces"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id          = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    repo_key          = Column(Text, nullable=False)
    repo_name         = Column(Text, nullable=False)
    repo_url          = Column(Text, nullable=False)
    description       = Column(Text, nullable=True)
    language          = Column(Text, nullable=True)
    stars             = Column(Integer, default=0)
    forks             = Column(Integer, default=0)
    file_count        = Column(Integer, default=0)
    ai_summary        = Column(Text, nullable=True)
    is_public         = Column(Boolean, nullable=False, default=False)
    share_token       = Column(Text, unique=True)
    last_indexed_at   = Column(DateTime(timezone=True), nullable=True)
    chroma_collection = Column(Text, nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner         = relationship("User", back_populates="workspaces")
    members       = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="workspace", cascade="all, delete-orphan")
    arch_snapshots = relationship("ArchSnapshot", back_populates="workspace", cascade="all, delete-orphan",
                                  order_by="ArchSnapshot.version.desc()")

    def to_dict(self):
        return {
            "id":               str(self.id),
            "owner_id":         str(self.owner_id),
            "repo_key":         self.repo_key,
            "repo_name":        self.repo_name,
            "repo_url":         self.repo_url,
            "description":      self.description,
            "language":         self.language,
            "stars":            self.stars,
            "forks":            self.forks,
            "file_count":       self.file_count,
            "ai_summary":       self.ai_summary,
            "is_public":        self.is_public,
            "share_token":      self.share_token,
            "last_indexed_at":  self.last_indexed_at.isoformat() if self.last_indexed_at else None,
            "created_at":       self.created_at.isoformat() if self.created_at else None,
        }


# ─── WORKSPACE MEMBERS ────────────────────────────────────
class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id  = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    invited_email = Column(Text, nullable=True)
    role          = Column(Text, nullable=False, default="viewer")
    status        = Column(Text, nullable=False, default="pending")
    invited_by    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    accepted_at   = Column(DateTime(timezone=True), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", back_populates="members")
    user      = relationship("User", foreign_keys=[user_id], back_populates="memberships")

    def to_dict(self):
        return {
            "id":            str(self.id),
            "workspace_id":  str(self.workspace_id),
            "user_id":       str(self.user_id) if self.user_id else None,
            "invited_email": self.invited_email,
            "role":          self.role,
            "status":        self.status,
            "accepted_at":   self.accepted_at.isoformat() if self.accepted_at else None,
            "created_at":    self.created_at.isoformat() if self.created_at else None,
        }


# ─── CHAT SESSIONS ────────────────────────────────────────
class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title        = Column(Text, nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="chat_sessions")
    user      = relationship("User", back_populates="chat_sessions")
    messages  = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan",
                             order_by="ChatMessage.created_at")

    def to_dict(self):
        return {
            "id":           str(self.id),
            "workspace_id": str(self.workspace_id),
            "user_id":      str(self.user_id),
            "title":        self.title,
            "created_at":   self.created_at.isoformat() if self.created_at else None,
        }


# ─── CHAT MESSAGES ────────────────────────────────────────
class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id  = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role        = Column(Text, nullable=False)
    content     = Column(Text, nullable=False)
    sources     = Column(ARRAY(Text), nullable=True)
    tokens_used = Column(Integer, nullable=True)
    model       = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")

    def to_dict(self):
        return {
            "id":          str(self.id),
            "session_id":  str(self.session_id),
            "role":        self.role,
            "content":     self.content,
            "sources":     self.sources or [],
            "tokens_used": self.tokens_used,
            "model":       self.model,
            "duration_ms": self.duration_ms,
            "created_at":  self.created_at.isoformat() if self.created_at else None,
        }


# ─── QUERY ANALYTICS ──────────────────────────────────────
class QueryLog(Base):
    __tablename__ = "query_log"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    question     = Column(Text, nullable=False)
    answer_len   = Column(Integer, nullable=True)
    sources      = Column(ARRAY(Text), nullable=True)
    model        = Column(Text, nullable=True)
    tokens_in    = Column(Integer, nullable=True)
    tokens_out   = Column(Integer, nullable=True)
    duration_ms  = Column(Integer, nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())


# ─── ARCHITECTURE SNAPSHOTS ───────────────────────────────
class ArchSnapshot(Base):
    __tablename__ = "arch_snapshots"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    nodes        = Column(JSONB, nullable=False, default=list)
    edges        = Column(JSONB, nullable=False, default=list)
    version      = Column(Integer, nullable=False, default=1)
    generated_by = Column(Text, default="heuristic")
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", back_populates="arch_snapshots")

    def to_dict(self):
        return {
            "id":           str(self.id),
            "workspace_id": str(self.workspace_id),
            "nodes":        self.nodes,
            "edges":        self.edges,
            "version":      self.version,
            "generated_by": self.generated_by,
            "created_at":   self.created_at.isoformat() if self.created_at else None,
        }


# ─── API KEYS ─────────────────────────────────────────────
class ApiKey(Base):
    __tablename__ = "api_keys"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key_hash     = Column(Text, unique=True, nullable=False)
    name         = Column(Text, nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    expires_at   = Column(DateTime(timezone=True), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="api_keys")


# ─── AUDIT LOG ────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_log"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True)
    action       = Column(Text, nullable=False)
    meta         = Column("metadata", JSONB, default=dict)
    ip_address   = Column(INET, nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
