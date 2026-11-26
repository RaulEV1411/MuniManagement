from rest_framework.pagination import PageNumberPagination


class Paginacion(PageNumberPagination):
    """50 por página; el cliente puede pedir hasta 100 con ?page_size=. Las listas cortas
    (catálogos, direcciones, departamentos, roles) no se paginan."""

    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100
