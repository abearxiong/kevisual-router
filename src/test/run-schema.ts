import z from "zod";
import { App } from "../index.ts";
import { api as a2 } from './api.js';

const app = new App();
const api = {
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
        },
        "returns": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string"
            },
            "age": {
              "type": "number"
            }
          },
          "additionalProperties": false,
          "required": ["name", "age"]
        }
      }
    }
  }
} as const;
type API = typeof api;

// 类型推断生效：payload 根据 metadata.args 自动推断
// get 的 args.data 是 type:"object"，所以 payload 需要 { data: object }
app.runAction(a2.app_domain_manager.get, { data: { idd: "1" }, })

// delete 的 args 是 { domainId: { type: "string" } }，所以 payload 需要 { domainId: string }
app.runAction(api.app_domain_manager.delete, { domainId: "d1" })

// getUser 的 args 是 { userId: string, includeProfile: boolean }
const res = await app.runAction(api.user_manager.getUser, { userId: "u1", includeProfile: true })
const name: string = res.data.name;