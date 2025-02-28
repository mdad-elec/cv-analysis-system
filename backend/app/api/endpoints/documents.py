import os
import shutil
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Dict, List
from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import logger
from app.core.database import get_cvs_collection, get_parsed_data_collection
from app.models.documents import CVDocument, DocumentStatus, DocumentType, ParsedCV
from app.services.document_processing import DocumentProcessor
from app.services.llm_service import LLMService

router = APIRouter()
llm_service = LLMService()

@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_document(file: UploadFile = File(...)) -> Dict:

    file_size = 0
    max_size = settings.MAX_DOCUMENT_SIZE_MB * 1024 * 1024  
    
    file_ext = Path(file.filename).suffix.lower().lstrip(".")
    if file_ext not in settings.ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(settings.ALLOWED_DOCUMENT_TYPES)}"
        )
    
    upload_dir = Path("data/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    with NamedTemporaryFile(delete=False) as temp_file:
        shutil.copyfileobj(file.file, temp_file)
        file_size = temp_file.tell()
        
        if file_size > max_size:
            os.unlink(temp_file.name)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {settings.MAX_DOCUMENT_SIZE_MB}MB"
            )
        
        file_path = upload_dir / f"{ObjectId()}.{file_ext}"
        shutil.move(temp_file.name, file_path)
    
    document_type = DocumentType.PDF if file_ext == "pdf" else DocumentType.DOCX
    cv_document = CVDocument(
        filename=file.filename,
        file_type=document_type,
        file_size=file_size,
        file_path=str(file_path),
        status=DocumentStatus.PENDING
    )
    
    cvs_collection = get_cvs_collection()
    result = await cvs_collection.insert_one(cv_document.model_dump(exclude={"id"}))
    document_id = str(result.inserted_id)
    
    try:
        await cvs_collection.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {"status": DocumentStatus.PROCESSING}}
        )
        
        parsed_cv, error = await DocumentProcessor.process_document(cv_document)
        
        if error:
            await cvs_collection.update_one(
                {"_id": ObjectId(document_id)},
                {
                    "$set": {
                        "status": DocumentStatus.FAILED,
                        "error_message": error
                    }
                }
            )
            logger.error(f"Document processing failed: {error}")
        else:
            try:
                if not hasattr(parsed_cv, 'id') or parsed_cv.id is None:
                    parsed_cv.id = document_id
                
                enhanced_cv = await llm_service.enhance_cv(parsed_cv)
                
                if not enhanced_cv.embedding:
                    text_for_embedding = llm_service._prepare_text_for_embedding(enhanced_cv)
                    enhanced_cv.embedding = llm_service.embedding_model.encode(text_for_embedding).tolist()
                
                parsed_data_collection = get_parsed_data_collection()
                parsed_data_result = await parsed_data_collection.insert_one(
                    enhanced_cv.model_dump(by_alias=True, exclude={"id"})
                )
                parsed_data_id = str(parsed_data_result.inserted_id)
                
                await cvs_collection.update_one(
                    {"_id": ObjectId(document_id)},
                    {
                        "$set": {
                            "status": DocumentStatus.COMPLETED,
                            "parsed_data_id": parsed_data_id
                        }
                    }
                )
                
                logger.info(f"Document processed successfully: {document_id}")
            except Exception as e:
                logger.error(f"Error enhancing CV with LLM: {str(e)}", exc_info=True)
                await cvs_collection.update_one(
                    {"_id": ObjectId(document_id)},
                    {
                        "$set": {
                            "status": DocumentStatus.FAILED,
                            "error_message": f"Error enhancing CV: {str(e)}"
                        }
                    }
                )
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}", exc_info=True)
        await cvs_collection.update_one(
            {"_id": ObjectId(document_id)},
            {
                "$set": {
                    "status": DocumentStatus.FAILED,
                    "error_message": str(e)
                }
            }
        )
    
    return {"message": "Document uploaded and queued for processing", "document_id": document_id}

@router.get("/status/{document_id}")
async def get_document_status(document_id: str) -> Dict:

    try:
        cvs_collection = get_cvs_collection()
        document = await cvs_collection.find_one({"_id": ObjectId(document_id)})
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {document_id} not found"
            )
        
        document["_id"] = str(document["_id"])
        if "parsed_data_id" in document and document["parsed_data_id"]:
            document["parsed_data_id"] = str(document["parsed_data_id"])
        
        return document
    except Exception as e:
        logger.error(f"Error getting document status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting document status: {str(e)}"
        )

@router.get("/list")
async def list_documents() -> List[Dict]:

    try:
        cvs_collection = get_cvs_collection()
        documents = await cvs_collection.find().to_list(length=100)  
        
        for doc in documents:
            doc["_id"] = str(doc["_id"])
            if "parsed_data_id" in doc and doc["parsed_data_id"]:
                doc["parsed_data_id"] = str(doc["parsed_data_id"])
        
        return documents
    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing documents: {str(e)}"
        )

@router.get("/{document_id}")
async def get_document(document_id: str) -> Dict:

    try:
        cvs_collection = get_cvs_collection()
        document = await cvs_collection.find_one({"_id": ObjectId(document_id)})
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {document_id} not found"
            )
        
        document["_id"] = str(document["_id"])
        
        if "parsed_data_id" in document and document["parsed_data_id"]:
            parsed_data_id = document["parsed_data_id"]
            document["parsed_data_id"] = str(parsed_data_id)
            
            parsed_data_collection = get_parsed_data_collection()
            parsed_data = await parsed_data_collection.find_one({"_id": ObjectId(parsed_data_id)})
            
            if parsed_data:
                parsed_data["_id"] = str(parsed_data["_id"])
                document["parsed_data"] = parsed_data
        
        return document
    except Exception as e:
        logger.error(f"Error getting document: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting document: {str(e)}"
        )

@router.delete("/{document_id}")
async def delete_document(document_id: str) -> Dict:

    try:
        cvs_collection = get_cvs_collection()
        document = await cvs_collection.find_one({"_id": ObjectId(document_id)})
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {document_id} not found"
            )
        
        if "file_path" in document and document["file_path"]:
            file_path = Path(document["file_path"])
            if file_path.exists():
                file_path.unlink()
        
        if "parsed_data_id" in document and document["parsed_data_id"]:
            parsed_data_id = document["parsed_data_id"]
            parsed_data_collection = get_parsed_data_collection()
            await parsed_data_collection.delete_one({"_id": ObjectId(parsed_data_id)})
        
        await cvs_collection.delete_one({"_id": ObjectId(document_id)})
        
        return {"message": f"Document with ID {document_id} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting document: {str(e)}"
        )