from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class EmailAnalysis(Base):
    __tablename__ = "email_analysis"

    id = Column(Integer, primary_key=True, index=True)
    email_id = Column(Integer, ForeignKey("emails.id"), unique=True, nullable=False)
    summary = Column(Text, nullable=True)           # resumo gerado pela IA
    suggested_reply = Column(Text, nullable=True)   # resposta sugerida pela IA
    category = Column(String, nullable=True)        # trabalho, financeiro, pessoal, urgente...
    urgency = Column(String, nullable=True)         # alta, média, baixa
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relacionamento
    email = relationship("Email", back_populates="analysis")