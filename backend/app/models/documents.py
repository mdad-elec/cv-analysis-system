from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Union
from pydantic import BaseModel, Field

class DocumentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class DocumentType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"

class PersonalInfo(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    website: Optional[str] = None

class Education(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = "Not Specified"
    field_of_study: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    gpa: Optional[float] = None
    description: Optional[str] = None

class WorkExperience(BaseModel):
    company: str
    position: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    location: Optional[str] = None
    description: Optional[str] = None
    highlights: List[str] = []

class Project(BaseModel):
    name: str
    description: Optional[str] = None
    technologies: List[str] = []
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    url: Optional[str] = None

class Certification(BaseModel):
    name: str
    issuer: Optional[str] = None
    date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    url: Optional[str] = None

class Skill(BaseModel):
    name: str
    category: Optional[str] = None
    level: Optional[str] = None

class ParsedCV(BaseModel):
    id: Optional[str] = None
    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)
    education: List[Education] = []
    work_experience: List[WorkExperience] = []
    skills: List[Skill] = []
    projects: List[Project] = []
    certifications: List[Certification] = []
    raw_text: str = ""
    embedding: Optional[List[float]] = None

class CVDocument(BaseModel):
    id: Optional[str] = None
    filename: str
    file_type: DocumentType
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    status: DocumentStatus = DocumentStatus.PENDING
    error_message: Optional[str] = None
    file_size: int
    file_path: str
    parsed_data_id: Optional[str] = None

class CVQuery(BaseModel):
    query: str
    context: Optional[str] = None