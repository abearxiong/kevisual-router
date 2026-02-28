# Router 系统设计文档

## 概述

轻量级路由框架，支持链式路由、中间件模式、统一上下文。适用于构建 API 服务，支持跨语言实现（Go、Rust 等）。

## 核心组件

### Route

| 字段 | 类型 | 说明 |
|------|------|------|
| path | string | 一级路径 |
| key | string | 二级路径 |
| id | string | 唯一标识 |
| run | Handler | 业务处理函数 |
| nextRoute | NextRoute? | 下一个路由 |
| middleware | string[] | 中间件 ID 列表 |
| metadata | T | 元数据/参数 schema |
| type | string | 类型：route / middleware |
| isDebug | bool | 是否开启调试 |

### NextRoute

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string? | 路由 ID |
| path | string? | 一级路径 |
| key | string? | 二级路径 |

### RouteContext

| 字段 | 类型 | 说明 |
|------|------|------|
| appId | string? | 应用 ID |
| query | object | URL 参数和 payload 合并结果 |
| args | object | 同 query |
| body | any | 响应 body |
| code | number | 响应状态码 |
| message | string | 响应消息 |
| state | object | 状态传递 |
| currentId | string? | 当前路由 ID |
| currentPath | string? | 当前路径 |
| currentKey | string? | 当前 key |
| currentRoute | Route? | 当前路由对象 |
| progress | [string, string][] | 路由执行路径 |
| nextQuery | object | 传递给下一个路由的参数 |
| end | boolean | 是否提前结束 |
| app | QueryRouter? | 路由实例引用 |
| error | any | 错误信息 |
| call | function | 调用其他路由（返回完整上下文） |
| run | function | 调用其他路由（返回简化结果） |
| throw | function | 抛出错误 |
| needSerialize | boolean | 是否需要序列化 |

### QueryRouter

| 方法 | 说明 |
|------|------|
| add(route, opts?) | 添加路由 |
| remove(route) | 按 path/key 移除路由 |
| removeById(id) | 按 ID 移除路由 |
| runRoute(path, key, ctx) | 执行单个路由 |
| parse(message, ctx) | 入口解析，返回完整上下文 |
| call(message, ctx) | 调用路由，返回完整上下文 |
| run(message, ctx) | 调用路由，返回简化结果 {code, data, message} |
| getHandle() | 获取 HTTP 处理函数 |
| setContext(ctx) | 设置默认上下文 |
| getList(filter?) | 获取路由列表 |
| hasRoute(path, key) | 检查路由是否存在 |
| findRoute(opts) | 查找路由 |
| exportRoutes() | 导出所有路由 |
| importRoutes(routes) | 批量导入路由 |
| createRouteList(opts) | 创建内置的路由列表功能 |

### QueryRouterServer

继承 QueryRouter，新增：

| 字段 | 类型 | 说明 |
|------|------|------|
| appId | string | 应用 ID |
| handle | function | HTTP 处理函数 |

| 方法 | 说明 |
|------|------|
| setHandle(wrapperFn, ctx) | 设置处理函数 |
| route(path, key?, opts?) | 工厂方法创建路由 |

## Go 设计

```go
package router

// Route 路由单元
type Route struct {
    Path      string
    Key       string
    ID        string
    Run       func(ctx *RouteContext) (*RouteContext, error)
    NextRoute *NextRoute
    Middleware []string
    Metadata  map[string]interface{}
    Type      string
    IsDebug   bool
}

// NextRoute 下一个路由
type NextRoute struct {
    ID   string
    Path string
    Key  string
}

// RouteContext 请求上下文
type RouteContext struct {
    AppID       string
    Query       map[string]interface{}
    Args        map[string]interface{}
    Body        interface{}
    Code        int
    Message     string
    State       map[string]interface{}
    CurrentID   string
    CurrentPath string
    CurrentKey  string
    CurrentRoute *Route
    Progress    [][2]string
    NextQuery   map[string]interface{}
    End         bool
    App         *QueryRouter
    Error       error
    NeedSerialize bool
    // Methods
    Call func(msg interface{}, ctx *RouteContext) (*RouteContext, error)
    Run  func(msg interface{}, ctx *RouteContext) (interface{}, error)
    Throw func(err interface{})
}

// Message 调用消息
type Message struct {
    ID       string
    Path     string
    Key      string
    Payload  map[string]interface{}
}

// Result 调用结果
type Result struct {
    Code    int
    Data    interface{}
    Message string
}

// AddOpts 添加选项
type AddOpts struct {
    Overwrite bool
}

// QueryRouter 路由管理器
type QueryRouter struct {
    Routes        []*Route
    MaxNextRoute  int
    Context       *RouteContext
}

func NewQueryRouter() *QueryRouter

func (r *QueryRouter) Add(route *Route, opts *AddOpts)
func (r *QueryRouter) Remove(path, key string)
func (r *QueryRouter) RemoveByID(id string)
func (r *QueryRouter) RunRoute(path, key string, ctx *RouteContext) (*RouteContext, error)
func (r *QueryRouter) Parse(msg Message, ctx *RouteContext) (*RouteContext, error)
func (r *QueryRouter) Call(msg Message, ctx *RouteContext) (*RouteContext, error)
func (r *QueryRouter) Run(msg Message, ctx *RouteContext) (Result, error)
func (r *QueryRouter) GetHandle() func(msg interface{}) Result
func (r *QueryRouter) SetContext(ctx *RouteContext)
func (r *QueryRouter) GetList() []Route
func (r *QueryRouter) HasRoute(path, key string) bool
func (r *QueryRouter) FindRoute(opts FindOpts) *Route

// QueryRouterServer 服务端
type QueryRouterServer struct {
    QueryRouter
    AppID  string
    Handle func(msg interface{}) Result
}

type ServerOpts struct {
    HandleFn func(msg interface{}, ctx interface{}) Result
    Context  *RouteContext
    AppID    string
}

func NewQueryRouterServer(opts *ServerOpts) *QueryRouterServer

func (s *QueryRouterServer) SetHandle(wrapperFn func(msg interface{}, ctx interface{}) Result, ctx *RouteContext)
func (s *QueryRouterServer) Route(path string, key ...string) *Route
```

## Rust 设计

```rust
use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;

// Route 路由单元
pub struct Route<M = Value> {
    pub path: String,
    pub key: String,
    pub id: String,
    pub run: Option<Box<dyn Fn(RouteContext) -> Pin<Box<dyn Future<Output = Result<RouteContext>>>> + Send>>,
    pub next_route: Option<NextRoute>,
    pub middleware: Vec<String>,
    pub metadata: M,
    pub route_type: String,
    pub is_debug: bool,
}

// NextRoute 下一个路由
#[derive(Clone)]
pub struct NextRoute {
    pub id: Option<String>,
    pub path: Option<String>,
    pub key: Option<String>,
}

// RouteContext 请求上下文
#[derive(Clone)]
pub struct RouteContext {
    pub app_id: Option<String>,
    pub query: HashMap<String, Value>,
    pub args: HashMap<String, Value>,
    pub body: Option<Value>,
    pub code: Option<i32>,
    pub message: Option<String>,
    pub state: HashMap<String, Value>,
    pub current_id: Option<String>,
    pub current_path: Option<String>,
    pub current_key: Option<String>,
    pub current_route: Option<Box<Route>>,
    pub progress: Vec<(String, String)>,
    pub next_query: HashMap<String, Value>,
    pub end: bool,
    pub app: Option<Box<QueryRouter>>,
    pub error: Option<Value>,
    pub need_serialize: bool,
}

// Message 调用消息
#[derive(Clone)]
pub struct Message {
    pub id: Option<String>,
    pub path: Option<String>,
    pub key: Option<String>,
    pub payload: HashMap<String, Value>,
}

// Result 调用结果
pub struct Result {
    pub code: i32,
    pub data: Option<Value>,
    pub message: Option<String>,
}

// AddOpts 添加选项
pub struct AddOpts {
    pub overwrite: bool,
}

// FindOpts 查找选项
pub struct FindOpts {
    pub path: Option<String>,
    pub key: Option<String>,
    pub id: Option<String>,
}

// QueryRouter 路由管理器
pub struct QueryRouter {
    pub routes: Vec<Route>,
    pub max_next_route: usize,
    pub context: RouteContext,
}

impl QueryRouter {
    pub fn new() -> Self
    pub fn add(&mut self, route: Route, opts: Option<AddOpts>)
    pub fn remove(&mut self, path: &str, key: &str)
    pub fn remove_by_id(&mut self, id: &str)
    pub async fn run_route(&self, path: &str, key: &str, ctx: RouteContext) -> Result<RouteContext>
    pub async fn parse(&self, msg: Message, ctx: Option<RouteContext>) -> Result<RouteContext>
    pub async fn call(&self, msg: Message, ctx: Option<RouteContext>) -> Result<RouteContext>
    pub async fn run(&self, msg: Message, ctx: Option<RouteContext>) -> Result<Result>
    pub fn get_handle(&self) -> impl Fn(Message) -> Result + '_
    pub fn set_context(&mut self, ctx: RouteContext)
    pub fn get_list(&self) -> Vec<Route>
    pub fn has_route(&self, path: &str, key: &str) -> bool
    pub fn find_route(&self, opts: FindOpts) -> Option<&Route>
}

// ServerOpts 服务端选项
pub struct ServerOpts {
    pub handle_fn: Option<Box<dyn Fn(Message, Option<RouteContext>) -> Result + Send>>,
    pub context: Option<RouteContext>,
    pub app_id: Option<String>,
}

// QueryRouterServer 服务端
pub struct QueryRouterServer {
    pub router: QueryRouter,
    pub app_id: String,
    pub handle: Option<Box<dyn Fn(Message) -> Result + Send>>,
}

impl QueryRouterServer {
    pub fn new(opts: Option<ServerOpts>) -> Self
    pub fn set_handle(&mut self, wrapperFn: Box<dyn Fn(Message) -> Result + Send>)
    pub fn route(&self, path: &str, key: Option<&str>) -> Route
}
```

## 执行流程

```
Message → parse() → runRoute() → [middleware] → run() → [nextRoute] → ...
                    ↓
                RouteContext (层层传递)
```

1. `parse()` 接收消息，初始化上下文（query、args、state）
2. `runRoute()` 查找路由，先执行 middleware，再执行 run
3. middleware 执行出错立即返回错误
4. 如有 nextRoute，递归执行下一个路由（最多 40 层）
5. 返回最终 RouteContext

## 特性说明

- **双层路径**: path + key 构成唯一路由
- **链式路由**: nextRoute 支持路由链式执行
- **中间件**: 每个 Route 可挂载多个 middleware
- **统一上下文**: RouteContext 贯穿整个请求生命周期

## 内置路由

框架内置以下路由，通过 HTTP 访问时使用 `path` 和 `key` 参数：

| 路由 path | 路由 key | 说明 |
|-----------|----------|------|
| router | list | 获取当前应用所有路由列表 |

### router/list

获取当前应用所有路由列表。

**访问方式：** `POST /api/router?path=router&key=list`

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
