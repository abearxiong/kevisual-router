# WebSocket Server 设计文档

## 概述

WebSocket 服务器支持实时双向通信，可与 HTTP 服务器共享同一端口。所有 WebSocket 连接统一入口为 `/api/router`，通过 `type` 参数区分业务类型。
