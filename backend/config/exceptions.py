from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """Normalise every DRF error to {"detail": str, "code": str}.

    The frontend has one error renderer; without this it has to cope with
    both {"detail": ...} and {"field": ["msg"]} shapes.
    """
    response = exception_handler(exc, context)
    if response is None:
        return None

    data = response.data
    code = getattr(exc, "default_code", "error")

    if isinstance(data, dict):
        if "detail" in data:
            detail = str(data["detail"])
            code = getattr(data["detail"], "code", code)
        else:
            field, messages = next(iter(data.items()))
            first = messages[0] if isinstance(messages, (list, tuple)) else messages
            detail = f"{field}: {first}" if field != "non_field_errors" else str(first)
    elif isinstance(data, (list, tuple)) and data:
        detail = str(data[0])
    else:
        detail = str(data)

    response.data = {"detail": detail, "code": code}
    return response
