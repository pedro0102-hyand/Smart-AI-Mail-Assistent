from sqlalchemy import Column, Integer, Boolean, Float, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class EmailProductivity(Base):
    __tablename__ = "email_productivity"

    id = Column(Integer, primary_key=True, index=True)
    email_id = Column(Integer, ForeignKey("emails.id"), unique=True, nullable=False)
    is_productive = Column(Boolean, nullable=False)
    productive_score = Column(Float, nullable=False)
    label = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    email = relationship("Email", back_populates="productivity")
