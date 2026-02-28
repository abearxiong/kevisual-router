# WebSocket Server 设计文档

## 概述

WebSocket 服务器支持实时双向通信，可与 HTTP 服务器共享同一端口。所有 WebSocket 连接统一入口为 `/api/router`，通过 `type` 参数区分业务类型。

## 连接入口

```
ws://host:port/api/router?token=xxx&id=client-id
```

| 参数 | 说明 |
|------|------|
| token | 认证 token |
| id | 客户端标识 |

## 消息协议

### 请求消息格式

```json
{
  "type": "router",
  "path": "demo",
  "key": "01",
  "payload": { "name": "test" }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | 消息类型：router |
| path | string | 路由 path |
| key | string | 路由 key |
| payload | object | 请求参数 |

### 响应消息格式

```json
{
  "type": "router",
  "code": 200,
  "data": { "result": "success" },
  "message": "success"
}
```

### 内置消息类型

| 消息 | 说明 |
|------|------|
| ping | 服务端返回 pong |
| close | 关闭连接 |
| connected | 连接成功通知 |

## 自定义 WebSocket 监听器

可以注册自定义的 WebSocket 监听器来处理特定路径的 WebSocket 连接。

### 注册监听器

```typescript
app.on([
  {
    path: '/ws/chat',
    io: true,
    func: async (req, res) => {
      const { data, token, pathname, id, ws, emitter } = req;
      // 处理聊天消息
      res.end({ message: 'received' });
    }
  }
]);
```

### Listener 配置

| 字段 | 类型 | 说明 |
|------|------|------|
| path | string | WebSocket 路径 |
| io | boolean | 是否为 WebSocket 监听器 |
| func | function | 处理函数 |
| json | boolean | 是否自动解析 JSON |

## 执行流程

```
WebSocket 连接 → 查找 listener → 自定义处理 / 默认 router 处理 → 响应
```

1. WebSocket 连接建立时，解析 URL 获取 pathname、token、id
2. 查找是否有匹配的自定义 listener
3. 如有自定义 listener，调用对应处理函数
4. 如无自定义 listener，使用默认处理：
   - type = 'router' 时，调用 handle 处理路由
   - 支持 ping/pong/close 内置命令
5. 响应消息通过 ws.send 返回

## Go 设计

```go
package server

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/websocket"
)

// WebSocketMessage WebSocket 消息
type WebSocketMessage struct {
	Type    string                 `json:"type"`
	Path    string                 `json:"path,omitempty"`
	Key     string                 `json:"key,omitempty"`
	Payload map[string]interface{} `json:"payload,omitempty"`
	Data    interface{}            `json:"data,omitempty"`
	Code    int                    `json:"code,omitempty"`
	Message string                 `json:"message,omitempty"`
}

// WebSocketUpgrader WebSocket 升级配置
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Listener WebSocket 监听器
type Listener struct {
	Path    string
	IO      bool
	Func    func(msg WebSocketMessage, ws *websocket.Conn) error
	JSON    bool
}

// WsServer WebSocket 服务器
type WsServer struct {
	Router    *QueryRouter
	Path      string
	Listeners []Listener
	Listen    func() error
}

// HandleWebSocket 处理 WebSocket 连接
func (s *WsServer) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer ws.Close()

	// 解析 token 和 id
	token := r.URL.Query().Get("token")
	id := r.URL.Query().Get("id")

	for {
		// 读取消息
		_, msgBytes, err := ws.ReadMessage()
		if err != nil {
			break
		}

		var msg WebSocketMessage
		if err := json.Unmarshal(msgBytes, &msg); err != nil {
			ws.WriteJSON(WebSocketMessage{
				Code:    400,
				Message: "invalid message",
			})
			continue
		}

		// 查找自定义 listener
		pathname := r.URL.Path
		var handled bool
		for _, listener := range s.Listeners {
			if listener.IO && listener.Path == pathname {
				if err := listener.Func(msg, ws); err != nil {
					ws.WriteJSON(WebSocketMessage{
						Code:    500,
						Message: err.Error(),
					})
				}
				handled = true
				break
			}
		}

		if handled {
			continue
		}

		// 默认处理：router 类型
		if msg.Type == "router" {
			result, err := s.Router.Run(Message{
				Path:    msg.Path,
				Key:     msg.Key,
				Payload: msg.Payload,
			}, nil)
			if err != nil {
				ws.WriteJSON(WebSocketMessage{
					Code:    500,
					Message: err.Error(),
				})
				continue
			}
			ws.WriteJSON(WebSocketMessage{
				Type:    "router",
				Code:    result.Code,
				Data:    result.Data,
				Message: result.Message,
			})
			continue
		}

		// 内置命令
		if string(msgBytes) == "ping" {
			ws.WriteMessage(websocket.TextMessage, []byte("pong"))
			continue
		}

		if string(msgBytes) == "close" {
			break
		}

		ws.WriteJSON(WebSocketMessage{
			Code:    400,
			Message: "unknown type",
		})
	}
}

// Start 启动服务器
func (s *WsServer) Start(addr string) error {
	http.HandleFunc(s.Path, s.HandleWebSocket)
	return http.ListenAndServe(addr, nil)
}
```

## Rust 设计

```rust
use actix_web::{web, App, HttpServer, HttpRequest, HttpResponse, Responder};
use actix_ws::{Message, Session, Aggregate};
use std::sync::Arc;

// WebSocket 消息
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WsMessage {
    pub r#type: Option<String>,
    pub path: Option<String>,
    pub key: Option<String>,
    pub payload: Option<serde_json::Value>,
    pub data: Option<serde_json::Value>,
    pub code: Option<i32>,
    pub message: Option<String>,
}

// Listener 配置
pub struct Listener {
    pub path: String,
    pub io: bool,
    pub func: Option<Box<dyn Fn(WsMessage, &mut Session) -> Result<(), Box<dyn std::error::Error>> + Send>>,
    pub json: bool,
}

// WsServer
pub struct WsServer {
    pub router: QueryRouter,
    pub path: String,
    pub listeners: Vec<Listener>,
}

impl WsServer {
    pub async fn start(&self, addr: &str) -> std::io::Result<()> {
        let router = web::Data::new(self.router.clone());
        let path = self.path.clone();

        HttpServer::new(move || {
            App::new()
                .app_data(router.clone())
                .service(
                    web::resource(&path)
                        .route(web::get().to(ws_handler))
                )
        })
        .bind(addr)?
        .run()
        .await
    }
}

async fn ws_handler(
    req: HttpRequest,
    stream: web::Payload,
    router: web::Data<QueryRouter>,
) -> impl Responder {
    let (resp, session, msg) = actix_ws::handle(&req, stream)?;

    let mut session = session;

    // 处理消息
    while let Some(result) = msg.next().await {
        match result {
            Ok(Message::Text(text)) => {
                let ws_msg: WsMessage = match serde_json::from_str(&text) {
                    Ok(m) => m,
                    Err(_) => {
                        let _ = session.text(r#"{"code":400,"message":"invalid message"}"#).await;
                        continue;
                    }
                };

                // 调用 router
                if ws_msg.r#type.as_deref() == Some("router") {
                    let msg = Message {
                        path: ws_msg.path.clone(),
                        key: ws_msg.key.clone(),
                        payload: ws_msg.payload.clone(),
                    };

                    match router.run(msg, None).await {
                        Ok(result) => {
                            let resp = WsMessage {
                                r Some("router".to_string()),
                                code: Some(result.code),
                                data: result.data,
                                message: result.message,
                            };
                            let _ = session.text(serde_json::to_string(&resp).unwrap()).await;
                        }
                        Err(e) => {
                            let _ = session.text(format!(r#"{{"code":500,"message":"{}"}}"#, e)).await;
                        }
                    }
                } else if text == "ping" {
                    let _ = session.text("pong").await;
                } else if text == "close" {
                    break;
                }
            }
            Ok(Message::Close(_)) => break,
            Err(e) => {
                let _ = session.text(format!(r#"{{"code":500,"message":"{}"}}"#, e)).await;
                break;
            }
            _ => {}
        }
    }

    let _ = session.close(None).await;

    Ok(resp)
}
```

## 客户端示例

### TypeScript 客户端

```typescript
import { ReconnectingWebSocket } from '@kevisual/router';

const ws = new ReconnectingWebSocket('ws://localhost:4002/api/router', {
  onOpen: () => {
    console.log('connected');
  },
  onMessage: (data) => {
    console.log('received:', data);
  }
});

// 调用路由
ws.send({
  type: 'router',
  path: 'demo',
  key: '01',
  payload: { name: 'test' }
});
```

### 原生 WebSocket

```javascript
const ws = new WebSocket('ws://localhost:4002/api/router?token=xxx&id=client1');

ws.onopen = () => {
  // 调用路由
  ws.send(JSON.stringify({
    type: 'router',
    path: 'demo',
    key: '01',
    payload: { name: 'test' }
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('received:', data);
};

// 发送 ping
ws.send('ping');

// 关闭连接
ws.send('close');
```

## 连接示例

```bash
# 基础连接
wscat -c ws://localhost:4002/api/router

# 带 token 和 id
wscat -c "ws://localhost:4002/api/router?token=xxx&id=client1"

# 发送路由请求
{"type":"router","path":"demo","key":"01"}
```
