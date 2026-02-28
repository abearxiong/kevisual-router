# HTTP Server 设计文档

## 概述

HTTP 服务器层负责接收外部 HTTP 请求，将其归一化后传递给 Router 层处理。所有请求统一入口为 `/api/router`。

## 请求入口

```
POST /api/router?path=demo&key=01
GET  /api/router?path=demo&key=01
```

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| path | /api/router | 请求入口路径 |

## 请求参数归一化

HTTP 请求的参数来源于两个部分，最终合并为一个 Message 对象：

### 1. URL Query (searchParams)

```typescript
// GET /api/router?path=demo&key=01&token=xxx
{
  path: "demo",
  key: "01",
  token: "xxx"
}
```

### 2. POST Body

```typescript
// POST /api/router
// Body: { "name": "test", "value": 123 }
{
  name: "test",
  value: 123
}
```

### 3. 合并规则

最终的 Message = Query + Body（后者覆盖前者）

```typescript
// GET /api/router?path=demo&key=01
// POST Body: { "key": "02", "extra": "data" }
{
  path: "demo",
  key: "02",  // body 覆盖 query
  extra: "data"
}
```

### 4. payload 参数

如果 query 或 body 中有 `payload` 字段且为 JSON 字符串，会自动解析为对象：

```typescript
// GET /api/router?path=demo&key=01&payload={"id":123}
{
  path: "demo",
  key: "01",
  payload: { id: 123 }  // 自动解析
}
```

### 5. 认证信息

| 来源 | 字段名 | 说明 |
|------|--------|------|
| Authorization header | token | Bearer token |
| Cookie | token | cookie 中的 token |
| Cookie | cookies | 完整 cookie 对象 |

## 路由匹配

### 方式一：path + key

```bash
# 访问 path=demo, key=01 的路由
POST /api/router?path=demo&key=01
```

### 方式二：id

```bash
# 直接通过路由 ID 访问
POST /api/router?id=abc123
```

## 内置路由

所有内置路由使用统一的访问方式：

| 路由 | 访问方式 | 说明 |
|------|----------|------|
| router.list | POST /api/router?path=router&key=list | 获取路由列表 |

### router.list

获取当前应用所有路由列表。

**请求：**

```bash
POST /api/router?path=router&key=list
```

**响应：**

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": "router$#$list",
        "path": "router",
        "key": "list",
        "description": "列出当前应用下的所有的路由信息",
        "middleware": [],
        "metadata": {}
      }
    ],
    "isUser": false
  },
  "message": "success"
}
```

## Go 设计

```go
package server

import (
    "encoding/json"
    "net/http"
)

// Message HTTP 请求归一化后的消息
type Message struct {
    Path     string                 // 路由 path
    Key      string                 // 路由 key
    ID       string                 // 路由 ID (优先于 path+key)
    Token    string                 // 认证 token
    Payload  map[string]interface{} // payload 参数
    Query    url.Values             // 原始 query
    Cookies  map[string]string      // cookie
    // 其他参数
    Extra map[string]interface{}
}

// HandleServer 解析 HTTP 请求
func HandleServer(req *http.Request) (*Message, error) {
    method := req.Method
    if method != "GET" && method != "POST" {
        return nil, fmt.Errorf("method not allowed")
    }

    // 解析 query
    query := req.URL.Query()

    // 获取 token
    token := req.Header.Get("Authorization")
    if token != "" {
        token = strings.TrimPrefix(token, "Bearer ")
    }
    if token == "" {
        if cookie, err := req.Cookie("token"); err == nil {
            token = cookie.Value
        }
    }

    // 解析 body (POST)
    var body map[string]interface{}
    if method == "POST" {
        if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
            body = make(map[string]interface{})
        }
    }

    // 合并 query 和 body
    msg := &Message{
        Token:   token,
        Query:   query,
        Cookies: parseCookies(req.Cookies()),
    }

    // query 参数
    if v := query.Get("path"); v != "" {
        msg.Path = v
    }
    if v := query.Get("key"); v != "" {
        msg.Key = v
    }
    if v := query.Get("id"); v != "" {
        msg.ID = v
    }
    if v := query.Get("payload"); v != "" {
        if err := json.Unmarshal([]byte(v), &msg.Payload); err == nil {
            // payload 解析成功
        }
    }

    // body 参数覆盖 query
    for k, v := range body {
        msg.Extra[k] = v
        switch k {
        case "path":
            msg.Path = v.(string)
        case "key":
            msg.Key = v.(string)
        case "id":
            msg.ID = v.(string)
        case "payload":
            msg.Payload = v.(map[string]interface{})
        }
    }

    return msg, nil
}

// RouterHandler 创建 HTTP 处理函数
func RouterHandler(router *QueryRouter) http.HandlerFunc {
    return func(w http.ResponseWriter, req *http.Request) {
        // CORS
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST")
        w.Header().Set("Content-Type", "application/json")

        if req.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }

        msg, err := HandleServer(req)
        if err != nil {
            json.NewEncoder(w).Encode(Result{Code: 400, Message: err.Error()})
            return
        }

        // 调用 router.run
        result, err := router.Run(*msg, nil)
        if err != nil {
            json.NewEncoder(w).Encode(Result{Code: 500, Message: err.Error()})
            return
        }

        json.NewEncoder(w).Encode(result)
    }
}

// Server HTTP 服务器
type Server struct {
    Router   *QueryRouter
    Path     string
    Handlers []http.HandlerFunc
}

func (s *Server) Listen(addr string) error {
    mux := http.NewServeMux()

    // 自定义处理器
    for _, h := range s.Handlers {
        mux.HandleFunc(s.Path, h)
    }

    // 路由处理器
    mux.HandleFunc(s.Path, RouterHandler(s.Router))

    return http.ListenAndServe(addr, mux)
}
```

## Rust 设计

```rust
use actix_web::{web, App, HttpServer, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Message HTTP 请求归一化后的消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub path: Option<String>,
    pub key: Option<String>,
    pub id: Option<String>,
    pub token: Option<String>,
    pub payload: Option<HashMap<String, Value>>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

// Result 调用结果
#[derive(Debug, Serialize)]
pub struct Result {
    pub code: i32,
    pub data: Option<Value>,
    pub message: Option<String>,
}

// 解析 HTTP 请求
pub async fn handle_server(req: HttpRequest, body: web::Bytes) -> Result<Message, String> {
    let method = req.method().as_str();
    if method != "GET" && method != "POST" {
        return Err("method not allowed".to_string());
    }

    // 获取 query 参数
    let query: web::Query<HashMap<String, String>> = web::Query::clone(&req);

    // 获取 token
    let mut token = None;
    if let Some(auth) = req.headers().get("authorization") {
        if let Ok(s) = auth.to_str() {
            token = Some(s.trim_start_matches("Bearer ").to_string());
        }
    }
    if token.is_none() {
        if let Some(cookie) = req.cookie("token") {
            token = Some(cookie.value().to_string());
        }
    }

    // 解析 body (POST)
    let mut body_map = HashMap::new();
    if method == "POST" {
        if let Ok(v) = serde_json::from_slice::<Value>(&body) {
            if let Some(obj) = v.as_object() {
                for (k, val) in obj {
                    body_map.insert(k.clone(), val.clone());
                }
            }
        }
    }

    // 构建 Message
    let mut msg = Message {
        path: query.get("path").cloned(),
        key: query.get("key").cloned(),
        id: query.get("id").cloned(),
        token,
        payload: None,
        extra: HashMap::new(),
    };

    // 处理 payload
    if let Some(p) = query.get("payload") {
        if let Ok(v) = serde_json::from_str::<Value>(p) {
            msg.payload = v.as_object().map(|m| m.clone());
        }
    }

    // body 覆盖 query
    for (k, v) in body_map {
        match k.as_str() {
            "path" => msg.path = v.as_str().map(|s| s.to_string()),
            "key" => msg.key = v.as_str().map(|s| s.to_string()),
            "id" => msg.id = v.as_str().map(|s| s.to_string()),
            "payload" => msg.payload = v.as_object().map(|m| m.clone()),
            _ => msg.extra.insert(k, v),
        }
    }

    Ok(msg)
}

// HTTP 处理函数
async fn router_handler(
    req: HttpRequest,
    body: web::Bytes,
    router: web::Data<QueryRouter>,
) -> impl Responder {
    let msg = match handle_server(req, body).await {
        Ok(m) => m,
        Err(e) => return HttpResponse::BadRequest().json(Result {
            code: 400,
            data: None,
            message: Some(e),
        }),
    };

    // 调用 router.run
    match router.run(msg, None).await {
        Ok(result) => HttpResponse::Ok().json(result),
        Err(e) => HttpResponse::InternalServerError().json(Result {
            code: 500,
            data: None,
            message: Some(e.to_string()),
        }),
    }
}

// Server HTTP 服务器
pub struct Server {
    pub router: QueryRouter,
    pub path: String,
}

impl Server {
    pub async fn listen(self, addr: &str) -> std::io::Result<()> {
        let router = web::Data::new(self.router);

        HttpServer::new(move || {
            App::new()
                .app_data(router.clone())
                .route(&self.path, web::post().to(router_handler))
                .route(&self.path, web::get().to(router_handler))
        })
        .bind(addr)?
        .run()
        .await
    }
}
```

## 请求示例

### 基础请求

```bash
# 访问 demo/01 路由
curl -X POST "http://localhost:4002/api/router?path=demo&key=01"

# 带 body
curl -X POST "http://localhost:4002/api/router?path=demo&key=01" \
  -H "Content-Type: application/json" \
  -d '{"name":"test","value":123}'
```

### 获取路由列表

```bash
curl -X POST "http://localhost:4002/api/router?path=router&key=list"
```

### 带认证

```bash
# 通过 Header
curl -X POST "http://localhost:4002/api/router?path=demo&key=01" \
  -H "Authorization: Bearer your-token"

# 通过 Cookie
curl -X POST "http://localhost:4002/api/router?path=demo&key=01" \
  -b "token=your-token"
```
