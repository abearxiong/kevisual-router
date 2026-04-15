export declare const api: {
  "app_domain_manager": {
    /**
     * 获取域名信息，可以通过id或者domain进行查询
     *
     * @param data - Request parameters
     * @param data.data - {object}
     */
    "get": {
      "path": "app_domain_manager",
      "key": "get",
      "description": "获取域名信息，可以通过id或者domain进行查询",
      "metadata": {
        "args": {
          "data": {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "domain": {
                "type": "string"
              }
            },
            "additionalProperties": false,
            "required": ["id",]
          }
        },
        "viewItem": {
          "api": {
            "url": "/api/router"
          },
          "type": "api",
          "title": "路由"
        },
        "url": "/api/router",
        "source": "query-proxy-api"
      }
    },
    "delete": {
      "path": "app_domain_manager",
      "key": "delete",
      "description": "删除域名",
      "metadata": {
        "args": {
          "domainId": {
            "type": "string",
            "optional": true
          }
        }
      }
    }
  },
  "user_manager": {
    "getUser": {
      "path": "user_manager",
      "key": "getUser",
      "description": "获取用户信息",
      "metadata": {
        "args": {
          "userId": {
            "type": "string"
          },
          "includeProfile": {
            "type": "boolean"
          }
        }
      }
    }
  }
} 