from typing import Dict, List, Optional, Union, Set, Tuple
import json
import anthropic
from anthropic.types import Message
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from tenacity import retry, stop_after_attempt, wait_exponential
import asyncio
import re

from app.core.config import settings
from app.core.logging import logger
from app.models.documents import ParsedCV, CVQuery, PersonalInfo, Education, WorkExperience, Skill, Project, Certification

class LLMService:
    def __init__(self):
        self.model_name = "claude-3-haiku-20240307"
        
        self.client = None
        self.embedding_model = None
        self.index = None
        self.cv_ids = []
        
        self.entity_map = {}
        
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Anthropic client and embedding model lazily."""
        if self.client is not None:
            return
            
        try:
            self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            logger.info("Anthropic client initialized successfully")
            
            # Load embedding model in background
            asyncio.create_task(self._initialize_embedding_model())
        except Exception as e:
            logger.error(f"Failed to initialize Anthropic client: {e}")
            self.client = None
    
    async def _initialize_embedding_model(self):
        try:
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            self.embedding_model = None
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def enhance_cv(self, parsed_cv: ParsedCV) -> ParsedCV:
        """Use LLM to extract and categorize all CV data in one comprehensive pass."""
        # Ensure client is initialized
        if not self.client:
            self._initialize_client()
            if not self.client:
                logger.error("Anthropic client initialization failed")
                return parsed_cv
        
        logger.info("Processing CV data using LLM")
        
        prompt = self._create_cv_parsing_prompt(parsed_cv.raw_text)
        
        try:
            response = self.client.messages.create(
                model=self.model_name,
                max_tokens=4000,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            json_response = self._extract_json_from_response(response.content[0].text)
            
            if json_response:
                enhanced_cv = self._cv_from_json(parsed_cv.raw_text, json_response)
                
                if self.embedding_model:
                    text_for_embedding = self._prepare_text_for_embedding(enhanced_cv)
                    embedding = self.embedding_model.encode(text_for_embedding).tolist()
                    enhanced_cv.embedding = embedding
                
                # Update entity map with this candidate's information
                self._update_entity_map(enhanced_cv)
                
                return enhanced_cv
            else:
                logger.warning("Could not extract valid JSON from LLM response")
                return parsed_cv
                
        except Exception as e:
            logger.error(f"Error calling Anthropic API: {e}")
            raise
    
    def _update_entity_map(self, cv: ParsedCV):
        """Update entity map with candidate information for better entity resolution."""
        if not cv.personal_info or not cv.personal_info.name:
            return
            
        name = cv.personal_info.name.lower()
        
        if name not in self.entity_map:
            self.entity_map[name] = {
                "id": cv.id,
                "aliases": self._generate_name_variants(name),
                "skills": set(),
                "companies": set(),
                "education": set()
            }
        
        for skill in cv.skills:
            if skill.name:
                self.entity_map[name]["skills"].add(skill.name.lower())
        
        for exp in cv.work_experience:
            if exp.company:
                self.entity_map[name]["companies"].add(exp.company.lower())
        
        for edu in cv.education:
            if edu.institution:
                self.entity_map[name]["education"].add(edu.institution.lower())
                
    def _generate_name_variants(self, name: str) -> Set[str]:
        """Generate common variants of a name for better entity resolution."""
        variants = {name}
        
        parts = name.split()
        if len(parts) > 1:
            variants.add(f"{parts[0]} {parts[-1]}")
            
            initials = "".join(p[0] for p in parts[:-1])
            variants.add(f"{initials}. {parts[-1]}")
            
            variants.add(f"{parts[0][0]}. {parts[-1]}")
            
            variants.add(parts[-1])
            
        return variants
    
    def _create_cv_parsing_prompt(self, raw_text: str) -> str:
        prompt = f"""
        You are an expert CV/resume parser. I'll provide the raw text extracted from a CV.
        Please extract and structure all relevant information into these categories:

        1. Personal Information (name, email, phone, location, LinkedIn, GitHub, website)
        2. Education History (institution, degree, field of study, dates, GPA)
        3. Work Experience (company, position, dates, location, description, highlights)
        4. Skills (categorized by type)
        5. Projects (name, description, technologies used, urls)
        6. Certifications (name, issuer, date)

        For each section:
        - Extract all information that can be confidently determined
        - For dates, extract both start and end dates where applicable
        - For work experience, separate the description from bullet point highlights
        - For skills, categorize them (e.g., Programming Languages, Tools, Soft Skills)
        - Ignore any information that isn't relevant to these categories

        Raw CV text:
        {raw_text}

        Respond with a JSON object containing the structured information. The format should be:

        ```json
        {{
          "personal_information": {{
            "name": "...",
            "email": "...",
            "phone": "...",
            "location": "...",
            "linkedin": "...",
            "github": "...",
            "website": "..."
          }},
          "education": [
            {{
              "institution": "...",
              "degree": "...",
              "field_of_study": "...",
              "start_date": "YYYY-MM",
              "end_date": "YYYY-MM or Present",
              "gpa": "..."
            }}
          ],
          "work_experience": [
            {{
              "company": "...",
              "position": "...",
              "start_date": "YYYY-MM",
              "end_date": "YYYY-MM or Present",
              "location": "...",
              "description": "...",
              "highlights": [
                "...",
                "..."
              ]
            }}
          ],
          "skills": {{
            "Programming Languages": ["...", "..."],
            "Frameworks": ["...", "..."],
            "Tools": ["...", "..."],
            "Soft Skills": ["...", "..."]
          }},
          "projects": [
            {{
              "name": "...",
              "description": "...",
              "technologies": ["...", "..."],
              "url": "..."
            }}
          ],
          "certifications": [
            {{
              "name": "...",
              "issuer": "...",
              "date": "YYYY-MM"
            }}
          ]
        }}
        ```

        For any field where you cannot determine the value, use null instead of leaving it blank or guessing.
        For arrays, if there are no items, use an empty array [].
        For objects, include all fields even if they are null.
        Your response should contain ONLY the JSON object, nothing else.
        """
        
        return prompt
    
    def _extract_json_from_response(self, response_text: str) -> Optional[Dict]:
        """Extract JSON from LLM response with improved error handling."""
        json_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
        json_match = re.search(json_pattern, response_text)
        
        if json_match:
            json_str = json_match.group(1)
        else:
            curly_pattern = r'(\{[\s\S]*\})'
            curly_match = re.search(curly_pattern, response_text)
            if curly_match:
                json_str = curly_match.group(1)
            else:
                return None
        
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            try:
                fixed_str = json_str.replace("'", "\"")
                fixed_str = re.sub(r',\s*}', '}', fixed_str)
                fixed_str = re.sub(r',\s*]', ']', fixed_str)
                return json.loads(fixed_str)
            except json.JSONDecodeError:
                logger.error("Failed to parse JSON even after fixes")
                return None
    
    def _cv_from_json(self, raw_text: str, json_data: Dict) -> ParsedCV:
        import dateparser
        
        parsed_cv = ParsedCV(raw_text=raw_text)
        
        if 'personal_information' in json_data:
            personal = json_data['personal_information']
            parsed_cv.personal_info = PersonalInfo(
                name=personal.get('name'),
                email=personal.get('email'),
                phone=personal.get('phone'),
                location=personal.get('location'),
                linkedin=personal.get('linkedin'),
                github=personal.get('github'),
                website=personal.get('website')
            )
        
        if 'education' in json_data and json_data['education']:
            parsed_cv.education = []
            for edu in json_data['education']:
                education = Education(
                    institution=edu.get('institution'),
                    degree=edu.get('degree'),
                    field_of_study=edu.get('field_of_study'),
                    gpa=edu.get('gpa')
                )
                
                if 'start_date' in edu and edu['start_date']:
                    education.start_date = dateparser.parse(edu['start_date'])
                if 'end_date' in edu and edu['end_date']:
                    education.end_date = dateparser.parse(edu['end_date'])
                
                parsed_cv.education.append(education)
        
        if 'work_experience' in json_data and json_data['work_experience']:
            parsed_cv.work_experience = []
            for work in json_data['work_experience']:
                experience = WorkExperience(
                    company=work.get('company'),
                    position=work.get('position'),
                    location=work.get('location'),
                    description=work.get('description')
                )
                
                if 'start_date' in work and work['start_date']:
                    experience.start_date = dateparser.parse(work['start_date'])
                if 'end_date' in work and work['end_date']:
                    experience.end_date = dateparser.parse(work['end_date'])
                
                if 'highlights' in work and work['highlights']:
                    experience.highlights = work['highlights']
                
                parsed_cv.work_experience.append(experience)
        
        if 'skills' in json_data and json_data['skills']:
            parsed_cv.skills = []
            
            if isinstance(json_data['skills'], dict):
                for category, skills in json_data['skills'].items():
                    if isinstance(skills, list):
                        for skill_name in skills:
                            parsed_cv.skills.append(Skill(name=skill_name, category=category))
            
            elif isinstance(json_data['skills'], list):
                for skill in json_data['skills']:
                    if isinstance(skill, str):
                        parsed_cv.skills.append(Skill(name=skill))
                    elif isinstance(skill, dict) and 'name' in skill:
                        parsed_cv.skills.append(Skill(
                            name=skill['name'],
                            category=skill.get('category')
                        ))
        
        if 'projects' in json_data and json_data['projects']:
            parsed_cv.projects = []
            for proj in json_data['projects']:
                project = Project(
                    name=proj.get('name'),
                    description=proj.get('description'),
                    url=proj.get('url')
                )
                
                if 'technologies' in proj and proj['technologies']:
                    project.technologies = proj['technologies']
                
                if 'start_date' in proj and proj['start_date']:
                    project.start_date = dateparser.parse(proj['start_date'])
                if 'end_date' in proj and proj['end_date']:
                    project.end_date = dateparser.parse(proj['end_date'])
                
                parsed_cv.projects.append(project)
        
        if 'certifications' in json_data and json_data['certifications']:
            parsed_cv.certifications = []
            for cert in json_data['certifications']:
                certification = Certification(
                    name=cert.get('name'),
                    issuer=cert.get('issuer'),
                    url=cert.get('url')
                )
                
                if 'date' in cert and cert['date']:
                    certification.date = dateparser.parse(cert['date'])
                if 'expiration_date' in cert and cert['expiration_date']:
                    certification.expiration_date = dateparser.parse(cert['expiration_date'])
                
                parsed_cv.certifications.append(certification)
        
        return parsed_cv
    
    def _prepare_text_for_embedding(self, cv: ParsedCV) -> str:
        """Prepare CV text for embedding with improved weighting."""
        text_parts = []
        
        if cv.personal_info.name:
            text_parts.append(f"Name: {cv.personal_info.name}")
        
        if cv.skills:
            skills_by_category = {}
            for skill in cv.skills:
                category = skill.category or "Other"
                if category not in skills_by_category:
                    skills_by_category[category] = []
                skills_by_category[category].append(skill.name)
            
            for category, skills in skills_by_category.items():
                skills_text = f"{category} Skills: {', '.join(skills)}"
                text_parts.append(skills_text)
                if category in ["Programming Languages", "Frameworks", "Technologies"]:
                    text_parts.append(skills_text)
        
        if cv.work_experience:
            for work in cv.work_experience:
                position_text = f"Position: {work.position} at {work.company}"
                text_parts.append(position_text)
                text_parts.append(position_text)  
                
                if work.highlights:
                    highlights_text = "Work Highlights: " + ". ".join(work.highlights)
                    text_parts.append(highlights_text)
        
        if cv.education:
            for edu in cv.education:
                education_text = f"Education: {edu.degree}"
                if edu.field_of_study:
                    education_text += f" in {edu.field_of_study}"
                education_text += f" at {edu.institution}"
                text_parts.append(education_text)
        
        return "\n".join(text_parts)
    
    def _resolve_entity(self, name: str, cv_data: List[ParsedCV]) -> List[ParsedCV]:
        """Resolve entity mentions to actual candidates with disambiguation."""
        if not name:
            return []
            
        name_lower = name.lower()
        matched_cvs = []
        
        for cv in cv_data:
            if cv.personal_info and cv.personal_info.name and cv.personal_info.name.lower() == name_lower:
                matched_cvs.append(cv)
                
        if matched_cvs:
            return matched_cvs
            
        for person_name, info in self.entity_map.items():
            if name_lower in info["aliases"]:
                for cv in cv_data:
                    if cv.id == info["id"]:
                        matched_cvs.append(cv)
                        
        return matched_cvs
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def query_cv_data(self, query: CVQuery, cv_data: List[ParsedCV]) -> str:
        if not self.client:
            self._initialize_client()
            if not self.client:
                raise ValueError("Anthropic client initialization failed")
        
        logger.info(f"Querying CV data: {query.query}")
        
        cv_data_str = "\n".join([cv.raw_text for cv in cv_data])
        
        prompt = f"""
        You are a helpful assistant that answers questions about CV data. 
        Only provide answers based on the provided CV data. 
        
        Current query: {query.query}
        
        CV data:
        {cv_data_str}
        
        If the information is not available, respond with "The CV data does not provide this information."
        """
        
        try:
            response = self.client.messages.create(
                model=self.model_name,
                max_tokens=1500,
                system="You are a precise CV analysis assistant. You only make statements that are directly supported by the CV data.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Error calling Anthropic API for query: {e}")
            raise

    def _parse_conversation_context(self, context: str) -> List[Dict[str, str]]:
        if not context:
            return []
            
        qa_pairs = []
        lines = context.split('\n')
        
        current_role = None
        current_message = ""
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if line.startswith("User:"):
                if current_role == "assistant" and current_message:
                    qa_pairs[-1]["assistant"] = current_message.strip()
                    current_message = ""
                
                current_role = "user"
                message_content = line[5:].strip() 
                
                if message_content:
                    current_message = message_content
                else:
                    current_message = ""
                    
                qa_pairs.append({"user": "", "assistant": ""})
                
            elif line.startswith("Assistant:"):
                if current_role == "user" and current_message and qa_pairs:
                    qa_pairs[-1]["user"] = current_message.strip()
                    current_message = ""
                
                current_role = "assistant"
                message_content = line[10:].strip()  
                
                if message_content:
                    current_message = message_content
                else:
                    current_message = ""
                    
            else:
                if current_message:
                    current_message += " " + line
                else:
                    current_message = line
        
        if current_role and current_message and qa_pairs:
            qa_pairs[-1][current_role] = current_message.strip()
        
        qa_pairs = [qa for qa in qa_pairs if qa["user"] and qa["assistant"]]
        
        return qa_pairs
    
    def _extract_entity_mentions(self, query: str) -> List[str]:
        words = query.split()
        potential_entities = []
        
        i = 0
        while i < len(words):
            if words[i][0].isupper() and not words[i].isupper() and len(words[i]) > 1:
                # Could be start of a name
                name_parts = [words[i]]
                j = i + 1
                while j < len(words) and words[j][0].isupper() and not words[j].isupper() and len(words[j]) > 1:
                    name_parts.append(words[j])
                    j += 1
                
                if len(name_parts) > 1:  # Only consider multi-word names
                    potential_entities.append(" ".join(name_parts))
                    i = j
                else:
                    i += 1
            else:
                i += 1
        
        return potential_entities
    
    def build_index(self, cvs: List[ParsedCV]):
        """Build a FAISS index for CV embeddings."""
        if not cvs or not self.embedding_model:
            return
        
        valid_cvs = [cv for cv in cvs if cv.embedding and len(cv.embedding) > 0]
        if not valid_cvs:
            return
        
        embeddings = [cv.embedding for cv in valid_cvs]
        self.cv_ids = list(range(len(valid_cvs)))
        
        embeddings_np = np.array(embeddings).astype('float32')
        
        dimension = len(embeddings[0])
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(embeddings_np)
        
        logger.info(f"Built FAISS index with {len(valid_cvs)} CVs")
    
    def _get_relevant_cvs(self, query: str, cv_data: List[ParsedCV], top_k: int = 30) -> List[ParsedCV]:
        """Get relevant CVs using semantic search."""
        if not self.index or not self.embedding_model:
            return cv_data[:min(top_k, len(cv_data))]
        
        query_embedding = self.embedding_model.encode(query).reshape(1, -1).astype('float32')
        
        distances, indices = self.index.search(query_embedding, min(top_k, len(self.cv_ids)))
        
        relevant_cv_indices = indices[0]
        relevant_cvs = [cv_data[idx] for idx in relevant_cv_indices if idx < len(cv_data)]
        
        return relevant_cvs
    
    def _prepare_focused_cv_data(self, cvs: List[ParsedCV], query: str) -> str:
        """Prepare focused CV data relevant to the query."""
        query_lower = query.lower()
        
        focus_on_skills = any(term in query_lower for term in ['skill', 'technology', 'know', 'proficiency'])
        focus_on_education = any(term in query_lower for term in ['education', 'degree', 'university', 'school', 'college', 'academic', 'institution'])
        focus_on_experience = any(term in query_lower for term in ['experience', 'work', 'job', 'position'])
        focus_on_projects = any(term in query_lower for term in ['project', 'portfolio', 'build'])
        
        cv_texts = []
        
        for i, cv in enumerate(cvs):
            cv_text = f"--- CV #{i+1} ---\n"
            
            if cv.personal_info.name:
                cv_text += f"Name: {cv.personal_info.name}\n"
            
            if cv.skills and (focus_on_skills or not any([focus_on_education, focus_on_experience, focus_on_projects])):
                cv_text += "\nSkills:\n"
                skill_categories = {}
                
                for skill in cv.skills:
                    category = skill.category or "Other"
                    if category not in skill_categories:
                        skill_categories[category] = []
                    skill_categories[category].append(skill.name)
                
                for category, skills in skill_categories.items():
                    cv_text += f"- {category}: {', '.join(skills)}\n"
            
            if cv.education and (focus_on_education or not any([focus_on_skills, focus_on_experience, focus_on_projects])):
                cv_text += "\nEducation:\n"
                for edu in cv.education:
                    edu_text = f"- {edu.degree}"
                    if edu.field_of_study:
                        edu_text += f" in {edu.field_of_study}"
                    edu_text += f" at {edu.institution}"
                    
                    if 'when' in query_lower or 'year' in query_lower:
                        if edu.start_date and edu.end_date:
                            edu_text += f" ({edu.start_date.year}-{edu.end_date.year})"
                    
                    cv_text += edu_text + "\n"
            
            if cv.work_experience and (focus_on_experience or not any([focus_on_skills, focus_on_education, focus_on_projects])):
                cv_text += "\nWork Experience:\n"
                for work in cv.work_experience:
                    work_text = f"- {work.position} at {work.company}"
                    
                    if 'when' in query_lower or 'year' in query_lower or 'how long' in query_lower:
                        if work.start_date and work.end_date:
                            work_text += f" ({work.start_date.year}-{work.end_date.year})"
                    
                    cv_text += work_text + "\n"
                    
                    if work.description and ('detail' in query_lower or 'responsibility' in query_lower):
                        cv_text += f"  Description: {work.description}\n"
                    
                    if work.highlights and ('accomplish' in query_lower or 'achievement' in query_lower):
                        cv_text += "  Highlights:\n"
                        for highlight in work.highlights[:3]:  # Limit to 3 highlights
                            cv_text += f"   - {highlight}\n"
            
            if cv.projects and (focus_on_projects or 'project' in query_lower):
                cv_text += "\nProjects:\n"
                for project in cv.projects:
                    proj_text = f"- {project.name}"
                    if project.technologies:
                        proj_text += f" (Technologies: {', '.join(project.technologies[:5])})"  # Limit to 5 technologies
                    cv_text += proj_text + "\n"
                    
                    if project.description and len(project.description) > 10:

                        short_desc = project.description[:200] + "..." if len(project.description) > 200 else project.description
                        cv_text += f"  Description: {short_desc}\n"
            
            cv_texts.append(cv_text)
        
        return "\n\n".join(cv_texts)