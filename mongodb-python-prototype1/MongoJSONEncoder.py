from json import JSONEncoder
from bson.objectid import ObjectId
import datetime
from bson import json_util
from bson.py3compat import string_types

class MongoJSONEncoder(JSONEncoder):
    """A C{json.JSONEncoder} subclass to encode documents that have fields of
    type C{bson.objectid.ObjectId}, C{datetime.datetime}
    """
    def default(self, obj):
        if hasattr(obj, 'iteritems') or hasattr(obj, 'items'):  # PY3 support
            return dict(((k, self.default(v)) for k, v in obj.iteritems()))
        elif hasattr(obj, '__iter__') and not isinstance(obj, string_types):
            return list((self.default(v) for v in obj))
        try:
            if isinstance(obj, ObjectId):
                return str(obj)
            elif isinstance(obj, datetime.datetime):
                return obj.isoformat()
            else:
                return json_util.default(obj)
        except TypeError:
            return obj