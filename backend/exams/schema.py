from drf_spectacular.extensions import OpenApiAuthenticationExtension


class CsrfExemptSessionAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "exams.viewsets.common.CsrfExemptSessionAuthentication"
    name = "sessionAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "cookie",
            "name": "sessionid",
        }
