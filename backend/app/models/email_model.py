from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    gmail_id = Column(String, unique=True, nullable=False)   # ID original do Gmail
    thread_id = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    sender = Column(String, nullable=True)
    recipient = Column(String, nullable=True)
    snippet = Column(String, nullable=True)                  # preview curto do Gmail
    body = Column(Text, nullable=True)                       # corpo completo
    date = Column(DateTime, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relacionamentos
    user = relationship("User", back_populates="emails")
    analysis = relationship("EmailAnalysis", back_populates="email", uselist=False)