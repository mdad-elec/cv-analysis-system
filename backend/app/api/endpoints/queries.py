from typing import Dict, List
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from redis.asyncio import Redis

from app.core.logging import logger
from app.core.database import redis_client, get_parsed_data_collection
from app.models.documents import CVQuery, ParsedCV
from app.services.llm_service import LLMService

router = APIRouter()

try:
    llm_service = LLMService()
except Exception as e:
    logger.error(f"Failed to initialize LLM service: {e}")
    llm_service = None

@router.post("/query")
async def query_cv_data(query: CVQuery) -> Dict[str, str]:

    if not llm_service:
        logger.error("LLM service is not initialized")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LLM service is not initialized. Please check system logs."
        )
    
    try:
        parsed_data_collection = get_parsed_data_collection()
        
        logger.info(f"Processing query: '{query.query}'")
        
        try:
            parsed_data_docs = await parsed_data_collection.find().to_list(None)
            logger.info(f"Retrieved {len(parsed_data_docs)} documents from MongoDB")
            
            if parsed_data_docs and len(parsed_data_docs) > 0:
                logger.info(f"Sample document structure: {list(parsed_data_docs[0].keys())}")
        except Exception as db_error:
            logger.error(f"Error retrieving documents from MongoDB: {str(db_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database retrieval error: {str(db_error)}"
            )
        
        parsed_cvs = []
        conversion_errors = 0
        
        for doc in parsed_data_docs:
            try:
                original_id = str(doc.pop('_id', '')) if '_id' in doc else None
  
                parsed_cv = ParsedCV.model_validate(doc)
                
                parsed_cv.id = original_id
                
                if not parsed_cv.raw_text:
                    parsed_cv.raw_text = "No raw text available"
                
                parsed_cvs.append(parsed_cv)
                
            except Exception as validation_error:
                conversion_errors += 1
                logger.warning(f"Error converting document to ParsedCV: {validation_error}")
                try:
                    minimal_cv = ParsedCV(
                        id=str(doc.get('_id', '')),
                        raw_text="Partial data available"
                    )
                    
                    if 'personal_info' in doc and isinstance(doc['personal_info'], dict):
                        minimal_cv.personal_info.name = doc['personal_info'].get('name')
                        minimal_cv.personal_info.email = doc['personal_info'].get('email')
                    
                    if 'skills' in doc and isinstance(doc['skills'], list):
                        for skill_item in doc['skills']:
                            if isinstance(skill_item, dict) and 'name' in skill_item:
                                minimal_cv.skills.append({
                                    'name': skill_item['name'],
                                    'category': skill_item.get('category')
                                })
                    
                    parsed_cvs.append(minimal_cv)
                    logger.info(f"Added document with minimal valid data instead")
                except Exception as backup_error:
                    logger.error(f"Even minimal CV parsing failed: {backup_error}")
        
        logger.info(f"Successfully converted {len(parsed_cvs)} CVs, with {conversion_errors} conversion errors")
        
        if not parsed_cvs:
            logger.warning("No valid CV data found to process query")
            return {"response": "No CV data available to query. Please upload some CVs first."}
        
        logger.info(f"Processing query with {len(parsed_cvs)} CVs")
        for i, cv in enumerate(parsed_cvs[:5]): 
            name = cv.personal_info.name if cv.personal_info and cv.personal_info.name else "Unknown"
            skill_count = len(cv.skills) if cv.skills else 0
            logger.info(f"CV #{i+1}: {name}, {skill_count} skills, ID: {cv.id}")
        
        try:
            if llm_service.embedding_model:
                llm_service.build_index(parsed_cvs)
                logger.info("Successfully built search index for CVs")
            else:
                logger.warning("Embedding model not initialized, skipping index building")
        except Exception as index_error:
            logger.warning(f"Failed to build index: {index_error}, continuing with basic processing")
        
        try:
            response = await llm_service.query_cv_data(query, parsed_cvs)
            logger.info("Successfully received response from LLM service")
        except Exception as llm_error:
            logger.error(f"Error querying LLM service: {llm_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing query with LLM: {str(llm_error)}"
            )
        
        try:
            if redis_client:
                query_key = f"query:{ObjectId()}"
                await redis_client.set(query_key, query.model_dump_json(), ex=3600) 
                logger.info("Successfully saved query to Redis history")
        except Exception as redis_error:
            logger.warning(f"Failed to save query to Redis: {redis_error}")
        
        return {"response": response}
    
    except Exception as e:
        logger.error(f"Error querying CV data: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error querying CV data: {str(e)}"
        )

@router.post("/followup")
async def followup_query(query: CVQuery) -> Dict[str, str]:

    try:
        return await query_cv_data(query)
    except Exception as e:
        logger.error(f"Error in followup query: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in followup query: {str(e)}"
        )