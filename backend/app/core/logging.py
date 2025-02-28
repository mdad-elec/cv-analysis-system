import logging
import json
import sys
from pythonjsonlogger import jsonlogger
from datetime import datetime

from app.core.config import settings

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        log_record['timestamp'] = datetime.utcnow().isoformat()
        log_record['level'] = record.levelname
        log_record['app'] = settings.PROJECT_NAME
        log_record['environment'] = settings.APP_ENV

def setup_logging():
    log_handler = logging.StreamHandler(sys.stdout)
    formatter = CustomJsonFormatter('%(timestamp)s %(level)s %(name)s %(message)s')
    log_handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers = []
    root_logger.addHandler(log_handler)
    root_logger.setLevel(settings.LOG_LEVEL)

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("anthropic").setLevel(logging.WARNING)
    
    return root_logger

logger = setup_logging()