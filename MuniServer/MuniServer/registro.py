"""Logs en una línea JSON por evento, para que docker logs y cualquier recolector los lean igual."""
import json
import logging
from datetime import datetime, timezone


class FormatoJSON(logging.Formatter):
    def format(self, record):
        datos = {
            'fecha': datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            'nivel': record.levelname,
            'origen': record.name,
            'mensaje': record.getMessage(),
        }
        if record.exc_info:
            datos['error'] = self.formatException(record.exc_info)
        return json.dumps(datos, ensure_ascii=False)
